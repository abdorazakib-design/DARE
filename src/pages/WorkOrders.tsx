import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchRequests, fetchWorkOrders } from '@/data/api'
import type { CircuitRequest, WorkOrder } from '@/lib/types'
import { EmptyState, PageHeader, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { useToast } from '@/components/ui/feedback'
import { WorkOrderDoc } from '@/components/WorkOrderDoc'
import { StatusBadge } from '@/components/badges'
import { fmtDateTime } from '@/lib/utils'

export default function WorkOrders() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version } = useData()
  const { push } = useToast()
  const [orders, setOrders] = useState<WorkOrder[] | null>(null)
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)
  const [query, setQuery] = useState('')
  /** Work order document opened when a row is clicked (viewer only). */
  const [docWo, setDocWo] = useState<WorkOrder | null>(null)

  useEffect(() => {
    fetchWorkOrders().then(setOrders).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchRequests().then(setRequests).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const requestOf = (w: WorkOrder): CircuitRequest | undefined => requests?.find((x) => x.id === w.request_id)
  const requestType = (r: CircuitRequest) => refs?.requestTypes.find((rt) => rt.id === r.request_type_id)
  /** Approver recorded on the request details when it was approved. */
  const approvedByOf = (r: CircuitRequest | undefined): string => {
    const v = r?.details?.approved_by
    return typeof v === 'string' && v ? v : '—'
  }

  const filtered = useMemo(() => {
    if (!orders) return []
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((w) => {
      const r = requestOf(w)
      return `${w.number} ${w.assigned_to ?? ''} ${r?.circuit_ref ?? ''} ${r?.circuit_designation ?? ''}`
        .toLowerCase()
        .includes(q)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, query, requests])

  const columns: Column<WorkOrder>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t.workorders.number,
        sortValue: (w) => w.number,
        render: (w) => <span className="font-mono text-xs font-medium text-white">{w.number}</span>,
      },
      {
        key: 'circuitRef',
        header: t.circuits.ref,
        sortValue: (w) => requestOf(w)?.circuit_ref ?? '',
        render: (w) => {
          const r = requestOf(w)
          if (!r?.circuit_ref) return <span className="text-slate-500">—</span>
          return <span className="font-mono text-xs text-neon-300">{r.circuit_ref}</span>
        },
      },
      {
        key: 'designation',
        header: t.circuits.designation,
        sortValue: (w) => requestOf(w)?.circuit_designation ?? '',
        render: (w) => {
          const r = requestOf(w)
          if (!r?.circuit_designation) return <span className="text-slate-500">—</span>
          return <span className="text-xs font-medium text-white">{r.circuit_designation}</span>
        },
      },
      {
        key: 'request',
        header: t.workorders.request,
        sortValue: (w) => w.request_id ?? '',
        render: (w) => {
          const r = requestOf(w)
          if (!r) return <span className="text-slate-500">—</span>
          return <span className="text-xs text-slate-400">{pick(requestType(r))}</span>
        },
      },
      {
        key: 'assigned',
        header: t.workorders.assignedTo,
        sortValue: (w) => w.assigned_to ?? '',
        render: (w) => w.assigned_to ?? <span className="text-slate-600">{t.workorders.assigneePlaceholder}</span>,
      },
      {
        key: 'status',
        header: t.common.status,
        sortValue: (w) => maps?.statusById.get(w.status_id)?.sort_order ?? 0,
        render: (w) => <StatusBadge status={maps?.statusById.get(w.status_id)} />,
      },
      {
        key: 'created',
        header: t.workorders.createdAt,
        sortValue: (w) => w.created_at,
        render: (w) => fmtDateTime(w.created_at, lang),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang, maps, requests, refs, pick],
  )

  /** Clicking a work order opens its document (viewer). */
  const openDoc = (target: WorkOrder) => {
    if (!requestOf(target)) {
      push(t.workorders.docNoRequest, 'error')
      return
    }
    setDocWo(target)
  }

  const docRequest = docWo ? requestOf(docWo) : undefined

  return (
    <div>
      <PageHeader
        title={t.workorders.title}
        subtitle={t.workorders.subtitle}
      />

      <div className="glass mb-4 flex flex-wrap items-center gap-3 p-4">
        <TextInput
          className="max-w-xs flex-1"
          placeholder={`${t.common.search} — ${t.workorders.number.toLowerCase()}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-xs text-slate-500">{t.common.results(filtered.length)}</p>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={orders === null}
        empty={<EmptyState icon={<ClipboardList className="h-6 w-6" />} title={t.workorders.empty} />}
        onRowClick={openDoc}
        getKey={(w) => w.id}
        initialSortKey="number"
      />

      <WorkOrderDoc
        workOrder={docWo}
        request={docRequest ?? null}
        approvedBy={approvedByOf(docRequest)}
        onClose={() => setDocWo(null)}
      />
    </div>
  )
}

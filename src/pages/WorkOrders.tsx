import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { deleteWorkOrder, fetchRequests, fetchWorkOrders, updateWorkOrder } from '@/data/api'
import type { CircuitRequest, WorkOrder, WorkOrderInput } from '@/lib/types'
import { Button, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { fmtDateTime } from '@/lib/utils'

interface FormState {
  number: string
  request_id: string
  status_id: string
  assigned_to: string
}

export default function WorkOrders() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [orders, setOrders] = useState<WorkOrder[] | null>(null)
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<WorkOrder | null>(null)
  const [form, setForm] = useState<FormState>({ number: '', request_id: '', status_id: '', assigned_to: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<WorkOrder | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchWorkOrders().then(setOrders).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchRequests().then(setRequests).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const requestType = (r: CircuitRequest) => refs?.requestTypes.find((rt) => rt.id === r.request_type_id)

  const filtered = useMemo(() => {
    if (!orders) return []
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((w) => `${w.number} ${w.assigned_to ?? ''}`.toLowerCase().includes(q))
  }, [orders, query])

  const columns: Column<WorkOrder>[] = useMemo(
    () => [
      {
        key: 'number',
        header: t.workorders.number,
        sortValue: (w) => w.number,
        render: (w) => <span className="font-mono text-xs font-medium text-white">{w.number}</span>,
      },
      {
        key: 'request',
        header: t.workorders.request,
        sortValue: (w) => w.request_id ?? '',
        render: (w) => {
          const r = requests?.find((x) => x.id === w.request_id)
          if (!r) return <span className="text-slate-500">—</span>
          return (
            <span className="text-xs">
              {r.circuit_designation ?? r.circuit_ref}
              <span className="ml-1.5 text-slate-500">({pick(requestType(r))})</span>
            </span>
          )
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

  // Work orders are created from approved requests only — this page edits existing ones.
  const openEdit = (target: WorkOrder) => {
    setForm({ number: target.number, request_id: target.request_id ?? '', status_id: target.status_id, assigned_to: target.assigned_to ?? '' })
    setEditing(target)
  }

  const save = async () => {
    if (!editing || !refs) return
    const statusId = form.status_id || maps?.statusesByScope('work_order')[0]?.id
    if (!form.number.trim() || !statusId) return
    setSaving(true)
    try {
      const payload: WorkOrderInput = {
        number: form.number.trim(),
        request_id: form.request_id || null,
        status_id: statusId,
        assigned_to: form.assigned_to.trim() || null,
      }
      await updateWorkOrder(editing.id, payload)
      push(t.workorders.statusUpdated)
      setEditing(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setConfirmLoading(true)
    try {
      await deleteWorkOrder(deleting.id)
      push(t.toast.deleted(deleting.number))
      setDeleting(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setConfirmLoading(false)
    }
  }

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
        onRowClick={openEdit}
        getKey={(w) => w.id}
        initialSortKey="number"
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? t.workorders.number : ''}
        size="md"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editing ? (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setDeleting(editing)
                  setEditing(null)
                }}
              >
                {t.common.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t.common.cancel}
              </Button>
              <Button loading={saving} onClick={() => void save()}>
                {t.common.save}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label={t.workorders.number}
            required
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="font-mono"
          />
          <TextInput
            label={t.workorders.assignedTo}
            placeholder={t.workorders.assigneePlaceholder}
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
          />
          <Select
            label={t.workorders.request}
            placeholder={t.common.none}
            options={(requests ?? []).map((r) => ({
              value: r.id,
              label: `${r.circuit_designation ?? r.circuit_ref ?? r.id.slice(0, 8)} · ${pick(requestType(r))}`,
            }))}
            value={form.request_id}
            onChange={(e) => setForm({ ...form, request_id: e.target.value })}
          />
          <Select
            label={t.common.status}
            required
            options={(maps?.statusesByScope('work_order') ?? []).map((s) => ({ value: s.id, label: pick(s) }))}
            value={form.status_id}
            onChange={(e) => setForm({ ...form, status_id: e.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t.common.deleteTitle}
        message={deleting ? t.common.deleteConfirm(deleting.number) : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={confirmLoading}
      />
    </div>
  )
}

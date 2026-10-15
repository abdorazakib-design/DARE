import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCircuits, fetchMaintenance, fetchRequests, fetchWorkOrders } from '@/data/api'
import type { Circuit, CircuitRequest, MaintenanceEvent, WorkOrder } from '@/lib/types'
import { Button, Card, EmptyState, PageHeader, Select } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { useToast } from '@/components/ui/feedback'
import { downloadCSV, fmtDate, fmtDateTime, toCSV, todayISO } from '@/lib/utils'

type DatasetKey = 'circuits' | 'requests' | 'workorders' | 'maintenance'
type Row = Record<string, string>

interface Built {
  headers: string[]
  rows: Row[]
  data: (string | number | null)[][]
}

export default function Reports() {
  const { t, lang, pick } = useI18n()
  const { maps, version } = useData()
  const { push } = useToast()
  const [dataset, setDataset] = useState<DatasetKey>('circuits')
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)
  const [orders, setOrders] = useState<WorkOrder[] | null>(null)
  const [events, setEvents] = useState<MaintenanceEvent[] | null>(null)

  useEffect(() => {
    fetchCircuits().then(setCircuits).catch(() => undefined)
    fetchRequests().then(setRequests).catch(() => undefined)
    fetchWorkOrders().then(setOrders).catch(() => undefined)
    fetchMaintenance().then(setEvents).catch(() => undefined)
  }, [version])

  const built = useMemo<Built | null>(() => {
    if (!maps) return null
    let headers: string[] = []
    let data: (string | number | null)[][] = []
    if (dataset === 'circuits' && circuits) {
      headers = [
        t.circuits.designation, t.circuits.ref, t.circuits.operator, t.circuits.stationA, t.circuits.stationB,
        t.circuits.bandwidth, t.circuits.interface, t.circuits.quantity, t.circuits.restoration, t.circuits.status,
        t.circuits.activatedAt, t.circuits.requestedBy,
      ]
      data = circuits.map((c) => [
        c.designation,
        c.circuit_ref,
        maps.operatorById.get(c.operator_id)?.name ?? '',
        maps.stationById.get(c.station_a_id)?.name ?? '',
        maps.stationById.get(c.station_b_id)?.name ?? '',
        pick(maps.bandwidthById.get(c.bandwidth_id)),
        pick(maps.interfaceById.get(c.interface_type_id)),
        c.quantity,
        pick(maps.restorationById.get(c.restoration_type_id)),
        pick(maps.statusById.get(c.status_id)),
        c.activated_at ? fmtDate(c.activated_at, lang) : '',
        c.requested_by ?? '',
      ])
    } else if (dataset === 'requests' && requests) {
      headers = [t.request.requestType, t.request.designation, t.request.circuitRef, t.request.requestedBy, t.request.requestedDate, t.common.status, t.request.created]
      data = requests.map((r) => [
        pick(maps.requestTypeById.get(r.request_type_id)),
        r.circuit_designation ?? '',
        r.circuit_ref ?? '',
        r.requested_by,
        r.requested_date ? fmtDate(r.requested_date, lang) : '',
        pick(maps.statusById.get(r.status_id)),
        fmtDateTime(r.created_at, lang),
      ])
    } else if (dataset === 'workorders' && orders) {
      headers = [t.workorders.number, t.request.reference, t.workorders.assignedTo, t.common.status, t.workorders.createdAt]
      data = orders.map((w) => {
        const r = requests?.find((x) => x.id === w.request_id)
        return [
          w.number,
          r ? `${r.circuit_designation ?? r.circuit_ref ?? ''}` : '',
          w.assigned_to ?? '',
          pick(maps.statusById.get(w.status_id)),
          fmtDateTime(w.created_at, lang),
        ]
      })
    } else if (dataset === 'maintenance' && events) {
      headers = [t.om.event, t.om.station, t.om.severity, t.common.status, t.om.startedAt, t.om.resolvedAt, t.common.description]
      data = events.map((m) => [
        m.title,
        maps.stationById.get(m.station_id)?.name ?? '',
        m.severity,
        pick(maps.statusById.get(m.status_id)),
        m.started_at ? fmtDate(m.started_at, lang) : '',
        m.resolved_at ? fmtDate(m.resolved_at, lang) : '',
        m.description ?? '',
      ])
    } else {
      return null
    }
    const rows: Row[] = data.map((cells, i) => {
      const row: Row = { id: String(i) }
      cells.forEach((v, j) => {
        row[`c${j}`] = String(v ?? '')
      })
      return row
    })
    return { headers, rows, data }
  }, [dataset, circuits, requests, orders, events, maps, lang, pick, t])

  const columns: Column<Row>[] = useMemo(() => (built?.headers ?? []).map((h, i) => ({ key: `c${i}`, header: h })), [built])

  const exportCsv = () => {
    if (!built) return
    downloadCSV(`dare-${dataset}-${todayISO()}.csv`, toCSV(built.headers, built.data))
    push(t.reports.exported(built.rows.length))
  }

  const datasetOptions = [
    { value: 'circuits', label: t.reports.circuits },
    { value: 'requests', label: t.reports.requests },
    { value: 'workorders', label: t.reports.workorders },
    { value: 'maintenance', label: t.reports.maintenance },
  ]

  return (
    <div>
      <PageHeader
        title={t.reports.title}
        subtitle={t.reports.subtitle}
        actions={
          <Button size="sm" icon={<Download className="h-3.5 w-3.5" />} disabled={!built} onClick={exportCsv}>
            {t.common.exportCsv}
          </Button>
        }
      />

      <div className="glass mb-4 flex flex-wrap items-end gap-4 p-4">
        <Select
          label={t.reports.dataset}
          options={datasetOptions}
          value={dataset}
          onChange={(e) => setDataset(e.target.value as DatasetKey)}
          className="min-w-56"
        />
        <p className="pb-2.5 text-xs text-slate-500">{t.reports.hint}</p>
      </div>

      <Card title={t.reports.preview} right={built ? <span className="text-xs text-slate-500">{t.reports.rows(built.rows.length)}</span> : null}>
        <DataTable
          columns={columns}
          rows={built?.rows ?? []}
          loading={built === null}
          empty={<EmptyState icon={<BarChart3 className="h-6 w-6" />} title={t.common.noResults} />}
          getKey={(r) => r.id}
          pageSize={10}
        />
      </Card>
    </div>
  )
}

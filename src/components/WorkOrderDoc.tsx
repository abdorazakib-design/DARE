import { useEffect, useMemo, useState } from 'react'
import { Mail, Printer } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCapacity, fetchUsers } from '@/data/api'
import type { AppUser, CapacityEntitlement, CircuitRequest, WorkOrder } from '@/lib/types'
import { Modal, useToast } from '@/components/ui/feedback'
import { Button } from '@/components/ui/primitives'

interface Props {
  workOrder: WorkOrder | null
  request: CircuitRequest | null
  approvedBy: string
  onClose: () => void
}

interface DocRow {
  label: string
  value: string
}

interface EqRow {
  label: string
  a: string
  b: string
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Document date format: dd/mm/yyyy (as on the operator work orders). */
const docDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

/**
 * Work order document shown when a work order is created — mirrors the
 * operator's paper format (WORKORDER DETAILS / CIRCUIT DETAILS /
 * EQUIPMENT DETAILS with A END & B END columns) and can be printed or
 * emailed to the requester to confirm the process is underway.
 */
export function WorkOrderDoc({ workOrder, request, approvedBy, onClose }: Props) {
  const { t, lang, pick } = useI18n()
  const { maps } = useData()
  const { push } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [capacity, setCapacity] = useState<CapacityEntitlement[]>([])

  useEffect(() => {
    if (!request) return
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
    fetchCapacity()
      .then(setCapacity)
      .catch(() => setCapacity([]))
  }, [request])

  const rows: DocRow[] = useMemo(() => {
    if (!request || !workOrder) return []
    const d = (request.details ?? {}) as Record<string, unknown>
    const str = (k: string): string => (typeof d[k] === 'string' ? (d[k] as string) : '')
    const dash = (s: string | null | undefined): string => (s && s.trim() ? s : '—')
    const stationA = maps?.stationById.get(str('station_a_id'))
    const stationB = maps?.stationById.get(str('station_b_id'))
    const bandwidth = maps?.bandwidthById.get(str('bandwidth_id'))
    const quantity = Number(d.quantity ?? 1) || 1
    const provider = maps?.providerById.get(str('provider_id') || str('new_provider_id'))
    // DLS reference from the capacity table: S_FP{fp}_DLS_{nn}_{staA}-{staB}
    // e.g. S_FP2_DLS_02_DJB-MOM (matches the operator work order format; the
    // station codes follow the same 3-letter convention as the circuit IDs).
    const capRow = capacity.find(
      (c) =>
        c.operator_id === str('operator_id') &&
        ((c.station_a_id === str('station_a_id') && c.station_b_id === str('station_b_id')) ||
          (c.station_a_id === str('station_b_id') && c.station_b_id === str('station_a_id'))) &&
        c.dls_number != null,
    )
    const short = (code: string | undefined): string => (code ? code.slice(0, 3).toUpperCase() : '—')
    const dlsRef = capRow
      ? `S_FP${capRow.fp_pair.replace(/^FP/i, '')}_DLS_${String(capRow.dls_number).padStart(2, '0')}_${short(stationA?.code)}-${short(stationB?.code)}`
      : '—'

    return [
      { label: 'CircuitID', value: dash(request.circuit_ref) },
      { label: 'Circuit Désignation', value: dash(request.circuit_designation) },
      { label: 'Bandwidth', value: dash(bandwidth?.label) },
      { label: 'Interface Type', value: dash(pick(maps?.interfaceById.get(str('interface_type_id')))) },
      { label: 'Capacity', value: bandwidth ? `${bandwidth.value_gbps * quantity} Gbps` : '—' },
      { label: 'Quantity', value: String(quantity) },
      { label: 'StationA', value: dash(stationA?.name) },
      { label: 'StationB', value: dash(stationB?.name) },
      { label: 'Backhaul ProviderA', value: dash(provider?.name) },
      { label: 'Backhaul ProviderB', value: dash(provider?.name) },
      { label: 'Requesting Party', value: dash(maps?.operatorById.get(str('operator_id'))?.name) },
      { label: 'Requested By', value: dash(request.requested_by) },
      { label: 'Restoration Type', value: dash(pick(maps?.restorationById.get(str('restoration_type_id')))).toUpperCase() },
      { label: 'Status', value: dash(pick(maps?.statusById.get(request.status_id))).toUpperCase() },
      { label: 'Circuit Type', value: 'CA' },
      { label: 'Approved By', value: dash(approvedBy) },
      // DLS reference built from the capacity entitlement (matches the
      // operator format, e.g. S_FP2_DLS_02_DJB-MOM): FP pair + DLS number +
      // party code + station B short code.
      { label: 'DLS détails', value: dlsRef },
      { label: 'OCH', value: '—' },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, workOrder, maps, pick, approvedBy, capacity])

  /** EQUIPMENT DETAILS: A END / B END columns (station, SLTE, ODF). */
  const eqRows: EqRow[] = useMemo(() => {
    if (!request) return []
    const d = (request.details ?? {}) as Record<string, unknown>
    const str = (k: string): string => (typeof d[k] === 'string' ? (d[k] as string) : '')
    const stationA = maps?.stationById.get(str('station_a_id'))
    const stationB = maps?.stationById.get(str('station_b_id'))
    const cls = (name: string | undefined): string => (name ? `${name} CLS` : '—')
    return [
      { label: 'STATION', a: cls(stationA?.name), b: cls(stationB?.name) },
      { label: 'SLTE', a: '—', b: '—' },
      { label: 'ODF', a: '—', b: '—' },
    ]
  }, [request, maps])

  const requesterEmail = useMemo(() => {
    if (!request) return ''
    const u = users.find((x) => x.full_name.trim().toLowerCase() === request.requested_by.trim().toLowerCase())
    return u?.email ?? ''
  }, [users, request])

  const asText = (): string => {
    if (!workOrder) return ''
    const head = `DARE-1 Network Administrator\nWorkOrder reference No : ${workOrder.number}\nWorkOrder Issued Date : ${docDate(
      workOrder.created_at,
    )}`
    const details = `WORKORDER DETAILS\nCIRCUIT DETAILS\n${rows.map((r) => `${r.label}  ${r.value}`).join('\n')}`
    const equip = `EQUIPMENT DETAILS\n          A END          B END\n${eqRows
      .map((r) => `${r.label}  ${r.a}  ${r.b}`)
      .join('\n')}`
    return `${head}\n\n${details}\n\n${equip}`
  }

  const printDoc = () => {
    if (!workOrder) return
    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>${esc(workOrder.number)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 40px; font-size: 13px; }
  .head { margin-bottom: 18px; }
  .head p { margin: 2px 0; }
  .head .title { font-weight: 700; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; margin: 18px 0 8px; border-bottom: 1px solid #333; padding-bottom: 3px; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; margin: 12px 0 6px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 8px 3px 0; vertical-align: top; }
  td.k { width: 38%; color: #333; }
  td.v { font-weight: 600; }
  .eq td { width: 31%; }
  .eq td.lbl { width: 12%; font-weight: 700; }
  .eq tr.head td { font-weight: 700; text-transform: uppercase; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<div class="head">
  <p class="title">DARE-1 Network Administrator</p>
  <p>WorkOrder reference No : ${esc(workOrder.number)}</p>
  <p>WorkOrder Issued Date : ${esc(docDate(workOrder.created_at))}</p>
</div>
<h2>WORKORDER DETAILS</h2>
<h3>CIRCUIT DETAILS</h3>
<table>${rows.map((r) => `<tr><td class="k">${esc(r.label)}</td><td class="v">${esc(r.value)}</td></tr>`).join('')}</table>
<h2>EQUIPMENT DETAILS</h2>
<table class="eq">
  <tr class="head"><td class="lbl"></td><td>A END</td><td>B END</td></tr>
  ${eqRows.map((r) => `<tr><td class="lbl">${esc(r.label)}</td><td>${esc(r.a)}</td><td>${esc(r.b)}</td></tr>`).join('')}
</table>
</body></html>`
    const w = window.open('', '_blank')
    if (!w) {
      push(t.request.printBlocked, 'error')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 350)
  }

  const sendByEmail = () => {
    if (!workOrder || !request) return
    const subject = t.request.emailSubjectWO(workOrder.number)
    const body = `${t.request.emailIntroWO}\n\n${asText()}\n\n— ${t.app.name}`
    if (!requesterEmail) push(t.request.emailNoMatch(request.requested_by), 'error')
    window.location.href = `mailto:${encodeURIComponent(requesterEmail)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
    if (requesterEmail) push(t.request.emailOpened, 'success')
  }

  return (
    <Modal
      open={!!workOrder && !!request}
      onClose={onClose}
      title={`${t.request.woDocTitle} — ${workOrder?.number ?? ''}`}
      size="md"
    >
      {workOrder && request ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-neon-400/20 bg-neon-500/5 px-3.5 py-2.5 text-xs text-neon-200">
            {t.request.workOrderCreatedForCircuit(workOrder.number, request.circuit_designation ?? '')}
          </div>
          {/* Document preview — styled with the app theme (dark/light). */}
          <div className="glass p-5">
            <div className="mb-4">
              <p className="font-display text-sm font-bold text-white">DARE-1 Network Administrator</p>
              <p className="mt-1 text-xs text-slate-300">
                WorkOrder reference No : <span className="font-mono font-semibold text-neon-300">{workOrder.number}</span>
              </p>
              <p className="text-xs text-slate-300">WorkOrder Issued Date : {docDate(workOrder.created_at)}</p>
            </div>
            <h4 className="mb-2 border-b border-white/8 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Workorder details
            </h4>
            <h5 className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Circuit details</h5>
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs text-slate-500">{r.label}</dt>
                  <dd className="text-right text-xs font-medium text-slate-200">{r.value}</dd>
                </div>
              ))}
            </dl>
            <h4 className="mt-4 mb-2 border-b border-white/8 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
              Equipment details
            </h4>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-slate-400 uppercase">
                  <th className="w-[12%] py-1.5 pr-2 text-left font-semibold" />
                  <th className="py-1.5 text-left font-semibold">A END</th>
                  <th className="py-1.5 text-left font-semibold">B END</th>
                </tr>
              </thead>
              <tbody>
                {eqRows.map((r) => (
                  <tr key={r.label} className="border-t border-white/5">
                    <td className="py-1.5 pr-2 align-top font-semibold text-slate-300">{r.label}</td>
                    <td className="py-1.5 align-top text-slate-200">{r.a}</td>
                    <td className="py-1.5 align-top text-slate-200">{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/8 pt-4">
        <Button variant="outline" size="sm" icon={<Printer className="h-4 w-4" />} onClick={printDoc}>
          {t.request.print}
        </Button>
        <Button variant="primary" size="sm" icon={<Mail className="h-4 w-4" />} onClick={sendByEmail}>
          {t.request.sendEmail}
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>
          {t.common.close}
        </Button>
      </div>
    </Modal>
  )
}

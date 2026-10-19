import { useEffect, useMemo, useState } from 'react'
import { Mail, Printer } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchUsers } from '@/data/api'
import type { AppUser, CircuitRequest } from '@/lib/types'
import { Modal, useToast } from '@/components/ui/feedback'
import { Button } from '@/components/ui/primitives'
import { fmtDateTime } from '@/lib/utils'

interface Props {
  request: CircuitRequest | null
  onClose: () => void
}

interface Row {
  label: string
  value: string
}

interface Section {
  title: string
  rows: Row[]
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * End-of-process summary for a "New Circuit Activation" request: mirrors the
 * confirmation sheet (designation, ID, capacity, party, POPs, schedule) and
 * can be printed or drafted into an email to the requester for confirmation
 * and traceability.
 */
export function ActivationRecap({ request, onClose }: Props) {
  const { t, lang, pick } = useI18n()
  const { maps } = useData()
  const { push } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])

  useEffect(() => {
    if (!request) return
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [request])

  const sections: Section[] = useMemo(() => {
    if (!request) return []
    const d = (request.details ?? {}) as Record<string, unknown>
    const str = (k: string): string => (typeof d[k] === 'string' ? (d[k] as string) : '')
    const dash = (s: string | null | undefined): string => (s && s.trim() ? s : '—')

    const operator = maps?.operatorById.get(str('operator_id'))
    const stationA = maps?.stationById.get(str('station_a_id'))
    const stationB = maps?.stationById.get(str('station_b_id'))
    const provider = maps?.providerById.get(str('provider_id'))
    const status = maps?.statusById.get(request.status_id)
    const approvedAt = typeof d.approved_at === 'string' ? (d.approved_at as string) : null

    return [
      {
        title: t.request.recapActivation,
        rows: [
          { label: t.request.designation, value: dash(request.circuit_designation) },
          { label: t.request.circuitRef, value: dash(request.circuit_ref) },
          { label: t.request.bandwidth, value: dash(pick(maps?.bandwidthById.get(str('bandwidth_id')))) },
          { label: t.request.interface, value: dash(pick(maps?.interfaceById.get(str('interface_type_id')))) },
          { label: t.request.restoration, value: dash(pick(maps?.restorationById.get(str('restoration_type_id')))) },
          { label: t.common.quantity, value: d.quantity != null ? String(d.quantity) : '—' },
        ],
      },
      {
        title: t.request.recapParty,
        rows: [{ label: t.request.operator, value: dash(operator?.name) }],
      },
      {
        title: t.request.recapPopA,
        rows: [
          { label: t.request.popA, value: dash(stationA?.name) },
          { label: t.request.backhaulA, value: dash(provider?.name) },
        ],
      },
      {
        title: t.request.recapPopB,
        rows: [
          { label: t.request.popB, value: dash(stationB?.name) },
          { label: t.request.backhaulB, value: dash(provider?.name) },
        ],
      },
      {
        title: t.request.recapSchedule,
        rows: [
          { label: t.request.requestedDate, value: fmtDateTime(request.requested_date, lang) },
          { label: t.request.requestedCompany, value: dash(operator?.name) },
          { label: t.request.requestedBy, value: dash(request.requested_by) },
          { label: t.request.approvalDate, value: fmtDateTime(approvedAt, lang) },
          { label: t.common.status, value: dash(pick(status)).toUpperCase() },
        ],
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, maps, lang, pick, t])

  const requesterEmail = useMemo(() => {
    if (!request) return ''
    const u = users.find((x) => x.full_name.trim().toLowerCase() === request.requested_by.trim().toLowerCase())
    return u?.email ?? ''
  }, [users, request])

  const asText = (): string =>
    sections.map((s) => `${s.title}\n${s.rows.map((r) => `${r.label}: ${r.value}`).join('\n')}`).join('\n\n')


  const printRecap = () => {
    if (!request) return
    const generated = fmtDateTime(new Date().toISOString(), lang)
    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>${esc(t.request.recapTitle)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 40px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 22px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: #444; margin: 20px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 5px 8px; vertical-align: top; border-bottom: 1px solid #eee; }
  td.k { width: 42%; color: #555; }
  td.v { font-weight: 600; }
  .ref { font-family: ui-monospace, Menlo, monospace; }
  footer { margin-top: 28px; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 8px; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<h1>${esc(t.request.recapTitle)}</h1>
<p class="meta">${esc(t.app.name)} — ${esc(t.request.recapGenerated)}: ${esc(generated)}</p>
${sections
  .map(
    (s) =>
      `<h2>${esc(s.title)}</h2><table>${s.rows
        .map(
          (r) =>
            `<tr><td class="k">${esc(r.label)}</td><td class="v${
              r.label === t.request.circuitRef ? ' ref' : ''
            }">${esc(r.value)}</td></tr>`,
        )
        .join('')}</table>`,
  )
  .join('')}
<footer>${esc(t.request.recapFooter)}</footer>
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
    if (!request) return
    const subject = t.request.emailSubject(request.circuit_ref ?? '')
    const body = `${t.request.emailIntro}\n\n${asText()}\n\n— ${t.app.name}`
    if (!requesterEmail) push(t.request.emailNoMatch(request.requested_by), 'error')
    window.location.href = `mailto:${encodeURIComponent(requesterEmail)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
    if (requesterEmail) push(t.request.emailOpened, 'success')
  }

  return (
    <Modal open={!!request} onClose={onClose} title={t.request.recapTitle} size="md">
      {request ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-neon-400/20 bg-neon-500/5 px-3.5 py-2.5 text-xs text-neon-200">
            {t.request.recapIntro}
          </div>
          {sections.map((s) => (
            <section key={s.title}>
              <h4 className="mb-1.5 border-b border-white/8 pb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {s.title}
              </h4>
              <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {s.rows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-slate-500">{r.label}</dt>
                    <dd
                      className={`text-right text-xs font-medium text-slate-200 ${
                        r.label === t.request.circuitRef ? 'font-mono text-neon-300' : ''
                      }`}
                    >
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <p className="text-[11px] leading-relaxed text-slate-500">{t.request.recapFooter}</p>
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/8 pt-4">
        <Button variant="outline" size="sm" icon={<Printer className="h-4 w-4" />} onClick={printRecap}>
          {t.request.print}
        </Button>
        <Button variant="primary" size="sm" icon={<Mail className="h-4 w-4" />} onClick={sendByEmail}>
          {t.request.sendEmail}
        </Button>
      </div>
    </Modal>
  )
}

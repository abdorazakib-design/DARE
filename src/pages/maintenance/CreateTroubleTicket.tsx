import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ticket } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createTroubleTicket, fetchCircuits } from '@/data/api'
import type { Circuit, MaintenanceInput } from '@/lib/types'
import { Button, Card, PageHeader, Select, TextArea, TextInput } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/feedback'
import { todayISO } from '@/lib/utils'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

interface FormState {
  title: string
  station_id: string
  severity: string
  description: string
  circuit_id: string
  opened_at: string
}

/**
 * Create a trouble ticket: severity + affected station/circuit + description.
 * The ticket number (TT-YYYY-NNN) and the initial "open" status are assigned
 * automatically; the user lands on the ticket list afterwards.
 */
export default function CreateTroubleTicket() {
  const { t, pick } = useI18n()
  const { refs, maps, bump } = useData()
  const { push } = useToast()
  const navigate = useNavigate()
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: '',
    station_id: refs?.stations[0]?.id ?? '',
    severity: 'medium',
    description: '',
    circuit_id: '',
    opened_at: todayISO(),
  })

  useEffect(() => {
    fetchCircuits()
      .then(setCircuits)
      .catch(() => setCircuits([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const severityLabels: Record<string, string> = {
    low: t.om.low,
    medium: t.om.medium,
    high: t.om.high,
    critical: t.om.critical,
  }

  const openStatus = useMemo(
    () => maps?.statusesByScope('trouble_ticket').find((s) => s.code === 'open') ?? maps?.statusesByScope('trouble_ticket')[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maps],
  )

  const submit = async () => {
    if (!form.title.trim() || !form.station_id || !openStatus) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: MaintenanceInput = {
      title: form.title.trim(),
      station_id: form.station_id,
      severity: form.severity,
      status_id: openStatus.id,
      description: form.description.trim() || null,
      kind: 'trouble',
      circuit_id: form.circuit_id || null,
      started_at: form.opened_at || null,
      resolved_at: null,
    }
    setSaving(true)
    try {
      const created = await createTroubleTicket(payload)
      push(t.tt.created(created.ticket_number ?? ''))
      bump()
      navigate('/maintenance/trouble')
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  /** Picking a circuit pre-fills the affected station. */
  const onPickCircuit = (id: string) => {
    const c = circuits.find((x) => x.id === id)
    setForm((f) => ({ ...f, circuit_id: id, station_id: c?.station_a_id ?? f.station_id }))
  }

  return (
    <div>
      <PageHeader title={t.tt.createTitle} subtitle={t.tt.createSubtitle} />

      <Card className="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label={t.common.title}
            required
            className="sm:col-span-2"
            placeholder={t.tt.titlePlaceholder}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            label={t.circuits.circuitDetail}
            placeholder={t.common.none}
            className="sm:col-span-2"
            options={circuits.map((c) => ({ value: c.id, label: `${c.designation} · ${c.circuit_ref ?? ''}` }))}
            value={form.circuit_id}
            onChange={(e) => onPickCircuit(e.target.value)}
          />
          <Select
            label={t.om.station}
            required
            options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))}
            value={form.station_id}
            onChange={(e) => setForm({ ...form, station_id: e.target.value })}
          />
          <Select
            label={t.om.severity}
            required
            options={SEVERITIES.map((s) => ({ value: s, label: severityLabels[s] }))}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          />
          <TextInput
            label={t.tt.openedAt}
            type="date"
            value={form.opened_at}
            onChange={(e) => setForm({ ...form, opened_at: e.target.value })}
          />
          <TextArea
            label={t.common.description}
            className="sm:col-span-2"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-white/8 pt-4">
          <Button variant="ghost" onClick={() => navigate('/maintenance/trouble')}>
            {t.common.cancel}
          </Button>
          <Button
            loading={saving}
            icon={<Ticket className="h-4 w-4" />}
            onClick={() => void submit()}
          >
            {t.tt.submit}
          </Button>
        </div>
      </Card>
    </div>
  )
}

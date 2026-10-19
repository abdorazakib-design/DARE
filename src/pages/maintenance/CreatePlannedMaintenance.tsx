import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarPlus } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createMaintenance, fetchCircuits } from '@/data/api'
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
  planned_start: string
  planned_end: string
}

/**
 * Plan a maintenance window: affected station/circuit, severity, planned
 * start/end dates. Stored with kind='planned' and the "planned" status;
 * the user lands on the planned maintenance list afterwards.
 */
export default function CreatePlannedMaintenance() {
  const { t } = useI18n()
  const { refs, maps, bump } = useData()
  const { push } = useToast()
  const navigate = useNavigate()
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: '',
    station_id: refs?.stations[0]?.id ?? '',
    severity: 'low',
    description: '',
    circuit_id: '',
    planned_start: todayISO(),
    planned_end: '',
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

  const plannedStatus =
    maps?.statusesByScope('maintenance').find((s) => s.code === 'planned') ??
    maps?.statusesByScope('maintenance')[0]

  const submit = async () => {
    if (!form.title.trim() || !form.station_id || !plannedStatus) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: MaintenanceInput = {
      title: form.title.trim(),
      station_id: form.station_id,
      severity: form.severity,
      status_id: plannedStatus.id,
      description: form.description.trim() || null,
      kind: 'planned',
      circuit_id: form.circuit_id || null,
      started_at: form.planned_start || null,
      resolved_at: form.planned_end || null,
    }
    setSaving(true)
    try {
      await createMaintenance(payload)
      push(t.pm.created)
      bump()
      navigate('/maintenance/planned')
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  const onPickCircuit = (id: string) => {
    const c = circuits.find((x) => x.id === id)
    setForm((f) => ({ ...f, circuit_id: id, station_id: c?.station_a_id ?? f.station_id }))
  }

  return (
    <div>
      <PageHeader title={t.pm.createTitle} subtitle={t.pm.createSubtitle} />

      <Card className="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label={t.common.title}
            required
            className="sm:col-span-2"
            placeholder={t.pm.titlePlaceholder}
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
            label={t.pm.plannedStart}
            type="date"
            required
            value={form.planned_start}
            onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
          />
          <TextInput
            label={t.pm.plannedEnd}
            type="date"
            value={form.planned_end}
            onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
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
          <Button variant="ghost" onClick={() => navigate('/maintenance/planned')}>
            {t.common.cancel}
          </Button>
          <Button loading={saving} icon={<CalendarPlus className="h-4 w-4" />} onClick={() => void submit()}>
            {t.pm.submit}
          </Button>
        </div>
      </Card>
    </div>
  )
}

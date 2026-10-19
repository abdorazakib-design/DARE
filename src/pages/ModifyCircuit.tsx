import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Cable, Save } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCircuits, updateCircuit } from '@/data/api'
import type { Circuit, CircuitInput } from '@/lib/types'
import { Button, Card, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/feedback'

type FormState = Omit<CircuitInput, 'requested_by' | 'activated_at'>

export default function ModifyCircuit() {
  const { t, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [params] = useSearchParams()
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchCircuits()
      .then((rows) => {
        setCircuits(rows)
        const wanted = params.get('circuit')
        if (wanted && rows.some((c) => c.id === wanted)) setSelectedId(wanted)
      })
      .catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const selected = useMemo(() => circuits?.find((c) => c.id === selectedId) ?? null, [circuits, selectedId])

  useEffect(() => {
    if (!selected) {
      setForm(null)
      return
    }
    setForm({
      designation: selected.designation,
      circuit_ref: selected.circuit_ref,
      operator_id: selected.operator_id,
      station_a_id: selected.station_a_id,
      station_b_id: selected.station_b_id,
      bandwidth_id: selected.bandwidth_id,
      interface_type_id: selected.interface_type_id,
      quantity: selected.quantity,
      restoration_type_id: selected.restoration_type_id,
      status_id: selected.status_id,
    })
  }, [selected])

  const save = async () => {
    if (!selected || !form) return
    if (!form.designation.trim() || !form.circuit_ref.trim() || form.station_a_id === form.station_b_id) {
      push(t.request.invalid, 'error')
      return
    }
    setSaving(true)
    try {
      await updateCircuit(selected.id, form)
      push(t.modify.changesSaved(form.designation))
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title={t.modify.title} subtitle={t.modify.subtitle} />

      <div className="glass mb-4 p-4">
        {/* Type-to-search picker — no more dropdown scrolling. */}
        <Combobox<Circuit>
          label={t.modify.pickCircuit}
          placeholder={t.modify.pickCircuitPlaceholder}
          items={circuits ?? []}
          getItemLabel={(c) => `${c.designation} · ${c.circuit_ref} · ${maps?.operatorById.get(c.operator_id)?.name ?? ''}`}
          getItemKey={(c) => c.id}
          value={selectedId}
          onChange={setSelectedId}
        />
      </div>

      {!selected || !form ? (
        <div className="glass">
          <EmptyState icon={<Cable className="h-6 w-6" />} title={t.modify.pickFirst} />
        </div>
      ) : (
        <Card
          title={t.circuits.circuitDetail}
          right={
            <Button size="sm" loading={saving} icon={<Save className="h-3.5 w-3.5" />} onClick={() => void save()}>
              {t.common.save}
            </Button>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label={t.circuits.designation} required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            <TextInput label={t.circuits.ref} required className="font-mono" value={form.circuit_ref} onChange={(e) => setForm({ ...form, circuit_ref: e.target.value })} />
            <Select label={t.circuits.operator} required options={(refs?.operators ?? []).map((o) => ({ value: o.id, label: o.name }))} value={form.operator_id} onChange={(e) => setForm({ ...form, operator_id: e.target.value })} />
            <Select label={t.circuits.status} required options={(maps?.statusesByScope('circuit') ?? []).map((s) => ({ value: s.id, label: pick(s) }))} value={form.status_id} onChange={(e) => setForm({ ...form, status_id: e.target.value })} />
            <Select label={t.circuits.stationA} required options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.station_a_id} onChange={(e) => setForm({ ...form, station_a_id: e.target.value })} />
            <Select label={t.circuits.stationB} required options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.station_b_id} onChange={(e) => setForm({ ...form, station_b_id: e.target.value })} />
            <Select label={t.circuits.bandwidth} required options={(refs?.bandwidths ?? []).map((b) => ({ value: b.id, label: b.label }))} value={form.bandwidth_id} onChange={(e) => setForm({ ...form, bandwidth_id: e.target.value })} />
            <Select label={t.circuits.interface} required options={(refs?.interfaceTypes ?? []).map((i) => ({ value: i.id, label: i.label }))} value={form.interface_type_id} onChange={(e) => setForm({ ...form, interface_type_id: e.target.value })} />
            <Select label={t.circuits.restoration} required options={(refs?.restorationTypes ?? []).map((r) => ({ value: r.id, label: r.label }))} value={form.restoration_type_id} onChange={(e) => setForm({ ...form, restoration_type_id: e.target.value })} />
            <TextInput label={t.common.quantity} required type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
        </Card>
      )}
    </div>
  )
}

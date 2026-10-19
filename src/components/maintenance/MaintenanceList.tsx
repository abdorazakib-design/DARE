import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { deleteMaintenance, fetchCircuits, fetchMaintenance, updateMaintenance } from '@/data/api'
import type { Circuit, MaintenanceEvent, MaintenanceInput } from '@/lib/types'
import { Button, Select, TextArea, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/feedback'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { fmtDate } from '@/lib/utils'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const

interface FormState {
  title: string
  station_id: string
  severity: string
  status_id: string
  description: string
  circuit_id: string
  started_at: string
  resolved_at: string
}

/**
 * Shared list + detail modal for maintenance events (trouble tickets or
 * planned maintenance). Row click opens the detail modal with edit fields,
 * status progression and deletion — same interaction as the rest of the app.
 */
export function MaintenanceList({ kind }: { kind: 'trouble' | 'planned' }) {
  const { t, lang, pick } = useI18n()
  const { maps, version, bump } = useData()
  const { push } = useToast()
  const [events, setEvents] = useState<MaintenanceEvent[] | null>(null)
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [selected, setSelected] = useState<MaintenanceEvent | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<MaintenanceEvent | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchMaintenance()
      .then((rows) => setEvents(rows.filter((m) => (m.kind ?? 'planned') === kind)))
      .catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchCircuits()
      .then(setCircuits)
      .catch(() => setCircuits([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, kind])

  const scope = kind === 'trouble' ? 'trouble_ticket' : 'maintenance'
  const severityLabels: Record<string, string> = {
    low: t.om.low,
    medium: t.om.medium,
    high: t.om.high,
    critical: t.om.critical,

  const columns: Column<MaintenanceEvent>[] = useMemo(() => {
    const base: Column<MaintenanceEvent>[] = []
    if (kind === 'trouble') {
      base.push({
        key: 'ticket',
        header: t.tt.number,
        sortValue: (m) => m.ticket_number ?? '',
        render: (m) => <span className="font-mono text-xs font-medium text-neon-300">{m.ticket_number ?? '—'}</span>,
      })
    }
    base.push(
      {
        key: 'title',
        header: t.common.title,
        sortValue: (m) => m.title,
        render: (m) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{m.title}</p>
            {m.description ? <p className="mt-0.5 max-w-md truncate text-[11px] text-slate-500">{m.description}</p> : null}
          </div>
        ),
      },
      {
        key: 'station',
        header: t.om.station,
        sortValue: (m) => maps?.stationById.get(m.station_id)?.name ?? '',
        render: (m) => maps?.stationById.get(m.station_id)?.name ?? '—',
      },
      {
        key: 'severity',
        header: t.om.severity,
        sortValue: (m) => SEVERITIES.indexOf(m.severity as (typeof SEVERITIES)[number]),
        render: (m) => <SeverityBadge severity={m.severity} />,
      },
      {
        key: 'status',
        header: t.common.status,
        sortValue: (m) => maps?.statusById.get(m.status_id)?.sort_order ?? 0,
        render: (m) => <StatusBadge status={maps?.statusById.get(m.status_id)} />,
      },
      {
        key: 'started',
        header: kind === 'trouble' ? t.tt.openedAt : t.pm.plannedStart,
        sortValue: (m) => m.started_at ?? '',
        render: (m) => fmtDate(m.started_at, lang),
      },
      {
        key: 'resolved',
        header: kind === 'trouble' ? t.tt.closedAt : t.pm.plannedEnd,
        sortValue: (m) => m.resolved_at ?? '',
        render: (m) => fmtDate(m.resolved_at, lang),
      },
    )
    return base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, t, lang, maps])

  const openDetail = (m: MaintenanceEvent) => {
    setSelected(m)
    setForm({
      title: m.title,
      station_id: m.station_id,
      severity: m.severity,
      status_id: m.status_id,
      description: m.description ?? '',
      circuit_id: m.circuit_id ?? '',
      started_at: m.started_at ?? '',
      resolved_at: m.resolved_at ?? '',
    })
  }

  const save = async () => {
    if (!selected || !form || !form.title.trim() || !form.station_id || !form.status_id) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: Partial<MaintenanceInput> = {
      title: form.title.trim(),
      station_id: form.station_id,
      severity: form.severity,
      status_id: form.status_id,
      description: form.description.trim() || null,
      circuit_id: form.circuit_id || null,
      started_at: form.started_at || null,
      resolved_at: form.resolved_at || null,
    }
    setSaving(true)
    try {
      await updateMaintenance(selected.id, payload)
      push(t.om.saved)
      setSelected(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  /** Move the event to the next status of its workflow (by sort_order). */
  const advanceStatus = async () => {
    if (!selected || !maps) return
    const workflow = maps.statusesByScope(scope)
    const idx = workflow.findIndex((s) => s.id === selected.status_id)
    const next = workflow[idx + 1]
    if (!next) return
    setSaving(true)
    try {
      const payload: Partial<MaintenanceInput> = { status_id: next.id }
      // Resolving closes the ticket with today's date.
      if (next.code === 'resolved') payload.resolved_at = new Date().toISOString().slice(0, 10)
      await updateMaintenance(selected.id, payload)
      push(t.om.saved)
      setSelected(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  const nextStatus = useMemo(() => {
    if (!selected || !maps) return null
    const workflow = maps.statusesByScope(scope)
    const idx = workflow.findIndex((s) => s.id === selected.status_id)
    return workflow[idx + 1] ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, maps, scope])

  const confirmDelete = async () => {
    if (!deleting) return
    setConfirmLoading(true)
    try {
      await deleteMaintenance(deleting.id)
      push(t.toast.deleted(deleting.ticket_number ?? deleting.title))
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
      <DataTable
        columns={columns}
        rows={events ?? []}
        loading={events === null}
        empty={
          kind === 'trouble' ? (
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={t.tt.empty} hint={t.tt.emptyHint} />
          ) : (
            <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={t.pm.empty} hint={t.pm.emptyHint} />
          )
        }
        onRowClick={openDetail}
        getKey={(m) => m.id}
        pageSize={10}
      />

      {/* Detail modal: edit fields + status progression + delete */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={kind === 'trouble' ? `${t.tt.detail} — ${selected?.ticket_number ?? ''}` : t.pm.detail}
        size="md"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {selected ? (
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => {
                  setDeleting(selected)
                  setSelected(null)
                }}
              >
                {t.common.delete}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {nextStatus ? (
                <Button variant="success" size="sm" loading={saving} onClick={() => void advanceStatus()}>
                  {t.tt.advanceTo(nextStatus.label_fr || nextStatus.label_en)}
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setSelected(null)}>
                {t.common.cancel}
              </Button>
              <Button loading={saving} onClick={() => void save()}>
                {t.common.save}
              </Button>
            </div>
          </div>
        }
      >
        {selected && form ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label={t.common.title}
              required
              className="sm:col-span-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Select
              label={t.om.station}
              required
              options={(maps?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))}
              value={form.station_id}
              onChange={(e) => setForm({ ...form, station_id: e.target.value })}
            />
            <Select
              label={t.circuits.circuitDetail}
              placeholder={t.common.none}
              options={circuits.map((c) => ({
                value: c.id,
                label: `${c.designation} · ${c.circuit_ref ?? ''}`,
              }))}
              value={form.circuit_id}
              onChange={(e) => setForm({ ...form, circuit_id: e.target.value })}
            />
            <Select
              label={t.om.severity}
              required
              options={SEVERITIES.map((s) => ({ value: s, label: severityLabels[s] }))}
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            />
            <Select
              label={t.common.status}
              required
              options={(maps?.statusesByScope(scope) ?? []).map((s) => ({ value: s.id, label: pick(s) }))}
              value={form.status_id}
              onChange={(e) => setForm({ ...form, status_id: e.target.value })}
            />
            <TextInput
              label={kind === 'trouble' ? t.tt.openedAt : t.pm.plannedStart}
              type="date"
              value={form.started_at}
              onChange={(e) => setForm({ ...form, started_at: e.target.value })}
            />
            <TextInput
              label={kind === 'trouble' ? t.tt.closedAt : t.pm.plannedEnd}
              type="date"
              value={form.resolved_at}
              onChange={(e) => setForm({ ...form, resolved_at: e.target.value })}
            />
            <TextArea
              label={t.common.description}
              className="sm:col-span-2"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t.common.deleteTitle}
        message={deleting ? t.common.deleteConfirm(deleting.ticket_number ?? deleting.title) : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={confirmLoading}
      />
    </div>
  )
}

  }

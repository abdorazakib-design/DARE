import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Wrench } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createMaintenance, deleteMaintenance, fetchMaintenance, updateMaintenance } from '@/data/api'
import type { MaintenanceEvent, MaintenanceInput } from '@/lib/types'
import { Button, EmptyState, PageHeader, Select, TextArea, TextInput } from '@/components/ui/primitives'
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
  started_at: string
  resolved_at: string
}

const emptyForm = (stationId: string, statusId: string): FormState => ({
  title: '',
  station_id: stationId,
  severity: 'low',
  status_id: statusId,
  description: '',
  started_at: '',
  resolved_at: '',
})

export default function Maintenance() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [events, setEvents] = useState<MaintenanceEvent[] | null>(null)
  const [editing, setEditing] = useState<MaintenanceEvent | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm('', ''))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<MaintenanceEvent | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  useEffect(() => {
    fetchMaintenance().then(setEvents).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const severityLabels: Record<string, string> = { low: t.om.low, medium: t.om.medium, high: t.om.high, critical: t.om.critical }

  const columns: Column<MaintenanceEvent>[] = useMemo(
    () => [
      {
        key: 'title',
        header: t.om.event,
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
      { key: 'severity', header: t.om.severity, sortValue: (m) => SEVERITIES.indexOf(m.severity as (typeof SEVERITIES)[number]), render: (m) => <SeverityBadge severity={m.severity} /> },
      {
        key: 'status',
        header: t.common.status,
        sortValue: (m) => maps?.statusById.get(m.status_id)?.sort_order ?? 0,
        render: (m) => <StatusBadge status={maps?.statusById.get(m.status_id)} />,
      },
      { key: 'started', header: t.om.startedAt, sortValue: (m) => m.started_at ?? '', render: (m) => fmtDate(m.started_at, lang) },
      { key: 'resolved', header: t.om.resolvedAt, sortValue: (m) => m.resolved_at ?? '', render: (m) => fmtDate(m.resolved_at, lang) },
    ],
    [t, lang, maps],
  )

  const openEdit = (target: MaintenanceEvent | 'new') => {
    if (target === 'new') {
      const station = refs?.stations[0]?.id ?? ''
      const status = maps?.statusesByScope('maintenance').find((s) => s.code === 'planned') ?? maps?.statusesByScope('maintenance')[0]
      setForm(emptyForm(station, status?.id ?? ''))
    } else {
      setForm({
        title: target.title,
        station_id: target.station_id,
        severity: target.severity,
        status_id: target.status_id,
        description: target.description ?? '',
        started_at: target.started_at ?? '',
        resolved_at: target.resolved_at ?? '',
      })
    }
    setEditing(target)
  }

  const save = async () => {
    if (!form.title.trim() || !form.station_id || !form.status_id) {
      push(t.request.invalid, 'error')
      return
    }
    const payload: MaintenanceInput = {
      title: form.title.trim(),
      station_id: form.station_id,
      severity: form.severity,
      status_id: form.status_id,
      description: form.description.trim() || null,
      started_at: form.started_at || null,
      resolved_at: form.resolved_at || null,
    }
    setSaving(true)
    try {
      if (editing === 'new') await createMaintenance(payload)
      else if (editing) await updateMaintenance(editing.id, payload)
      push(t.om.saved)
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
      await deleteMaintenance(deleting.id)
      push(t.toast.deleted(deleting.title))
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
        title={t.om.title}
        subtitle={t.om.subtitle}
        actions={
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openEdit('new')}>
            {t.om.newEvent}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={events ?? []}
        loading={events === null}
        empty={<EmptyState icon={<Wrench className="h-6 w-6" />} title={t.om.empty} />}
        onRowClick={openEdit}
        getKey={(m) => m.id}
        pageSize={8}
      />

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t.om.newEvent : t.om.editEvent}
        size="md"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editing && editing !== 'new' ? (
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
          <TextInput label={t.common.title} required className="sm:col-span-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Select label={t.om.station} required options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${s.country}` }))} value={form.station_id} onChange={(e) => setForm({ ...form, station_id: e.target.value })} />
          <Select label={t.common.status} required options={(maps?.statusesByScope('maintenance') ?? []).map((s) => ({ value: s.id, label: pick(s) }))} value={form.status_id} onChange={(e) => setForm({ ...form, status_id: e.target.value })} />
          <Select
            label={t.om.severity}
            required
            options={SEVERITIES.map((s) => ({ value: s, label: severityLabels[s] }))}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          />
          <TextInput label={t.om.startedAt} type="date" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} />
          <TextInput label={t.om.resolvedAt} type="date" value={form.resolved_at} onChange={(e) => setForm({ ...form, resolved_at: e.target.value })} />
          <TextArea label={t.common.description} className="sm:col-span-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t.common.deleteTitle}
        message={deleting ? t.common.deleteConfirm(deleting.title) : ''}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={confirmLoading}
      />
    </div>
  )
}

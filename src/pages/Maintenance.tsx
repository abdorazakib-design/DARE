import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Wrench } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createMaintenance, deleteMaintenance, fetchMaintenance, updateMaintenance } from '@/data/api'
import type { MaintenanceComment, MaintenanceEvent, MaintenanceInput } from '@/lib/types'
import { Button, EmptyState, PageHeader, Select, TextArea, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { ConfirmDialog, Modal, useToast } from '@/components/ui/feedback'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { fmtDate, fmtDateTime } from '@/lib/utils'

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const TICKET_TYPES = ['network_event', 'service_request', 'incident', 'repair_and_return'] as const
const SERVICE_TYPES = ['request_loopback', 'performance_monitoring'] as const
const RAISED_BY_OPTIONS = ['CLS', 'NOC'] as const
const NE_CREATION_OPTIONS = [
  'adcn',
  'branch_unit',
  'dsl_fiber_pair',
  'node_id',
  'others',
  'segment',
  'station_pop',
  'sub_segment',
] as const
const NETWORK_IMPACT_OPTIONS = ['traffic_affected', 'no_traffic_affected', 'traffic_threat'] as const
const INCIDENT_IMPACT_OPTIONS = ['service_affected', 'service_threat', 'non_service_affected'] as const
const IMPACT_OPTIONS = [...NETWORK_IMPACT_OPTIONS, ...INCIDENT_IMPACT_OPTIONS] as const

function toDateTimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

interface FormState {
  title: string
  station_id: string
  ticket_type: (typeof TICKET_TYPES)[number] | ''
  service_type: (typeof SERVICE_TYPES)[number] | ''
  ne_creation_on: (typeof NE_CREATION_OPTIONS)[number] | ''
  impact: (typeof IMPACT_OPTIONS)[number] | ''
  circuit_id: string
  brief_description: string
  raised_by: (typeof RAISED_BY_OPTIONS)[number] | ''
  new_comment: string
  severity: string
  status_id: string
  description: string
  started_at: string
  resolved_at: string
}

const emptyForm = (stationId: string, statusId: string): FormState => ({
  title: '',
  station_id: stationId,
  ticket_type: '',
  service_type: '',
  ne_creation_on: '',
  impact: '',
  circuit_id: '',
  brief_description: '',
  raised_by: '',
  new_comment: '',
  severity: 'low',
  status_id: statusId,
  description: '',
  started_at: '',
  resolved_at: '',
})

type MaintenanceView = 'tickets-create' | 'tickets-details' | 'planned-create' | 'planned-details' | 'schedule'

export default function Maintenance({ view }: { view: MaintenanceView }) {
  const navigate = useNavigate()
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [events, setEvents] = useState<MaintenanceEvent[] | null>(null)
  const [ticketStatusFilter, setTicketStatusFilter] = useState('')
  const [editing, setEditing] = useState<MaintenanceEvent | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm('', ''))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<MaintenanceEvent | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const isCreateView = view.endsWith('-create')
  const maintenanceType = view.startsWith('planned') ? 'planned' : 'tickets'
  const isTicketTypeStep = maintenanceType === 'tickets' && editing === 'new' && !form.ticket_type

  useEffect(() => {
    fetchMaintenance().then(setEvents).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  useEffect(() => {
    if (!isCreateView || !refs) return
    const station = refs.stations[0]?.id ?? ''
    const preferredStatus = maintenanceType === 'tickets' ? 'ongoing' : 'planned'
    const status = maps?.statusesByScope('maintenance').find((s) => s.code === preferredStatus) ?? maps?.statusesByScope('maintenance')[0]
    setForm(emptyForm(station, status?.id ?? ''))
    setEditing('new')
  }, [isCreateView, maintenanceType, refs, maps])

  const severityLabels: Record<string, string> = { low: t.om.low, medium: t.om.medium, high: t.om.high, critical: t.om.critical }
  const title =
    isCreateView
      ? maintenanceType === 'tickets'
        ? t.om.createTicketTitle
        : t.om.createPlannedTitle
      : view === 'planned-details'
        ? t.om.plannedTitle
        : view === 'schedule'
          ? t.om.scheduleTitle
          : t.om.ticketsTitle
  const subtitle =
    view === 'planned-details' ? t.om.plannedSubtitle : view === 'schedule' ? t.om.scheduleSubtitle : t.om.ticketsSubtitle
  const visibleEvents = useMemo(() => {
    const rows = (events ?? []).filter((event) => {
      const statusCode = maps?.statusById.get(event.status_id)?.code
      if (maintenanceType === 'planned') return statusCode === 'planned'
      if (maintenanceType === 'tickets' && view !== 'schedule') return statusCode !== 'planned' && statusCode !== 'resolved'
      return Boolean(event.started_at)
    })
    const filteredRows = ticketStatusFilter
      ? rows.filter((event) => event.status_id === ticketStatusFilter)
      : rows
    if (view === 'schedule') filteredRows.sort((a, b) => (a.started_at ?? '').localeCompare(b.started_at ?? ''))
    return filteredRows
  }, [events, maps, maintenanceType, ticketStatusFilter, view])

  const columns: Column<MaintenanceEvent>[] = useMemo(
    () => maintenanceType === 'tickets'
      ? [
          {
            key: 'ticketNumber',
            header: t.om.ticketNumber,
            sortValue: (m) => m.ticket_number ?? '',
            render: (m) => m.ticket_number ?? '—',
          },
          {
            key: 'started',
            header: t.common.date,
            sortValue: (m) => m.started_at ?? '',
            render: (m) => fmtDateTime(m.started_at, lang),
          },
          {
            key: 'title',
            header: t.common.title,
            sortValue: (m) => m.title,
            render: (m) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{m.title}</p>
                {m.brief_description ? <p className="mt-0.5 max-w-md truncate text-[11px] text-slate-500">{m.brief_description}</p> : null}
              </div>
            ),
          },
        ]
      : [
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
      {
        key: 'started',
        header: t.om.startedAt,
        sortValue: (m) => m.started_at ?? '',
        render: (m) => fmtDate(m.started_at, lang),
      },
      { key: 'resolved', header: t.om.resolvedAt, sortValue: (m) => m.resolved_at ?? '', render: (m) => fmtDate(m.resolved_at, lang) },
    ],
    [t, lang, maps, maintenanceType],
  )

  const openEdit = (target: MaintenanceEvent | 'new') => {
    if (target === 'new') {
      const station = refs?.stations[0]?.id ?? ''
      const preferredStatus = maintenanceType === 'tickets' ? 'ongoing' : 'planned'
      const status = maps?.statusesByScope('maintenance').find((s) => s.code === preferredStatus) ?? maps?.statusesByScope('maintenance')[0]
      setForm(emptyForm(station, status?.id ?? ''))
    } else {
      setForm({
        title: target.title,
        station_id: target.station_id,
        ticket_type: target.ticket_type ?? '',
        service_type: SERVICE_TYPES.find((option) => option === target.service_type) ?? '',
        ne_creation_on: NE_CREATION_OPTIONS.find((option) => option === target.ne_creation_on) ?? '',
        impact: IMPACT_OPTIONS.find((option) => option === target.impact) ?? '',
        circuit_id: target.circuit_id ?? '',
        brief_description: target.brief_description ?? '',
        raised_by: RAISED_BY_OPTIONS.find((option) => option === target.request_person) ?? '',
        new_comment: '',
        severity: target.severity,
        status_id: target.status_id,
        description: target.description ?? '',
        started_at: maintenanceType === 'tickets' ? toDateTimeLocal(target.started_at) : target.started_at ?? '',
        resolved_at: target.resolved_at ?? '',
      })
    }
    setEditing(target)
  }

  const save = async () => {
    if (
      !form.title.trim() ||
      !form.station_id ||
      !form.status_id ||
      (maintenanceType === 'tickets' &&
        (!form.ticket_type ||
          (form.ticket_type === 'service_request' && !form.service_type) ||
          (form.ticket_type === 'network_event' && (!form.severity || !form.raised_by || !form.ne_creation_on || !form.impact)) ||
          (form.ticket_type === 'incident' && !form.impact)))
    ) {
      push(t.request.invalid, 'error')
      return
    }
    const previousComments: MaintenanceComment[] =
      maintenanceType === 'tickets' && editing && editing !== 'new'
        ? editing.update_comments?.length
          ? editing.update_comments
          : editing.update_note?.trim()
            ? [{ text: editing.update_note.trim(), created_at: editing.created_at }]
            : []
        : []
    const newComment = form.new_comment.trim()
    const comments = newComment
      ? [...previousComments, { text: newComment, created_at: new Date().toISOString() }]
      : previousComments
    const payload: MaintenanceInput = {
      title: form.title.trim(),
      station_id: form.station_id,
      ticket_type: maintenanceType === 'tickets' ? form.ticket_type || null : null,
      service_type: maintenanceType === 'tickets' && form.ticket_type === 'service_request' ? form.service_type || null : null,
      ne_creation_on: maintenanceType === 'tickets' && form.ticket_type === 'network_event' ? form.ne_creation_on || null : null,
      impact: maintenanceType === 'tickets' && (form.ticket_type === 'network_event' || form.ticket_type === 'incident') ? form.impact || null : null,
      circuit_id: maintenanceType === 'tickets' && form.ticket_type !== 'network_event' ? form.circuit_id.trim() || null : null,
      brief_description: maintenanceType === 'tickets' && form.ticket_type === 'network_event' ? form.brief_description.trim() || null : null,
      request_person: maintenanceType === 'tickets' ? form.raised_by || null : null,
      update_comments: maintenanceType === 'tickets' ? comments : [],
      update_note: null,
      severity: form.severity,
      status_id: form.status_id,
      description: form.description.trim() || null,
      started_at: form.started_at
        ? maintenanceType === 'tickets'
          ? new Date(form.started_at).toISOString()
          : form.started_at
        : null,
      resolved_at: form.resolved_at || null,
    }
    setSaving(true)
    try {
      const creating = editing === 'new'
      const savedEvent = creating
        ? await createMaintenance(payload)
        : editing
          ? await updateMaintenance(editing.id, payload)
          : null
      push(
        creating && savedEvent?.ticket_number
          ? t.om.ticketCreated(savedEvent.ticket_number)
          : t.om.saved,
      )
      setEditing(null)
      bump()
      if (creating) navigate(`/maintenance/${maintenanceType}/details`)
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

  const closeTicket = async () => {
    if (!editing || editing === 'new') return
    const closedStatus = maps?.statusesByScope('maintenance').find((status) => status.code === 'resolved')
    if (!closedStatus) {
      push(t.om.closeStatusUnavailable, 'error')
      return
    }
    setSaving(true)
    try {
      await updateMaintenance(editing.id, { status_id: closedStatus.id })
      push(t.om.ticketClosed)
      setEditing(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={!isCreateView && view !== 'schedule' ? (
          <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate(`/maintenance/${maintenanceType}/create`)}>
            {maintenanceType === 'tickets' ? t.om.createTicketTitle : t.om.createPlannedTitle}
          </Button>
        ) : null}
      />

      {view === 'tickets-details' ? (
        <div className="mb-4 flex justify-end">
          <div className="w-full sm:max-w-xs">
            <Select
              label={t.circuits.filterStatus}
              placeholder={t.common.all}
              options={(maps?.statusesByScope('maintenance') ?? [])
                .filter((status) => status.code !== 'planned' && status.code !== 'resolved')
                .map((status) => ({ value: status.id, label: pick(status) }))}
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value)}
            />
          </div>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={visibleEvents}
        loading={events === null}
        empty={<EmptyState icon={<Wrench className="h-6 w-6" />} title={t.om.empty} />}
        onRowClick={openEdit}
        getKey={(m) => m.id}
        pageSize={8}
      />

      <Modal
        open={editing !== null}
        onClose={() => {
          setEditing(null)
          if (isCreateView) navigate(`/maintenance/${maintenanceType}/details`)
        }}
        title={editing === 'new'
          ? maintenanceType === 'tickets' ? t.om.createTicketTitle : t.om.createPlannedTitle
          : t.om.editEvent}
        size="md"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            {maintenanceType !== 'tickets' && editing && editing !== 'new' ? (
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
              <Button
                variant="ghost"
                loading={maintenanceType === 'tickets' && editing !== 'new' && saving}
                onClick={() => {
                  if (maintenanceType === 'tickets' && editing && editing !== 'new') {
                    void closeTicket()
                    return
                  }
                  setEditing(null)
                  if (isCreateView) navigate(`/maintenance/${maintenanceType}/details`)
                }}
              >
                {maintenanceType === 'tickets' ? t.common.close : t.common.cancel}
              </Button>
              <Button loading={saving} disabled={isTicketTypeStep} onClick={() => void save()}>
                {maintenanceType === 'tickets' ? t.common.submit : t.common.save}
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {maintenanceType === 'tickets' ? (
            <Select
              label={t.om.ticketType}
              required
              className={isTicketTypeStep ? 'sm:col-span-2' : ''}
              options={TICKET_TYPES.map((type) => ({ value: type, label: t.om.ticketTypes[type] }))}
              placeholder={t.om.ticketTypePlaceholder}
              value={form.ticket_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  ticket_type: TICKET_TYPES.find((type) => type === e.target.value) ?? '',
                  service_type: '',
                  ne_creation_on: '',
                  impact: '',
                  station_id: '',
                  status_id: '',
                  severity: '',
                  raised_by: '',
                })
              }
            />
          ) : null}
          {!isTicketTypeStep ? (
            <>
              <TextInput label={t.common.title} required className="sm:col-span-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {maintenanceType === 'tickets' ? (
                <>
                  {form.ticket_type === 'service_request' ? (
                    <Select
                      label={t.om.serviceType}
                      required
                      placeholder={t.om.selectServiceType}
                      options={SERVICE_TYPES.map((type) => ({ value: type, label: t.om.serviceTypes[type] }))}
                      value={form.service_type}
                      onChange={(e) => setForm({ ...form, service_type: SERVICE_TYPES.find((type) => type === e.target.value) ?? '' })}
                    />
                  ) : form.ticket_type !== 'network_event' ? (
                    <TextInput label={t.om.circuitId} value={form.circuit_id} onChange={(e) => setForm({ ...form, circuit_id: e.target.value })} />
                  ) : null}
                  <TextArea
                    label={t.om.briefDescription}
                    className="sm:col-span-2"
                    rows={2}
                    value={form.brief_description}
                    onChange={(e) => setForm({ ...form, brief_description: e.target.value })}
                  />
                </>
              ) : null}
              <Select
                label={t.om.station}
                required
                placeholder={maintenanceType === 'tickets' ? t.om.selectStation : undefined}
                options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${s.country}` }))}
                value={form.station_id}
                onChange={(e) => setForm({ ...form, station_id: e.target.value })}
              />
              <Select
                label={t.common.status}
                required
                placeholder={maintenanceType === 'tickets' ? t.om.selectStatus : undefined}
                options={(maps?.statusesByScope('maintenance') ?? [])
                  .filter((s) => maintenanceType !== 'tickets' || (s.code !== 'planned' && s.code !== 'resolved'))
                  .map((s) => ({ value: s.id, label: pick(s) }))}
                value={form.status_id}
                onChange={(e) => setForm({ ...form, status_id: e.target.value })}
              />
              <Select
                label={t.om.severity}
                required
                placeholder={maintenanceType === 'tickets' ? t.om.selectSeverity : undefined}
                options={SEVERITIES.map((s) => ({ value: s, label: severityLabels[s] }))}
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              />
              {maintenanceType === 'tickets' && (form.ticket_type === 'network_event' || form.ticket_type === 'incident') ? (
                <>
                  {form.ticket_type === 'network_event' ? (
                    <Select
                      label={t.om.neCreationOn}
                      required
                      placeholder={t.om.selectNECreationOn}
                      options={NE_CREATION_OPTIONS.map((option) => ({ value: option, label: t.om.neCreationOptions[option] }))}
                      value={form.ne_creation_on}
                      onChange={(e) => setForm({ ...form, ne_creation_on: NE_CREATION_OPTIONS.find((option) => option === e.target.value) ?? '' })}
                    />
                  ) : null}
                  <Select
                    label={t.om.impact}
                    required
                    placeholder={t.om.selectImpact}
                    options={(form.ticket_type === 'incident' ? INCIDENT_IMPACT_OPTIONS : NETWORK_IMPACT_OPTIONS).map((option) => ({
                      value: option,
                      label: t.om.impactOptions[option],
                    }))}
                    value={form.impact}
                    onChange={(e) => setForm({ ...form, impact: IMPACT_OPTIONS.find((option) => option === e.target.value) ?? '' })}
                  />
                </>
              ) : null}
              <TextInput
                label={t.om.startedAt}
                type={maintenanceType === 'tickets' ? 'datetime-local' : 'date'}
                value={form.started_at}
                onChange={(e) => setForm({ ...form, started_at: e.target.value })}
              />
              {maintenanceType === 'tickets' ? (
                <Select
                  label={t.om.raisedBy}
                  required
                  options={RAISED_BY_OPTIONS.map((option) => ({ value: option, label: option }))}
                  placeholder={t.om.selectRaisedBy}
                  value={form.raised_by}
                  onChange={(e) => setForm({ ...form, raised_by: RAISED_BY_OPTIONS.find((option) => option === e.target.value) ?? '' })}
                />
              ) : null}
              {maintenanceType === 'planned' ? (
                <>
                  <TextInput label={t.om.resolvedAt} type="date" value={form.resolved_at} onChange={(e) => setForm({ ...form, resolved_at: e.target.value })} />
                  <TextArea label={t.common.description} className="sm:col-span-2" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </>
              ) : null}
              {maintenanceType === 'tickets' && editing && editing !== 'new' ? (
                <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 space-y-3">
                    {(editing.update_comments?.length
                      ? editing.update_comments
                      : editing.update_note?.trim()
                        ? [{ text: editing.update_note.trim(), created_at: editing.created_at }]
                        : []
                    ).map((comment, index) => (
                      <div key={`${comment.created_at}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
                        <p className="mb-2 text-xs font-medium text-slate-400">{fmtDateTime(comment.created_at, lang)}</p>
                        <p className="whitespace-pre-wrap text-sm text-slate-200">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                  <TextArea
                    label={t.om.newComment}
                    rows={3}
                    value={form.new_comment}
                    onChange={(e) => setForm({ ...form, new_comment: e.target.value })}
                  />
                </div>
              ) : null}
            </>
          ) : null}
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

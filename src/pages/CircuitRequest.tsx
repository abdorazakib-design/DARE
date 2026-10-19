import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, History, Inbox, Send, Wrench, XCircle } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createRequest, createWorkOrder, fetchCircuits, fetchRequests, provisionCircuitFromRequest, reserveCircuitRef, updateRequestDetails, updateRequestStatus } from '@/data/api'
import { buildCircuitRefPrefix, formatCircuitRef, isCompletePrefix, nextSequence } from '@/lib/circuitRef'
import { resolveSessionUser } from '@/lib/sessionUser'
import type { AppUser } from '@/lib/types'
import type { Circuit, CircuitRequest } from '@/lib/types'
import { Button, Card, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { Modal, useToast } from '@/components/ui/feedback'
import { ActivationRecap } from '@/components/ActivationRecap'
import { StatusBadge } from '@/components/badges'
import { fmtDate, fmtDateTime, todayISO } from '@/lib/utils'

interface FormState {
  type_id: string
  requested_date: string
  designation: string
  circuit_ref: string
  operator_id: string
  station_a_id: string
  station_b_id: string
  bandwidth_id: string
  interface_type_id: string
  restoration_type_id: string
  quantity: number
  circuit_id: string
  new_provider_id: string
  new_designation: string
  new_interface_id: string
  new_restoration_id: string
}

const initialForm: FormState = {
  type_id: '',
  requested_date: todayISO(),
  designation: '',
  circuit_ref: '',
  operator_id: '',
  station_a_id: '',
  station_b_id: '',
  bandwidth_id: '',
  interface_type_id: '',
  restoration_type_id: '',
  quantity: 1,
  circuit_id: '',
  new_provider_id: '',
  new_designation: '',
  new_interface_id: '',
  new_restoration_id: '',
}

export default function CircuitRequest() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  /** The session user — auto-detected, read-only (never typed). */
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<CircuitRequest | null>(null)
  const [acting, setActing] = useState(false)
  // The request history is hidden by default (kept reachable for approvals).
  const [showHistory, setShowHistory] = useState(false)
  /** End-of-process activation summary (print / email to the requester). */
  const [recap, setRecap] = useState<CircuitRequest | null>(null)

  useEffect(() => {
    fetchRequests().then(setRequests).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchCircuits().then(setCircuits).catch(() => undefined)
    resolveSessionUser().then(setSessionUser).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const type = refs?.requestTypes.find((rt) => rt.id === form.type_id) ?? null
  const code = type?.code ?? ''
  const isActivation = code === 'activation'
  const pickedCircuit = circuits?.find((c) => c.id === form.circuit_id) ?? null
  const statusBy = (c: string) => refs?.statuses.find((s) => s.code === c && s.scope === 'request')

  // Auto-generated circuit ID (activation requests): stable, self-describing
  // prefix derived from the selected operator / route / capacity / interface /
  // restoration — e.g. SOMT/DJI/MOG/10G/100GE/R/001
  const refPrefix = useMemo(() => {
    if (!isActivation || !maps) return ''
    const operator = maps.operatorById.get(form.operator_id)
    const stationA = maps.stationById.get(form.station_a_id)
    const stationB = maps.stationById.get(form.station_b_id)
    const bandwidth = maps.bandwidthById.get(form.bandwidth_id)
    const iface = maps.interfaceById.get(form.interface_type_id)
    const restoration = maps.restorationById.get(form.restoration_type_id)
    if (!operator || !stationA || !stationB || !bandwidth || !iface || !restoration) return ''
    return buildCircuitRefPrefix({
      operatorCode: operator.code,
      stationACode: stationA.code,
      stationBCode: stationB.code,
      bandwidthLabel: bandwidth.label,
      interfaceLabel: iface.label,
      restorationCode: restoration.code,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isActivation,
    maps,
    form.operator_id,
    form.station_a_id,
    form.station_b_id,
    form.bandwidth_id,
    form.interface_type_id,
    form.restoration_type_id,
  ])

  /** Live preview of the ID that will be reserved on submit. */
  const refPreview = useMemo(() => {
    if (!refPrefix) return ''
    return formatCircuitRef(
      refPrefix,
      nextSequence(refPrefix, [
        ...(circuits ?? []).map((c) => c.circuit_ref),
        ...(requests ?? []).map((r) => r.circuit_ref),
      ]),
    )
  }, [refPrefix, circuits, requests])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const onPickCircuit = (id: string) => {
    const c = circuits?.find((x) => x.id === id) ?? null
    setForm((f) => ({ ...f, circuit_id: id, designation: c?.designation ?? f.designation, circuit_ref: c?.circuit_ref ?? f.circuit_ref }))
  }

  const submit = async () => {
    if (!refs || !type) return
    const pending = statusBy('pending')
    if (!pending || !form.requested_date) {
      push(t.request.invalid, 'error')
      return
    }
    if (!sessionUser) {
      push(t.request.noSessionUser, 'error')
      return
    }
    let designation = form.designation.trim()
    let ref = form.circuit_ref.trim()
    let details: Record<string, unknown> = {}
    if (isActivation) {
      if (
        !designation ||
        !isCompletePrefix(refPrefix) ||
        !form.operator_id ||
        !form.station_a_id ||
        !form.station_b_id ||
        form.station_a_id === form.station_b_id ||
        !form.bandwidth_id ||
        !form.interface_type_id ||
        !form.restoration_type_id
      ) {
        push(t.request.invalid, 'error')
        return
      }
      // The circuit ID is never typed by the user: it is reserved atomically
      // on submit (see reserveCircuitRef) so concurrent requests can't clash.
      ref = ''
      details = {
        operator_id: form.operator_id,
        station_a_id: form.station_a_id,
        station_b_id: form.station_b_id,
        bandwidth_id: form.bandwidth_id,
        interface_type_id: form.interface_type_id,
        quantity: form.quantity,
        restoration_type_id: form.restoration_type_id,
      }
    } else {
      if (!pickedCircuit) {
        push(t.request.invalid, 'error')
        return
      }
      designation = pickedCircuit.designation
      ref = pickedCircuit.circuit_ref
      if (code === 'backhaul-change' && form.new_provider_id) details = { provider_id: form.new_provider_id }
      else if (code === 'designation-change' && form.new_designation.trim()) details = { new_designation: form.new_designation.trim() }
      else if (code === 'interface-change' && form.new_interface_id) details = { new_interface_id: form.new_interface_id }
      else if (code === 'restoration-change' && form.new_restoration_id) details = { new_restoration_id: form.new_restoration_id }
      else if (code === 'deactivation') details = {}
      else {
        push(t.request.invalid, 'error')
        return
      }
    }
    setSubmitting(true)
    try {
      if (isActivation) ref = await reserveCircuitRef(refPrefix)
      const created = await createRequest({
        request_type_id: type.id,
        status_id: pending.id,
        circuit_designation: designation,
        circuit_ref: ref,
        details,
        requested_by: sessionUser.full_name,
        requested_date: form.requested_date,
      })
      push(t.request.submitted(pick(type)))
      setForm({ ...initialForm, requested_date: todayISO() })
      // Reveal the history so the new request is visibly listed right away.
      setShowHistory(true)
      // Show the confirmation sheet right away (status: pending approval).
      if (isActivation) setRecap(created)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const setStatus = async (r: CircuitRequest, statusCode: string) => {
    const st = statusBy(statusCode)
    if (!st) return
    setActing(true)
    try {
      await updateRequestStatus(r.id, st.id)
      const updated: CircuitRequest = { ...r, status_id: st.id }
      // Stamp the approval time once — the recap shows it as "Approval Date".
      if (statusCode === 'approved' && typeof r.details?.approved_at !== 'string') {
        updated.details = { ...r.details, approved_at: new Date().toISOString() }
        await updateRequestDetails(r.id, updated.details)
      }
      // Approving (or completing) a "New Circuit Activation" request provisions
      // the real circuit so it appears in the Circuit List.
      const isActivation = maps?.requestTypeById.get(r.request_type_id)?.code === 'activation'
      if (statusCode === 'approved' || statusCode === 'completed') {
        const active = refs?.statuses.find((s) => s.code === 'active' && s.scope === 'circuit')
        if (isActivation && active) {
          const created = await provisionCircuitFromRequest(r, active.id)
          if (created) push(t.request.circuitProvisioned(created.circuit_ref))
        }
      }
      push(t.request.statusUpdated)
      if (selected?.id === r.id) setSelected(updated)
      // End of the activation process → show the recap (print / email) automatically.
      if (isActivation && (statusCode === 'approved' || statusCode === 'completed')) setRecap(updated)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setActing(false)
    }
  }

  const createWO = async (r: CircuitRequest) => {
    if (!refs) return
    const open = refs.statuses.find((s) => s.code === 'open' && s.scope === 'work_order')
    if (!open) return
    setActing(true)
    try {
      const number = `WO-${new Date().getFullYear()}-${String((requests?.length ?? 0) + 1).padStart(3, '0')}`
      await createWorkOrder({ number, request_id: r.id, status_id: open.id, assigned_to: null })
      push(t.request.workOrderCreated(number))
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setActing(false)
    }
  }

  const columns: Column<CircuitRequest>[] = useMemo(
    () => [
      {
        key: 'type',
        header: t.request.requestType,
        sortValue: (r) => maps?.requestTypeById.get(r.request_type_id)?.sort_order ?? 0,
        render: (r) => pick(maps?.requestTypeById.get(r.request_type_id)) || '—',
      },
      {
        key: 'reference',
        header: t.request.reference,
        sortValue: (r) => r.circuit_designation ?? '',
        render: (r) => (
          <span className="text-xs">
            <span className="font-medium text-white">{r.circuit_designation ?? '—'}</span>
            <span className="ml-1.5 font-mono text-slate-400">{r.circuit_ref ?? ''}</span>
          </span>
        ),
      },
      { key: 'by', header: t.request.requestedBy, sortValue: (r) => r.requested_by, render: (r) => r.requested_by },
      { key: 'date', header: t.request.requestedDate, sortValue: (r) => r.requested_date ?? '', render: (r) => fmtDate(r.requested_date, lang) },
      {
        key: 'status',
        header: t.common.status,
        sortValue: (r) => maps?.statusById.get(r.status_id)?.sort_order ?? 0,
        render: (r) => <StatusBadge status={maps?.statusById.get(r.status_id)} />,
      },
      { key: 'created', header: t.request.created, sortValue: (r) => r.created_at, render: (r) => fmtDateTime(r.created_at, lang) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang, maps, pick],
  )

  const detailLabel = (key: string): string => {
    if (key === 'operator_id') return t.request.operator
    if (key === 'station_a_id') return t.request.stationA
    if (key === 'station_b_id') return t.request.stationB
    if (key === 'bandwidth_id') return t.request.bandwidth
    if (key === 'interface_type_id' || key === 'new_interface_id') return t.request.interface
    if (key === 'restoration_type_id' || key === 'new_restoration_id') return t.request.restoration
    if (key === 'provider_id') return t.request.newProvider
    if (key === 'new_designation') return t.request.newDesignation
    if (key === 'quantity') return t.common.quantity
    return key
  }

  const detailValue = (key: string, value: unknown): string => {
    if (typeof value !== 'string') return String(value)
    if (key === 'operator_id') return maps?.operatorById.get(value)?.name ?? value
    if (key === 'station_a_id' || key === 'station_b_id') return maps?.stationById.get(value)?.name ?? value
    if (key === 'bandwidth_id') return pick(maps?.bandwidthById.get(value)) || value
    if (key === 'interface_type_id' || key === 'new_interface_id') return pick(maps?.interfaceById.get(value)) || value
    if (key === 'restoration_type_id' || key === 'new_restoration_id') return pick(maps?.restorationById.get(value)) || value
    if (key === 'provider_id') return maps?.providerById.get(value)?.name ?? value
    return value
  }

  const selectedStatus = selected ? maps?.statusById.get(selected.status_id)?.code : undefined
  const canDecide = selectedStatus === 'pending' || selectedStatus === 'in-review'

  return (
    <div>
      <PageHeader
        title={t.request.title}
        subtitle={t.request.subtitle}
        actions={
          <Button
            variant={showHistory ? 'primary' : 'outline'}
            size="sm"
            icon={<History className="h-4 w-4" />}
            onClick={() => setShowHistory((v) => !v)}
          >
            {t.request.history}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <Card title={t.request.newRequest} className={showHistory ? 'xl:col-span-2' : 'xl:col-span-5'}>
          <div className="space-y-4">
            <Select
              label={t.request.requestType}
              required
              placeholder={t.request.selectType}
              options={(refs?.requestTypes ?? [])
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((rt) => ({ value: rt.id, label: pick(rt) }))}
              value={form.type_id}
              onChange={(e) => set('type_id', e.target.value)}
            />

            {type ? <p className="text-xs leading-relaxed text-slate-500">{lang === 'fr' ? type.desc_fr : type.desc_en}</p> : null}

            {isActivation ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label={t.request.designation} required value={form.designation} onChange={(e) => set('designation', e.target.value)} />
                <div className="sm:col-span-2">
                  <p className="mb-1.5 block text-[13px] font-medium text-slate-300">
                    {t.request.circuitRef} <span className="font-normal text-neon-400">({t.request.autoRef})</span>
                  </p>
                  <div className="field flex select-none items-center justify-between gap-3" aria-readonly="true" title={t.request.autoRefHint}>
                    <span className={`font-mono ${refPreview ? 'text-neon-300' : 'text-slate-500'}`}>
                      {refPreview || t.request.autoRefPending}
                    </span>
                    <span className="text-[11px] text-slate-500">{t.request.autoRefHint}</span>
                  </div>
                </div>
                <Select label={t.request.operator} required placeholder={t.request.selectOperator} options={(refs?.operators ?? []).map((o) => ({ value: o.id, label: o.name }))} value={form.operator_id} onChange={(e) => set('operator_id', e.target.value)} />
                <Select label={t.request.stationA} required placeholder={t.request.selectStation} options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.station_a_id} onChange={(e) => set('station_a_id', e.target.value)} />
                <Select label={t.request.stationB} required placeholder={t.request.selectStation} options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.station_b_id} onChange={(e) => set('station_b_id', e.target.value)} />
                <Select label={t.request.bandwidth} required placeholder={t.request.selectBandwidth} options={(refs?.bandwidths ?? []).map((b) => ({ value: b.id, label: b.label }))} value={form.bandwidth_id} onChange={(e) => set('bandwidth_id', e.target.value)} />
                <Select label={t.request.interface} required placeholder={t.request.selectInterface} options={(refs?.interfaceTypes ?? []).map((i) => ({ value: i.id, label: i.label }))} value={form.interface_type_id} onChange={(e) => set('interface_type_id', e.target.value)} />
                <Select label={t.request.restoration} required placeholder={t.request.selectRestoration} options={(refs?.restorationTypes ?? []).map((r) => ({ value: r.id, label: r.label }))} value={form.restoration_type_id} onChange={(e) => set('restoration_type_id', e.target.value)} />
                <TextInput label={t.common.quantity} required type="number" min={1} value={form.quantity} onChange={(e) => set('quantity', Math.max(1, Number(e.target.value) || 1))} />
              </div>
            ) : type ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label={t.circuits.designation}
                  required
                  className="sm:col-span-2"
                  placeholder={t.request.selectCircuit}
                  options={(circuits ?? []).map((c) => ({ value: c.id, label: `${c.designation} · ${c.circuit_ref}` }))}
                  value={form.circuit_id}
                  onChange={(e) => onPickCircuit(e.target.value)}
                />
                {code === 'backhaul-change' ? (
                  <Select label={t.request.newProvider} required placeholder={t.request.selectProvider} options={(refs?.providers ?? []).map((p) => ({ value: p.id, label: p.name }))} value={form.new_provider_id} onChange={(e) => set('new_provider_id', e.target.value)} />
                ) : null}
                {code === 'designation-change' ? (
                  <TextInput label={t.request.newDesignation} required value={form.new_designation} onChange={(e) => set('new_designation', e.target.value)} />
                ) : null}
                {code === 'interface-change' ? (
                  <Select label={t.request.newInterface} required placeholder={t.request.selectInterface} options={(refs?.interfaceTypes ?? []).map((i) => ({ value: i.id, label: i.label }))} value={form.new_interface_id} onChange={(e) => set('new_interface_id', e.target.value)} />
                ) : null}
                {code === 'restoration-change' ? (
                  <Select label={t.request.newRestoration} required placeholder={t.request.selectRestoration} options={(refs?.restorationTypes ?? []).map((r) => ({ value: r.id, label: r.label }))} value={form.new_restoration_id} onChange={(e) => set('new_restoration_id', e.target.value)} />
                ) : null}
                {pickedCircuit ? (
                  <p className="text-xs text-slate-500 sm:col-span-2">
                    {t.request.reference}: {pickedCircuit.designation} · {maps?.operatorById.get(pickedCircuit.operator_id)?.name}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{t.request.emptyHint}</p>
            )}

            <div className="grid gap-4 border-t border-white/8 pt-4 sm:grid-cols-2">
              {/* The session user is auto-detected and read-only — no typing allowed. */}
              <TextInput
                label={t.request.requestedBy}
                required
                disabled
                readOnly
                title={t.request.noSessionUser}
                value={sessionUser?.full_name ?? t.common.loading}
                onChange={() => undefined}
              />
              <TextInput label={t.request.requestedDate} required type="date" value={form.requested_date} onChange={(e) => set('requested_date', e.target.value)} />
            </div>

            <Button className="w-full" loading={submitting} icon={<Send className="h-4 w-4" />} disabled={!type} onClick={() => void submit()}>
              {submitting ? t.request.submitting : t.request.submit}
            </Button>
          </div>
        </Card>

        {showHistory ? (
          <Card title={t.request.history} className="xl:col-span-3">
            <DataTable
              columns={columns}
              rows={requests ?? []}
              loading={requests === null}
              empty={<EmptyState icon={<Inbox className="h-6 w-6" />} title={t.request.emptyHistory} hint={t.request.emptyHint} />}
              onRowClick={setSelected}
              getKey={(r) => r.id}
              pageSize={6}
            />
          </Card>
        ) : null}
      </div>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? pick(maps?.requestTypeById.get(selected.request_type_id)) : t.request.history}
        size="md"
        footer={
          selected ? (
            <div className="flex flex-wrap justify-end gap-2">
              {maps?.requestTypeById.get(selected.request_type_id)?.code === 'activation' &&
              (selectedStatus === 'approved' || selectedStatus === 'completed') ? (
                <Button variant="outline" size="sm" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => setRecap(selected)}>
                  {t.request.viewRecap}
                </Button>
              ) : null}
              {canDecide ? (
                <>
                  <Button variant="danger" size="sm" loading={acting} icon={<XCircle className="h-3.5 w-3.5" />} onClick={() => void setStatus(selected, 'rejected')}>
                    {t.request.reject}
                  </Button>
                  <Button variant="success" size="sm" loading={acting} icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => void setStatus(selected, 'approved')}>
                    {t.request.approve}
                  </Button>
                </>
              ) : null}
              {selectedStatus === 'approved' ? (
                <>
                  <Button variant="outline" size="sm" loading={acting} icon={<Wrench className="h-3.5 w-3.5" />} onClick={() => void createWO(selected)}>
                    {t.request.createWorkOrder}
                  </Button>
                  <Button variant="primary" size="sm" loading={acting} onClick={() => void setStatus(selected, 'completed')}>
                    {t.request.complete}
                  </Button>
                </>
              ) : null}
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.common.status}</dt>
                <dd className="mt-1"><StatusBadge status={maps?.statusById.get(selected.status_id)} /></dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.request.reference}</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {selected.circuit_designation ?? '—'} <span className="font-mono text-xs text-slate-400">{selected.circuit_ref ?? ''}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.request.requestedBy}</dt>
                <dd className="mt-1 text-sm text-slate-200">{selected.requested_by}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.request.requestedDate}</dt>
                <dd className="mt-1 text-sm text-slate-200">{fmtDate(selected.requested_date, lang)}</dd>
              </div>
            </dl>

            {Object.keys(selected.details).length > 0 ? (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <p className="mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.common.details}</p>
                <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {Object.entries(selected.details).map(([key, value]) => (
                    <div key={key} className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-slate-500">{detailLabel(key)}</dt>
                      <dd className="text-right text-xs font-medium text-slate-200">{detailValue(key, value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ActivationRecap request={recap} onClose={() => setRecap(null)} />
    </div>
  )


}

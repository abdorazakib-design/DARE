import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Inbox, Mail, Printer, Send, Wrench, XCircle } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createCircuit, createRequest, createWorkOrder, fetchCircuits, fetchRequests, fetchWorkOrders, updateRequestStatus } from '@/data/api'
import type { Circuit, CircuitInput, CircuitRequest } from '@/lib/types'
import { Button, Card, EmptyState, PageHeader, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { fmtDate, fmtDateTime, nextWorkOrderNumber, todayISO } from '@/lib/utils'

interface FormState {
  type_id: string
  requested_by: string
  requested_date: string
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

interface ActivationConfirmation {
  designation: string
  circuitRef: string
  requestingParty: string
  stationA: string
  stationB: string
  bandwidth: string
  capacity: number
  interfaceType: string
  restoration: string
  requestedBy: string
  requestedDate: string
  workOrder: string | null
  approved: boolean
}

const initialForm: FormState = {
  type_id: '',
  requested_by: '',
  requested_date: todayISO(),
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

const designationCode = (code: string) =>
  code.trim().toUpperCase() === 'DJIBOUTI TELECOM' ? 'DJB' : code.trim().slice(0, 3).toUpperCase()

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)

export default function CircuitRequest() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<CircuitRequest | null>(null)
  const [acting, setActing] = useState(false)
  const [activationConfirmation, setActivationConfirmation] = useState<ActivationConfirmation | null>(null)

  useEffect(() => {
    fetchRequests().then(setRequests).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchCircuits().then(setCircuits).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const type = refs?.requestTypes.find((rt) => rt.id === form.type_id) ?? null
  const code = type?.code ?? ''
  const isActivation = code === 'activation'
  const pickedCircuit = circuits?.find((c) => c.id === form.circuit_id) ?? null
  const statusBy = (c: string) => refs?.statuses.find((s) => s.code === c && s.scope === 'request')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  const onPickCircuit = (id: string) => {
    set('circuit_id', id)
  }

  const submit = async () => {
    if (!refs || !type) return
    const pending = statusBy('pending')
    if (!pending || !form.requested_by.trim() || !form.requested_date) {
      push(t.request.invalid, 'error')
      return
    }
    let designation: string | null = null
    let ref: string | null = form.circuit_ref.trim() || null
    let details: Record<string, unknown> = {}
    if (isActivation) {
      if (
        !ref ||
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
      let activationFields: Omit<ActivationConfirmation, 'workOrder' | 'approved'> | null = null
      if (isActivation) {
        const operator = refs.operators.find((row) => row.id === form.operator_id)
        const operatorCode = refs.operators.find((row) => row.id === form.operator_id)?.code
        const stationA = refs.stations.find((row) => row.id === form.station_a_id)
        const stationB = refs.stations.find((row) => row.id === form.station_b_id)
        const bandwidth = refs.bandwidths.find((row) => row.id === form.bandwidth_id)
        const interfaceType = refs.interfaceTypes.find((row) => row.id === form.interface_type_id)
        const restoration = refs.restorationTypes.find((row) => row.id === form.restoration_type_id)
        if (!operator || !operatorCode || !stationA || !stationB || !bandwidth || !interfaceType || !restoration) {
          throw new Error(t.request.invalid)
        }

        const existingRequests = await fetchRequests()
        const activationTypeIds = new Set(refs.requestTypes.filter((row) => row.code === 'activation').map((row) => row.id))
        const latestSequence = existingRequests.reduce((latest, request) => {
          if (!activationTypeIds.has(request.request_type_id)) return latest
          const match = request.circuit_designation?.match(/\/(\d{4,5})$/)
          return match ? Math.max(latest, Number(match[1])) : latest
        }, 0)
        if (latestSequence >= 9999) throw new Error(t.request.invalid)

        designation = [
          designationCode(operatorCode),
          designationCode(stationA.code),
          designationCode(stationB.code),
          bandwidth.label,
          interfaceType.label,
          String(latestSequence + 1).padStart(4, '0'),
        ].join('/')
        activationFields = {
          designation,
          circuitRef: ref ?? '',
          requestingParty: operator.name,
          stationA: stationA.name,
          stationB: stationB.name,
          bandwidth: bandwidth.label,
          capacity: form.quantity,
          interfaceType: interfaceType.label,
          restoration: restoration.label,
          requestedBy: form.requested_by.trim(),
          requestedDate: form.requested_date,
        }
      }

      await createRequest({
        request_type_id: type.id,
        status_id: pending.id,
        circuit_designation: designation,
        circuit_ref: ref,
        details,
        requested_by: form.requested_by.trim(),
        requested_date: form.requested_date,
      })
      if (isActivation && activationFields) {
        setActivationConfirmation({ ...activationFields, workOrder: null, approved: false })
      } else {
        push(t.request.submitted(pick(type)))
      }
      setForm({ ...initialForm, requested_date: todayISO(), requested_by: form.requested_by })
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const createWO = async (r: CircuitRequest) => {
    if (!refs) return
    const open = refs.statuses.find((s) => s.code === 'open' && s.scope === 'work_order')
    if (!open) return
    setActing(true)
    try {
      const orders = await fetchWorkOrders()
      const existing = orders.find((order) => order.request_id === r.id)
      if (existing) {
        push(t.request.workOrderAlreadyExists(existing.number))
        return
      }
      const number = nextWorkOrderNumber(orders.map((order) => order.number))
      if (!number) throw new Error(t.request.invalid)
      await createWorkOrder({ number, request_id: r.id, status_id: open.id, assigned_to: null })
      push(t.request.workOrderCreated(number))
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setActing(false)
    }
  }

  const ensureActivationWorkOrder = async (r: CircuitRequest): Promise<string> => {
    if (!refs) throw new Error(t.common.error)
    const orders = await fetchWorkOrders()
    const existing = orders.find((order) => order.request_id === r.id)
    if (existing) return existing.number

    const open = refs.statuses.find((status) => status.code === 'open' && status.scope === 'work_order')
    const number = nextWorkOrderNumber(orders.map((order) => order.number))
    if (!open || !number) throw new Error(t.request.invalid)
    await createWorkOrder({ number, request_id: r.id, status_id: open.id, assigned_to: null })
    return number
  }

  const activationConfirmationFor = (
    r: CircuitRequest,
    workOrder: string | null,
    approved: boolean,
  ): ActivationConfirmation => {
    if (!refs) throw new Error(t.common.error)
    const details = r.details
    const operator = typeof details.operator_id === 'string' ? maps?.operatorById.get(details.operator_id) : undefined
    const stationA = typeof details.station_a_id === 'string' ? maps?.stationById.get(details.station_a_id) : undefined
    const stationB = typeof details.station_b_id === 'string' ? maps?.stationById.get(details.station_b_id) : undefined
    const bandwidth = typeof details.bandwidth_id === 'string' ? maps?.bandwidthById.get(details.bandwidth_id) : undefined
    const interfaceType = typeof details.interface_type_id === 'string' ? maps?.interfaceById.get(details.interface_type_id) : undefined
    const restoration = typeof details.restoration_type_id === 'string' ? maps?.restorationById.get(details.restoration_type_id) : undefined
    const quantity = details.quantity
    if (!operator || !stationA || !stationB || !bandwidth || !interfaceType || !restoration || typeof quantity !== 'number') {
      throw new Error(t.request.invalid)
    }
    return {
      designation: r.circuit_designation ?? r.circuit_ref ?? '',
      circuitRef: r.circuit_ref ?? '',
      requestingParty: operator.name,
      stationA: stationA.name,
      stationB: stationB.name,
      bandwidth: bandwidth.label,
      capacity: quantity,
      interfaceType: interfaceType.label,
      restoration: restoration.label,
      requestedBy: r.requested_by,
      requestedDate: r.requested_date ?? r.created_at,
      workOrder,
      approved,
    }
  }

  const createActivationCircuit = async (r: CircuitRequest) => {
    if (!refs) throw new Error(t.common.error)

    const circuitRef = r.circuit_ref?.trim()
    const details = r.details
    const operatorId = details.operator_id
    const stationAId = details.station_a_id
    const stationBId = details.station_b_id
    const bandwidthId = details.bandwidth_id
    const interfaceTypeId = details.interface_type_id
    const restorationTypeId = details.restoration_type_id
    const quantity = details.quantity
    const active = refs.statuses.find((s) => s.code === 'active' && s.scope === 'circuit')

    if (
      !circuitRef ||
      typeof operatorId !== 'string' ||
      typeof stationAId !== 'string' ||
      typeof stationBId !== 'string' ||
      stationAId === stationBId ||
      typeof bandwidthId !== 'string' ||
      typeof interfaceTypeId !== 'string' ||
      typeof restorationTypeId !== 'string' ||
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !active
    ) {
      throw new Error(t.request.invalid)
    }

    const input: CircuitInput = {
      designation: r.circuit_designation?.trim() || circuitRef,
      circuit_ref: circuitRef,
      operator_id: operatorId,
      station_a_id: stationAId,
      station_b_id: stationBId,
      bandwidth_id: bandwidthId,
      interface_type_id: interfaceTypeId,
      quantity,
      restoration_type_id: restorationTypeId,
      status_id: active.id,
      requested_by: r.requested_by,
      activated_at: todayISO(),
    }

    const existing = (await fetchCircuits()).find((c) => c.circuit_ref === circuitRef)
    if (existing) {
      const isSameCircuit =
        existing.designation === input.designation &&
        existing.operator_id === input.operator_id &&
        existing.station_a_id === input.station_a_id &&
        existing.station_b_id === input.station_b_id &&
        existing.bandwidth_id === input.bandwidth_id &&
        existing.interface_type_id === input.interface_type_id &&
        existing.restoration_type_id === input.restoration_type_id &&
        existing.quantity === input.quantity &&
        existing.requested_by === input.requested_by
      if (isSameCircuit) return
      throw new Error(t.request.invalid)
    }

    await createCircuit(input)
  }

  const setStatus = async (r: CircuitRequest, statusCode: string) => {
    const st = statusBy(statusCode)
    if (!st) return
    setActing(true)
    try {
      const isActivationRequest = maps?.requestTypeById.get(r.request_type_id)?.code === 'activation'
      let activationWorkOrder: string | null = null
      if (statusCode === 'approved' && isActivationRequest) {
        activationWorkOrder = await ensureActivationWorkOrder(r)
      }
      if (statusCode === 'completed' && maps?.requestTypeById.get(r.request_type_id)?.code === 'activation') {
        await createActivationCircuit(r)
      }
      await updateRequestStatus(r.id, st.id)
      if (statusCode === 'approved' && isActivationRequest && activationWorkOrder) {
        setActivationConfirmation(activationConfirmationFor(r, activationWorkOrder, true))
        setSelected(null)
      } else {
        push(t.request.statusUpdated)
        if (selected?.id === r.id) setSelected({ ...r, status_id: st.id })
      }
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
  const confirmationRows = activationConfirmation
    ? [
        [t.request.circuitRef, activationConfirmation.circuitRef],
        [t.request.operator, activationConfirmation.requestingParty],
        [t.request.stationA, activationConfirmation.stationA],
        [t.request.stationB, activationConfirmation.stationB],
        [t.request.bandwidth, activationConfirmation.bandwidth],
        [t.request.capacity, String(activationConfirmation.capacity)],
        [t.request.interface, activationConfirmation.interfaceType],
        [t.request.restoration, activationConfirmation.restoration],
        [t.request.requestedBy, activationConfirmation.requestedBy],
        [t.request.requestedDate, fmtDate(activationConfirmation.requestedDate, lang)],
        ...(activationConfirmation.workOrder ? [[t.request.workOrder, activationConfirmation.workOrder]] : []),
        [t.common.status, activationConfirmation.approved ? t.request.activationApproved : t.request.activationRequestPending],
      ]
    : []

  const sendActivationEmail = () => {
    if (!activationConfirmation) return
    const subject = t.request.activationConfirmationTitle(activationConfirmation.designation)
    const body = [
      t.request.activationConfirmationMessage(activationConfirmation.designation, activationConfirmation.workOrder),
      '',
      ...confirmationRows.map(([label, value]) => `${label}: ${value}`),
    ].join('\n')
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const printActivationConfirmation = () => {
    if (!activationConfirmation) return
    const printWindow = window.open('', '_blank', 'width=800,height=700')
    if (!printWindow) {
      push(t.request.printPopupBlocked, 'error')
      return
    }
    const rows = confirmationRows
      .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
      .join('')
    printWindow.document.write(
      `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${escapeHtml(t.request.activationConfirmationTitle(activationConfirmation.designation))}</title><style>body{font:16px Arial,sans-serif;color:#111;margin:40px}h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-top:24px}th,td{border:1px solid #bbb;padding:10px;text-align:left}th{width:35%;background:#f2f2f2}</style></head><body><h1>${escapeHtml(t.request.activationConfirmationTitle(activationConfirmation.designation))}</h1><p>${escapeHtml(t.request.activationConfirmationMessage(activationConfirmation.designation, activationConfirmation.workOrder))}</p><table>${rows}</table></body></html>`,
    )
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  return (
    <div>
      <PageHeader title={t.request.title} subtitle={t.request.subtitle} />

      <div className="grid gap-4 xl:grid-cols-5">
        <Card title={t.request.newRequest} className="xl:col-span-2">
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
                <TextInput label={t.request.circuitRef} required placeholder={t.request.circuitIdPlaceholder} className="font-mono" value={form.circuit_ref} onChange={(e) => set('circuit_ref', e.target.value)} />
                <Select label={t.request.operator} required placeholder={t.request.chooseParty} options={(refs?.operators ?? []).map((o) => ({ value: o.id, label: o.name }))} value={form.operator_id} onChange={(e) => set('operator_id', e.target.value)} />
                <Select label={t.request.stationA} required placeholder={t.request.chooseLandingStation} options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.station_a_id} onChange={(e) => set('station_a_id', e.target.value)} />
                <Select label={t.request.stationB} required placeholder={t.request.chooseLandingStation} options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: s.name }))} value={form.station_b_id} onChange={(e) => set('station_b_id', e.target.value)} />
                <Select label={t.request.bandwidth} required placeholder={t.request.chooseBandwidth} options={(refs?.bandwidths ?? []).map((b) => ({ value: b.id, label: b.label }))} value={form.bandwidth_id} onChange={(e) => set('bandwidth_id', e.target.value)} />
                <Select label={t.request.interface} required placeholder={t.request.chooseInterface} options={(refs?.interfaceTypes ?? []).map((i) => ({ value: i.id, label: i.label }))} value={form.interface_type_id} onChange={(e) => set('interface_type_id', e.target.value)} />
                <Select label={t.request.restoration} required placeholder={t.request.chooseRestoration} options={(refs?.restorationTypes ?? []).map((r) => ({ value: r.id, label: r.label }))} value={form.restoration_type_id} onChange={(e) => set('restoration_type_id', e.target.value)} />
                <TextInput label={t.common.quantity} required type="number" min={1} value={form.quantity} onChange={(e) => set('quantity', Math.max(1, Number(e.target.value) || 1))} />
              </div>
            ) : type ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label={t.circuits.designation}
                  required
                  className="sm:col-span-2"
                  placeholder={t.request.selectType}
                  options={(circuits ?? []).map((c) => ({ value: c.id, label: `${c.designation} · ${c.circuit_ref}` }))}
                  value={form.circuit_id}
                  onChange={(e) => onPickCircuit(e.target.value)}
                />
                {code === 'backhaul-change' ? (
                  <Select label={t.request.newProvider} required options={(refs?.providers ?? []).map((p) => ({ value: p.id, label: p.name }))} value={form.new_provider_id} onChange={(e) => set('new_provider_id', e.target.value)} />
                ) : null}
                {code === 'designation-change' ? (
                  <TextInput label={t.request.newDesignation} required value={form.new_designation} onChange={(e) => set('new_designation', e.target.value)} />
                ) : null}
                {code === 'interface-change' ? (
                  <Select label={t.request.newInterface} required options={(refs?.interfaceTypes ?? []).map((i) => ({ value: i.id, label: i.label }))} value={form.new_interface_id} onChange={(e) => set('new_interface_id', e.target.value)} />
                ) : null}
                {code === 'restoration-change' ? (
                  <Select label={t.request.newRestoration} required options={(refs?.restorationTypes ?? []).map((r) => ({ value: r.id, label: r.label }))} value={form.new_restoration_id} onChange={(e) => set('new_restoration_id', e.target.value)} />
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
              <TextInput label={t.request.requestedBy} required value={form.requested_by} onChange={(e) => set('requested_by', e.target.value)} />
              <TextInput label={t.request.requestedDate} required type="date" value={form.requested_date} onChange={(e) => set('requested_date', e.target.value)} />
            </div>

            <Button className="w-full" loading={submitting} icon={<Send className="h-4 w-4" />} disabled={!type} onClick={() => void submit()}>
              {submitting ? t.request.submitting : t.request.submit}
            </Button>
          </div>
        </Card>

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
      </div>

      <Modal
        open={activationConfirmation !== null}
        onClose={() => setActivationConfirmation(null)}
        title={activationConfirmation ? t.request.activationConfirmationTitle(activationConfirmation.designation) : t.request.history}
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={printActivationConfirmation}>
              {t.request.print}
            </Button>
            <Button variant="outline" size="sm" icon={<Mail className="h-3.5 w-3.5" />} onClick={sendActivationEmail}>
              {t.request.sendEmail}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setActivationConfirmation(null)}>
              {t.common.close}
            </Button>
          </div>
        }
      >
        {activationConfirmation ? (
          <div>
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm leading-relaxed text-slate-200">
                {t.request.activationConfirmationMessage(activationConfirmation.designation, activationConfirmation.workOrder)}
              </p>
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {confirmationRows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
                  <dd className="mt-1 break-words text-sm text-slate-100">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? pick(maps?.requestTypeById.get(selected.request_type_id)) : t.request.history}
        size="md"
        footer={
          selected ? (
            <div className="flex flex-wrap justify-end gap-2">
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
                  {maps?.requestTypeById.get(selected.request_type_id)?.code !== 'activation' ? (
                    <Button variant="outline" size="sm" loading={acting} icon={<Wrench className="h-3.5 w-3.5" />} onClick={() => void createWO(selected)}>
                      {t.request.createWorkOrder}
                    </Button>
                  ) : null}
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
    </div>
  )


}

import { useEffect, useMemo, useState } from 'react'
import { Inbox, RotateCcw } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import {
  applyCapacityDelta,
  createWorkOrderForRequest,
  fetchCapacity,
  fetchRequests,
  provisionCircuitFromRequest,
  remainingCapacity,
  updateRequestDetails,
  updateRequestStatus,
} from '@/data/api'
import { resolveSessionUser } from '@/lib/sessionUser'
import type { AppUser, CapacityEntitlement, CircuitRequest, WorkOrder } from '@/lib/types'
import { Button, Card, EmptyState, PageHeader, Select } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { Modal, useToast } from '@/components/ui/feedback'
import { WorkOrderDoc } from '@/components/WorkOrderDoc'
import { fmtDate, fmtNumber } from '@/lib/utils'

/**
 * "Rejected requests" page: activation requests auto-rejected for insufficient
 * capacity. Clicking one opens a modal to revise the requested bandwidth on
 * that line — allowed only while capacity remains (even if reduced). Resuming
 * re-runs the automatic flow (approve → provision → counters → work order).
 */
export default function ModifyCircuit() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)
  const [capacity, setCapacity] = useState<CapacityEntitlement[]>([])
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null)
  const [selected, setSelected] = useState<CircuitRequest | null>(null)
  const [newBandwidthId, setNewBandwidthId] = useState('')
  const [acting, setActing] = useState(false)
  /** Work order document shown after a successful resume. */
  const [woDoc, setWoDoc] = useState<{ wo: WorkOrder; request: CircuitRequest } | null>(null)

  useEffect(() => {
    fetchRequests().then(setRequests).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchCapacity().then(setCapacity).catch(() => setCapacity([]))
    resolveSessionUser().then(setSessionUser).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const rejectedStatus = refs?.statuses.find((s) => s.code === 'rejected' && s.scope === 'request')

  const rejected = useMemo(
    () => (requests ?? []).filter((r) => r.status_id === rejectedStatus?.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requests, rejectedStatus],
  )

  const detailsOf = (r: CircuitRequest): Record<string, unknown> => (r.details ?? {}) as Record<string, unknown>
  const strOf = (r: CircuitRequest, k: string): string => {
    const v = detailsOf(r)[k]
    return typeof v === 'string' ? v : ''
  }

  /** Line info for the selected request (operator / route / bandwidth). */
  const selOperator = selected ? maps?.operatorById.get(strOf(selected, 'operator_id')) : undefined
  const selStationA = selected ? maps?.stationById.get(strOf(selected, 'station_a_id')) : undefined
  const selStationB = selected ? maps?.stationById.get(strOf(selected, 'station_b_id')) : undefined
  const selBandwidth = selected ? maps?.bandwidthById.get(strOf(selected, 'bandwidth_id')) : undefined
  const selRemaining =
    selected && selOperator && selStationA && selStationB
      ? remainingCapacity(capacity, selOperator.id, selStationA.id, selStationB.id)
      : null

  /** No capacity at all → modification is impossible (10G & 100G quota empty). */
  const lineExhausted = selRemaining !== null && selRemaining <= 0
  /** Bandwidth options that still fit the remaining capacity (reduction allowed). */
  const bandwidthOptions = useMemo(() => {
    if (!refs) return []
    return (refs.bandwidths ?? [])
      .filter((b) => selRemaining === null || b.value_gbps <= selRemaining)
      .sort((a, b) => a.value_gbps - b.value_gbps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, selRemaining])

  const openRequest = (r: CircuitRequest) => {
    setSelected(r)
    setNewBandwidthId(strOf(r, 'bandwidth_id'))
  }

  const resume = async () => {
    if (!selected || !refs || !sessionUser) return
    const approved = refs.statuses.find((s) => s.code === 'approved' && s.scope === 'request')
    const openWo = refs.statuses.find((s) => s.code === 'open' && s.scope === 'work_order')
    const active = refs.statuses.find((s) => s.code === 'active' && s.scope === 'circuit')
    if (!approved || !openWo || !active) return
    const newBw = refs.bandwidths.find((b) => b.id === newBandwidthId)
    if (!newBw) {
      push(t.request.invalid, 'error')
      return
    }
    const qty = typeof detailsOf(selected).quantity === 'number' ? (detailsOf(selected).quantity as number) : 1
    const needed = newBw.value_gbps * qty
    if (selRemaining !== null && needed > selRemaining) {
      push(t.request.capacityExceeded(needed, selRemaining), 'error')
      return
    }
    setActing(true)
    try {
      // 1. Revise the requested bandwidth + clear the rejection reason.
      const d: Record<string, unknown> = { ...detailsOf(selected), bandwidth_id: newBw.id }
      delete d.rejection_reason
      delete d.rejection_needed_gbps
      delete d.rejection_remaining_gbps
      // 2. Approve (stamps date/author) + move counters + provision + WO.
      const details = { ...d, approved_at: new Date().toISOString(), approved_by: sessionUser.full_name }
      await updateRequestDetails(selected.id, details)
      await updateRequestStatus(selected.id, approved.id)
      const updated: CircuitRequest = { ...selected, details, status_id: approved.id }
      await provisionCircuitFromRequest(updated, active.id).catch(() => null)
      await applyCapacityDelta(strOf(selected, 'operator_id'), strOf(selected, 'station_a_id'), strOf(selected, 'station_b_id'), needed).catch(() => null)
      const wo = await createWorkOrderForRequest(updated, openWo.id)
      push(t.modify.resumed)
      setSelected(null)
      setWoDoc({ wo, request: updated })
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
        key: 'ref',
        header: t.circuits.ref,
        sortValue: (r) => r.circuit_ref ?? '',
        render: (r) => <span className="font-mono text-xs text-neon-300">{r.circuit_ref ?? '—'}</span>,
      },
      {
        key: 'designation',
        header: t.circuits.designation,
        sortValue: (r) => r.circuit_designation ?? '',
        render: (r) => <span className="text-xs font-medium text-white">{r.circuit_designation ?? '—'}</span>,
      },
      {
        key: 'operator',
        header: t.circuits.operator,
        sortValue: (r) => maps?.operatorById.get(strOf(r, 'operator_id'))?.name ?? '',
        render: (r) => <span className="text-xs">{maps?.operatorById.get(strOf(r, 'operator_id'))?.name ?? '—'}</span>,
      },
      {
        key: 'route',
        header: t.modify.route,
        sortValue: (r) => `${maps?.stationById.get(strOf(r, 'station_a_id'))?.name}→${maps?.stationById.get(strOf(r, 'station_b_id'))?.name}`,
        render: (r) => (
          <span className="text-xs">
            {maps?.stationById.get(strOf(r, 'station_a_id'))?.name ?? '—'}{' '}
            <span className="text-slate-600">→</span> {maps?.stationById.get(strOf(r, 'station_b_id'))?.name ?? '—'}
          </span>
        ),
      },
      {
        key: 'bandwidth',
        header: t.modify.requestedBandwidth,
        sortValue: (r) => maps?.bandwidthById.get(strOf(r, 'bandwidth_id'))?.value_gbps ?? 0,
        render: (r) => (
          <span className="text-xs text-amber-400">
            {pick(maps?.bandwidthById.get(strOf(r, 'bandwidth_id'))) || '—'}
          </span>
        ),
      },
      {
        key: 'reason',
        header: t.request.reject,
        sortValue: () => '',
        render: () => <span className="text-[11px] text-rose-400">{t.modify.rejectionCapacity}</span>,
      },
      {
        key: 'created',
        header: t.modify.submittedOn,
        sortValue: (r) => r.created_at,
        render: (r) => fmtDate(r.created_at, lang),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, lang, maps, pick],
  )


  return (
    <div>
      <PageHeader title={t.modify.title} subtitle={t.modify.subtitle} />

      <Card className="mb-4">
        <p className="text-xs leading-relaxed text-slate-400">{t.modify.intro}</p>
      </Card>

      <DataTable
        columns={columns}
        rows={rejected}
        loading={requests === null}
        empty={<EmptyState icon={<Inbox className="h-6 w-6" />} title={t.modify.empty} hint={t.modify.emptyHint} />}
        onRowClick={openRequest}
        getKey={(r) => r.id}
        initialSortKey="created"
      />

      {/* Revision modal: adjust the requested capacity on the line. */}
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          <span className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-neon-300" />
            {t.modify.resume}
          </span>
        }
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSelected(null)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              loading={acting}
              disabled={lineExhausted}
              onClick={() => void resume()}
            >
              {t.modify.revise}
            </Button>
          </div>
        }
      >
        {selected ? (
          <div className="space-y-4">
            {/* Request summary */}
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.circuits.ref}</dt>
                <dd className="mt-1 font-mono text-sm text-neon-300">{selected.circuit_ref ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.circuits.designation}</dt>
                <dd className="mt-1 text-sm text-slate-200">{selected.circuit_designation ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.circuits.operator}</dt>
                <dd className="mt-1 text-sm text-slate-200">{selOperator?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.modify.route}</dt>
                <dd className="mt-1 text-sm text-slate-200">
                  {selStationA?.name ?? '—'} → {selStationB?.name ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.modify.requestedBandwidth}</dt>
                <dd className="mt-1 text-sm font-semibold text-amber-400">
                  {pick(selBandwidth) || '—'}
                  {typeof detailsOf(selected).quantity === 'number' && (detailsOf(selected).quantity as number) > 1
                    ? ` ×${detailsOf(selected).quantity as number}`
                    : ''}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.modify.remainingOnLine}</dt>
                <dd className={`mt-1 text-sm font-semibold ${lineExhausted ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selRemaining !== null ? `${fmtNumber(selRemaining, lang)} Gbps` : '—'}
                </dd>
              </div>
            </dl>

            {/* Exhuasted line → modification impossible */}
            {lineExhausted ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs leading-relaxed text-rose-300">
                {t.modify.noCapacity(selOperator?.name ?? '—', selStationA?.name ?? '—', selStationB?.name ?? '—')}
              </div>
            ) : (
              <Select
                label={t.modify.selectBandwidth}
                placeholder={t.request.selectBandwidth}
                options={bandwidthOptions.map((b) => ({
                  value: b.id,
                  label: `${pick(b)} — ${fmtNumber(b.value_gbps, lang)} Gbps`,
                }))}
                value={newBandwidthId}
                onChange={(e) => setNewBandwidthId(e.target.value)}
              />
            )}

            {bandwidthOptions.length === 0 && !lineExhausted ? (
              <p className="text-xs text-amber-400">{t.request.capacityExceeded(0, selRemaining ?? 0)}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Work order document after a successful resume */}
      <WorkOrderDoc
        workOrder={woDoc?.wo ?? null}
        request={woDoc?.request ?? null}
        approvedBy={sessionUser?.full_name ?? '—'}
        onClose={() => setWoDoc(null)}
      />
    </div>
  )
}


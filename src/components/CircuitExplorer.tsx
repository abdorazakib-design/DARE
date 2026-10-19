import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Search, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createRequest, fetchCircuits } from '@/data/api'
import type { Circuit } from '@/lib/types'
import { Button, EmptyState, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { fmtDate, fmtNumber, todayISO, cn } from '@/lib/utils'

/** How the search matches circuits: by their logical ID or by designation. */
type SearchMode = 'designation' | 'ref'

/** Circuit explorer for the /circuits search page. */
export function CircuitExplorer() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('designation')
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Circuit | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    fetchCircuits().then(setCircuits).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  /**
   * Nothing is displayed until the user types a query (matched on the chosen
   * mode only: circuit ID or designation) or presses "Show all".
   */
  const filtered = useMemo(() => {
    if (!circuits) return []
    const q = query.trim().toLowerCase()
    if (!q) return showAll ? circuits : []
    return circuits.filter((c) => (mode === 'ref' ? c.circuit_ref : c.designation).toLowerCase().includes(q))
  }, [circuits, query, mode, showAll])

  const totalGbps = useMemo(
    () => filtered.reduce((s, c) => s + (maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0),
    [filtered, maps],
  )

  const columns: Column<Circuit>[] = useMemo(
    () => [
      { key: 'designation', header: t.circuits.designation, sortValue: (c) => c.designation, render: (c) => <span className="font-medium text-white">{c.designation}</span> },
      { key: 'ref', header: t.circuits.ref, sortValue: (c) => c.circuit_ref, render: (c) => <span className="font-mono text-xs text-slate-400">{c.circuit_ref}</span> },
      { key: 'operator', header: t.circuits.operator, sortValue: (c) => maps?.operatorById.get(c.operator_id)?.name ?? '', render: (c) => maps?.operatorById.get(c.operator_id)?.name ?? '—' },
      {
        key: 'route',
        header: `${t.circuits.stationA} → ${t.circuits.stationB}`,
        sortValue: (c) => `${maps?.stationById.get(c.station_a_id)?.name ?? ''}→${maps?.stationById.get(c.station_b_id)?.name ?? ''}`,
        render: (c) => (
          <span className="text-xs">
            {maps?.stationById.get(c.station_a_id)?.name ?? '—'} <span className="text-slate-600">→</span> {maps?.stationById.get(c.station_b_id)?.name ?? '—'}
          </span>
        ),
      },
      { key: 'bandwidth', header: t.circuits.bandwidth, sortValue: (c) => maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0, render: (c) => pick(maps?.bandwidthById.get(c.bandwidth_id)) || '—' },
      { key: 'interface', header: t.circuits.interface, sortValue: (c) => maps?.interfaceById.get(c.interface_type_id)?.sort_order ?? 0, render: (c) => pick(maps?.interfaceById.get(c.interface_type_id)) || '—' },
      { key: 'quantity', header: t.circuits.quantity, sortValue: (c) => c.quantity, render: (c) => `×${c.quantity}` },
      { key: 'status', header: t.circuits.status, sortValue: (c) => maps?.statusById.get(c.status_id)?.sort_order ?? 0, render: (c) => <StatusBadge status={maps?.statusById.get(c.status_id)} /> },
      { key: 'activatedAt', header: t.circuits.activatedAt, sortValue: (c) => c.activated_at ?? '', render: (c) => fmtDate(c.activated_at, lang) },
    ],
    [t, maps, lang, pick],
  )

  const requestDeactivation = async () => {
    if (!selected || !refs) return
    const type = refs.requestTypes.find((rt) => rt.code === 'deactivation')
    const pending = refs.statuses.find((s) => s.code === 'pending' && s.scope === 'request')
    if (!type || !pending) return
    setDeactivating(true)
    try {
      await createRequest({
        request_type_id: type.id,
        status_id: pending.id,
        circuit_designation: selected.designation,
        circuit_ref: selected.circuit_ref,
        details: {},
        requested_by: 'DARE NOC',
        requested_date: todayISO(),
      })
      push(t.request.submitted(pick(type)))
      setSelected(null)
      bump()
    } catch (e) {
      push(e instanceof Error ? e.message : t.common.error, 'error')
    } finally {
      setDeactivating(false)
    }
  }

  const searching = query.trim().length > 0
  const empty = (
    <EmptyState
      icon={<Search className="h-6 w-6" />}
      title={searching ? t.circuits.emptySearch : t.circuits.searchPromptTitle}
      hint={searching ? undefined : t.circuits.searchPromptHint}
    />
  )

  const modeButton = (m: SearchMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={cn(
        'cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
        mode === m ? 'bg-neon-400/15 text-neon-300' : 'text-slate-400 hover:text-slate-200',
      )}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="glass mb-4 flex flex-wrap items-end gap-3 p-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-slate-300">{t.circuits.searchMode}</p>
          <div className="flex rounded-xl border border-white/10 p-1">
            {modeButton('designation', t.circuits.searchByDesignation)}
            {modeButton('ref', t.circuits.searchById)}
          </div>
        </div>
        <div className="min-w-56 flex-1">
          <TextInput
            placeholder={
              mode === 'ref'
                ? `${t.circuits.searchPlaceholder} — ${t.circuits.searchById}`
                : `${t.circuits.searchPlaceholder} — ${t.circuits.searchByDesignation}`
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button
          variant={showAll ? 'primary' : 'outline'}
          icon={showAll ? <X className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? t.circuits.hideAll : t.circuits.showAll}
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={circuits === null}
        empty={empty}
        onRowClick={setSelected}
        getKey={(c) => c.id}
        initialSortKey="designation"
      />

      {filtered.length > 0 ? (
        <p className="mt-3 text-right text-xs text-slate-500">
          {t.common.results(filtered.length)} · {t.circuits.capacityLabel}:{' '}
          <span className="font-medium text-neon-300">
            {fmtNumber(totalGbps, lang)} {t.dashboard.gbps}
          </span>
        </p>
      ) : null}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={t.circuits.circuitDetail}
        size="md"
        footer={
          selected ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Link to={`/modify?circuit=${selected.id}`} onClick={() => setSelected(null)}>
                <Button variant="outline" size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
                  {t.circuits.modify}
                </Button>
              </Link>
              <Button variant="danger" size="sm" loading={deactivating} onClick={() => void requestDeactivation()}>
                {t.circuits.deactivate}
              </Button>
            </div>
          ) : null
        }
      >
        {selected && maps ? (
          <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
            <DetailRow label={t.circuits.designation} value={selected.designation} />
            <DetailRow label={t.circuits.ref} value={<span className="font-mono text-xs">{selected.circuit_ref}</span>} />
            <DetailRow label={t.circuits.operator} value={maps.operatorById.get(selected.operator_id)?.name ?? '—'} />
            <DetailRow label={t.circuits.status} value={<StatusBadge status={maps.statusById.get(selected.status_id)} />} />
            <DetailRow label={t.circuits.stationA} value={maps.stationById.get(selected.station_a_id)?.name ?? '—'} />
            <DetailRow label={t.circuits.stationB} value={maps.stationById.get(selected.station_b_id)?.name ?? '—'} />
            <DetailRow label={t.circuits.bandwidth} value={pick(maps.bandwidthById.get(selected.bandwidth_id)) || '—'} />
            <DetailRow label={t.circuits.interface} value={pick(maps.interfaceById.get(selected.interface_type_id)) || '—'} />
            <DetailRow label={t.circuits.quantity} value={`×${selected.quantity}`} />
            <DetailRow label={t.circuits.restoration} value={pick(maps.restorationById.get(selected.restoration_type_id)) || '—'} />
            <DetailRow
              label={t.circuits.capacityLabel}
              value={`${fmtNumber((maps.bandwidthById.get(selected.bandwidth_id)?.value_gbps ?? 0) * selected.quantity, lang)} ${t.dashboard.gbps}`}
            />
            <DetailRow label={t.circuits.activatedAt} value={fmtDate(selected.activated_at, lang)} />
            <DetailRow label={t.circuits.requestedBy} value={selected.requested_by ?? '—'} />
          </dl>
        ) : null}
      </Modal>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-200">{value}</dd>
    </div>
  )
}
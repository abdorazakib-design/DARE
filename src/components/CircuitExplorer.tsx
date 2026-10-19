import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Cable, Pencil, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { createRequest, fetchCircuits } from '@/data/api'
import type { Circuit } from '@/lib/types'
import { Button, EmptyState, Select, TextInput } from '@/components/ui/primitives'
import { DataTable, type Column } from '@/components/ui/table'
import { Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { fmtDate, fmtNumber, todayISO } from '@/lib/utils'

/** Shared circuit explorer — powers /circuits (all circuits) and /active (active only). */
export function CircuitExplorer({ onlyActive = false }: { onlyActive?: boolean }) {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version, bump } = useData()
  const { push } = useToast()
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [searchField, setSearchField] = useState('')
  const [appliedSearchField, setAppliedSearchField] = useState('')
  const [fOperator, setFOperator] = useState('')
  const [fStation, setFStation] = useState('')
  const [fBandwidth, setFBandwidth] = useState('')
  const [fInterface, setFInterface] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [selected, setSelected] = useState<Circuit | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    fetchCircuits().then(setCircuits).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const filtered = useMemo(() => {
    if (!circuits || !maps) return []
    const q = appliedQuery.trim().toLowerCase()
    return circuits.filter((c) => {
      if (onlyActive && maps.statusById.get(c.status_id)?.code !== 'active') return false
      if (fOperator && c.operator_id !== fOperator) return false
      if (fBandwidth && c.bandwidth_id !== fBandwidth) return false
      if (fInterface && c.interface_type_id !== fInterface) return false
      if (fStatus && c.status_id !== fStatus) return false
      if (fStation && c.station_a_id !== fStation && c.station_b_id !== fStation) return false
      if (q) {
        const hay =
          appliedSearchField === 'id'
            ? c.circuit_ref.toLowerCase()
            : appliedSearchField === 'designation'
              ? c.designation.toLowerCase()
              : `${c.designation} ${c.circuit_ref}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [circuits, maps, appliedQuery, appliedSearchField, fOperator, fStation, fBandwidth, fInterface, fStatus, onlyActive])

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

  const empty = <EmptyState icon={<Cable className="h-6 w-6" />} title={onlyActive ? t.circuits.emptyActive : t.circuits.emptySearch} />

  return (
    <>
      <div className="glass mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-7">
        <form
          className="flex min-w-0 gap-2 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault()
            setAppliedQuery(query)
            setAppliedSearchField(searchField)
          }}
        >
          <Select
            wrapClassName="min-w-0 flex-1"
            placeholder={t.circuits.filterCircuit}
            options={[
              { value: 'id', label: t.circuits.ref },
              { value: 'designation', label: t.circuits.designation },
            ]}
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          />
          <TextInput
            className="min-w-0"
            wrapClassName="min-w-0 flex-1"
            placeholder={t.circuits.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit" className="shrink-0" icon={<Search className="h-4 w-4" />}>
            {t.circuits.searchButton}
          </Button>
        </form>
        <Select
          placeholder={t.circuits.filterOperator}
          options={(refs?.operators ?? []).map((o) => ({ value: o.id, label: o.name }))}
          value={fOperator}
          onChange={(e) => setFOperator(e.target.value)}
        />
        <Select
          placeholder={t.circuits.filterStation}
          options={(refs?.stations ?? []).map((s) => ({ value: s.id, label: `${s.name} · ${s.country}` }))}
          value={fStation}
          onChange={(e) => setFStation(e.target.value)}
        />
        <Select
          placeholder={t.circuits.filterBandwidth}
          options={(refs?.bandwidths ?? []).map((b) => ({ value: b.id, label: b.label }))}
          value={fBandwidth}
          onChange={(e) => setFBandwidth(e.target.value)}
        />
        <Select
          placeholder={t.circuits.filterInterface}
          options={(refs?.interfaceTypes ?? []).map((i) => ({ value: i.id, label: i.label }))}
          value={fInterface}
          onChange={(e) => setFInterface(e.target.value)}
        />
        <Select
          placeholder={t.circuits.filterStatus}
          options={(maps?.statusesByScope('circuit') ?? []).map((s) => ({ value: s.id, label: pick(s) }))}
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
        />
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

      <p className="mt-3 text-right text-xs text-slate-500">
        {t.common.results(filtered.length)} · {t.circuits.capacityLabel}:{' '}
        <span className="font-medium text-neon-300">
          {fmtNumber(totalGbps, lang)} {t.dashboard.gbps}
        </span>
      </p>

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
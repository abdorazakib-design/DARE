import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCircuits } from '@/data/api'
import type { Circuit } from '@/lib/types'
import { Card, PageHeader, Skeleton } from '@/components/ui/primitives'
import { Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { cn, fmtDate, fmtNumber } from '@/lib/utils'

type ViewMode = 'circuits' | 'capacity'

interface Cell {
  a: string
  b: string
  iface: string
}

export default function MuxPlan() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version } = useData()
  const { push } = useToast()
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [view, setView] = useState<ViewMode>('circuits')
  const [cell, setCell] = useState<Cell | null>(null)

  useEffect(() => {
    fetchCircuits().then(setCircuits).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const active = useMemo(
    () => (circuits ?? []).filter((c) => maps?.statusById.get(c.status_id)?.code === 'active'),
    [circuits, maps],
  )

  const pairs = useMemo(() => {
    const stations = refs?.stations ?? []
    const list: { a: string; b: string; label: string }[] = []
    for (let i = 0; i < stations.length; i++)
      for (let j = i + 1; j < stations.length; j++)
        list.push({ a: stations[i].id, b: stations[j].id, label: `${stations[i].name} ↔ ${stations[j].name}` })
    return list
  }, [refs])

  const cellCircuits = (a: string, b: string, iface: string) =>
    active.filter(
      (c) =>
        c.interface_type_id === iface &&
        ((c.station_a_id === a && c.station_b_id === b) || (c.station_a_id === b && c.station_b_id === a)),
    )

  const cellValue = (a: string, b: string, iface: string): number => {
    const cs = cellCircuits(a, b, iface)
    if (view === 'circuits') return cs.length
    return cs.reduce((s, c) => s + (maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0)
  }

  const maxValue = useMemo(() => {
    let max = 0
    for (const p of pairs)
      for (const i of refs?.interfaceTypes ?? []) {
        const v = cellValue(p.a, p.b, i.id)
        if (v > max) max = v
      }
    return max
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairs, refs, active, view, maps])

  const stationSummary = useMemo(
    () =>
      (refs?.stations ?? []).map((s) => {
        const cs = active.filter((c) => c.station_a_id === s.id || c.station_b_id === s.id)
        const gbps = cs.reduce((sum, c) => sum + (maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0)
        return { station: s, count: cs.length, gbps }
      }),
    [refs, active, maps],
  )

  const loading = circuits === null || !refs || !maps

  return (
    <div>
      <PageHeader
        title={t.mux.title}
        subtitle={t.mux.subtitle}
        actions={
          <div className="glass flex rounded-xl p-1">
            {(['circuits', 'capacity'] as ViewMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setView(m)}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  view === m ? 'bg-gradient-to-r from-neon-500 to-plasma-500 text-white' : 'text-slate-400 hover:text-white',
                )}
              >
                {m === 'circuits' ? t.mux.viewCircuits : t.mux.viewCapacity}
              </button>
            ))}
          </div>
        }
      />

      <Card className="mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-slate-400 uppercase">
                  {t.mux.pair}
                </th>
                {(refs?.interfaceTypes ?? []).map((i) => (
                  <th key={i.id} className="px-3 py-3 text-center text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap text-slate-400 uppercase">
                    {i.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pairs.map((p) => (
                <tr key={`${p.a}-${p.b}`} className="border-b border-white/[0.04] last:border-b-0">
                  <td className="px-4 py-3 text-xs font-medium whitespace-nowrap text-slate-200">{p.label}</td>
                  {(refs?.interfaceTypes ?? []).map((i) => {
                    const value = cellValue(p.a, p.b, i.id)
                    const intensity = maxValue > 0 ? value / maxValue : 0
                    return (
                      <td key={i.id} className="px-1.5 py-2 text-center">
                        <button
                          disabled={value === 0}
                          onClick={() => setCell({ a: p.a, b: p.b, iface: i.id })}
                          className={cn(
                            'w-full rounded-lg py-2 text-xs font-semibold tabular-nums transition-all',
                            value === 0
                              ? 'cursor-default text-slate-700'
                              : 'cursor-pointer text-white hover:scale-[1.05] hover:shadow-[0_0_16px_rgb(34_211_238/0.25)]',
                          )}
                          style={value > 0 ? { backgroundColor: `rgba(34, 211, 238, ${0.08 + intensity * 0.5})` } : undefined}
                        >
                          {view === 'capacity' ? fmtNumber(value, lang) : value || '·'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={t.mux.stationSummary}>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: refs?.stations.length ?? 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stationSummary.map(({ station, count, gbps }) => (
              <div key={station.id} className="glass rounded-xl p-4">
                <p className="text-sm font-semibold text-white">{station.name}</p>
                <p className="text-[11px] text-slate-500">{station.country}</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-xs text-slate-400">{t.mux.connectedCircuits(count)}</span>
                  <span className="font-display text-lg font-bold text-neon-300">{fmtNumber(gbps, lang)}</span>
                </div>
                <p className="mt-0.5 text-right text-[10px] tracking-wide text-slate-600 uppercase">{t.mux.capacityGbps}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={cell !== null} onClose={() => setCell(null)} title={t.mux.cellDetail} size="lg">
        {cell && maps ? (
          <>
            <p className="mb-3 text-sm text-slate-300">
              <span className="font-medium text-white">
                {maps.stationById.get(cell.a)?.name} ↔ {maps.stationById.get(cell.b)?.name}
              </span>
              <span className="ml-2 rounded-full border border-neon-400/30 bg-neon-400/10 px-2 py-0.5 text-[11px] text-neon-300">
                {pick(maps.interfaceById.get(cell.iface))}
              </span>
            </p>
            <ul className="space-y-1.5">
              {cellCircuits(cell.a, cell.b, cell.iface).map((c) => (
                <CellCircuit key={c.id} c={c} />
              ))}
            </ul>
          </>
        ) : null}
      </Modal>
    </div>
  )
}

function CellCircuit({ c }: { c: Circuit }) {
  const { lang, pick } = useI18n()
  const { maps } = useData()
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">
          {c.designation}
          <span className="ml-2 font-mono text-xs font-normal text-slate-400">{c.circuit_ref}</span>
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {maps?.operatorById.get(c.operator_id)?.name ?? '—'} · {pick(maps?.bandwidthById.get(c.bandwidth_id))} ×{c.quantity} ·{' '}
          {fmtDate(c.activated_at, lang)}
        </p>
      </div>
      <StatusBadge status={maps?.statusById.get(c.status_id)} />
    </li>
  )
}

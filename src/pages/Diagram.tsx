import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCircuits } from '@/data/api'
import type { Circuit, LandingStation } from '@/lib/types'
import { Card, PageHeader, Skeleton } from '@/components/ui/primitives'
import { Modal, useToast } from '@/components/ui/feedback'
import { StatusBadge } from '@/components/badges'
import { fmtNumber } from '@/lib/utils'

interface Segment {
  key: string
  a: LandingStation
  b: LandingStation
  circuits: Circuit[]
  activeCount: number
  gbps: number
}

export default function Diagram() {
  const { t, lang, pick } = useI18n()
  const { refs, maps, version } = useData()
  const { push } = useToast()
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [seg, setSeg] = useState<Segment | null>(null)
  const [station, setStation] = useState<LandingStation | null>(null)

  useEffect(() => {
    fetchCircuits().then(setCircuits).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const segments = useMemo<Segment[]>(() => {
    const stations = refs?.stations ?? []
    const list: Segment[] = []
    for (let i = 0; i < stations.length; i++) {
      for (let j = i + 1; j < stations.length; j++) {
        const a = stations[i]
        const b = stations[j]
        const cs = (circuits ?? []).filter(
          (c) =>
            (c.station_a_id === a.id && c.station_b_id === b.id) ||
            (c.station_a_id === b.id && c.station_b_id === a.id),
        )
        if (cs.length === 0) continue
        const active = cs.filter((c) => maps?.statusById.get(c.status_id)?.code === 'active')
        const gbps = active.reduce((s, c) => s + (maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0)
        list.push({ key: `${a.id}-${b.id}`, a, b, circuits: cs, activeCount: active.length, gbps })
      }
    }
    return list
  }, [refs, circuits, maps])

  const stationStats = (s: LandingStation) => {
    const cs = (circuits ?? []).filter((c) => c.station_a_id === s.id || c.station_b_id === s.id)
    const active = cs.filter((c) => maps?.statusById.get(c.status_id)?.code === 'active')
    const gbps = active.reduce((sum, c) => sum + (maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0)
    return { count: cs.length, active: active.length, gbps }
  }

  const loading = circuits === null || !refs || !maps

  return (
    <div>
      <PageHeader title={t.diagram.title} subtitle={`${t.diagram.subtitle} — ${t.diagram.clickHint}`} />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="glass flex items-center justify-between px-4 py-3">
          <span className="text-[11px] tracking-wide text-slate-400 uppercase">{t.diagram.stations}</span>
          <span className="font-display text-lg font-bold text-neon-300">{refs?.stations.length ?? '—'}</span>
        </div>
        <div className="glass flex items-center justify-between px-4 py-3">
          <span className="text-[11px] tracking-wide text-slate-400 uppercase">{t.diagram.segments}</span>
          <span className="font-display text-lg font-bold text-plasma-300">{segments.length}</span>
        </div>
      </div>

      <Card>
        {loading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : (
          <svg viewBox="0 0 800 420" className="w-full" role="img" aria-label={t.diagram.title}>
            <defs>
              <linearGradient id="seg-active" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {segments.map((s) => {
              const isActive = s.activeCount > 0
              return (
                <g key={s.key} className="cursor-pointer" onClick={() => setSeg(s)}>
                  <line
                    x1={s.a.x}
                    y1={s.a.y}
                    x2={s.b.x}
                    y2={s.b.y}
                    stroke={isActive ? 'url(#seg-active)' : '#334155'}
                    strokeWidth={isActive ? 3 : 1.5}
                    strokeOpacity={isActive ? 0.9 : 0.6}
                    className={isActive ? 'dataflow-line' : undefined}
                  />
                  <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke="transparent" strokeWidth={18} />
                </g>
              )
            })}

            {(refs?.stations ?? []).map((s) => (
              <g key={s.id} className="cursor-pointer" onClick={() => setStation(s)}>
                <circle cx={s.x} cy={s.y} r={15} fill="rgba(4, 7, 15, 0.92)" stroke="#22d3ee" strokeWidth={2} />
                <circle cx={s.x} cy={s.y} r={5} fill="#22d3ee" />
                <text x={s.x} y={s.y + 32} textAnchor="middle" className="fill-slate-200 text-[11px] font-semibold">
                  {s.name}
                </text>
                <text x={s.x} y={s.y + 45} textAnchor="middle" className="fill-slate-500 text-[9px]">
                  {s.country}
                </text>
              </g>
            ))}
          </svg>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-white/8 pt-3">
          <span className="text-[11px] tracking-wide text-slate-500 uppercase">{t.diagram.legend}</span>
          <span className="inline-flex items-center gap-2 text-xs text-slate-300">
            <span className="h-0.5 w-6 rounded-full bg-gradient-to-r from-neon-400 to-plasma-400" /> {t.diagram.activeSegment}
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-slate-300">
            <span className="h-0.5 w-6 rounded-full bg-slate-600" /> {t.diagram.idleSegment}
          </span>
        </div>
      </Card>

      <Modal open={station !== null} onClose={() => setStation(null)} title={t.diagram.stationDetail} size="sm">
        {station ? (
          <dl className="space-y-3">
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{t.diagram.stations}</dt>
              <dd className="mt-1 text-base font-semibold text-white">{station.name}</dd>
              <dd className="text-xs text-slate-500">{station.country}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-xs text-slate-400">{t.diagram.totalCircuits(stationStats(station).count)}</dt>
              <dd className="font-display text-lg font-bold text-neon-300">{fmtNumber(stationStats(station).gbps, lang)}</dd>
            </div>
            <div className="border-t border-white/8 pt-2 text-xs text-slate-500">
              {t.diagram.capacityGbps}: <span className="font-medium text-neon-300">{fmtNumber(stationStats(station).gbps, lang)} {t.dashboard.gbps}</span>
              <span className="ml-2 text-slate-600">· {t.circuits.activeTitle}: {stationStats(station).active}</span>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal open={seg !== null} onClose={() => setSeg(null)} title={t.diagram.segmentDetail} size="lg">
        {seg ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">
                {seg.a.name} ↔ {seg.b.name}
              </p>
              <p className="text-xs text-slate-500">
                {t.diagram.totalCircuits(seg.circuits.length)} · {t.diagram.capacityGbps}:{' '}
                <span className="font-medium text-neon-300">{fmtNumber(seg.gbps, lang)} {t.dashboard.gbps}</span>
              </p>
            </div>
            <ul className="space-y-1.5">
              {seg.circuits.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {c.designation}
                      <span className="ml-2 font-mono text-xs font-normal text-slate-400">{c.circuit_ref}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {maps?.operatorById.get(c.operator_id)?.name ?? '—'} · {pick(maps?.bandwidthById.get(c.bandwidth_id))} ×{c.quantity} ·{' '}
                      {pick(maps?.interfaceById.get(c.interface_type_id))}
                    </p>
                  </div>
                  <StatusBadge status={maps?.statusById.get(c.status_id)} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Modal>
    </div>
  )
}

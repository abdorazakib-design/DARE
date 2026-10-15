import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Inbox,
  Send,
  Zap,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchCircuits, fetchRequests } from '@/data/api'
import type { Circuit, CircuitRequest } from '@/lib/types'
import { Card, PageHeader, Skeleton } from '@/components/ui/primitives'
import { StatusBadge } from '@/components/badges'
import { fmtDate, fmtNumber, monthKey, monthLabel } from '@/lib/utils'
import { useToast } from '@/components/ui/feedback'

const PALETTE = ['#22d3ee', '#a855f7', '#34d399', '#f59e0b', '#f472b6', '#38bdf8']

const axisProps = {
  tick: { fill: '#64748b', fontSize: 11 },
} as const

const tooltipProps = {
  contentStyle: {
    backgroundColor: 'rgba(11, 18, 34, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    color: '#f1f5f9',
    fontSize: 12,
  },
  cursor: { stroke: 'rgba(34, 211, 238, 0.25)' },
} as const

function CountUp({ value, lang }: { value: number; lang: 'en' | 'fr' }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const duration = 750
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span>{fmtNumber(display, lang)}</span>
}

export default function Dashboard() {
  const { t, lang } = useI18n()
  const { refs, maps, version } = useData()
  const { push } = useToast()
  const [circuits, setCircuits] = useState<Circuit[] | null>(null)
  const [requests, setRequests] = useState<CircuitRequest[] | null>(null)

  useEffect(() => {
    fetchCircuits().then(setCircuits).catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    fetchRequests().then(setRequests).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const stats = useMemo(() => {
    if (!circuits || !requests || !maps) return null
    const active = circuits.filter((c) => maps.statusById.get(c.status_id)?.code === 'active')
    const capacity = active.reduce((sum, c) => sum + (maps.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0)
    const pending = requests.filter((r) => ['pending', 'in-review'].includes(maps.statusById.get(r.status_id)?.code ?? ''))
    return { active, capacity, pending, totalRequests: requests.length }
  }, [circuits, requests, maps])

  const trend = useMemo(() => {
    if (!requests) return []
    const now = new Date()
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    return months.map((m) => ({
      label: monthLabel(m, lang),
      count: requests.filter((r) => monthKey(r.created_at) === m).length,
    }))
  }, [requests, lang])

  const byOperator = useMemo(() => {
    if (!refs || !stats) return []
    return refs.operators.map((op) => ({
      name: op.name,
      value: stats.active
        .filter((c) => c.operator_id === op.id)
        .reduce((sum, c) => sum + (maps?.bandwidthById.get(c.bandwidth_id)?.value_gbps ?? 0) * c.quantity, 0),
    }))
  }, [refs, stats, maps])

  const interfaceMix = useMemo(() => {
    if (!refs || !stats) return []
    return refs.interfaceTypes
      .map((it) => ({
        name: it.label,
        value: stats.active.filter((c) => c.interface_type_id === it.id).length,
      }))
      .filter((d) => d.value > 0)
  }, [refs, stats])

  const recent = useMemo(() => {
    if (!requests) return []
    return [...requests]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
  }, [requests])

  const loading = !stats

  const kpiCards = [
    { icon: Activity, label: t.dashboard.activeCircuits, value: loading ? null : stats.active.length, accent: '#22d3ee' },
    { icon: Inbox, label: t.dashboard.pendingRequests, value: loading ? null : stats.pending.length, accent: '#a855f7' },
    { icon: Zap, label: t.dashboard.capacityInUse, value: loading ? null : stats.capacity, accent: '#f59e0b' },
    { icon: Send, label: t.dashboard.totalRequests, value: loading ? null : stats.totalRequests, accent: '#34d399' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t.nav.dashboard} subtitle={t.dashboard.subtitle} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className="glass glass-hover animate-fade-up relative overflow-hidden p-5"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div
                className="absolute top-0 right-0 h-16 w-16 rounded-full blur-2xl"
                style={{ backgroundColor: `${kpi.accent}1a` }}
              />
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{ backgroundColor: `${kpi.accent}14`, borderColor: `${kpi.accent}30` }}
              >
                <Icon className="h-5 w-5" style={{ color: kpi.accent }} />
              </div>
              <p className="font-display text-2xl font-bold text-white">
                {loading || kpi.value === null ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <CountUp value={kpi.value} lang={lang} />
                    {kpi.label === t.dashboard.capacityInUse ? (
                      <span className="ml-1.5 text-sm font-medium text-slate-400">{t.dashboard.gbps}</span>
                    ) : null}
                  </>
                )}
              </p>
              <p className="mt-1 text-xs tracking-wide text-slate-400">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Trend + interface mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={t.dashboard.requestsTrend}
          className="animate-fade-up lg:col-span-2"
          right={<span className="text-[11px] text-slate-500">{t.dashboard.gbps}</span>}
        >
          <div className="h-56">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={axisProps.tick} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisProps.tick} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipProps} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name={t.dashboard.requestsTrend}
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    fill="url(#trendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card title={t.dashboard.interfaceMix} className="animate-fade-up" style={{ animationDelay: '70ms' }}>
          <div className="flex h-56 flex-col">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : interfaceMix.length === 0 ? (
              <p className="flex flex-1 items-center justify-center text-xs text-slate-500">{t.dashboard.noData}</p>
            ) : (
              <>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={interfaceMix} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">
                        {interfaceMix.map((entry, i) => (
                          <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1">
                  {interfaceMix.map((entry, i) => (
                    <span key={entry.name} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                      />
                      {entry.name} · {entry.value}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Operator capacity + recent requests */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t.dashboard.capacityByOperator} className="animate-fade-up">
          <div className="h-52">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byOperator} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisProps.tick, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={axisProps.tick} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipProps} />
                  <Bar dataKey="value" name={t.dashboard.gbps} radius={[6, 6, 0, 0]} maxBarSize={42}>
                    {byOperator.map((entry, i) => (
                      <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card
          title={t.dashboard.recentRequests}
          className="animate-fade-up lg:col-span-2"
          right={
            <Link
              to="/request"
              className="inline-flex items-center gap-1 text-xs font-medium text-neon-300 transition-colors hover:text-neon-400"
            >
              {t.dashboard.viewAll}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">{t.dashboard.noData}</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((r) => {
                const type = maps?.requestTypeById.get(r.request_type_id)
                const status = maps?.statusById.get(r.status_id)
                return (
                  <li key={r.id}>
                    <Link
                      to="/request"
                      className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5 transition-all hover:border-neon-400/20 hover:bg-neon-400/[0.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {r.circuit_designation ?? t.request.circuitRef}
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            {type ? (lang === 'fr' ? type.label_fr : type.label_en) : t.common.unknown}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {r.requested_by} · {fmtDate(r.requested_date, lang)}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

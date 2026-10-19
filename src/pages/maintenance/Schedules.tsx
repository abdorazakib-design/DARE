import { useEffect, useMemo, useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { fetchMaintenance } from '@/data/api'
import type { MaintenanceEvent } from '@/lib/types'
import { Card, EmptyState, PageHeader } from '@/components/ui/primitives'
import { useToast } from '@/components/ui/feedback'
import { SeverityBadge, StatusBadge } from '@/components/badges'
import { fmtDate } from '@/lib/utils'

/**
 * Schedules: a chronological agenda of every dated maintenance event —
 * planned windows and trouble tickets — grouped by month, so operators can
 * see at a glance what is scheduled and what is being worked on.
 */
export default function Schedules() {
  const { t, lang } = useI18n()
  const { maps, version } = useData()
  const { push } = useToast()
  const [events, setEvents] = useState<MaintenanceEvent[] | null>(null)

  useEffect(() => {
    fetchMaintenance()
      .then(setEvents)
      .catch((e: unknown) => push(e instanceof Error ? e.message : t.common.error, 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  /** Events with a start date, sorted ascending, grouped by YYYY-MM. */
  const months = useMemo(() => {
    const dated = (events ?? [])
      .filter((e) => e.started_at)
      .sort((a, b) => (a.started_at ?? '').localeCompare(b.started_at ?? ''))
    const groups = new Map<string, MaintenanceEvent[]>()
    for (const e of dated) {
      const key = (e.started_at ?? '').slice(0, 7)
      const list = groups.get(key) ?? []
      list.push(e)
      groups.set(key, list)
    }
    return [...groups.entries()]
  }, [events])

  const monthLabel = (key: string): string => {
    const d = new Date(`${key}-01T00:00:00`)
    if (Number.isNaN(d.getTime())) return key
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      month: 'long',
      year: 'numeric',
    }).format(d)
  }

  return (
    <div>
      <PageHeader title={t.sch.title} subtitle={t.sch.subtitle} />

      {months.length === 0 ? (
        <EmptyState icon={<CalendarRange className="h-6 w-6" />} title={t.sch.empty} hint={t.sch.emptyHint} />
      ) : (
        <div className="space-y-6">
          {months.map(([key, list]) => (
            <Card key={key}>
              <h3 className="mb-3 font-display text-sm font-semibold text-neon-300 capitalize">
                {monthLabel(key)}
                <span className="ml-2 text-xs font-normal text-slate-500">{t.common.results(list.length)}</span>
              </h3>
              <ul className="divide-y divide-white/5">
                {list.map((e) => {
                  const isTrouble = (e.kind ?? 'planned') === 'trouble'
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <span className="w-24 shrink-0 font-mono text-xs text-slate-400">{fmtDate(e.started_at, lang)}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          isTrouble ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'
                        }`}
                      >
                        {isTrouble ? t.tt.kindLabel : t.pm.kindLabel}
                      </span>
                      {isTrouble && e.ticket_number ? (
                        <span className="font-mono text-xs text-neon-300">{e.ticket_number}</span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{e.title}</span>
                      <SeverityBadge severity={e.severity} />
                      <StatusBadge status={maps?.statusById.get(e.status_id)} />
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

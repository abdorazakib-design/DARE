import { useData } from '@/data/DataProvider'
import { useI18n } from '@/i18n'

interface ConnectionPillProps {
  onOpenSetup: () => void
}

export function ConnectionPill({ onOpenSetup }: ConnectionPillProps) {
  const { mode, error } = useData()
  const { t } = useI18n()

  if (mode === 'live') {
    return (
      <span
        className="animate-pulse-glow hidden items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 md:inline-flex"
        title={t.connection.live}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {t.connection.live}
      </span>
    )
  }

  return (
    <button
      onClick={onOpenSetup}
      title={error ?? t.connection.demoBanner}
      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-400 transition-all hover:border-amber-400/50 hover:bg-amber-400/20"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      {t.connection.demo}
    </button>
  )
}

import { useI18n } from '@/i18n'
import type { StatusRow } from '@/lib/types'
import { Badge } from '@/components/ui/primitives'

export function StatusBadge({ status, label }: { status?: StatusRow; label?: string }) {
  const { lang } = useI18n()
  if (!status) return <span className="text-slate-500">—</span>
  const text =
    label ??
    (lang === 'fr'
      ? status.label_fr || status.label_en
      : status.label_en || status.label_fr)
  return <Badge color={status.color}>{text}</Badge>
}

const severityColors: Record<string, string> = {
  low: '#34d399',
  medium: '#f59e0b',
  high: '#fb923c',
  critical: '#f87171',
}

export function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useI18n()
  const labels: Record<string, string> = {
    low: t.om.low,
    medium: t.om.medium,
    high: t.om.high,
    critical: t.om.critical,
  }
  return <Badge color={severityColors[severity] ?? '#64748b'}>{labels[severity] ?? severity}</Badge>
}

const roleColors: Record<string, string> = {
  admin: '#a855f7',
  engineer: '#22d3ee',
  viewer: '#94a3b8',
}

export function RoleBadge({ role }: { role: string }) {
  const { t } = useI18n()
  return <Badge color={roleColors[role] ?? '#64748b'}>{t.users.roles[role] ?? role}</Badge>
}

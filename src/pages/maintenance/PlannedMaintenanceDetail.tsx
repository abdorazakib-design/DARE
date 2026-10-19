import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/ui/primitives'
import { MaintenanceList } from '@/components/maintenance/MaintenanceList'

/** Planned maintenance list + detail modal (edit / advance status / delete). */
export default function PlannedMaintenanceDetail() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader
        title={t.pm.detailTitle}
        subtitle={t.pm.detailSubtitle}
        actions={
          <a
            href="/maintenance/planned/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-neon-500 to-plasma-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgb(34_211_238/0.25)] transition-all hover:shadow-[0_0_28px_rgb(34_211_238/0.4)] hover:brightness-110"
          >
            {t.pm.createTitle}
          </a>
        }
      />
      <MaintenanceList kind="planned" />
    </div>
  )
}

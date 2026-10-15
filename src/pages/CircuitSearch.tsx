import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/ui/primitives'
import { CircuitExplorer } from '@/components/CircuitExplorer'

export default function CircuitSearch() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t.circuits.searchTitle} subtitle={t.circuits.searchSubtitle} />
      <CircuitExplorer />
    </div>
  )
}

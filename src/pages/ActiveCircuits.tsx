import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/ui/primitives'
import { CircuitExplorer } from '@/components/CircuitExplorer'

export default function ActiveCircuits() {
  const { t } = useI18n()
  return (
    <div>
      <PageHeader title={t.circuits.activeTitle} subtitle={t.circuits.activeSubtitle} />
      <CircuitExplorer onlyActive />
    </div>
  )
}

import { Menu, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { Button } from '@/components/ui/primitives'
import { ConnectionPill } from './ConnectionPill'
import { LanguageSwitcher } from './LanguageSwitcher'

interface TopbarProps {
  title: string
  onMenu: () => void
  onOpenSetup: () => void
}

export function Topbar({ title, onMenu, onOpenSetup }: TopbarProps) {
  const { t } = useI18n()

  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-abyss-950/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          onClick={onMenu}
          className="cursor-pointer rounded-xl border border-white/10 p-2 text-slate-300 transition-colors hover:border-neon-400/40 hover:text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <h2 className="font-display flex-1 truncate text-base font-semibold text-white sm:text-lg">{title}</h2>

        <Link to="/request" className="hidden sm:block">
          <Button size="sm" icon={<Send className="h-3.5 w-3.5" />}>
            {t.request.newRequest}
          </Button>
        </Link>

        <ConnectionPill onOpenSetup={onOpenSetup} />
        <LanguageSwitcher />
      </div>
    </header>
  )
}

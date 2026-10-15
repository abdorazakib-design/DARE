import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Database, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useData } from '@/data/DataProvider'
import { findNavItem } from '@/lib/nav'
import { Button } from '@/components/ui/primitives'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { SetupModal } from './SetupModal'
import { Background } from './Background'

export function AppShell() {
  const { t } = useI18n()
  const { mode, error } = useData()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const nav = findNavItem(location.pathname)
  const title = nav ? t.nav[nav.labelKey] : ''

  return (
    <div className="min-h-screen">
      <Background />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-[268px]">
        <Topbar title={title} onMenu={() => setSidebarOpen(true)} onOpenSetup={() => setSetupOpen(true)} />

        {mode === 'demo' && !bannerDismissed ? (
          <div className="animate-fade-in flex flex-wrap items-center gap-3 border-b border-amber-400/15 bg-amber-400/[0.06] px-4 py-2.5 sm:px-6">
            <Database className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="flex-1 text-xs leading-relaxed text-amber-200/90">
              {error ? `${t.common.error} — ${error}` : t.connection.demoBanner}
            </p>
            <Button size="sm" variant="outline" onClick={() => setSetupOpen(true)}>
              {t.connection.connect}
            </Button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="cursor-pointer rounded-lg p-1 text-amber-200/60 transition-colors hover:text-amber-200"
              aria-label={t.connection.dismiss}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-white/6 px-6 py-4 text-center text-[11px] text-slate-600">
          DARE · {t.app.tagline} — © 2026
        </footer>
      </div>

      <SetupModal open={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  )
}

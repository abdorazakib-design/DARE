import { NavLink } from 'react-router-dom'
import { ChevronDown, PieChart, Waves, Wrench, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import {
  capacityItems,
  mainItems,
  maintenanceItems,
  plannedMaintenanceItems,
  secondaryItems,
  troubleTicketItems,
  type NavItem,
} from '@/lib/nav'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useI18n()
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
          isActive
            ? 'bg-gradient-to-r from-neon-500/15 to-plasma-500/10 text-white'
            : 'text-slate-400 hover:bg-white/[0.05] hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-neon-400 to-plasma-400 transition-all duration-300',
              isActive ? 'opacity-100 shadow-[0_0_10px_rgb(34_211_238/0.6)]' : 'opacity-0',
            )}
          />
          <Icon className={cn('h-[18px] w-[18px] shrink-0 transition-colors', isActive ? 'text-neon-300' : 'text-slate-500 group-hover:text-neon-300')} />
          <span className="truncate">{t.nav[item.labelKey]}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useI18n()

  const capacityOpenDefault = capacityItems.some((i) => window.location.pathname.startsWith(i.path))
  const maintenanceOpenDefault = maintenanceItems.some((i) => window.location.pathname.startsWith(i.path))

  return (
    <>
      {/* Mobile overlay */}
      {open ? (
        <div className="animate-fade-in fixed inset-0 z-30 bg-abyss-950/60 backdrop-blur-sm lg:hidden" onClick={onClose} />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-white/8 bg-abyss-900/85 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="relative flex items-center gap-3 border-b border-white/8 px-5 py-5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-500 to-plasma-500 shadow-[0_0_24px_rgb(34_211_238/0.35)]">
            <Waves className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-none font-bold tracking-wide">
              <span className="text-gradient">DARE</span>
            </p>
            <p className="mt-1 truncate text-[10px] tracking-[0.18em] text-slate-500 uppercase">{t.app.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {mainItems.map((item) => (
            <NavRow key={item.path} item={item} onNavigate={onClose} />
          ))}

          <div className="group">
            <input type="checkbox" id="capacity-menu" defaultChecked={capacityOpenDefault} className="peer hidden" />
            <label
              htmlFor="capacity-menu"
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-400 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
            >
              <PieChart className="h-[18px] w-[18px] shrink-0 text-slate-500 transition-colors group-hover:text-neon-300" />
              <span className="flex-1 truncate">{t.nav.capacity}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-600 transition-transform duration-300 peer-checked:rotate-180" />
            </label>
            <div className="grid grid-rows-[0fr] transition-all duration-300 peer-checked:grid-rows-[1fr]">
              <div className="overflow-hidden">
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/8 pl-2">
                  {capacityItems.map((item) => (
                    <NavRow key={item.path} item={item} onNavigate={onClose} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="group">
            <input type="checkbox" id="maintenance-menu" defaultChecked={maintenanceOpenDefault} className="peer hidden" />
            <label
              htmlFor="maintenance-menu"
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-400 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
            >
              <Wrench className="h-[18px] w-[18px] shrink-0 text-slate-500 transition-colors group-hover:text-neon-300" />
              <span className="flex-1 truncate">{t.nav.maintenance}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-600 transition-transform duration-300 peer-checked:rotate-180" />
            </label>
            <div className="grid grid-rows-[0fr] transition-all duration-300 peer-checked:grid-rows-[1fr]">
              <div className="overflow-hidden">
                <div className="ml-4 mt-0.5 space-y-1 border-l border-white/8 pl-2">
                  <p className="px-3 pt-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{t.nav.troubleTickets}</p>
                  {troubleTicketItems.map((item) => (
                    <NavRow key={item.path} item={item} onNavigate={onClose} />
                  ))}
                  <p className="px-3 pt-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">{t.nav.plannedMaintenance}</p>
                  {plannedMaintenanceItems.map((item) => (
                    <NavRow key={item.path} item={item} onNavigate={onClose} />
                  ))}
                  {maintenanceItems.filter((item) => item.labelKey === 'maintenanceSchedule').map((item) => (
                    <NavRow key={item.path} item={item} onNavigate={onClose} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {secondaryItems.map((item) => (
            <NavRow key={item.path} item={item} onNavigate={onClose} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-3.5">
          <p className="text-[10px] tracking-wider text-slate-600 uppercase">
            DARE1 · Djibouti — Somalia — Kenya
          </p>
        </div>
      </aside>
    </>
  )
}

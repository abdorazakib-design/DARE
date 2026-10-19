import {
  Activity,
  BarChart3,
  Cable,
  ClipboardList,
  FolderOpen,
  Gauge,
  Layers,
  Network,
  Pencil,
  Plus,
  Rocket,
  Search,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Translations } from '@/i18n'

export interface NavItem {
  path: string
  labelKey: keyof Translations['nav']
  icon: LucideIcon
}

export const capacityItems: NavItem[] = [
  { path: '/mux', labelKey: 'muxPlan', icon: Layers },
  { path: '/circuits', labelKey: 'circuitSearch', icon: Search },
  { path: '/request', labelKey: 'circuitRequest', icon: Send },
  { path: '/workorders', labelKey: 'workOrders', icon: ClipboardList },
  { path: '/modify', labelKey: 'modifyCircuit', icon: Pencil },
  { path: '/active', labelKey: 'activeCircuits', icon: Activity },
]

export const mainItems: NavItem[] = [{ path: '/', labelKey: 'dashboard', icon: Gauge }]

export const troubleTicketItems: NavItem[] = [
  { path: '/maintenance/tickets/create', labelKey: 'createTroubleTicket', icon: Plus },
  { path: '/maintenance/tickets/details', labelKey: 'troubleTicketDetails', icon: ClipboardList },
]

export const plannedMaintenanceItems: NavItem[] = [
  { path: '/maintenance/planned/create', labelKey: 'createPlannedMaintenance', icon: Plus },
  { path: '/maintenance/planned/details', labelKey: 'plannedMaintenanceDetails', icon: ClipboardList },
]

export const maintenanceItems: NavItem[] = [
  ...troubleTicketItems,
  ...plannedMaintenanceItems,
  { path: '/maintenance/schedule', labelKey: 'maintenanceSchedule', icon: Activity },
]

export const secondaryItems: NavItem[] = [
  { path: '/reports', labelKey: 'reports', icon: BarChart3 },
  { path: '/documents', labelKey: 'documents', icon: FolderOpen },
  { path: '/users', labelKey: 'users', icon: Users },
  { path: '/providers', labelKey: 'providers', icon: Cable },
  { path: '/diagram', labelKey: 'diagram', icon: Network },
  { path: '/project', labelKey: 'project', icon: Rocket },
]

export function findNavItem(pathname: string): NavItem | undefined {
  const all = [...mainItems, ...capacityItems, ...maintenanceItems, ...secondaryItems]
  if (pathname === '/') return all[0]
  return all
    .filter((item) => pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]
}

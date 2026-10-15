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
  Rocket,
  Search,
  Send,
  Users,
  Wrench,
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

export const secondaryItems: NavItem[] = [
  { path: '/maintenance', labelKey: 'maintenance', icon: Wrench },
  { path: '/reports', labelKey: 'reports', icon: BarChart3 },
  { path: '/documents', labelKey: 'documents', icon: FolderOpen },
  { path: '/users', labelKey: 'users', icon: Users },
  { path: '/providers', labelKey: 'providers', icon: Cable },
  { path: '/diagram', labelKey: 'diagram', icon: Network },
  { path: '/project', labelKey: 'project', icon: Rocket },
]

export function findNavItem(pathname: string): NavItem | undefined {
  const all = [...mainItems, ...capacityItems, ...secondaryItems]
  if (pathname === '/') return all[0]
  return all.find((item) => pathname.startsWith(item.path))
}

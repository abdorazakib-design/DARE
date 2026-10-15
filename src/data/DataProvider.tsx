import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchRefs } from './api'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Refs, StatusRow } from '@/lib/types'

type Mode = 'live' | 'demo'

interface RefMaps {
  operatorById: Map<string, Refs['operators'][number]>
  stationById: Map<string, Refs['stations'][number]>
  bandwidthById: Map<string, Refs['bandwidths'][number]>
  interfaceById: Map<string, Refs['interfaceTypes'][number]>
  restorationById: Map<string, Refs['restorationTypes'][number]>
  requestTypeById: Map<string, Refs['requestTypes'][number]>
  statusById: Map<string, Refs['statuses'][number]>
  providerById: Map<string, Refs['providers'][number]>
  docCatById: Map<string, Refs['docCategories'][number]>
  statusesByScope: (scope: string) => StatusRow[]
}

interface DataContextValue {
  refs: Refs | null
  maps: RefMaps | null
  mode: Mode
  /** Incremented after every mutation (and realtime events) so lists refetch. */
  version: number
  bump: () => void
  error: string | null
}

const DataContext = createContext<DataContextValue | null>(null)

function buildMaps(refs: Refs): RefMaps {
  const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]))
  return {
    operatorById: byId(refs.operators),
    stationById: byId(refs.stations),
    bandwidthById: byId(refs.bandwidths),
    interfaceById: byId(refs.interfaceTypes),
    restorationById: byId(refs.restorationTypes),
    requestTypeById: byId(refs.requestTypes),
    statusById: byId(refs.statuses),
    providerById: byId(refs.providers),
    docCatById: byId(refs.docCategories),
    statusesByScope: (scope: string) => refs.statuses.filter((s) => s.scope === scope),
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [refs, setRefs] = useState<Refs | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [mode, setMode] = useState<Mode>(isSupabaseConfigured ? 'live' : 'demo')

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let cancelled = false
    fetchRefs()
      .then((r) => {
        if (!cancelled) setRefs(r)
      })
      .catch((e: unknown) => {
        // Supabase credentials present but unreachable / schema not installed:
        // fall back to demo data so the app stays usable, and surface the error.
        if (cancelled) return
        setMode('demo')
        setError(e instanceof Error ? e.message : String(e))
        fetchRefs()
          .then((r) => !cancelled && setRefs(r))
          .catch(() => undefined)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Supabase Realtime: any change on any table refreshes the active views.
  useEffect(() => {
    if (mode !== 'live' || !supabase) return
    const sb = supabase
    const channel = sb
      .channel('dare-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => bump())
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  }, [mode, bump])

  const maps = useMemo(() => (refs ? buildMaps(refs) : null), [refs])

  return (
    <DataContext.Provider value={{ refs, maps, mode, version, bump, error }}>{children}</DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

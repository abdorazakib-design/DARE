import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  demoCircuits,
  demoDocCategories,
  demoDocuments,
  demoMaintenance,
  demoOperators,
  demoPhases,
  demoProviders,
  demoRequestTypes,
  demoRequests,
  demoRestorationTypes,
  demoStatuses,
  demoStations,
  demoBandwidths,
  demoInterfaceTypes,
  demoUsers,
  demoWorkOrders,
} from './demoData'
import type {
  AppUser,
  AppUserInput,
  BackhaulProvider,
  Circuit,
  CircuitInput,
  CircuitRequest,
  DocumentInput,
  DocumentRow,
  MaintenanceEvent,
  MaintenanceInput,
  ProjectPhase,
  ProviderInput,
  Refs,
  RequestInput,
  WorkOrder,
  WorkOrderInput,
} from '@/lib/types'
import { uid } from '@/lib/utils'

let demoMaintenanceTicketSequence = demoMaintenance.reduce((max, event) => {
  const match = /^TT(\d{5})$/.exec(event.ticket_number ?? '')
  return match ? Math.max(max, Number(match[1])) : max
}, 0)

/**
 * Unified data access layer.
 * - Live mode: every call hits Supabase.
 * - Demo mode (no .env credentials): the same calls run against an in-memory
 *   mirror of the SQL seed, so the whole app is testable before Supabase exists.
 */

const nowISO = () => new Date().toISOString()
const wait = (ms = 160) => new Promise<void>((r) => setTimeout(r, ms))

async function sbList<T>(table: string, order: string, ascending = true): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select('*').order(order, { ascending })
  if (error) throw new Error(error.message)
  return (data ?? []) as T[]
}

async function sbInsert<T>(table: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().from(table).insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as T
}

async function sbUpdate<T>(table: string, id: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().from(table).update(payload).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as T
}

async function sbDelete(table: string, id: string): Promise<void> {
  const { error } = await getSupabase().from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------- Reference data ----------

export async function fetchRefs(): Promise<Refs> {
  if (!isSupabaseConfigured) {
    await wait()
    return {
      operators: [...demoOperators],
      stations: [...demoStations],
      bandwidths: [...demoBandwidths],
      interfaceTypes: [...demoInterfaceTypes],
      restorationTypes: [...demoRestorationTypes],
      requestTypes: [...demoRequestTypes],
      statuses: [...demoStatuses],
      providers: [...demoProviders],
      docCategories: [...demoDocCategories],
    }
  }
  const [operators, stations, bandwidths, interfaceTypes, restorationTypes, requestTypes, statuses, providers, docCategories] =
    await Promise.all([
      sbList<Refs['operators'][number]>('operators', 'name'),
      sbList<Refs['stations'][number]>('landing_stations', 'name'),
      sbList<Refs['bandwidths'][number]>('bandwidths', 'sort_order'),
      sbList<Refs['interfaceTypes'][number]>('interface_types', 'sort_order'),
      sbList<Refs['restorationTypes'][number]>('restoration_types', 'label'),
      sbList<Refs['requestTypes'][number]>('request_types', 'sort_order'),
      sbList<Refs['statuses'][number]>('statuses', 'sort_order'),
      sbList<Refs['providers'][number]>('backhaul_providers', 'name'),
      sbList<Refs['docCategories'][number]>('document_categories', 'label_en'),
    ])
  return { operators, stations, bandwidths, interfaceTypes, restorationTypes, requestTypes, statuses, providers, docCategories }
}

// ---------- Circuits ----------

export async function fetchCircuits(): Promise<Circuit[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoCircuits])
  return sbList<Circuit>('circuits', 'created_at', false)
}

export async function createCircuit(input: CircuitInput): Promise<Circuit> {
  if (!isSupabaseConfigured) {
    await wait()
    const row: Circuit = {
      id: uid(),
      created_at: nowISO(),
      ...input,
      requested_by: input.requested_by ?? null,
      activated_at: input.activated_at ?? null,
    }
    demoCircuits.push(row)
    return row
  }
  return sbInsert<Circuit>('circuits', { ...input })
}

export async function updateCircuit(id: string, input: Partial<CircuitInput>): Promise<Circuit> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoCircuits.findIndex((c) => c.id === id)
    if (i === -1) throw new Error('Not found')
    demoCircuits[i] = { ...demoCircuits[i], ...input }
    return demoCircuits[i]
  }
  return sbUpdate<Circuit>('circuits', id, { ...input })
}

export async function deleteCircuit(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoCircuits.findIndex((c) => c.id === id)
    if (i !== -1) demoCircuits.splice(i, 1)
    return
  }
  return sbDelete('circuits', id)
}

// ---------- Circuit requests ----------

export async function fetchRequests(): Promise<CircuitRequest[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoRequests])
  return sbList<CircuitRequest>('circuit_requests', 'created_at', false)
}

export async function createRequest(input: RequestInput): Promise<CircuitRequest> {
  if (!isSupabaseConfigured) {
    await wait()
    const row: CircuitRequest = { id: uid(), created_at: nowISO(), ...input }
    demoRequests.unshift(row)
    return row
  }
  return sbInsert<CircuitRequest>('circuit_requests', { ...input })
}

export async function updateRequestStatus(id: string, statusId: string): Promise<CircuitRequest> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoRequests.findIndex((r) => r.id === id)
    if (i === -1) throw new Error('Not found')
    demoRequests[i] = { ...demoRequests[i], status_id: statusId }
    return demoRequests[i]
  }
  return sbUpdate<CircuitRequest>('circuit_requests', id, { status_id: statusId })
}

// ---------- Work orders ----------

export async function fetchWorkOrders(): Promise<WorkOrder[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoWorkOrders])
  return sbList<WorkOrder>('work_orders', 'created_at', false)
}

export async function createWorkOrder(input: WorkOrderInput): Promise<WorkOrder> {
  if (!isSupabaseConfigured) {
    await wait()
    const row: WorkOrder = { id: uid(), created_at: nowISO(), ...input }
    demoWorkOrders.unshift(row)
    return row
  }
  return sbInsert<WorkOrder>('work_orders', { ...input })
}

export async function updateWorkOrder(id: string, input: Partial<WorkOrderInput>): Promise<WorkOrder> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoWorkOrders.findIndex((w) => w.id === id)
    if (i === -1) throw new Error('Not found')
    demoWorkOrders[i] = { ...demoWorkOrders[i], ...input }
    return demoWorkOrders[i]
  }
  return sbUpdate<WorkOrder>('work_orders', id, { ...input })
}

export async function deleteWorkOrder(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoWorkOrders.findIndex((w) => w.id === id)
    if (i !== -1) demoWorkOrders.splice(i, 1)
    return
  }
  return sbDelete('work_orders', id)
}

// ---------- Maintenance ----------

export async function fetchMaintenance(): Promise<MaintenanceEvent[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoMaintenance])
  return sbList<MaintenanceEvent>('maintenance_events', 'started_at', false)
}

export async function createMaintenance(input: MaintenanceInput): Promise<MaintenanceEvent> {
  if (!isSupabaseConfigured) {
    await wait()
    const ticketNumber = input.ticket_type
      ? `TT${String(++demoMaintenanceTicketSequence).padStart(5, '0')}`
      : null
    const row: MaintenanceEvent = {
      id: uid(),
      created_at: nowISO(),
      ...input,
      ticket_number: ticketNumber,
      update_comments: input.update_comments ?? [],
    }
    demoMaintenance.unshift(row)
    return row
  }
  return sbInsert<MaintenanceEvent>('maintenance_events', { ...input })
}

export async function updateMaintenance(id: string, input: Partial<MaintenanceInput>): Promise<MaintenanceEvent> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoMaintenance.findIndex((m) => m.id === id)
    if (i === -1) throw new Error('Not found')
    demoMaintenance[i] = { ...demoMaintenance[i], ...input }
    return demoMaintenance[i]
  }
  return sbUpdate<MaintenanceEvent>('maintenance_events', id, { ...input })
}

export async function deleteMaintenance(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoMaintenance.findIndex((m) => m.id === id)
    if (i !== -1) demoMaintenance.splice(i, 1)
    return
  }
  return sbDelete('maintenance_events', id)
}

// ---------- Documents ----------

export async function fetchDocuments(): Promise<DocumentRow[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoDocuments])
  return sbList<DocumentRow>('documents', 'created_at', false)
}

export async function createDocument(input: DocumentInput): Promise<DocumentRow> {
  if (!isSupabaseConfigured) {
    await wait()
    const row: DocumentRow = { id: uid(), created_at: nowISO(), ...input }
    demoDocuments.unshift(row)
    return row
  }
  return sbInsert<DocumentRow>('documents', { ...input })
}

export async function updateDocument(id: string, input: Partial<DocumentInput>): Promise<DocumentRow> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoDocuments.findIndex((d) => d.id === id)
    if (i === -1) throw new Error('Not found')
    demoDocuments[i] = { ...demoDocuments[i], ...input }
    return demoDocuments[i]
  }
  return sbUpdate<DocumentRow>('documents', id, { ...input })
}

export async function deleteDocument(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoDocuments.findIndex((d) => d.id === id)
    if (i !== -1) demoDocuments.splice(i, 1)
    return
  }
  return sbDelete('documents', id)
}

// ---------- Users ----------

export async function fetchUsers(): Promise<AppUser[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoUsers])
  return sbList<AppUser>('app_users', 'created_at')
}

export async function createUser(input: AppUserInput): Promise<AppUser> {
  if (!isSupabaseConfigured) {
    await wait()
    const row: AppUser = { id: uid(), created_at: nowISO(), ...input }
    demoUsers.push(row)
    return row
  }
  return sbInsert<AppUser>('app_users', { ...input })
}

export async function updateUser(id: string, input: Partial<AppUserInput>): Promise<AppUser> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoUsers.findIndex((u) => u.id === id)
    if (i === -1) throw new Error('Not found')
    demoUsers[i] = { ...demoUsers[i], ...input }
    return demoUsers[i]
  }
  return sbUpdate<AppUser>('app_users', id, { ...input })
}

export async function deleteUser(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoUsers.findIndex((u) => u.id === id)
    if (i !== -1) demoUsers.splice(i, 1)
    return
  }
  return sbDelete('app_users', id)
}

// ---------- Backhaul providers ----------

export async function fetchProviders(): Promise<BackhaulProvider[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoProviders])
  return sbList<BackhaulProvider>('backhaul_providers', 'name')
}

export async function createProvider(input: ProviderInput): Promise<BackhaulProvider> {
  if (!isSupabaseConfigured) {
    await wait()
    const row: BackhaulProvider = { id: uid(), ...input }
    demoProviders.push(row)
    return row
  }
  return sbInsert<BackhaulProvider>('backhaul_providers', { ...input })
}

export async function updateProvider(id: string, input: Partial<ProviderInput>): Promise<BackhaulProvider> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoProviders.findIndex((p) => p.id === id)
    if (i === -1) throw new Error('Not found')
    demoProviders[i] = { ...demoProviders[i], ...input }
    return demoProviders[i]
  }
  return sbUpdate<BackhaulProvider>('backhaul_providers', id, { ...input })
}

export async function deleteProvider(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoProviders.findIndex((p) => p.id === id)
    if (i !== -1) demoProviders.splice(i, 1)
    return
  }
  return sbDelete('backhaul_providers', id)
}

// ---------- Project phases ----------

export async function fetchPhases(): Promise<ProjectPhase[]> {
  if (!isSupabaseConfigured) return wait().then(() => [...demoPhases])
  return sbList<ProjectPhase>('project_phases', 'phase_order')
}

export async function updatePhase(id: string, input: Partial<ProjectPhase>): Promise<ProjectPhase> {
  if (!isSupabaseConfigured) {
    await wait()
    const i = demoPhases.findIndex((p) => p.id === id)
    if (i === -1) throw new Error('Not found')
    demoPhases[i] = { ...demoPhases[i], ...input }
    return demoPhases[i]
  }
  return sbUpdate<ProjectPhase>('project_phases', id, { ...input })
}

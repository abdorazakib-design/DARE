// Database row types — mirror the tables created by supabase/schema.sql

export interface Operator {
  id: string
  code: string
  name: string
}

export interface LandingStation {
  id: string
  code: string
  name: string
  country: string
  /** diagram coordinates (SVG viewBox 800x420) */
  x: number
  y: number
}

export interface Bandwidth {
  id: string
  label: string
  value_gbps: number
  sort_order: number
}

export interface InterfaceType {
  id: string
  label: string
  sort_order: number
}

export interface RestorationType {
  id: string
  code: string
  label: string
}

export interface RequestType {
  id: string
  code: string
  label_en: string
  label_fr: string
  desc_en: string
  desc_fr: string
  sort_order: number
}

export interface StatusRow {
  id: string
  code: string
  scope: string
  label_en: string
  label_fr: string
  color: string
  sort_order: number
}

export interface BackhaulProvider {
  id: string
  name: string
  contact_email: string | null
  phone: string | null
}

export interface DocumentCategory {
  id: string
  code: string
  label_en: string
  label_fr: string
}

export interface Circuit {
  id: string
  designation: string
  circuit_ref: string
  operator_id: string
  station_a_id: string
  station_b_id: string
  bandwidth_id: string
  interface_type_id: string
  quantity: number
  restoration_type_id: string
  status_id: string
  requested_by: string | null
  activated_at: string | null
  created_at: string
}

export interface CircuitRequest {
  id: string
  request_type_id: string
  status_id: string
  circuit_designation: string | null
  circuit_ref: string | null
  details: Record<string, unknown>
  requested_by: string
  requested_date: string | null
  created_at: string
}

export interface WorkOrder {
  id: string
  number: string
  request_id: string | null
  status_id: string
  assigned_to: string | null
  created_at: string
}

export interface DocumentRow {
  id: string
  title: string
  category_id: string
  url: string
  size: string | null
  uploaded_by: string | null
  created_at: string
}

export interface AppUser {
  id: string
  full_name: string
  email: string
  role: string
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface MaintenanceEvent {
  id: string
  ticket_number: string | null
  title: string
  station_id: string
  ticket_type: 'network_event' | 'service_request' | 'incident' | 'repair_and_return' | null
  service_type: 'request_loopback' | 'performance_monitoring' | null
  ne_creation_on: string | null
  impact: 'traffic_affected' | 'no_traffic_affected' | 'traffic_threat' | 'service_affected' | 'service_threat' | 'non_service_affected' | null
  circuit_id: string | null
  brief_description: string | null
  request_person: string | null
  update_note: string | null
  severity: string
  status_id: string
  description: string | null
  started_at: string | null
  resolved_at: string | null
  created_at: string
}

export interface ProjectPhase {
  id: string
  name: string
  phase_order: number
  status_id: string
  progress: number
  start_date: string | null
  end_date: string | null
}

/** All reference tables, loaded once and cached — no UI value is ever hardcoded. */
export interface Refs {
  operators: Operator[]
  stations: LandingStation[]
  bandwidths: Bandwidth[]
  interfaceTypes: InterfaceType[]
  restorationTypes: RestorationType[]
  requestTypes: RequestType[]
  statuses: StatusRow[]
  providers: BackhaulProvider[]
  docCategories: DocumentCategory[]
}

// ---- Input payloads ----

export interface CircuitInput {
  designation: string
  circuit_ref: string
  operator_id: string
  station_a_id: string
  station_b_id: string
  bandwidth_id: string
  interface_type_id: string
  quantity: number
  restoration_type_id: string
  status_id: string
  requested_by?: string | null
  activated_at?: string | null
}

export interface RequestInput {
  request_type_id: string
  status_id: string
  circuit_designation: string | null
  circuit_ref: string | null
  details: Record<string, unknown>
  requested_by: string
  requested_date: string
}

export interface WorkOrderInput {
  number: string
  request_id: string | null
  status_id: string
  assigned_to: string | null
}

export interface DocumentInput {
  title: string
  category_id: string
  url: string
  size: string | null
  uploaded_by: string | null
}

export interface AppUserInput {
  full_name: string
  email: string
  role: string
  phone: string | null
  is_active: boolean
}

export interface ProviderInput {
  name: string
  contact_email: string | null
  phone: string | null
}

export interface MaintenanceInput {
  ticket_number?: string | null
  title: string
  station_id: string
  ticket_type: 'network_event' | 'service_request' | 'incident' | 'repair_and_return' | null
  service_type: 'request_loopback' | 'performance_monitoring' | null
  ne_creation_on: string | null
  impact: 'traffic_affected' | 'no_traffic_affected' | 'traffic_threat' | 'service_affected' | 'service_threat' | 'non_service_affected' | null
  circuit_id: string | null
  brief_description: string | null
  request_person: string | null
  update_note: string | null
  severity: string
  status_id: string
  description: string | null
  started_at: string | null
  resolved_at: string | null
}

export interface PhaseInput {
  name: string
  phase_order: number
  status_id: string
  progress: number
  start_date: string | null
  end_date: string | null
}

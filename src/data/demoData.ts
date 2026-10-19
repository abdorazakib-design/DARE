import type {
  AppUser,
  BackhaulProvider,
  Bandwidth,
  Circuit,
  CircuitRequest,
  DocumentCategory,
  DocumentRow,
  InterfaceType,
  LandingStation,
  MaintenanceEvent,
  Operator,
  ProjectPhase,
  RequestType,
  RestorationType,
  StatusRow,
  WorkOrder,
} from '@/lib/types'

/**
 * In-memory demo database — the exact mirror of the SQL seed in supabase/schema.sql.
 * Used only while Supabase credentials are not configured (.env missing).
 * Every UI list is driven by these tables (or the live Supabase ones), never hardcoded.
 */

const id = (n: number) => `00000000-0000-4000-8000-00000000${String(n).padStart(4, '0')}`

export const demoOperators: Operator[] = [
  { id: id(0x0011), code: 'SOMTEL', name: 'SOMTEL' },
  { id: id(0x0012), code: 'HORMUUD', name: 'HORMUUD' },
  { id: id(0x0013), code: 'DJIBOUTI TELECOM', name: 'DJIBOUTI TELECOM' },
  { id: id(0x0014), code: 'TELESOM', name: 'TELESOM' },
]

export const demoStations: LandingStation[] = [
  { id: id(0x0021), code: 'DJIBOUTI', name: 'DJIBOUTI', country: 'Djibouti', x: 120, y: 84 },
  { id: id(0x0022), code: 'BOSASO', name: 'BOSASO', country: 'Somalia', x: 512, y: 78 },
  { id: id(0x0023), code: 'MOGADISHU', name: 'MOGADISHU', country: 'Somalia', x: 566, y: 214 },
  { id: id(0x0024), code: 'MOMBASA', name: 'MOMBASA', country: 'Kenya', x: 168, y: 328 },
]

export const demoBandwidths: Bandwidth[] = [
  { id: id(0x0031), label: '10G', value_gbps: 10, sort_order: 1 },
  { id: id(0x0032), label: '100G', value_gbps: 100, sort_order: 2 },
]

export const demoInterfaceTypes: InterfaceType[] = [
  { id: id(0x0041), label: '10GE', sort_order: 1 },
  { id: id(0x0042), label: 'OTU2', sort_order: 2 },
  { id: id(0x0043), label: 'OTU2e', sort_order: 3 },
  { id: id(0x0044), label: 'STM64', sort_order: 4 },
  { id: id(0x0045), label: '100GE', sort_order: 5 },
  { id: id(0x0046), label: 'OTU4', sort_order: 6 },
  { id: id(0x0047), label: 'OTU4e', sort_order: 7 },
  { id: id(0x0048), label: 'OC192', sort_order: 8 },
]

export const demoRestorationTypes: RestorationType[] = [
  { id: id(0x0051), code: 'no-restored', label: 'NO RESTORED' },
  { id: id(0x0052), code: 'restored', label: 'RESTORED' },
]

export const demoRequestTypes: RequestType[] = [
  {
    id: id(0x0061), code: 'activation', sort_order: 1,
    label_en: 'New Circuit Activation', label_fr: 'Nouvelle activation de circuit',
    desc_en: 'Request the activation of a new circuit between two landing stations.',
    desc_fr: "Demander l'activation d'un nouveau circuit entre deux stations d'atterrissage.",
  },
  {
    id: id(0x0062), code: 'deactivation', sort_order: 2,
    label_en: 'Circuit De-Activation', label_fr: 'Désactivation de circuit',
    desc_en: 'Request the de-activation of an existing circuit.',
    desc_fr: 'Demander la désactivation d\'un circuit existant.',
  },
  {
    id: id(0x0063), code: 'backhaul-change', sort_order: 3,
    label_en: 'Backhaul Provider Change', label_fr: 'Changement de fournisseur backhaul',
    desc_en: 'Change the backhaul provider of an existing circuit.',
    desc_fr: 'Changer le fournisseur backhaul d\'un circuit existant.',
  },
  {
    id: id(0x0064), code: 'designation-change', sort_order: 4,
    label_en: 'Circuit Designation Change', label_fr: 'Changement de désignation de circuit',
    desc_en: 'Rename an existing circuit designation.',
    desc_fr: 'Renommer la désignation d\'un circuit existant.',
  },
  {
    id: id(0x0065), code: 'interface-change', sort_order: 5,
    label_en: 'Interface Change', label_fr: 'Changement d\'interface',
    desc_en: 'Change the interface type of an existing circuit.',
    desc_fr: 'Changer le type d\'interface d\'un circuit existant.',
  },
  {
    id: id(0x0066), code: 'restoration-change', sort_order: 6,
    label_en: 'Restoration Change', label_fr: 'Changement de restauration',
    desc_en: 'Change the restoration type of an existing circuit.',
    desc_fr: 'Changer le type de restauration d\'un circuit existant.',
  },
]

export const demoStatuses: StatusRow[] = [
  { id: id(0x0071), code: 'pending', scope: 'request', label_en: 'Pending', label_fr: 'En attente', color: '#f59e0b', sort_order: 1 },
  { id: id(0x0072), code: 'in-review', scope: 'request', label_en: 'In Review', label_fr: 'En révision', color: '#38bdf8', sort_order: 2 },
  { id: id(0x0073), code: 'approved', scope: 'request', label_en: 'Approved', label_fr: 'Approuvée', color: '#34d399', sort_order: 3 },
  { id: id(0x0074), code: 'rejected', scope: 'request', label_en: 'Rejected', label_fr: 'Rejetée', color: '#f87171', sort_order: 4 },
  { id: id(0x0075), code: 'completed', scope: 'request', label_en: 'Completed', label_fr: 'Terminée', color: '#a78bfa', sort_order: 5 },
  { id: id(0x0078), code: 'active', scope: 'circuit', label_en: 'Active', label_fr: 'Actif', color: '#34d399', sort_order: 1 },
  { id: id(0x0079), code: 'inactive', scope: 'circuit', label_en: 'Inactive', label_fr: 'Inactif', color: '#64748b', sort_order: 2 },
  { id: id(0x007a), code: 'suspended', scope: 'circuit', label_en: 'Suspended', label_fr: 'Suspendu', color: '#f59e0b', sort_order: 3 },
  { id: id(0x0081), code: 'open', scope: 'work_order', label_en: 'Open', label_fr: 'Ouvert', color: '#38bdf8', sort_order: 1 },
  { id: id(0x0082), code: 'in-progress', scope: 'work_order', label_en: 'In Progress', label_fr: 'En cours', color: '#f59e0b', sort_order: 2 },
  { id: id(0x0083), code: 'closed', scope: 'work_order', label_en: 'Closed', label_fr: 'Clôturé', color: '#64748b', sort_order: 3 },
  { id: id(0x0088), code: 'planned', scope: 'maintenance', label_en: 'Planned', label_fr: 'Planifié', color: '#38bdf8', sort_order: 1 },
  { id: id(0x0089), code: 'ongoing', scope: 'maintenance', label_en: 'Ongoing', label_fr: 'En cours', color: '#f59e0b', sort_order: 2 },
  { id: id(0x008a), code: 'resolved', scope: 'maintenance', label_en: 'Resolved', label_fr: 'Résolu', color: '#34d399', sort_order: 3 },
  { id: id(0x008b), code: 'open', scope: 'trouble_ticket', label_en: 'Open', label_fr: 'Ouvert', color: '#f59e0b', sort_order: 1 },
  { id: id(0x008c), code: 'in-progress', scope: 'trouble_ticket', label_en: 'In Progress', label_fr: 'En cours', color: '#38bdf8', sort_order: 2 },
  { id: id(0x008d), code: 'resolved', scope: 'trouble_ticket', label_en: 'Resolved', label_fr: 'Résolu', color: '#34d399', sort_order: 3 },
  { id: id(0x0091), code: 'done', scope: 'project', label_en: 'Done', label_fr: 'Terminé', color: '#34d399', sort_order: 1 },
  { id: id(0x0092), code: 'in-progress', scope: 'project', label_en: 'In Progress', label_fr: 'En cours', color: '#38bdf8', sort_order: 2 },
  { id: id(0x0093), code: 'delayed', scope: 'project', label_en: 'Delayed', label_fr: 'Retardé', color: '#f87171', sort_order: 3 },
  { id: id(0x0094), code: 'planned', scope: 'project', label_en: 'Planned', label_fr: 'Planifié', color: '#94a3b8', sort_order: 4 },
]

export const demoDocCategories: DocumentCategory[] = [
  { id: id(0x00a1), code: 'technical', label_en: 'Technical', label_fr: 'Technique' },
  { id: id(0x00a2), code: 'contractual', label_en: 'Contractual', label_fr: 'Contractuel' },
  { id: id(0x00a3), code: 'report', label_en: 'Reports', label_fr: 'Rapports' },
  { id: id(0x00a4), code: 'sla', label_en: 'SLA', label_fr: 'SLA' },
]

export const demoProviders: BackhaulProvider[] = [
  { id: id(0x00b1), name: 'Djibouti Telecom Backhaul', contact_email: 'backhaul@djiboutitelecom.example', phone: '+253 21 35 20 01' },
  { id: id(0x00b2), name: 'Somtel Fiber Services', contact_email: 'fiber@somtel.example', phone: '+252 63 442 0099' },
  { id: id(0x00b3), name: 'Hormuud Carrier Division', contact_email: 'carrier@hormuud.example', phone: '+252 61 300 1200' },
  { id: id(0x00b4), name: 'Global Carrier Services', contact_email: 'noc@gcs.example', phone: '+971 4 555 0134' },
]

const OP = demoOperators
const ST = demoStations
const BW = demoBandwidths
const IT = demoInterfaceTypes
const RT = demoRestorationTypes
const SX = demoStatuses

export const demoCircuits: Circuit[] = [
  { id: id(0x0101), designation: 'CKTI-001', circuit_ref: 'SOM-SRT-001', operator_id: OP[0].id, station_a_id: ST[0].id, station_b_id: ST[2].id, bandwidth_id: BW[1].id, interface_type_id: IT[4].id, quantity: 1, restoration_type_id: RT[0].id, status_id: SX[5].id, requested_by: 'A. Hosman', activated_at: '2025-11-10', created_at: '2025-11-08T09:12:00Z' },
  { id: id(0x0102), designation: 'CKTI-002', circuit_ref: 'HORM-MG-001', operator_id: OP[1].id, station_a_id: ST[2].id, station_b_id: ST[3].id, bandwidth_id: BW[0].id, interface_type_id: IT[0].id, quantity: 2, restoration_type_id: RT[0].id, status_id: SX[5].id, requested_by: 'N. Farah', activated_at: '2025-09-22', created_at: '2025-09-20T14:03:00Z' },
  { id: id(0x0103), designation: 'CKTI-003', circuit_ref: 'DJT-BSO-001', operator_id: OP[2].id, station_a_id: ST[0].id, station_b_id: ST[1].id, bandwidth_id: BW[1].id, interface_type_id: IT[5].id, quantity: 1, restoration_type_id: RT[1].id, status_id: SX[5].id, requested_by: 'S. Dubois', activated_at: '2026-01-15', created_at: '2026-01-13T10:40:00Z' },
  { id: id(0x0104), designation: 'CKTI-004', circuit_ref: 'SOM-BSO-002', operator_id: OP[0].id, station_a_id: ST[1].id, station_b_id: ST[2].id, bandwidth_id: BW[0].id, interface_type_id: IT[3].id, quantity: 1, restoration_type_id: RT[0].id, status_id: SX[5].id, requested_by: 'M. Kiprop', activated_at: '2026-02-05', created_at: '2026-02-03T08:25:00Z' },
  { id: id(0x0105), designation: 'CKTI-005', circuit_ref: 'HORM-DJI-002', operator_id: OP[1].id, station_a_id: ST[0].id, station_b_id: ST[3].id, bandwidth_id: BW[1].id, interface_type_id: IT[4].id, quantity: 2, restoration_type_id: RT[1].id, status_id: SX[5].id, requested_by: 'A. Hosman', activated_at: '2026-03-12', created_at: '2026-03-10T11:55:00Z' },
  { id: id(0x0106), designation: 'CKTI-006', circuit_ref: 'TLS-MG-001', operator_id: OP[3].id, station_a_id: ST[2].id, station_b_id: ST[3].id, bandwidth_id: BW[0].id, interface_type_id: IT[0].id, quantity: 1, restoration_type_id: RT[0].id, status_id: SX[7].id, requested_by: 'L. Ahmed', activated_at: '2026-04-02', created_at: '2026-03-31T16:12:00Z' },
  { id: id(0x0107), designation: 'CKTI-007', circuit_ref: 'DJT-MB-003', operator_id: OP[2].id, station_a_id: ST[0].id, station_b_id: ST[3].id, bandwidth_id: BW[1].id, interface_type_id: IT[6].id, quantity: 1, restoration_type_id: RT[0].id, status_id: SX[5].id, requested_by: 'M. Kiprop', activated_at: '2026-05-20', created_at: '2026-05-18T09:47:00Z' },
  { id: id(0x0108), designation: 'CKTI-008', circuit_ref: 'SOM-DJI-004', operator_id: OP[0].id, station_a_id: ST[0].id, station_b_id: ST[1].id, bandwidth_id: BW[0].id, interface_type_id: IT[1].id, quantity: 1, restoration_type_id: RT[0].id, status_id: SX[6].id, requested_by: 'A. Hosman', activated_at: '2025-12-01', created_at: '2025-11-29T13:30:00Z' },
  { id: id(0x0109), designation: 'CKTI-009', circuit_ref: 'HORM-BSO-002', operator_id: OP[1].id, station_a_id: ST[1].id, station_b_id: ST[2].id, bandwidth_id: BW[1].id, interface_type_id: IT[4].id, quantity: 1, restoration_type_id: RT[1].id, status_id: SX[5].id, requested_by: 'N. Farah', activated_at: '2026-06-08', created_at: '2026-06-06T10:15:00Z' },
  { id: id(0x0110), designation: 'CKTI-010', circuit_ref: 'DJT-MG-004', operator_id: OP[2].id, station_a_id: ST[0].id, station_b_id: ST[2].id, bandwidth_id: BW[0].id, interface_type_id: IT[0].id, quantity: 3, restoration_type_id: RT[0].id, status_id: SX[5].id, requested_by: 'S. Dubois', activated_at: '2026-07-14', created_at: '2026-07-12T15:20:00Z' },
]

export const demoRequests: CircuitRequest[] = [
  {
    id: id(0x0201), request_type_id: demoRequestTypes[0].id, status_id: SX[1].id,
    circuit_designation: 'CKTI-011', circuit_ref: 'SOM-MB-005',
    details: { operator_id: OP[0].id, station_a_id: ST[2].id, station_b_id: ST[3].id, bandwidth_id: BW[0].id, interface_type_id: IT[0].id, quantity: 2, restoration_type_id: RT[0].id },
    requested_by: 'A. Hosman', requested_date: '2026-06-03', created_at: '2026-06-03T09:12:00Z',
  },
  {
    id: id(0x0202), request_type_id: demoRequestTypes[0].id, status_id: SX[3].id,
    circuit_designation: 'CKTI-012', circuit_ref: 'HORM-DJI-003',
    details: { operator_id: OP[1].id, station_a_id: ST[0].id, station_b_id: ST[3].id, bandwidth_id: BW[1].id, interface_type_id: IT[4].id, quantity: 1, restoration_type_id: RT[1].id },
    requested_by: 'N. Farah', requested_date: '2026-07-18', created_at: '2026-07-18T11:30:00Z',
  },
  {
    id: id(0x0203), request_type_id: demoRequestTypes[1].id, status_id: SX[4].id,
    circuit_designation: 'CKTI-008', circuit_ref: 'SOM-DJI-004',
    details: {}, requested_by: 'A. Hosman', requested_date: '2026-05-20', created_at: '2026-05-20T08:45:00Z',
  },
  {
    id: id(0x0204), request_type_id: demoRequestTypes[4].id, status_id: SX[0].id,
    circuit_designation: 'CKTI-002', circuit_ref: 'HORM-MG-001',
    details: { new_interface_id: IT[4].id },
    requested_by: 'N. Farah', requested_date: '2026-08-02', created_at: '2026-08-02T14:05:00Z',
  },
  {
    id: id(0x0205), request_type_id: demoRequestTypes[2].id, status_id: SX[1].id,
    circuit_designation: 'CKTI-004', circuit_ref: 'SOM-BSO-002',
    details: { provider_id: demoProviders[1].id },
    requested_by: 'M. Kiprop', requested_date: '2026-09-10', created_at: '2026-09-10T10:22:00Z',
  },
  {
    id: id(0x0206), request_type_id: demoRequestTypes[5].id, status_id: SX[0].id,
    circuit_designation: 'CKTI-005', circuit_ref: 'HORM-DJI-002',
    details: { new_restoration_id: RT[0].id },
    requested_by: 'L. Ahmed', requested_date: '2026-09-28', created_at: '2026-09-28T16:40:00Z',
  },
  {
    id: id(0x0207), request_type_id: demoRequestTypes[3].id, status_id: SX[2].id,
    circuit_designation: 'CKTI-010', circuit_ref: 'DJT-MG-004',
    details: { new_designation: 'CKTI-010-R' },
    requested_by: 'S. Dubois', requested_date: '2026-10-06', created_at: '2026-10-06T09:00:00Z',
  },
  {
    id: id(0x0208), request_type_id: demoRequestTypes[0].id, status_id: SX[0].id,
    circuit_designation: 'CKTI-013', circuit_ref: 'DJT-BSO-002',
    details: { operator_id: OP[2].id, station_a_id: ST[0].id, station_b_id: ST[1].id, bandwidth_id: BW[1].id, interface_type_id: IT[5].id, quantity: 1, restoration_type_id: RT[0].id },
    requested_by: 'M. Kiprop', requested_date: '2026-10-09', created_at: '2026-10-09T13:18:00Z',
  },
]

export const demoWorkOrders: WorkOrder[] = [
  { id: id(0x0301), number: 'WO-2026-001', request_id: demoRequests[1].id, status_id: SX[9].id, assigned_to: 'M. Kiprop', created_at: '2026-07-19T08:30:00Z' },
  { id: id(0x0302), number: 'WO-2026-002', request_id: demoRequests[2].id, status_id: SX[10].id, assigned_to: 'N. Farah', created_at: '2026-05-21T09:10:00Z' },
  { id: id(0x0303), number: 'WO-2026-003', request_id: demoRequests[4].id, status_id: SX[9].id, assigned_to: 'N. Farah', created_at: '2026-09-11T14:44:00Z' },
  { id: id(0x0304), number: 'WO-2026-004', request_id: demoRequests[6].id, status_id: SX[8].id, assigned_to: 'S. Dubois', created_at: '2026-10-07T10:05:00Z' },
  { id: id(0x0305), number: 'WO-2026-005', request_id: demoRequests[0].id, status_id: SX[8].id, assigned_to: null, created_at: '2026-06-04T11:20:00Z' },
]

export const demoDocuments: DocumentRow[] = [
  { id: id(0x0401), title: 'Mux Plan v3.2', category_id: demoDocCategories[0].id, url: '#', size: '2.4 MB', uploaded_by: 'N. Farah', created_at: '2026-09-15T10:00:00Z' },
  { id: id(0x0402), title: 'DARE1 Service Level Agreement', category_id: demoDocCategories[3].id, url: '#', size: '1.1 MB', uploaded_by: 'S. Dubois', created_at: '2026-08-30T09:20:00Z' },
  { id: id(0x0403), title: 'Operations Report Q3 2026', category_id: demoDocCategories[2].id, url: '#', size: '860 KB', uploaded_by: 'M. Kiprop', created_at: '2026-10-02T16:30:00Z' },
  { id: id(0x0404), title: 'Marine Route Survey 2025', category_id: demoDocCategories[0].id, url: '#', size: '12.7 MB', uploaded_by: 'A. Hosman', created_at: '2026-04-11T08:45:00Z' },
  { id: id(0x0405), title: 'Interconnect Agreement — Djibouti Telecom', category_id: demoDocCategories[1].id, url: '#', size: '640 KB', uploaded_by: 'A. Hosman', created_at: '2026-05-06T14:12:00Z' },
]

export const demoUsers: AppUser[] = [
  { id: id(0x0501), full_name: 'Awale Hosman', email: 'awale.hosman@dare-net.example', role: 'admin', phone: '+253 77 82 41 05', is_active: true, created_at: '2025-10-01T08:00:00Z' },
  { id: id(0x0502), full_name: 'Nadira Farah', email: 'n.farah@dare-net.example', role: 'engineer', phone: '+252 61 552 3340', is_active: true, created_at: '2025-11-12T08:00:00Z' },
  { id: id(0x0503), full_name: 'Marcus Kiprop', email: 'm.kiprop@dare-net.example', role: 'engineer', phone: '+254 722 118 940', is_active: true, created_at: '2026-01-08T08:00:00Z' },
  { id: id(0x0504), full_name: 'Sophie Dubois', email: 's.dubois@dare-net.example', role: 'viewer', phone: '+33 6 44 20 18 75', is_active: true, created_at: '2026-02-19T08:00:00Z' },
  { id: id(0x0505), full_name: 'Liban Ahmed', email: 'l.ahmed@dare-net.example', role: 'viewer', phone: '+252 63 401 2266', is_active: false, created_at: '2026-03-27T08:00:00Z' },
]

export const demoMaintenance: MaintenanceEvent[] = [
  {
    id: id(0x0601), title: 'Fiber cut on segment DJIBOUTI – BOSASO', station_id: ST[1].id, severity: 'critical',
    status_id: SX[16].id, description: 'Anchor damage detected near Bosaso. Repair ship dispatched, splicing completed.',
    kind: 'trouble', ticket_number: 'TT-2026-001', circuit_id: null,
    started_at: '2026-08-14', resolved_at: '2026-08-16', created_at: '2026-08-14T06:50:00Z',
  },
  {
    id: id(0x0602), title: 'Optical span loss degradation DJIBOUTI – MOGADISHU', station_id: ST[0].id, severity: 'medium',
    status_id: SX[15].id, description: 'OSNR degradation trend observed on 4 spans. Investigation ongoing.',
    kind: 'trouble', ticket_number: 'TT-2026-002', circuit_id: null,
    started_at: '2026-09-30', resolved_at: null, created_at: '2026-09-30T11:25:00Z',
  },
  {
    id: id(0x0603), title: 'Card upgrade at Mombasa NNOB', station_id: ST[3].id, severity: 'low',
    status_id: SX[11].id, description: 'Planned amplifier card replacement during the next maintenance window.',
    kind: 'planned', ticket_number: null, circuit_id: null,
    started_at: '2026-11-01', resolved_at: null, created_at: '2026-10-01T09:00:00Z',
  },
  {
    id: id(0x0604), title: 'Power anomaly at Bosaso NNOB', station_id: ST[1].id, severity: 'high',
    status_id: SX[16].id, description: 'Rectifier failure — switched to redundant power feed.',
    kind: 'trouble', ticket_number: 'TT-2026-003', circuit_id: null,
    started_at: '2026-06-12', resolved_at: '2026-06-13', created_at: '2026-06-12T17:40:00Z',
  },
]

export const demoPhases: ProjectPhase[] = [
  { id: id(0x0701), name: 'System Design & Marine Survey', phase_order: 1, status_id: SX[17].id, progress: 100, start_date: '2025-02-01', end_date: '2025-04-30' },
  { id: id(0x0702), name: 'Marine Installation & Cable Laying', phase_order: 2, status_id: SX[17].id, progress: 100, start_date: '2025-05-10', end_date: '2025-09-15' },
  { id: id(0x0703), name: 'System Integration & Testing', phase_order: 3, status_id: SX[17].id, progress: 100, start_date: '2025-09-16', end_date: '2026-01-20' },
  { id: id(0x0704), name: 'Ready for Service (RFS) & Acceptance', phase_order: 4, status_id: SX[18].id, progress: 75, start_date: '2026-01-21', end_date: '2026-11-30' },
  { id: id(0x0705), name: 'Phase 1 Capacity Sales', phase_order: 5, status_id: SX[20].id, progress: 5, start_date: '2026-10-01', end_date: '2027-03-31' },
]

export function statusByCode(code: string, scope: string): StatusRow {
  return demoStatuses.find((s) => s.code === code && s.scope === scope) ?? demoStatuses[0]
}

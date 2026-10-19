-- ============================================================================
-- DARE — Submarine Capacity Platform · Supabase schema + seed
-- ----------------------------------------------------------------------------
-- Run this entire script in the Supabase SQL Editor (Dashboard → SQL Editor).
-- All UUIDs are randomly generated (uuid v4), no sequential zeros.
-- ============================================================================

create extension if not exists pgcrypto;

-- Reference tables
create table operators (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table landing_stations (
  id      uuid primary key default gen_random_uuid(),
  code    text not null unique,
  name    text not null,
  x       double precision not null default 0,
  y       double precision not null default 0
);

create table bandwidths (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  value_gbps numeric not null,
  sort_order int  not null default 0
);

create table interface_types (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  sort_order int  not null default 0
);

create table restoration_types (
  id    uuid primary key default gen_random_uuid(),
  code  text not null unique,
  label text not null
);

create table request_types (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label_en   text not null,
  label_fr   text not null,
  desc_en    text not null default '',
  desc_fr    text not null default '',
  sort_order int  not null default 0
);

create table statuses (
  id        uuid primary key default gen_random_uuid(),
  code      text not null,
  scope     text not null,
  label_en  text not null,
  label_fr  text not null,
  color     text not null default '#64748b',
  sort_order int not null default 0,
  unique (code, scope)
);

create table backhaul_providers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text,
  phone         text
);

create table document_categories (
  id       uuid primary key default gen_random_uuid(),
  code     text not null unique,
  label_en text not null,
  label_fr text not null
);

-- Core tables
create table circuits (
  id                 uuid primary key default gen_random_uuid(),
  designation        text not null,
  circuit_ref        text not null unique,
  operator_id        uuid not null references operators (id),
  station_a_id       uuid not null references landing_stations (id),
  station_b_id       uuid not null references landing_stations (id),
  bandwidth_id       uuid not null references bandwidths (id),
  interface_type_id  uuid not null references interface_types (id),
  quantity           int  not null default 1 check (quantity > 0),
  restoration_type_id uuid not null references restoration_types (id),
  status_id          uuid not null references statuses (id),
  requested_by       text,
  activated_at       date,
  created_at         timestamptz not null default now()
);

create table circuit_requests (
  id                 uuid primary key default gen_random_uuid(),
  request_type_id    uuid not null references request_types (id),
  status_id          uuid not null references statuses (id),
  circuit_designation text,
  circuit_ref        text,
  details            jsonb not null default '{}'::jsonb,
  requested_by       text not null,
  requested_date     date,
  created_at         timestamptz not null default now()
);

create table work_orders (
  id          uuid primary key default gen_random_uuid(),
  number      text not null unique,
  request_id  uuid references circuit_requests (id) on delete set null,
  status_id   uuid not null references statuses (id),
  assigned_to text,
  created_at  timestamptz not null default now()
);

create table maintenance_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  station_id  uuid not null references landing_stations (id),
  severity    text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  status_id   uuid not null references statuses (id),
  description text,
  started_at  date,
  resolved_at date,
  created_at  timestamptz not null default now()
);

create table documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category_id uuid not null references document_categories (id),
  url         text not null,
  size        text,
  uploaded_by text,
  created_at  timestamptz not null default now()
);

create table app_users (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text not null unique,
  role       text not null default 'viewer' check (role in ('admin', 'engineer', 'viewer')),
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table project_phases (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phase_order int  not null,
  status_id   uuid not null references statuses (id),
  progress    int  not null default 0 check (progress between 0 and 100),
  start_date  date,
  end_date    date
);
insert into operators (id, code, name) values
  ('b84701eb-4a3a-4850-86c7-8c7d3746f01f', 'SOMTEL', 'SOMTEL'),
  ('b42a425a-a29c-4fc3-87fa-b0348933ed49', 'HORMUUD', 'HORMUUD'),
  ('2fd2bde2-580f-4910-a07f-edef7c324e9d', 'DJIBOUTI TELECOM', 'DJIBOUTI TELECOM'),
  ('b5636561-4bf0-4608-a829-878a6c209d3f', 'TELESOM', 'TELESOM');

insert into landing_stations (id, code, name, x, y) values
  ('64db723f-b9d0-49f1-9d6d-a7ec17698950', 'DJIBOUTI', 'DJIBOUTI', 120, 84),
  ('6844c28f-3404-4bf2-8384-ff49c9312e1d', 'BOSASO', 'BOSASO', 512, 78),
  ('f6116f62-83ef-4798-b082-f51cbe2f972e', 'MOGADISHU', 'MOGADISHU', 566, 214),
  ('e4f8e690-272b-470f-a43a-ba7720b535c7', 'MOMBASA', 'MOMBASA', 168, 328);

insert into bandwidths (id, label, value_gbps, sort_order) values
  ('3464f64f-4b8b-4903-9292-2222b80cb6ac', '10G', 10, 1),
  ('20b052c4-5b1c-4264-8068-494dd4e4b484', '100G', 100, 2);

insert into interface_types (id, label, sort_order) values
  ('082a5300-6ddb-47b3-8a5e-2a74e2fae69d', '10GE', 1),
  ('087451cc-b37e-4114-b791-6feb6749c2e8', 'OTU2', 2),
  ('4fb9b908-529e-417a-91bf-472931bc7376', 'OTU2e', 3),
  ('3d886af4-1e6c-4425-b6f6-95c07da0811d', 'STM64', 4),
  ('09d97aaf-f4ce-4f4a-baeb-f5c42559e20d', '100GE', 5),
  ('c0e84515-696a-4814-a4e6-6b485f18c025', 'OTU4', 6),
  ('bb441886-028a-45e1-977a-1d13147f02d2', 'OTU4e', 7),
  ('08edf8ba-b33e-465a-9689-28f44e1d94a4', 'OC192', 8);

insert into restoration_types (id, code, label) values
  ('13160d05-5f16-41ed-8ed7-b96529da62da', 'no-restored', 'NO RESTORED'),
  ('0e378a8a-9289-464f-8aeb-6661e8410916', 'restored', 'RESTORED');

insert into request_types (id, code, label_en, label_fr, desc_en, desc_fr, sort_order) values
  ('0dc47552-dd9c-4c26-8870-ada2cfa979ef', 'activation', 'New Circuit Activation', 'Nouvelle activation de circuit', 'Request the activation of a new circuit between two landing stations.', 'Demander l''activation d''un nouveau circuit entre deux stations d''atterrissage.', 1),
  ('ba5b630b-abdf-45bd-b46d-16bdc72978e2', 'deactivation', 'Circuit De-Activation', 'Désactivation de circuit', 'Request the de-activation of an existing circuit.', 'Demander la désactivation d''un circuit existant.', 2),
  ('bea77ec4-620d-45e9-a077-c9f1cc3cb0f9', 'backhaul-change', 'Backhaul Provider Change', 'Changement de fournisseur backhaul', 'Change the backhaul provider of an existing circuit.', 'Changer le fournisseur backhaul d''un circuit existant.', 3),
  ('5fd9bd68-8b92-439d-b089-b2db73262ea0', 'designation-change', 'Circuit Designation Change', 'Changement de désignation de circuit', 'Rename an existing circuit designation.', 'Renommer la désignation d''un circuit existant.', 4),
  ('98009826-f7f8-45bb-815c-3aba5a3fc5f6', 'interface-change', 'Interface Change', 'Changement d''interface', 'Change the interface type of an existing circuit.', 'Changer le type d''interface d''un circuit existant.', 5),
  ('1e3c3da4-4c55-42ba-be2c-88eb49043806', 'restoration-change', 'Restoration Change', 'Changement de restauration', 'Change the restoration type of an existing circuit.', 'Changer le type de restauration d''un circuit existant.', 6);

insert into statuses (id, code, scope, label_en, label_fr, color, sort_order) values
  ('0ae90885-d967-40d5-bada-02ce01374e1d', 'pending', 'request', 'Pending', 'En attente', '#f59e0b', 1),
  ('778743ea-6877-4400-8808-83ddb0c4da91', 'in-review', 'request', 'In Review', 'En révision', '#38bdf8', 2),
  ('347e8f89-1430-4eec-a444-0241e87fd134', 'approved', 'request', 'Approved', 'Approuvée', '#34d399', 3),
  ('abd377e3-1eaa-42d6-b0bc-265f4e930008', 'rejected', 'request', 'Rejected', 'Rejetée', '#f87171', 4),
  ('0c554657-1396-440b-ac6c-d559ab3b85ae', 'completed', 'request', 'Completed', 'Terminée', '#a78bfa', 5),
  ('93725c0b-486f-49fb-a00d-63893691ba70', 'active', 'circuit', 'Active', 'Actif', '#34d399', 1),
  ('9d0e86be-7a8f-4c21-b170-c44290ec3ff5', 'inactive', 'circuit', 'Inactive', 'Inactif', '#64748b', 2),
  ('14b527d5-dbcf-487d-8b1d-ff1d5f845983', 'suspended', 'circuit', 'Suspended', 'Suspendu', '#f59e0b', 3),
  ('0494db14-4e84-47d4-8976-fadc390904a8', 'open', 'work_order', 'Open', 'Ouvert', '#38bdf8', 1),
  ('4fd9b0fd-ea4b-42e3-a92e-ac0ac901b589', 'in-progress', 'work_order', 'In Progress', 'En cours', '#f59e0b', 2),
  ('e4e64a01-c110-4cc9-b567-586856615b3a', 'closed', 'work_order', 'Closed', 'Clôturé', '#64748b', 3),
  ('781ca801-e7ce-44e6-9b2d-4103337012cb', 'planned', 'maintenance', 'Planned', 'Planifié', '#38bdf8', 1),
  ('4627d430-777a-4189-958e-4f59e40b8d53', 'ongoing', 'maintenance', 'Ongoing', 'En cours', '#f59e0b', 2),
  ('eed1ff46-9b4a-4fa4-bf3e-2777017df482', 'resolved', 'maintenance', 'Resolved', 'Résolu', '#34d399', 3),
  ('9ce6bbe2-94aa-4490-89d4-b4fa2c137598', 'done', 'project', 'Done', 'Terminé', '#34d399', 1),
  ('6b17bfac-64a5-430a-bc14-0920e5c0e0ae', 'in-progress', 'project', 'In Progress', 'En cours', '#38bdf8', 2),
  ('5cdcd49d-6fac-4c80-ac1a-3dcfd259bea2', 'delayed', 'project', 'Delayed', 'Retardé', '#f87171', 3),
  ('b5496731-8509-4c15-9751-d5018ebcad52', 'planned', 'project', 'Planned', 'Planifié', '#94a3b8', 4);

insert into document_categories (id, code, label_en, label_fr) values
  ('8a02e3af-5802-4da0-b7df-775e88ae78dc', 'technical', 'Technical', 'Technique'),
  ('09d90956-f3c8-421a-b53b-113d50cd1a33', 'contractual', 'Contractual', 'Contractuel'),
  ('8d007414-b363-4f02-bbfa-9db41048fd33', 'report', 'Reports', 'Rapports'),
  ('bc0b05d0-215c-4fb7-9d39-0945039afa94', 'sla', 'SLA', 'SLA');

insert into backhaul_providers (id, name, contact_email, phone) values
  ('378b60bd-a209-44e2-9cf9-a1a5e35e9b51', 'Djibouti Telecom Backhaul', 'backhaul@djiboutitelecom.example', '+253 21 35 20 01'),
  ('c930b4ae-9135-4c21-a50e-713e6b91a87f', 'Somtel Fiber Services', 'fiber@somtel.example', '+252 63 442 0099'),
  ('a6082927-2089-4797-8f32-59bd22b14cd3', 'Hormuud Carrier Division', 'carrier@hormuud.example', '+252 61 300 1200'),
  ('f43d0dce-b22d-4e8b-b4bc-d78ce1a8673c', 'Global Carrier Services', 'noc@gcs.example', '+971 4 555 0134');
insert into circuits (id, designation, circuit_ref, operator_id, station_a_id, station_b_id, bandwidth_id, interface_type_id, quantity, restoration_type_id, status_id, requested_by, activated_at, created_at) values
  ('118f7c98-aa14-48fd-9d9d-b41f70f4a9a9', 'CKTI-001', 'SOM-SRT-001', 'b84701eb-4a3a-4850-86c7-8c7d3746f01f', '64db723f-b9d0-49f1-9d6d-a7ec17698950', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '20b052c4-5b1c-4264-8068-494dd4e4b484', '09d97aaf-f4ce-4f4a-baeb-f5c42559e20d', 1, '13160d05-5f16-41ed-8ed7-b96529da62da', '93725c0b-486f-49fb-a00d-63893691ba70', 'A. Hosman', '2025-11-10', '2025-11-08T09:12:00Z'),
  ('86365ce9-d894-4139-9ca3-91e964e2ccb6', 'CKTI-002', 'HORM-MG-001', 'b42a425a-a29c-4fc3-87fa-b0348933ed49', 'f6116f62-83ef-4798-b082-f51cbe2f972e', 'e4f8e690-272b-470f-a43a-ba7720b535c7', '3464f64f-4b8b-4903-9292-2222b80cb6ac', '082a5300-6ddb-47b3-8a5e-2a74e2fae69d', 2, '13160d05-5f16-41ed-8ed7-b96529da62da', '93725c0b-486f-49fb-a00d-63893691ba70', 'N. Farah', '2025-09-22', '2025-09-20T14:03:00Z'),
  ('7431af45-b3b7-4328-a726-735fa61e1d52', 'CKTI-003', 'DJT-BSO-001', '2fd2bde2-580f-4910-a07f-edef7c324e9d', '64db723f-b9d0-49f1-9d6d-a7ec17698950', '6844c28f-3404-4bf2-8384-ff49c9312e1d', '20b052c4-5b1c-4264-8068-494dd4e4b484', 'c0e84515-696a-4814-a4e6-6b485f18c025', 1, '0e378a8a-9289-464f-8aeb-6661e8410916', '93725c0b-486f-49fb-a00d-63893691ba70', 'S. Dubois', '2026-01-15', '2026-01-13T10:40:00Z'),
  ('32e62f98-abaa-4680-8927-b7c03100922e', 'CKTI-004', 'SOM-BSO-002', 'b84701eb-4a3a-4850-86c7-8c7d3746f01f', '6844c28f-3404-4bf2-8384-ff49c9312e1d', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '3464f64f-4b8b-4903-9292-2222b80cb6ac', '3d886af4-1e6c-4425-b6f6-95c07da0811d', 1, '13160d05-5f16-41ed-8ed7-b96529da62da', '93725c0b-486f-49fb-a00d-63893691ba70', 'M. Kiprop', '2026-02-05', '2026-02-03T08:25:00Z'),
  ('8f31e354-d5e2-43fa-b6d4-28788bd43364', 'CKTI-005', 'HORM-DJI-002', 'b42a425a-a29c-4fc3-87fa-b0348933ed49', '64db723f-b9d0-49f1-9d6d-a7ec17698950', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '20b052c4-5b1c-4264-8068-494dd4e4b484', '09d97aaf-f4ce-4f4a-baeb-f5c42559e20d', 2, '0e378a8a-9289-464f-8aeb-6661e8410916', '93725c0b-486f-49fb-a00d-63893691ba70', 'A. Hosman', '2026-03-12', '2026-03-10T11:55:00Z'),
  ('e034d870-79fa-4bf4-8079-8065785967de', 'CKTI-006', 'SOM-MG-001', 'b84701eb-4a3a-4850-86c7-8c7d3746f01f', '6844c28f-3404-4bf2-8384-ff49c9312e1d', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '3464f64f-4b8b-4903-9292-2222b80cb6ac', '082a5300-6ddb-47b3-8a5e-2a74e2fae69d', 1, '13160d05-5f16-41ed-8ed7-b96529da62da', '93725c0b-486f-49fb-a00d-63893691ba70', 'S. Dubois', '2026-04-18', '2026-04-15T16:30:00Z'),
  ('3d96a350-7fdb-4d30-a4b0-154ca6bc518c', 'CKTI-007', 'DJT-MG-002', '2fd2bde2-580f-4910-a07f-edef7c324e9d', '64db723f-b9d0-49f1-9d6d-a7ec17698950', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '20b052c4-5b1c-4264-8068-494dd4e4b484', 'c0e84515-696a-4814-a4e6-6b485f18c025', 1, '0e378a8a-9289-464f-8aeb-6661e8410916', '93725c0b-486f-49fb-a00d-63893691ba70', 'N. Farah', '2026-05-02', '2026-04-28T09:45:00Z'),
  ('958aa962-0f0f-486b-94f1-e5cd895d9025', 'CKTI-008', 'SOM-DJI-004', 'b84701eb-4a3a-4850-86c7-8c7d3746f01f', '6844c28f-3404-4bf2-8384-ff49c9312e1d', '64db723f-b9d0-49f1-9d6d-a7ec17698950', '3464f64f-4b8b-4903-9292-2222b80cb6ac', '082a5300-6ddb-47b3-8a5e-2a74e2fae69d', 1, '13160d05-5f16-41ed-8ed7-b96529da62da', '93725c0b-486f-49fb-a00d-63893691ba70', 'M. Kiprop', '2026-05-20', '2026-05-18T14:10:00Z'),
  ('78010fe7-a526-45e1-919e-e827801ef660', 'CKTI-009', 'HORM-BSO-003', 'b42a425a-a29c-4fc3-87fa-b0348933ed49', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '6844c28f-3404-4bf2-8384-ff49c9312e1d', '20b052c4-5b1c-4264-8068-494dd4e4b484', '09d97aaf-f4ce-4f4a-baeb-f5c42559e20d', 1, '0e378a8a-9289-464f-8aeb-6661e8410916', '93725c0b-486f-49fb-a00d-63893691ba70', 'A. Hosman', '2026-06-10', '2026-06-08T11:20:00Z'),
  ('1420426c-a958-465a-a92c-d3530fc6bc4e', 'CKTI-010', 'DJT-MG-004', '2fd2bde2-580f-4910-a07f-edef7c324e9d', '64db723f-b9d0-49f1-9d6d-a7ec17698950', 'f6116f62-83ef-4798-b082-f51cbe2f972e', '20b052c4-5b1c-4264-8068-494dd4e4b484', 'c0e84515-696a-4814-a4e6-6b485f18c025', 1, '0e378a8a-9289-464f-8aeb-6661e8410916', '93725c0b-486f-49fb-a00d-63893691ba70', 'S. Dubois', '2026-10-06', '2026-10-04T09:00:00Z');

insert into circuit_requests (id, request_type_id, status_id, circuit_designation, circuit_ref, details, requested_by, requested_date, created_at) values
  ('0fb0df3d-8065-4238-9cde-84cbcc625095', '0dc47552-dd9c-4c26-8870-ada2cfa979ef', '778743ea-6877-4400-8808-83ddb0c4da91', 'CKTI-011', 'SOM-MB-005', '{"operator_id": "b84701eb-4a3a-4850-86c7-8c7d3746f01f", "station_a_id": "f6116f62-83ef-4798-b082-f51cbe2f972e", "station_b_id": "e4f8e690-272b-470f-a43a-ba7720b535c7", "bandwidth_id": "3464f64f-4b8b-4903-9292-2222b80cb6ac", "interface_type_id": "082a5300-6ddb-47b3-8a5e-2a74e2fae69d", "quantity": 2, "restoration_type_id": "13160d05-5f16-41ed-8ed7-b96529da62da"}', 'A. Hosman', '2026-06-03', '2026-06-03T09:12:00Z'),
  ('f7f581e8-1d67-47e6-80a5-df18444f3652', '0dc47552-dd9c-4c26-8870-ada2cfa979ef', 'abd377e3-1eaa-42d6-b0bc-265f4e930008', 'CKTI-012', 'HORM-DJI-003', '{"operator_id": "b42a425a-a29c-4fc3-87fa-b0348933ed49", "station_a_id": "64db723f-b9d0-49f1-9d6d-a7ec17698950", "station_b_id": "e4f8e690-272b-470f-a43a-ba7720b535c7", "bandwidth_id": "20b052c4-5b1c-4264-8068-494dd4e4b484", "interface_type_id": "09d97aaf-f4ce-4f4a-baeb-f5c42559e20d", "quantity": 1, "restoration_type_id": "0e378a8a-9289-464f-8aeb-6661e8410916"}', 'N. Farah', '2026-07-18', '2026-07-18T11:30:00Z'),
  ('e609ee6e-75eb-4067-8220-78748b6fa698', 'ba5b630b-abdf-45bd-b46d-16bdc72978e2', '0c554657-1396-440b-ac6c-d559ab3b85ae', 'CKTI-008', 'SOM-DJI-004', '{}', 'A. Hosman', '2026-05-20', '2026-05-20T08:45:00Z'),
  ('4c7167b2-35c0-4ce7-b3b6-763d2330439f', '98009826-f7f8-45bb-815c-3aba5a3fc5f6', '0ae90885-d967-40d5-bada-02ce01374e1d', 'CKTI-002', 'HORM-MG-001', '{"new_interface_id": "09d97aaf-f4ce-4f4a-baeb-f5c42559e20d"}', 'N. Farah', '2026-08-02', '2026-08-02T14:05:00Z'),
  ('236411ad-7cbd-47db-b020-8c3a8c8f47a8', 'bea77ec4-620d-45e9-a077-c9f1cc3cb0f9', '778743ea-6877-4400-8808-83ddb0c4da91', 'CKTI-004', 'SOM-BSO-002', '{"provider_id": "c930b4ae-9135-4c21-a50e-713e6b91a87f"}', 'M. Kiprop', '2026-09-10', '2026-09-10T10:22:00Z'),
  ('50d21b44-952b-4981-9b3e-c1af8bce3da2', '1e3c3da4-4c55-42ba-be2c-88eb49043806', '0ae90885-d967-40d5-bada-02ce01374e1d', 'CKTI-005', 'HORM-DJI-002', '{"new_restoration_id": "13160d05-5f16-41ed-8ed7-b96529da62da"}', 'L. Ahmed', '2026-09-28', '2026-09-28T16:40:00Z'),
  ('dca92b2a-a268-415b-90be-3fbdb8106d0a', '5fd9bd68-8b92-439d-b089-b2db73262ea0', '347e8f89-1430-4eec-a444-0241e87fd134', 'CKTI-010', 'DJT-MG-004', '{"new_designation": "CKTI-010-R"}', 'S. Dubois', '2026-10-06', '2026-10-06T09:00:00Z'),
  ('29c1bcc2-71ff-483f-8d05-9203ae78c9e2', '0dc47552-dd9c-4c26-8870-ada2cfa979ef', '347e8f89-1430-4eec-a444-0241e87fd134', 'CKTI-013', 'DJT-BSO-002', '{"operator_id": "2fd2bde2-580f-4910-a07f-edef7c324e9d", "station_a_id": "64db723f-b9d0-49f1-9d6d-a7ec17698950", "station_b_id": "6844c28f-3404-4bf2-8384-ff49c9312e1d", "bandwidth_id": "20b052c4-5b1c-4264-8068-494dd4e4b484", "interface_type_id": "c0e84515-696a-4814-a4e6-6b485f18c025", "quantity": 1, "restoration_type_id": "0e378a8a-9289-464f-8aeb-6661e8410916"}', 'M. Kiprop', '2026-10-09', '2026-10-09T13:18:00Z');
insert into work_orders (id, number, request_id, status_id, assigned_to, created_at) values
  ('f111b475-ff2b-47c7-9d0d-e257c29fcde8', 'WO-2026-001', 'f7f581e8-1d67-47e6-80a5-df18444f3652', '4fd9b0fd-ea4b-42e3-a92e-ac0ac901b589', 'M. Kiprop', '2026-07-19T08:30:00Z'),
  ('123ad781-a80d-4bff-ba02-bde7d6cc2c1f', 'WO-2026-002', 'e609ee6e-75eb-4067-8220-78748b6fa698', 'e4e64a01-c110-4cc9-b567-586856615b3a', 'N. Farah', '2026-05-21T09:10:00Z'),
  ('1a250c58-fdaa-4d59-9004-8303aa6ca6ff', 'WO-2026-003', '4c7167b2-35c0-4ce7-b3b6-763d2330439f', '4fd9b0fd-ea4b-42e3-a92e-ac0ac901b589', 'N. Farah', '2026-09-11T14:44:00Z'),
  ('8f69fc17-8953-4e7e-87c1-7f61cde636da', 'WO-2026-004', 'dca92b2a-a268-415b-90be-3fbdb8106d0a', '0494db14-4e84-47d4-8976-fadc390904a8', 'S. Dubois', '2026-10-07T10:05:00Z'),
  ('d11a8f7e-2629-4fef-a315-4f73b169279c', 'WO-2026-005', '0fb0df3d-8065-4238-9cde-84cbcc625095', '0494db14-4e84-47d4-8976-fadc390904a8', null, '2026-06-04T11:20:00Z');

insert into documents (id, title, category_id, url, size, uploaded_by, created_at) values
  ('4b5c4165-88f4-4118-83fa-5295d50d49bf', 'Mux Plan v3.2', '8a02e3af-5802-4da0-b7df-775e88ae78dc', '#', '2.4 MB', 'N. Farah', '2026-09-15T10:00:00Z'),
  ('14b89d3d-cbee-4329-8f88-13f3862adbce', 'DARE1 Service Level Agreement', 'bc0b05d0-215c-4fb7-9d39-0945039afa94', '#', '1.1 MB', 'S. Dubois', '2026-08-30T09:20:00Z'),
  ('4f43e5ae-1593-4e40-a404-c9a59f9cd0ff', 'Operations Report Q3 2026', '8d007414-b363-4f02-bbfa-9db41048fd33', '#', '860 KB', 'M. Kiprop', '2026-10-02T16:30:00Z'),
  ('e8378b89-b2fa-4e66-a81f-4b269bf585bc', 'Marine Route Survey 2025', '8a02e3af-5802-4da0-b7df-775e88ae78dc', '#', '12.7 MB', 'A. Hosman', '2026-04-11T08:45:00Z'),
  ('104d4b92-0f9b-4845-a186-31310a1a7d0d', 'Interconnect Agreement — Djibouti Telecom', '09d90956-f3c8-421a-b53b-113d50cd1a33', '#', '640 KB', 'A. Hosman', '2026-05-06T14:12:00Z');

insert into app_users (id, full_name, email, role, phone, is_active, created_at) values
  ('7eb7d5d6-4d8f-4cb9-87bb-9be4bd9eb77c', 'Awale Hosman', 'awale.hosman@dare-net.example', 'admin', '+253 77 82 41 05', true, '2025-10-01T08:00:00Z'),
  ('826f641c-30e2-480d-ad72-0739c4df31e8', 'Nadira Farah', 'n.farah@dare-net.example', 'engineer', '+252 61 552 3340', true, '2025-11-12T08:00:00Z'),
  ('959d125b-e3b6-4d26-91d6-c53ca8196a0c', 'Marcus Kiprop', 'm.kiprop@dare-net.example', 'engineer', '+254 722 118 940', true, '2026-01-08T08:00:00Z'),
  ('1ed3683c-7ddf-4465-aec4-bb801e6798bc', 'Sophie Dubois', 's.dubois@dare-net.example', 'viewer', '+33 6 44 20 18 75', true, '2026-02-19T08:00:00Z'),
  ('2f8d7e46-4afe-4938-9528-a40312a8789b', 'Liban Ahmed', 'l.ahmed@dare-net.example', 'viewer', '+252 63 401 2266', false, '2026-03-27T08:00:00Z');

insert into maintenance_events (id, title, station_id, severity, status_id, description, started_at, resolved_at, created_at) values
  ('14bb16da-c94a-4931-9db2-2718507bc301', 'Fiber cut on segment DJIBOUTI – BOSASO', '6844c28f-3404-4bf2-8384-ff49c9312e1d', 'critical', 'eed1ff46-9b4a-4fa4-bf3e-2777017df482', 'Anchor damage detected near Bosaso. Repair ship dispatched, splicing completed.', '2026-08-14', '2026-08-16', '2026-08-14T06:50:00Z'),
  ('c9a37b78-1824-4b22-9d0d-7754fc8b4b47', 'Optical span loss degradation DJIBOUTI – MOGADISHU', '64db723f-b9d0-49f1-9d6d-a7ec17698950', 'medium', '4627d430-777a-4189-958e-4f59e40b8d53', 'OSNR degradation trend observed on 4 spans. Investigation ongoing.', '2026-09-30', null, '2026-09-30T11:25:00Z'),
  ('3c943dec-66a8-4f84-aecb-c3d4ce87069b', 'Card upgrade at Mombasa NNOB', 'e4f8e690-272b-470f-a43a-ba7720b535c7', 'low', '781ca801-e7ce-44e6-9b2d-4103337012cb', 'Planned amplifier card replacement during the next maintenance window.', '2026-11-01', null, '2026-10-01T09:00:00Z'),
  ('3f6a4297-5704-457e-9464-06aec17e0063', 'Power anomaly at Bosaso NNOB', '6844c28f-3404-4bf2-8384-ff49c9312e1d', 'high', 'eed1ff46-9b4a-4fa4-bf3e-2777017df482', 'Rectifier failure — switched to redundant power feed.', '2026-06-12', '2026-06-13', '2026-06-12T17:40:00Z');

insert into project_phases (id, name, phase_order, status_id, progress, start_date, end_date) values
  ('353b6a82-99ed-4ccb-aae0-aae0d7f390b0', 'System Design & Marine Survey', 1, '9ce6bbe2-94aa-4490-89d4-b4fa2c137598', 100, '2025-02-01', '2025-04-30'),
  ('b1cd8222-f6a9-40d7-8427-e078a6859677', 'Marine Installation & Cable Laying', 2, '9ce6bbe2-94aa-4490-89d4-b4fa2c137598', 100, '2025-05-10', '2025-09-15'),
  ('110d0a89-53e1-4263-90a9-a40857b1f4fd', 'System Integration & Testing', 3, '9ce6bbe2-94aa-4490-89d4-b4fa2c137598', 100, '2025-09-16', '2026-01-20'),
  ('98977872-f298-43fd-919e-76cb5f448b59', 'Ready for Service (RFS) & Acceptance', 4, '6b17bfac-64a5-430a-bc14-0920e5c0e0ae', 75, '2026-01-21', '2026-11-30'),
  ('ade00435-3ca6-4ec8-9d47-3c9cef88e810', 'Phase 1 Capacity Sales', 5, 'b5496731-8509-4c15-9751-d5018ebcad52', 5, '2026-10-01', '2027-03-31');
-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- The app talks to Supabase with the public anon key only (no auth yet), so
-- permissive policies are enabled to keep every screen working out of the box.
-- ⚠️ Before going to production, replace these with authenticated policies
--    (e.g. `using (auth.role() = 'authenticated')`) or add real roles.
-- ----------------------------------------------------------------------------
alter table operators enable row level security;
alter table landing_stations enable row level security;
alter table bandwidths enable row level security;
alter table interface_types enable row level security;
alter table restoration_types enable row level security;
alter table request_types enable row level security;
alter table statuses enable row level security;
alter table backhaul_providers enable row level security;
alter table document_categories enable row level security;
alter table circuits enable row level security;
alter table circuit_requests enable row level security;
alter table work_orders enable row level security;
alter table maintenance_events enable row level security;
alter table documents enable row level security;
alter table app_users enable row level security;
alter table project_phases enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'operators', 'landing_stations', 'bandwidths', 'interface_types',
    'restoration_types', 'request_types', 'statuses', 'backhaul_providers',
    'document_categories', 'circuits', 'circuit_requests', 'work_orders',
    'maintenance_events', 'documents', 'app_users', 'project_phases'
  ]
  loop
    execute format('create policy "anon all" on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Supabase Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'circuits', 'circuit_requests', 'work_orders', 'maintenance_events',
    'documents', 'app_users', 'backhaul_providers', 'project_phases'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;

-- Done ✅

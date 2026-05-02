create extension if not exists pgcrypto;

-- 1) Seed reservations: จองเมล็ดพันธุ์
create table if not exists public.seed_reservations (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid,
  profile_id uuid,
  supplier_id uuid,
  variety_id uuid,
  requested_quantity numeric,
  approved_quantity numeric,
  reservation_date date default current_date,
  desired_pickup_date date,
  status text default 'requested',
  created_by uuid,
  created_by_role text,
  note text,
  created_at timestamptz default now()
);

-- 2) Seed receivables: ลูกหนี้เมล็ดพันธุ์
create table if not exists public.seed_receivables (
  id uuid primary key default gen_random_uuid(),
  seed_sale_id uuid,
  farmer_id uuid,
  profile_id uuid,
  total_amount numeric,
  paid_amount numeric default 0,
  balance_amount numeric,
  due_date date,
  status text default 'open',
  note text,
  created_at timestamptz default now()
);

-- 3) Seed payments: รับชำระเมล็ดพันธุ์
create table if not exists public.seed_payments (
  id uuid primary key default gen_random_uuid(),
  seed_sale_id uuid,
  receivable_id uuid,
  paid_amount numeric,
  payment_date date default current_date,
  payment_method text,
  reference_no text,
  note text,
  created_at timestamptz default now()
);

-- 4) Field calendar events: ปฏิทินงานภาคสนาม
create table if not exists public.field_calendar_events (
  id uuid primary key default gen_random_uuid(),
  event_type text,
  title text,
  description text,
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  service_provider_id uuid,
  related_table text,
  related_id uuid,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  status text default 'scheduled',
  location_lat numeric,
  location_lng numeric,
  note text,
  created_at timestamptz default now()
);

-- 5) Harvest appointments: นัดเกี่ยว / นัดรถ
create table if not exists public.harvest_appointments (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  agri_cycle_id uuid,
  crop_type text,
  requested_date date,
  scheduled_date date,
  service_provider_id uuid,
  harvester_provider_id uuid,
  transport_provider_id uuid,
  expected_qty_ton numeric,
  moisture_percent numeric,
  status text default 'requested',
  note text,
  created_at timestamptz default now()
);

-- 6) Service bookings: จองรถเกี่ยว รถไถ รถขนส่ง
create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  service_type text,
  requested_date date,
  preferred_time text,
  location_lat numeric,
  location_lng numeric,
  status text default 'requested',
  assigned_provider_id uuid,
  note text,
  created_at timestamptz default now()
);

-- 7) Service provider ratings: คะแนนรถเกี่ยว/รถไถ/รถขน
create table if not exists public.service_provider_ratings (
  id uuid primary key default gen_random_uuid(),
  service_provider_id uuid,
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  agri_cycle_id uuid,
  service_booking_id uuid,
  harvest_appointment_id uuid,
  provider_type text,
  score numeric,
  grade text,
  quality_score numeric,
  punctuality_score numeric,
  cleanliness_score numeric,
  loss_score numeric,
  comment text,
  rated_by uuid,
  rated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 8) Crop quality records: คุณภาพผลผลิตที่มาขาย
create table if not exists public.crop_quality_records (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  agri_cycle_id uuid,
  crop_type text,
  sale_date date,
  weight_kg numeric,
  moisture_percent numeric,
  impurity_percent numeric,
  broken_kernel_percent numeric,
  grade text,
  harvester_provider_id uuid,
  transport_provider_id uuid,
  note text,
  created_at timestamptz default now()
);

-- 9) Agri cycles: วงจรเกษตร
create table if not exists public.agri_cycles (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  cycle_name text,
  crop_type text,
  season text,
  year integer,
  start_date date,
  end_date date,
  status text default 'active',
  created_at timestamptz default now()
);

-- 10) Agri cycle stages: ขั้นตอนในวงจร
create table if not exists public.agri_cycle_stages (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid,
  stage_type text,
  stage_name text,
  planned_date date,
  actual_date date,
  residue_management_method text,
  is_no_burn boolean,
  burn_status text,
  evidence_photo_url text,
  lat numeric,
  lng numeric,
  verification_status text default 'pending',
  verified_by uuid,
  verified_at timestamptz,
  note text,
  created_at timestamptz default now()
);

-- 11) Agri cycle financials: รายได้/ค่าใช้จ่าย
create table if not exists public.agri_cycle_financials (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid,
  stage_id uuid,
  item_type text,
  item_category text,
  description text,
  amount numeric,
  quantity numeric,
  unit text,
  unit_price numeric,
  source text,
  created_at timestamptz default now()
);

-- 12) No-burn benefit summary: สรุปผลประโยชน์ไม่เผา
create table if not exists public.no_burn_benefit_summary (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid,
  profile_id uuid,
  farm_id uuid,
  cycle_id uuid,
  total_income numeric default 0,
  total_cost numeric default 0,
  no_burn_income numeric default 0,
  no_burn_extra_cost numeric default 0,
  bonus_amount numeric default 0,
  avoided_cost numeric default 0,
  net_benefit numeric default 0,
  no_burn_benefit numeric default 0,
  calculated_at timestamptz default now()
);

notify pgrst, 'reload schema';

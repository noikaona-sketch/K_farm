-- K-Farm Phase 1: farms, GPS map, no-burn applications, inspection type, audit logs
-- Safe/idempotent migration for existing Supabase schema.

begin;

create extension if not exists pgcrypto;

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  farm_code text,
  farm_name text,
  province text,
  district text,
  subdistrict text,
  village text,
  area_rai numeric,
  center_lat double precision,
  center_lng double precision,
  crop_type text,
  ownership_type text,
  status text not null default 'active',
  verified_status text not null default 'pending_verify',
  source text not null default 'field_staff',
  created_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farms
  add column if not exists profile_id uuid,
  add column if not exists farm_code text,
  add column if not exists farm_name text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists subdistrict text,
  add column if not exists village text,
  add column if not exists area_rai numeric,
  add column if not exists center_lat double precision,
  add column if not exists center_lng double precision,
  add column if not exists crop_type text,
  add column if not exists ownership_type text,
  add column if not exists status text not null default 'active',
  add column if not exists verified_status text not null default 'pending_verify',
  add column if not exists source text not null default 'field_staff',
  add column if not exists created_by uuid,
  add column if not exists verified_by uuid,
  add column if not exists verified_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_farms_profile_id on public.farms(profile_id);
create index if not exists idx_farms_location on public.farms(province, district, subdistrict);
create index if not exists idx_farms_center on public.farms(center_lat, center_lng);
create index if not exists idx_farms_verified_status on public.farms(verified_status);

create table if not exists public.farm_seasons (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete cascade,
  season_year int not null,
  season_name text,
  crop_type text,
  plant_date date,
  expected_harvest_date date,
  harvest_date date,
  burn_status text not null default 'unknown',
  activity_status text not null default 'none',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(farm_id, season_year, season_name)
);

create index if not exists idx_farm_seasons_farm_id on public.farm_seasons(farm_id);
create index if not exists idx_farm_seasons_year on public.farm_seasons(season_year);
create index if not exists idx_farm_seasons_burn_status on public.farm_seasons(burn_status);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  activity_name text not null,
  activity_type text not null default 'no_burn',
  start_date date,
  end_date date,
  status text not null default 'active',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_applications (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  farm_id uuid not null references public.farms(id) on delete cascade,
  farm_season_id uuid references public.farm_seasons(id) on delete set null,
  sale_history_status text not null default 'unknown',
  latest_sale_date date,
  latest_sale_season text,
  admin_review_status text not null default 'pending_review',
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(activity_id, member_id, farm_id)
);

create index if not exists idx_activity_applications_activity_id on public.activity_applications(activity_id);
create index if not exists idx_activity_applications_member_id on public.activity_applications(member_id);
create index if not exists idx_activity_applications_farm_id on public.activity_applications(farm_id);
create index if not exists idx_activity_applications_status on public.activity_applications(status);
create index if not exists idx_activity_applications_admin_review on public.activity_applications(admin_review_status);

alter table public.inspection_tasks
  add column if not exists inspection_type text not null default 'general',
  add column if not exists activity_application_id uuid references public.activity_applications(id) on delete set null,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

create index if not exists idx_inspection_tasks_inspection_type on public.inspection_tasks(inspection_type);
create index if not exists idx_inspection_tasks_activity_application_id on public.inspection_tasks(activity_application_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

create or replace function public.can_do_inspection(p_profile_id uuid, p_inspection_type text)
returns boolean
language sql
stable
as $$
  select case
    when public.has_capability(p_profile_id, 'manage_all') then true
    when public.has_capability(p_profile_id, 'can_inspect') then true
    when p_inspection_type = 'no_burn' and public.has_capability(p_profile_id, 'can_inspect_no_burn') then true
    else false
  end;
$$;

commit;

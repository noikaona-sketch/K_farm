-- K-Farm Identity Foundation Migration
-- Safe migration: add new columns/tables without dropping existing data.
-- Run in Supabase SQL Editor or through Supabase migrations.

begin;

-- Required for gen_random_uuid() on older Supabase projects.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Shared profiles model
-- -----------------------------------------------------------------------------
alter table if exists public.profiles
  add column if not exists base_type text,
  add column if not exists capabilities jsonb not null default '[]'::jsonb,
  add column if not exists grade text,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.profiles
  add constraint profiles_base_type_check
  check (base_type is null or base_type in ('farmer', 'service', 'staff')) not valid;

alter table if exists public.profiles
  add constraint profiles_grade_check
  check (grade is null or grade in ('A', 'B', 'C')) not valid;

alter table if exists public.profiles
  add constraint profiles_capabilities_is_array_check
  check (jsonb_typeof(capabilities) = 'array') not valid;

-- Backfill: keep legacy role working while introducing base_type.
update public.profiles
set base_type = case
  when base_type is not null then base_type
  when role in ('admin', 'staff', 'leader', 'field', 'inspector') then 'staff'
  when role in ('vehicle', 'service', 'driver') then 'service'
  else 'farmer'
end
where base_type is null;

-- Backfill common capabilities from legacy roles if present.
update public.profiles
set capabilities = (
  select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
  from (
    select jsonb_array_elements_text(coalesce(capabilities, '[]'::jsonb)) as cap
    union all select 'is_leader' where role in ('leader')
    union all select 'can_inspect' where role in ('inspector', 'field')
  ) s
)
where role in ('leader', 'inspector', 'field')
  or capabilities is null;

create index if not exists idx_profiles_base_type on public.profiles(base_type);
create index if not exists idx_profiles_grade on public.profiles(grade);
create index if not exists idx_profiles_capabilities_gin on public.profiles using gin(capabilities);

-- -----------------------------------------------------------------------------
-- 2) Farmer profile extension
-- -----------------------------------------------------------------------------
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  province text,
  district text,
  subdistrict text,
  village text,
  farm_name text,
  bank_name text,
  bank_account_no text,
  bank_account_name text,
  total_area numeric,
  area_rai numeric,
  tier text default 'bronze',
  gps_lat numeric,
  gps_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

create index if not exists idx_farmers_profile_id on public.farmers(profile_id);
create index if not exists idx_farmers_status on public.farmers(status);
create index if not exists idx_farmers_location on public.farmers(province, district, subdistrict);

-- -----------------------------------------------------------------------------
-- 3) Service providers / vehicles
-- -----------------------------------------------------------------------------
create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_type text not null check (vehicle_type in ('tractor', 'harvester', 'truck')),
  grade text check (grade in ('A', 'B', 'C')),
  license_plate text,
  vehicle_year int,
  driver_name text,
  driver_phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

create index if not exists idx_service_providers_profile_id on public.service_providers(profile_id);
create index if not exists idx_service_providers_type on public.service_providers(vehicle_type);
create index if not exists idx_service_providers_grade on public.service_providers(grade);
create index if not exists idx_service_providers_status on public.service_providers(status);

-- -----------------------------------------------------------------------------
-- 4) Staff profile extension
-- -----------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  department text not null check (department in ('agri', 'sales', 'stock', 'accounting', 'inspection', 'service', 'it')),
  level text,
  can_fieldwork boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id)
);

create index if not exists idx_staff_profiles_profile_id on public.staff_profiles(profile_id);
create index if not exists idx_staff_profiles_department on public.staff_profiles(department);
create index if not exists idx_staff_profiles_can_fieldwork on public.staff_profiles(can_fieldwork);
create index if not exists idx_staff_profiles_permissions_gin on public.staff_profiles using gin(permissions);

-- -----------------------------------------------------------------------------
-- 5) Farmer groups and QR join flow
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text,
  leader_id uuid references public.profiles(id) on delete set null,
  qr_token text unique,
  qr_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  joined_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  unique(group_id, member_id)
);

create index if not exists idx_groups_leader_id on public.groups(leader_id);
create index if not exists idx_groups_qr_token on public.groups(qr_token);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_member_id on public.group_members(member_id);
create index if not exists idx_group_members_status on public.group_members(status);

-- -----------------------------------------------------------------------------
-- 6) Inspection teams and tasks
-- -----------------------------------------------------------------------------
create table if not exists public.inspect_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid references public.profiles(id) on delete set null,
  qr_token text unique,
  qr_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspect_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.inspect_teams(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  joined_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  unique(team_id, member_id)
);

create table if not exists public.inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.inspect_teams(id) on delete set null,
  member_id uuid references public.profiles(id) on delete set null,
  farmer_id uuid references public.profiles(id) on delete set null,
  farm_id uuid references public.farmers(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'cancelled')),
  due_date date,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inspect_teams_leader_id on public.inspect_teams(leader_id);
create index if not exists idx_inspect_teams_qr_token on public.inspect_teams(qr_token);
create index if not exists idx_inspect_team_members_team_id on public.inspect_team_members(team_id);
create index if not exists idx_inspect_team_members_member_id on public.inspect_team_members(member_id);
create index if not exists idx_inspect_team_members_status on public.inspect_team_members(status);
create index if not exists idx_inspection_tasks_team_id on public.inspection_tasks(team_id);
create index if not exists idx_inspection_tasks_member_id on public.inspection_tasks(member_id);
create index if not exists idx_inspection_tasks_farmer_id on public.inspection_tasks(farmer_id);
create index if not exists idx_inspection_tasks_status on public.inspection_tasks(status);
create index if not exists idx_inspection_tasks_due_date on public.inspection_tasks(due_date);

-- -----------------------------------------------------------------------------
-- 7) Helper functions for capability checks
-- -----------------------------------------------------------------------------
create or replace function public.has_capability(p_profile_id uuid, p_capability text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.capabilities ? p_capability
  );
$$;

create or replace function public.add_capability(p_profile_id uuid, p_capability text)
returns void
language plpgsql
as $$
begin
  update public.profiles
  set capabilities = (
    select jsonb_agg(distinct cap)
    from (
      select jsonb_array_elements_text(coalesce(capabilities, '[]'::jsonb)) as cap
      union all select p_capability
    ) s
  ),
  updated_at = now()
  where id = p_profile_id;
end;
$$;

create or replace function public.remove_capability(p_profile_id uuid, p_capability text)
returns void
language plpgsql
as $$
begin
  update public.profiles
  set capabilities = coalesce((
    select jsonb_agg(cap)
    from jsonb_array_elements_text(coalesce(capabilities, '[]'::jsonb)) cap
    where cap <> p_capability
  ), '[]'::jsonb),
  updated_at = now()
  where id = p_profile_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8) Validate constraints after backfill
-- -----------------------------------------------------------------------------
alter table if exists public.profiles validate constraint profiles_base_type_check;
alter table if exists public.profiles validate constraint profiles_grade_check;
alter table if exists public.profiles validate constraint profiles_capabilities_is_array_check;

commit;

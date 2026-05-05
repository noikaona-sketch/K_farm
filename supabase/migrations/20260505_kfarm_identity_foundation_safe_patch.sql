-- K-Farm Identity Foundation Safe Patch
-- Use this when existing tables already exist with mixed/legacy columns.
-- This script checks columns before creating indexes/constraints.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- profiles: shared identity model
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists base_type text,
  add column if not exists capabilities jsonb not null default '[]'::jsonb,
  add column if not exists grade text,
  add column if not exists updated_at timestamptz not null default now();

-- Add constraints only if missing.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_base_type_check') then
    alter table public.profiles
      add constraint profiles_base_type_check
      check (base_type is null or base_type in ('farmer', 'service', 'staff')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_grade_check') then
    alter table public.profiles
      add constraint profiles_grade_check
      check (grade is null or grade in ('A', 'B', 'C')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_capabilities_is_array_check') then
    alter table public.profiles
      add constraint profiles_capabilities_is_array_check
      check (jsonb_typeof(capabilities) = 'array') not valid;
  end if;
end $$;

-- Backfill profiles safely. Requires role column; skip role mapping if role does not exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'
  ) then
    update public.profiles
    set base_type = case
      when base_type is not null then base_type
      when role in ('admin', 'staff', 'leader', 'field', 'inspector') then 'staff'
      when role in ('vehicle', 'service', 'driver') then 'service'
      else 'farmer'
    end
    where base_type is null;

    update public.profiles
    set capabilities = (
      select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
      from (
        select jsonb_array_elements_text(coalesce(capabilities, '[]'::jsonb)) as cap
        union all select 'is_leader' where role in ('leader')
        union all select 'can_inspect' where role in ('inspector', 'field')
      ) s
    )
    where role in ('leader', 'inspector', 'field') or capabilities is null;
  else
    update public.profiles set base_type = coalesce(base_type, 'farmer') where base_type is null;
  end if;
end $$;

create index if not exists idx_profiles_base_type on public.profiles(base_type);
create index if not exists idx_profiles_grade on public.profiles(grade);
create index if not exists idx_profiles_capabilities_gin on public.profiles using gin(capabilities);

-- -----------------------------------------------------------------------------
-- farmers: add only missing columns to existing table
-- -----------------------------------------------------------------------------
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.farmers
  add column if not exists profile_id uuid,
  add column if not exists code text,
  add column if not exists status text default 'pending',
  add column if not exists member_status text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists subdistrict text,
  add column if not exists village text,
  add column if not exists farm_name text,
  add column if not exists bank_name text,
  add column if not exists bank_account_no text,
  add column if not exists bank_account_name text,
  add column if not exists total_area numeric,
  add column if not exists area_rai numeric,
  add column if not exists tier text default 'bronze',
  add column if not exists gps_lat numeric,
  add column if not exists gps_lng numeric,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists grade text,
  add column if not exists leader_id uuid,
  add column if not exists can_inspect boolean default false,
  add column if not exists updated_at timestamptz not null default now();

-- FK only if missing and column exists.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'farmers' and column_name = 'profile_id'
  ) and not exists (select 1 from pg_constraint where conname = 'farmers_profile_id_fkey') then
    alter table public.farmers
      add constraint farmers_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_farmers_profile_id on public.farmers(profile_id);
create index if not exists idx_farmers_status on public.farmers(status);
create index if not exists idx_farmers_member_status on public.farmers(member_status);
create index if not exists idx_farmers_location on public.farmers(province, district, subdistrict);
create index if not exists idx_farmers_leader_id on public.farmers(leader_id);

-- Sync old farmer flags to new profile model.
update public.profiles p
set base_type = coalesce(p.base_type, 'farmer')
where exists (select 1 from public.farmers f where f.profile_id = p.id);

update public.profiles p
set capabilities = (
  select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
  from (
    select jsonb_array_elements_text(coalesce(p.capabilities, '[]'::jsonb)) as cap
    union all select 'can_inspect'
    where exists (select 1 from public.farmers f where f.profile_id = p.id and f.can_inspect = true)
    union all select 'is_leader'
    where exists (select 1 from public.farmers f where f.profile_id = p.id and f.leader_id is null and f.id in (select leader_id from public.farmers where leader_id is not null))
  ) s
)
where exists (select 1 from public.farmers f where f.profile_id = p.id);

-- -----------------------------------------------------------------------------
-- service providers / vehicles
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
-- staff profiles
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
-- groups and member join flow
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
-- inspection teams and tasks
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
create index if not exists idx_inspection_tasks_farm_id on public.inspection_tasks(farm_id);
create index if not exists idx_inspection_tasks_status on public.inspection_tasks(status);
create index if not exists idx_inspection_tasks_due_date on public.inspection_tasks(due_date);

-- -----------------------------------------------------------------------------
-- capability helpers
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
    select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
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

-- Validate new constraints. If this fails, existing dirty data must be cleaned first.
alter table public.profiles validate constraint profiles_base_type_check;
alter table public.profiles validate constraint profiles_grade_check;
alter table public.profiles validate constraint profiles_capabilities_is_array_check;

commit;

-- K-Farm Step 3: service providers, groups, and inspection tables
-- Run after STEP 1 and STEP 2 passed.
-- This script does not alter existing farmers columns except FK references from new tables.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Service providers / vehicles
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

-- Keep profile base_type/grade aligned for existing service rows.
update public.profiles p
set base_type = 'service',
    grade = coalesce(p.grade, sp.grade, 'C'),
    updated_at = now()
from public.service_providers sp
where sp.profile_id = p.id;

-- -----------------------------------------------------------------------------
-- Staff profile extension
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

update public.profiles p
set base_type = 'staff',
    updated_at = now()
from public.staff_profiles sp
where sp.profile_id = p.id;

-- -----------------------------------------------------------------------------
-- Farmer groups and QR join flow
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
create index if not exists idx_groups_qr_expires_at on public.groups(qr_expires_at);
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_member_id on public.group_members(member_id);
create index if not exists idx_group_members_status on public.group_members(status);

-- Group leaders get is_leader capability.
update public.profiles p
set capabilities = (
  select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
  from (
    select jsonb_array_elements_text(coalesce(p.capabilities, '[]'::jsonb)) as cap
    union all select 'is_leader'
  ) s
),
updated_at = now()
where exists (select 1 from public.groups g where g.leader_id = p.id);

-- -----------------------------------------------------------------------------
-- Inspection teams and tasks
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
create index if not exists idx_inspect_teams_qr_expires_at on public.inspect_teams(qr_expires_at);
create index if not exists idx_inspect_team_members_team_id on public.inspect_team_members(team_id);
create index if not exists idx_inspect_team_members_member_id on public.inspect_team_members(member_id);
create index if not exists idx_inspect_team_members_status on public.inspect_team_members(status);
create index if not exists idx_inspection_tasks_team_id on public.inspection_tasks(team_id);
create index if not exists idx_inspection_tasks_member_id on public.inspection_tasks(member_id);
create index if not exists idx_inspection_tasks_farmer_id on public.inspection_tasks(farmer_id);
create index if not exists idx_inspection_tasks_farm_id on public.inspection_tasks(farm_id);
create index if not exists idx_inspection_tasks_status on public.inspection_tasks(status);
create index if not exists idx_inspection_tasks_due_date on public.inspection_tasks(due_date);

-- Inspect team leaders get both is_leader and can_inspect.
update public.profiles p
set capabilities = (
  select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
  from (
    select jsonb_array_elements_text(coalesce(p.capabilities, '[]'::jsonb)) as cap
    union all select 'is_leader'
    union all select 'can_inspect'
  ) s
),
updated_at = now()
where exists (select 1 from public.inspect_teams t where t.leader_id = p.id);

-- Active inspect members get can_inspect.
update public.profiles p
set capabilities = (
  select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
  from (
    select jsonb_array_elements_text(coalesce(p.capabilities, '[]'::jsonb)) as cap
    union all select 'can_inspect'
  ) s
),
updated_at = now()
where exists (
  select 1 from public.inspect_team_members m
  where m.member_id = p.id and m.status = 'active'
);

commit;

-- Checks after run:
-- select table_name from information_schema.tables where table_schema = 'public' and table_name in ('service_providers','staff_profiles','groups','group_members','inspect_teams','inspect_team_members','inspection_tasks');
-- select full_name, base_type, capabilities, grade from public.profiles limit 20;

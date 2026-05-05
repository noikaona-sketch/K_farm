-- K-Farm STEP 3 SAFE: service providers, staff, groups, inspection
-- Use this instead of 20260505_step3_service_groups_inspection.sql if you got:
-- ERROR: column "profile_id" does not exist

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- service_providers: create if missing, then add columns if the table already existed
-- -----------------------------------------------------------------------------
create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.service_providers
  add column if not exists profile_id uuid,
  add column if not exists vehicle_type text,
  add column if not exists grade text,
  add column if not exists license_plate text,
  add column if not exists vehicle_year int,
  add column if not exists driver_name text,
  add column if not exists driver_phone text,
  add column if not exists status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'service_providers_profile_id_fkey') then
    alter table public.service_providers
      add constraint service_providers_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_service_providers_profile_id on public.service_providers(profile_id);
create index if not exists idx_service_providers_type on public.service_providers(vehicle_type);
create index if not exists idx_service_providers_grade on public.service_providers(grade);
create index if not exists idx_service_providers_status on public.service_providers(status);

update public.profiles p
set base_type = 'service',
    grade = coalesce(p.grade, sp.grade, 'C'),
    updated_at = now()
from public.service_providers sp
where sp.profile_id = p.id;

-- -----------------------------------------------------------------------------
-- staff_profiles
-- -----------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.staff_profiles
  add column if not exists profile_id uuid,
  add column if not exists department text,
  add column if not exists level text,
  add column if not exists can_fieldwork boolean not null default false,
  add column if not exists permissions jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'staff_profiles_profile_id_fkey') then
    alter table public.staff_profiles
      add constraint staff_profiles_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

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
-- groups
-- -----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.groups
  add column if not exists name text,
  add column if not exists zone text,
  add column if not exists leader_id uuid,
  add column if not exists qr_token text,
  add column if not exists qr_expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'groups_leader_id_fkey') then
    alter table public.groups
      add constraint groups_leader_id_fkey
      foreign key (leader_id) references public.profiles(id) on delete set null;
  end if;
end $$;

create unique index if not exists idx_groups_qr_token_unique on public.groups(qr_token) where qr_token is not null;
create index if not exists idx_groups_leader_id on public.groups(leader_id);
create index if not exists idx_groups_qr_expires_at on public.groups(qr_expires_at);

-- -----------------------------------------------------------------------------
-- group_members
-- -----------------------------------------------------------------------------
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.group_members
  add column if not exists group_id uuid,
  add column if not exists member_id uuid,
  add column if not exists status text not null default 'pending',
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'group_members_group_id_fkey') then
    alter table public.group_members
      add constraint group_members_group_id_fkey
      foreign key (group_id) references public.groups(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'group_members_member_id_fkey') then
    alter table public.group_members
      add constraint group_members_member_id_fkey
      foreign key (member_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'group_members_approved_by_fkey') then
    alter table public.group_members
      add constraint group_members_approved_by_fkey
      foreign key (approved_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create unique index if not exists idx_group_members_unique on public.group_members(group_id, member_id) where group_id is not null and member_id is not null;
create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_member_id on public.group_members(member_id);
create index if not exists idx_group_members_status on public.group_members(status);

-- Group leaders get is_leader.
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
-- inspect_teams
-- -----------------------------------------------------------------------------
create table if not exists public.inspect_teams (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.inspect_teams
  add column if not exists name text,
  add column if not exists leader_id uuid,
  add column if not exists qr_token text,
  add column if not exists qr_expires_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inspect_teams_leader_id_fkey') then
    alter table public.inspect_teams
      add constraint inspect_teams_leader_id_fkey
      foreign key (leader_id) references public.profiles(id) on delete set null;
  end if;
end $$;

create unique index if not exists idx_inspect_teams_qr_token_unique on public.inspect_teams(qr_token) where qr_token is not null;
create index if not exists idx_inspect_teams_leader_id on public.inspect_teams(leader_id);
create index if not exists idx_inspect_teams_qr_expires_at on public.inspect_teams(qr_expires_at);

-- -----------------------------------------------------------------------------
-- inspect_team_members
-- -----------------------------------------------------------------------------
create table if not exists public.inspect_team_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.inspect_team_members
  add column if not exists team_id uuid,
  add column if not exists member_id uuid,
  add column if not exists status text not null default 'pending',
  add column if not exists joined_at timestamptz not null default now(),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inspect_team_members_team_id_fkey') then
    alter table public.inspect_team_members
      add constraint inspect_team_members_team_id_fkey
      foreign key (team_id) references public.inspect_teams(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspect_team_members_member_id_fkey') then
    alter table public.inspect_team_members
      add constraint inspect_team_members_member_id_fkey
      foreign key (member_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspect_team_members_approved_by_fkey') then
    alter table public.inspect_team_members
      add constraint inspect_team_members_approved_by_fkey
      foreign key (approved_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create unique index if not exists idx_inspect_team_members_unique on public.inspect_team_members(team_id, member_id) where team_id is not null and member_id is not null;
create index if not exists idx_inspect_team_members_team_id on public.inspect_team_members(team_id);
create index if not exists idx_inspect_team_members_member_id on public.inspect_team_members(member_id);
create index if not exists idx_inspect_team_members_status on public.inspect_team_members(status);

-- -----------------------------------------------------------------------------
-- inspection_tasks
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.inspection_tasks
  add column if not exists team_id uuid,
  add column if not exists member_id uuid,
  add column if not exists farmer_id uuid,
  add column if not exists farm_id uuid,
  add column if not exists assigned_by uuid,
  add column if not exists assigned_at timestamptz not null default now(),
  add column if not exists status text not null default 'pending',
  add column if not exists due_date date,
  add column if not exists result jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_team_id_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_team_id_fkey
      foreign key (team_id) references public.inspect_teams(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_member_id_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_member_id_fkey
      foreign key (member_id) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_farmer_id_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_farmer_id_fkey
      foreign key (farmer_id) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_farm_id_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_farm_id_fkey
      foreign key (farm_id) references public.farmers(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_assigned_by_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_assigned_by_fkey
      foreign key (assigned_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists idx_inspection_tasks_team_id on public.inspection_tasks(team_id);
create index if not exists idx_inspection_tasks_member_id on public.inspection_tasks(member_id);
create index if not exists idx_inspection_tasks_farmer_id on public.inspection_tasks(farmer_id);
create index if not exists idx_inspection_tasks_farm_id on public.inspection_tasks(farm_id);
create index if not exists idx_inspection_tasks_status on public.inspection_tasks(status);
create index if not exists idx_inspection_tasks_due_date on public.inspection_tasks(due_date);

-- Inspect team leaders get both capabilities.
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

-- Check after run:
-- select table_name from information_schema.tables
-- where table_schema = 'public'
-- and table_name in ('service_providers','staff_profiles','groups','group_members','inspect_teams','inspect_team_members','inspection_tasks');

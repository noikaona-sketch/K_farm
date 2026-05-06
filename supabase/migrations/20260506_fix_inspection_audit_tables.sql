-- Fix missing inspection task columns and audit_logs table for no-burn flow.
-- Safe/idempotent patch for Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- inspection_tasks
-- -----------------------------------------------------------------------------
create table if not exists public.inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  member_id uuid,
  farmer_id uuid,
  farm_id uuid,
  assigned_by uuid,
  assigned_at timestamptz not null default now(),
  status text not null default 'pending',
  due_date date,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  add column if not exists inspection_type text not null default 'general',
  add column if not exists activity_application_id uuid,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs
  add column if not exists actor_id uuid,
  add column if not exists action text,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- Cleanup orphan FK values before adding constraints.
-- -----------------------------------------------------------------------------
update public.inspection_tasks t
set member_id = null
where member_id is not null
  and not exists (select 1 from public.profiles p where p.id = t.member_id);

update public.inspection_tasks t
set farmer_id = null
where farmer_id is not null
  and not exists (select 1 from public.profiles p where p.id = t.farmer_id);

update public.inspection_tasks t
set assigned_by = null
where assigned_by is not null
  and not exists (select 1 from public.profiles p where p.id = t.assigned_by);

update public.inspection_tasks t
set approved_by = null
where approved_by is not null
  and not exists (select 1 from public.profiles p where p.id = t.approved_by);

update public.inspection_tasks t
set farm_id = null
where farm_id is not null
  and not exists (select 1 from public.farms f where f.id = t.farm_id);

update public.inspection_tasks t
set activity_application_id = null
where activity_application_id is not null
  and not exists (select 1 from public.activity_applications a where a.id = t.activity_application_id);

update public.audit_logs a
set actor_id = null
where actor_id is not null
  and not exists (select 1 from public.profiles p where p.id = a.actor_id);

-- -----------------------------------------------------------------------------
-- FK constraints
-- -----------------------------------------------------------------------------
do $$
begin
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
      foreign key (farm_id) references public.farms(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_assigned_by_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_assigned_by_fkey
      foreign key (assigned_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_approved_by_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_approved_by_fkey
      foreign key (approved_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'inspection_tasks_activity_application_id_fkey') then
    alter table public.inspection_tasks
      add constraint inspection_tasks_activity_application_id_fkey
      foreign key (activity_application_id) references public.activity_applications(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'audit_logs_actor_id_fkey') then
    alter table public.audit_logs
      add constraint audit_logs_actor_id_fkey
      foreign key (actor_id) references public.profiles(id) on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_inspection_tasks_team_id on public.inspection_tasks(team_id);
create index if not exists idx_inspection_tasks_member_id on public.inspection_tasks(member_id);
create index if not exists idx_inspection_tasks_farmer_id on public.inspection_tasks(farmer_id);
create index if not exists idx_inspection_tasks_farm_id on public.inspection_tasks(farm_id);
create index if not exists idx_inspection_tasks_status on public.inspection_tasks(status);
create index if not exists idx_inspection_tasks_due_date on public.inspection_tasks(due_date);
create index if not exists idx_inspection_tasks_inspection_type on public.inspection_tasks(inspection_type);
create index if not exists idx_inspection_tasks_activity_application_id on public.inspection_tasks(activity_application_id);

create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at);

commit;

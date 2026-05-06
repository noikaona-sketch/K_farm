-- Fix missing no-burn tables used by /farmer/no-burn and /admin/no-burn.
-- Safe/idempotent patch for Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- activities
-- -----------------------------------------------------------------------------
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  activity_name text not null,
  activity_type text not null default 'no_burn',
  start_date date,
  end_date date,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activities
  add column if not exists activity_name text,
  add column if not exists activity_type text not null default 'no_burn',
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists status text not null default 'active',
  add column if not exists created_by uuid,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Ensure there is at least one active no-burn activity for the UI.
insert into public.activities (activity_name, activity_type, status)
select 'กิจกรรมไม่เผา', 'no_burn', 'active'
where not exists (
  select 1 from public.activities
  where activity_type = 'no_burn' and status = 'active'
);

-- -----------------------------------------------------------------------------
-- activity_applications
-- -----------------------------------------------------------------------------
create table if not exists public.activity_applications (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  member_id uuid not null,
  farm_id uuid not null,
  farm_season_id uuid,
  sale_history_status text not null default 'unknown',
  latest_sale_date date,
  latest_sale_season text,
  admin_review_status text not null default 'pending_review',
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.activity_applications
  add column if not exists activity_id uuid,
  add column if not exists member_id uuid,
  add column if not exists farm_id uuid,
  add column if not exists farm_season_id uuid,
  add column if not exists sale_history_status text not null default 'unknown',
  add column if not exists latest_sale_date date,
  add column if not exists latest_sale_season text,
  add column if not exists admin_review_status text not null default 'pending_review',
  add column if not exists status text not null default 'submitted',
  add column if not exists submitted_at timestamptz not null default now(),
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- -----------------------------------------------------------------------------
-- FK constraints: add only after tables exist.
-- Keep FK guarded and nullable-friendly for legacy data.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'activities_created_by_fkey') then
    alter table public.activities
      add constraint activities_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_applications_activity_id_fkey') then
    alter table public.activity_applications
      add constraint activity_applications_activity_id_fkey
      foreign key (activity_id) references public.activities(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_applications_member_id_fkey') then
    alter table public.activity_applications
      add constraint activity_applications_member_id_fkey
      foreign key (member_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_applications_farm_id_fkey') then
    alter table public.activity_applications
      add constraint activity_applications_farm_id_fkey
      foreign key (farm_id) references public.farms(id) on delete cascade;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'farm_seasons') then
    if not exists (select 1 from pg_constraint where conname = 'activity_applications_farm_season_id_fkey') then
      alter table public.activity_applications
        add constraint activity_applications_farm_season_id_fkey
        foreign key (farm_season_id) references public.farm_seasons(id) on delete set null;
    end if;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'activity_applications_reviewed_by_fkey') then
    alter table public.activity_applications
      add constraint activity_applications_reviewed_by_fkey
      foreign key (reviewed_by) references public.profiles(id) on delete set null;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists idx_activities_type_status on public.activities(activity_type, status);
create index if not exists idx_activity_applications_activity_id on public.activity_applications(activity_id);
create index if not exists idx_activity_applications_member_id on public.activity_applications(member_id);
create index if not exists idx_activity_applications_farm_id on public.activity_applications(farm_id);
create index if not exists idx_activity_applications_status on public.activity_applications(status);
create index if not exists idx_activity_applications_admin_review on public.activity_applications(admin_review_status);

commit;

-- Fix missing tables/columns for Admin Quick Create: vehicles/service providers and staff.
-- Safe/idempotent patch for Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- service_providers
-- -----------------------------------------------------------------------------
create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  vehicle_type text not null default 'truck',
  grade text default 'C',
  license_plate text,
  vehicle_year int,
  driver_name text,
  driver_phone text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_providers
  add column if not exists profile_id uuid,
  add column if not exists vehicle_type text not null default 'truck',
  add column if not exists grade text default 'C',
  add column if not exists license_plate text,
  add column if not exists vehicle_year int,
  add column if not exists driver_name text,
  add column if not exists driver_phone text,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Cleanup orphan profile ids before FK.
update public.service_providers s
set profile_id = null
where profile_id is not null
  and not exists (select 1 from public.profiles p where p.id = s.profile_id);

-- -----------------------------------------------------------------------------
-- staff_profiles
-- -----------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid,
  department text not null default 'agri',
  level text,
  can_fieldwork boolean not null default false,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_profiles
  add column if not exists profile_id uuid,
  add column if not exists department text not null default 'agri',
  add column if not exists level text,
  add column if not exists can_fieldwork boolean not null default false,
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.staff_profiles
set permissions = '[]'::jsonb
where permissions is null;

-- Cleanup orphan profile ids before FK.
update public.staff_profiles s
set profile_id = null
where profile_id is not null
  and not exists (select 1 from public.profiles p where p.id = s.profile_id);

-- -----------------------------------------------------------------------------
-- FKs and indexes
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'service_providers_profile_id_fkey') then
    alter table public.service_providers
      add constraint service_providers_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'staff_profiles_profile_id_fkey') then
    alter table public.staff_profiles
      add constraint staff_profiles_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'staff_profiles_permissions_is_array_check') then
    alter table public.staff_profiles
      add constraint staff_profiles_permissions_is_array_check
      check (jsonb_typeof(permissions) = 'array') not valid;
  end if;
end $$;

create index if not exists idx_service_providers_profile_id on public.service_providers(profile_id);
create index if not exists idx_service_providers_type on public.service_providers(vehicle_type);
create index if not exists idx_service_providers_status on public.service_providers(status);
create index if not exists idx_service_providers_grade on public.service_providers(grade);

create index if not exists idx_staff_profiles_profile_id on public.staff_profiles(profile_id);
create index if not exists idx_staff_profiles_department on public.staff_profiles(department);
create index if not exists idx_staff_profiles_can_fieldwork on public.staff_profiles(can_fieldwork);
create index if not exists idx_staff_profiles_permissions_gin on public.staff_profiles using gin(permissions);

commit;

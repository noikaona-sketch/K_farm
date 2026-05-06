-- Fix orphan farms.profile_id values before adding FK.
-- Run this if FK creation fails because farms.profile_id is not present in profiles.id.

begin;

create extension if not exists pgcrypto;

create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
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
  add column if not exists verified_at timestamptz;

-- Copy only valid farmer_id values into profile_id when farmer_id exists and matches profiles.id.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'farms' and column_name = 'farmer_id'
  ) then
    execute '
      update public.farms f
      set profile_id = f.farmer_id
      where f.profile_id is null
        and f.farmer_id is not null
        and exists (select 1 from public.profiles p where p.id = f.farmer_id)
    ';
  end if;
end $$;

-- Clear orphan profile_id values that do not exist in profiles.
update public.farms f
set profile_id = null
where f.profile_id is not null
  and not exists (
    select 1 from public.profiles p where p.id = f.profile_id
  );

-- Add FK after orphan cleanup.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'farms_profile_id_fkey') then
    alter table public.farms
      add constraint farms_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farms_created_by_fkey') then
    alter table public.farms
      add constraint farms_created_by_fkey
      foreign key (created_by) references public.profiles(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'farms_verified_by_fkey') then
    alter table public.farms
      add constraint farms_verified_by_fkey
      foreign key (verified_by) references public.profiles(id) on delete set null;
  end if;
end $$;

create index if not exists idx_farms_profile_id on public.farms(profile_id);
create index if not exists idx_farms_location on public.farms(province, district, subdistrict);
create index if not exists idx_farms_center on public.farms(center_lat, center_lng);
create index if not exists idx_farms_verified_status on public.farms(verified_status);

commit;

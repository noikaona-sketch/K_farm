-- Fix missing profiles columns used by /admin/roles and member permission management.
-- Safe/idempotent patch for Supabase SQL Editor.

begin;

-- Ensure required profile columns exist.
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists id_card text,
  add column if not exists role text default 'member',
  add column if not exists base_type text,
  add column if not exists capabilities jsonb not null default '[]'::jsonb,
  add column if not exists grade text default 'C',
  add column if not exists department text,
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists address text,
  add column if not exists province text,
  add column if not exists district text,
  add column if not exists subdistrict text,
  add column if not exists village text,
  add column if not exists status text,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize null json values.
update public.profiles
set capabilities = '[]'::jsonb
where capabilities is null;

update public.profiles
set permissions = '[]'::jsonb
where permissions is null;

-- Backfill base_type from role when empty.
update public.profiles
set base_type = case
  when role in ('vehicle', 'service', 'driver') then 'service'
  when role in ('admin', 'staff', 'field', 'inspector', 'leader') then 'staff'
  else 'farmer'
end
where base_type is null;

-- Backfill capabilities from legacy role when empty.
update public.profiles
set capabilities = (
  select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
  from (
    select jsonb_array_elements_text(coalesce(public.profiles.capabilities, '[]'::jsonb)) as cap
    union all select 'is_leader' where role = 'leader'
    union all select 'can_inspect' where role = 'inspector'
    union all select 'manage_all' where role = 'admin'
  ) s
)
where capabilities = '[]'::jsonb
  and role in ('leader', 'inspector', 'admin');

-- Add safe checks only if missing.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_base_type_check') then
    alter table public.profiles
      add constraint profiles_base_type_check
      check (base_type is null or base_type in ('farmer', 'service', 'staff')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_capabilities_is_array_check') then
    alter table public.profiles
      add constraint profiles_capabilities_is_array_check
      check (jsonb_typeof(capabilities) = 'array') not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'profiles_permissions_is_array_check') then
    alter table public.profiles
      add constraint profiles_permissions_is_array_check
      check (jsonb_typeof(permissions) = 'array') not valid;
  end if;
end $$;

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_base_type on public.profiles(base_type);
create index if not exists idx_profiles_grade on public.profiles(grade);
create index if not exists idx_profiles_department on public.profiles(department);
create index if not exists idx_profiles_location on public.profiles(province, district, subdistrict);
create index if not exists idx_profiles_capabilities_gin on public.profiles using gin(capabilities);
create index if not exists idx_profiles_permissions_gin on public.profiles using gin(permissions);

commit;

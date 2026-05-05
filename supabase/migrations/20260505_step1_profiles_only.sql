-- K-Farm Step 1: profiles only
-- Run this first. It does not touch farmers/service/inspection tables.

begin;

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists base_type text,
  add column if not exists capabilities jsonb not null default '[]'::jsonb,
  add column if not exists grade text,
  add column if not exists updated_at timestamptz not null default now();

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

-- Backfill base_type from legacy role if role exists.
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
    update public.profiles
    set base_type = coalesce(base_type, 'farmer')
    where base_type is null;
  end if;
end $$;

create index if not exists idx_profiles_base_type on public.profiles(base_type);
create index if not exists idx_profiles_grade on public.profiles(grade);
create index if not exists idx_profiles_capabilities_gin on public.profiles using gin(capabilities);

alter table public.profiles validate constraint profiles_base_type_check;
alter table public.profiles validate constraint profiles_grade_check;
alter table public.profiles validate constraint profiles_capabilities_is_array_check;

commit;

-- Check after run:
-- select id, full_name, role, base_type, capabilities, grade from public.profiles limit 20;

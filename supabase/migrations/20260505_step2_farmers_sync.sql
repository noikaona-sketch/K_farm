-- K-Farm Step 2: farmers sync only
-- Run after 20260505_step1_profiles_only.sql has passed.
-- This script only touches public.farmers + public.profiles.

begin;

-- Ensure farmer legacy/new columns exist.
alter table public.farmers
  add column if not exists profile_id uuid,
  add column if not exists status text default 'pending',
  add column if not exists member_status text,
  add column if not exists grade text,
  add column if not exists leader_id uuid,
  add column if not exists can_inspect boolean default false,
  add column if not exists updated_at timestamptz not null default now();

-- Add FK only if it does not exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'farmers_profile_id_fkey') then
    alter table public.farmers
      add constraint farmers_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- Indexes that are safe with your current farmers schema.
create index if not exists idx_farmers_profile_id on public.farmers(profile_id);
create index if not exists idx_farmers_status on public.farmers(status);
create index if not exists idx_farmers_member_status on public.farmers(member_status);
create index if not exists idx_farmers_grade on public.farmers(grade);
create index if not exists idx_farmers_leader_id on public.farmers(leader_id);
create index if not exists idx_farmers_can_inspect on public.farmers(can_inspect);
create index if not exists idx_farmers_location on public.farmers(province, district, subdistrict);

-- Backfill profiles from farmers.
update public.profiles p
set
  base_type = coalesce(p.base_type, 'farmer'),
  grade = coalesce(p.grade, f.grade, 'C'),
  updated_at = now()
from public.farmers f
where f.profile_id = p.id;

-- Sync can_inspect boolean to capabilities.
update public.profiles p
set
  capabilities = (
    select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
    from (
      select jsonb_array_elements_text(coalesce(p.capabilities, '[]'::jsonb)) as cap
      union all
      select 'can_inspect'
      where exists (
        select 1 from public.farmers f
        where f.profile_id = p.id and coalesce(f.can_inspect, false) = true
      )
    ) s
  ),
  updated_at = now()
where exists (select 1 from public.farmers f where f.profile_id = p.id);

-- Sync leader_id relation to capabilities.
-- If a profile is referenced as a leader_id by any farmer row, mark it as is_leader.
update public.profiles p
set
  capabilities = (
    select coalesce(jsonb_agg(distinct cap), '[]'::jsonb)
    from (
      select jsonb_array_elements_text(coalesce(p.capabilities, '[]'::jsonb)) as cap
      union all
      select 'is_leader'
      where exists (
        select 1 from public.farmers f
        where f.leader_id = p.id
      )
    ) s
  ),
  updated_at = now()
where exists (select 1 from public.farmers f where f.leader_id = p.id);

commit;

-- Check after run:
-- select p.full_name, p.base_type, p.capabilities, p.grade, f.status, f.can_inspect
-- from public.profiles p
-- left join public.farmers f on f.profile_id = p.id
-- limit 20;

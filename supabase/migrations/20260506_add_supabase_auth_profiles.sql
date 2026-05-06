-- Supabase Auth foundation for Admin/Staff workflows.
-- Adds profiles.auth_user_id and helper functions used by RLS policies.

begin;

-- Link app profile to Supabase auth user.
alter table public.profiles
  add column if not exists auth_user_id uuid,
  add column if not exists email text;

-- Avoid duplicate auth mapping.
create unique index if not exists idx_profiles_auth_user_id_unique
on public.profiles(auth_user_id)
where auth_user_id is not null;

create index if not exists idx_profiles_email on public.profiles(email);

-- FK to auth.users. Supabase allows referencing auth.users from public schema.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_auth_user_id_fkey') then
    alter table public.profiles
      add constraint profiles_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- Current profile id from auth.uid().
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

-- Check capability of current auth user.
create or replace function public.current_user_has_capability(p_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and coalesce(p.capabilities, '[]'::jsonb) ? p_capability
  );
$$;

-- Check permission of current auth user.
create or replace function public.current_user_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and (
        coalesce(p.permissions, '[]'::jsonb) ? p_permission
        or coalesce(p.permissions, '[]'::jsonb) ? 'system.all'
        or coalesce(p.capabilities, '[]'::jsonb) ? 'manage_all'
      )
  );
$$;

-- Admin checker for RLS.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_has_capability('manage_all')
      or public.current_user_has_permission('system.all');
$$;

commit;

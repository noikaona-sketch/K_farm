-- RLS policies for Admin core workflows.
-- Covers: profiles, staff_profiles, service_providers.
-- Requires migration: 20260506_add_supabase_auth_profiles.sql

begin;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Read own profile or admin can read all.
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_user_is_admin()
);

-- Admin can insert profiles.
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
on public.profiles
for insert
to authenticated
with check (
  public.current_user_is_admin()
);

-- User can update own basic profile; admin can update all.
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_user_is_admin()
)
with check (
  auth_user_id = auth.uid()
  or public.current_user_is_admin()
);

-- Admin can delete profiles if needed.
drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
on public.profiles
for delete
to authenticated
using (
  public.current_user_is_admin()
);

-- -----------------------------------------------------------------------------
-- staff_profiles
-- -----------------------------------------------------------------------------
alter table public.staff_profiles enable row level security;

-- Staff can read own staff profile; admin can read all.
drop policy if exists staff_profiles_select_self_or_admin on public.staff_profiles;
create policy staff_profiles_select_self_or_admin
on public.staff_profiles
for select
to authenticated
using (
  public.current_user_is_admin()
  or exists (
    select 1
    from public.profiles p
    where p.id = staff_profiles.profile_id
      and p.auth_user_id = auth.uid()
  )
);

-- Admin can create staff profile rows.
drop policy if exists staff_profiles_insert_admin on public.staff_profiles;
create policy staff_profiles_insert_admin
on public.staff_profiles
for insert
to authenticated
with check (
  public.current_user_is_admin()
);

-- Admin can update staff profile rows.
drop policy if exists staff_profiles_update_admin on public.staff_profiles;
create policy staff_profiles_update_admin
on public.staff_profiles
for update
to authenticated
using (
  public.current_user_is_admin()
)
with check (
  public.current_user_is_admin()
);

-- Admin can delete staff profile rows.
drop policy if exists staff_profiles_delete_admin on public.staff_profiles;
create policy staff_profiles_delete_admin
on public.staff_profiles
for delete
to authenticated
using (
  public.current_user_is_admin()
);

-- -----------------------------------------------------------------------------
-- service_providers
-- -----------------------------------------------------------------------------
alter table public.service_providers enable row level security;

-- Service user can read own service row; admin/service editors can read all.
drop policy if exists service_providers_select_self_or_admin on public.service_providers;
create policy service_providers_select_self_or_admin
on public.service_providers
for select
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('service.view')
  or exists (
    select 1
    from public.profiles p
    where p.id = service_providers.profile_id
      and p.auth_user_id = auth.uid()
  )
);

-- Admin/service editors can create service providers.
drop policy if exists service_providers_insert_admin_or_service_editor on public.service_providers;
create policy service_providers_insert_admin_or_service_editor
on public.service_providers
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('service.edit')
);

-- Admin/service editors can update service providers.
drop policy if exists service_providers_update_admin_or_service_editor on public.service_providers;
create policy service_providers_update_admin_or_service_editor
on public.service_providers
for update
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('service.edit')
)
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('service.edit')
);

-- Admin/service editors can delete service provider rows.
drop policy if exists service_providers_delete_admin_or_service_editor on public.service_providers;
create policy service_providers_delete_admin_or_service_editor
on public.service_providers
for delete
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('service.edit')
);

commit;

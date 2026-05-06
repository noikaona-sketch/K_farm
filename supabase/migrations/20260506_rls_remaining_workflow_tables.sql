-- Complete RLS policies for remaining Admin/Staff workflow tables.
-- Covers: farmers, farms, activity_applications, inspection_tasks, audit_logs.
-- Requires:
--   20260506_add_supabase_auth_profiles.sql
--   20260506_rls_admin_core_tables.sql
--
-- Notes:
-- This migration is defensive because some environments may not have every
-- optional workflow table/column yet. Policies are only created when the needed
-- table and columns exist.

begin;

-- -----------------------------------------------------------------------------
-- Helper functions for defensive migration checks.
-- -----------------------------------------------------------------------------
create or replace function public._kfarm_table_exists(p_table text)
returns boolean
language sql
stable
as $$
  select to_regclass('public.' || p_table) is not null;
$$;

create or replace function public._kfarm_column_exists(p_table text, p_column text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table
      and column_name = p_column
  );
$$;

do $$
declare
  has_profile_id boolean;
  has_farmer_id boolean;
  has_assigned_to_profile_id boolean;
  has_inspector_profile_id boolean;
  has_service_provider_profile_id boolean;
begin
  -- ---------------------------------------------------------------------------
  -- farmers
  -- Needs: profile_id
  -- ---------------------------------------------------------------------------
  if public._kfarm_table_exists('farmers') then
    has_profile_id := public._kfarm_column_exists('farmers', 'profile_id');

    execute 'alter table public.farmers enable row level security';

    if has_profile_id then
      execute 'drop policy if exists farmers_select_self_or_admin on public.farmers';
      execute $policy$
        create policy farmers_select_self_or_admin
        on public.farmers
        for select
        to authenticated
        using (
          public.current_user_is_admin()
          or public.current_user_has_permission(''member.view'')
          or public.current_user_has_permission(''member.approve'')
          or profile_id = public.current_profile_id()
        )
      $policy$;

      execute 'drop policy if exists farmers_insert_self_or_admin on public.farmers';
      execute $policy$
        create policy farmers_insert_self_or_admin
        on public.farmers
        for insert
        to authenticated
        with check (
          public.current_user_is_admin()
          or public.current_user_has_permission(''member.approve'')
          or profile_id = public.current_profile_id()
        )
      $policy$;

      execute 'drop policy if exists farmers_update_self_or_admin on public.farmers';
      execute $policy$
        create policy farmers_update_self_or_admin
        on public.farmers
        for update
        to authenticated
        using (
          public.current_user_is_admin()
          or public.current_user_has_permission(''member.approve'')
          or profile_id = public.current_profile_id()
        )
        with check (
          public.current_user_is_admin()
          or public.current_user_has_permission(''member.approve'')
          or profile_id = public.current_profile_id()
        )
      $policy$;
    else
      raise notice 'Skip owner/self farmers policies: public.farmers.profile_id does not exist';
    end if;

    execute 'drop policy if exists farmers_delete_admin on public.farmers';
    execute $policy$
      create policy farmers_delete_admin
      on public.farmers
      for delete
      to authenticated
      using (public.current_user_is_admin())
    $policy$;
  end if;

  -- ---------------------------------------------------------------------------
  -- farms
  -- Supports owner checks by profile_id and/or farmer_id when columns exist.
  -- ---------------------------------------------------------------------------
  if public._kfarm_table_exists('farms') then
    has_profile_id := public._kfarm_column_exists('farms', 'profile_id');
    has_farmer_id := public._kfarm_column_exists('farms', 'farmer_id')
      and public._kfarm_table_exists('farmers')
      and public._kfarm_column_exists('farmers', 'profile_id');

    execute 'alter table public.farms enable row level security';

    execute 'drop policy if exists farms_select_admin_staff on public.farms';
    execute $policy$
      create policy farms_select_admin_staff
      on public.farms
      for select
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''member.view'')
        or public.current_user_has_permission(''inspection.view'')
      )
    $policy$;

    execute 'drop policy if exists farms_insert_admin_staff on public.farms';
    execute $policy$
      create policy farms_insert_admin_staff
      on public.farms
      for insert
      to authenticated
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
      )
    $policy$;

    execute 'drop policy if exists farms_update_admin_staff on public.farms';
    execute $policy$
      create policy farms_update_admin_staff
      on public.farms
      for update
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''member.approve'')
        or public.current_user_has_permission(''inspection.edit'')
      )
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''member.approve'')
        or public.current_user_has_permission(''inspection.edit'')
      )
    $policy$;

    if has_profile_id then
      execute 'drop policy if exists farms_select_owner_by_profile on public.farms';
      execute $policy$
        create policy farms_select_owner_by_profile
        on public.farms
        for select
        to authenticated
        using (profile_id = public.current_profile_id())
      $policy$;

      execute 'drop policy if exists farms_insert_owner_by_profile on public.farms';
      execute $policy$
        create policy farms_insert_owner_by_profile
        on public.farms
        for insert
        to authenticated
        with check (profile_id = public.current_profile_id())
      $policy$;

      execute 'drop policy if exists farms_update_owner_by_profile on public.farms';
      execute $policy$
        create policy farms_update_owner_by_profile
        on public.farms
        for update
        to authenticated
        using (profile_id = public.current_profile_id())
        with check (profile_id = public.current_profile_id())
      $policy$;
    end if;

    if has_farmer_id then
      execute 'drop policy if exists farms_select_owner_by_farmer on public.farms';
      execute $policy$
        create policy farms_select_owner_by_farmer
        on public.farms
        for select
        to authenticated
        using (
          farmer_id in (
            select f.id from public.farmers f where f.profile_id = public.current_profile_id()
          )
        )
      $policy$;

      execute 'drop policy if exists farms_insert_owner_by_farmer on public.farms';
      execute $policy$
        create policy farms_insert_owner_by_farmer
        on public.farms
        for insert
        to authenticated
        with check (
          farmer_id in (
            select f.id from public.farmers f where f.profile_id = public.current_profile_id()
          )
        )
      $policy$;

      execute 'drop policy if exists farms_update_owner_by_farmer on public.farms';
      execute $policy$
        create policy farms_update_owner_by_farmer
        on public.farms
        for update
        to authenticated
        using (
          farmer_id in (
            select f.id from public.farmers f where f.profile_id = public.current_profile_id()
          )
        )
        with check (
          farmer_id in (
            select f.id from public.farmers f where f.profile_id = public.current_profile_id()
          )
        )
      $policy$;
    end if;

    execute 'drop policy if exists farms_delete_admin on public.farms';
    execute $policy$
      create policy farms_delete_admin
      on public.farms
      for delete
      to authenticated
      using (public.current_user_is_admin())
    $policy$;
  end if;

  -- ---------------------------------------------------------------------------
  -- activity_applications
  -- Supports owner checks by profile_id and/or farmer_id when columns exist.
  -- ---------------------------------------------------------------------------
  if public._kfarm_table_exists('activity_applications') then
    has_profile_id := public._kfarm_column_exists('activity_applications', 'profile_id');
    has_farmer_id := public._kfarm_column_exists('activity_applications', 'farmer_id')
      and public._kfarm_table_exists('farmers')
      and public._kfarm_column_exists('farmers', 'profile_id');

    execute 'alter table public.activity_applications enable row level security';

    execute 'drop policy if exists activity_applications_select_admin_staff on public.activity_applications';
    execute $policy$
      create policy activity_applications_select_admin_staff
      on public.activity_applications
      for select
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.view'')
        or public.current_user_has_permission(''field.no_burn'')
      )
    $policy$;

    execute 'drop policy if exists activity_applications_insert_admin_staff on public.activity_applications';
    execute $policy$
      create policy activity_applications_insert_admin_staff
      on public.activity_applications
      for insert
      to authenticated
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''field.no_burn'')
      )
    $policy$;

    execute 'drop policy if exists activity_applications_update_admin_staff on public.activity_applications';
    execute $policy$
      create policy activity_applications_update_admin_staff
      on public.activity_applications
      for update
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or public.current_user_has_permission(''field.no_burn'')
      )
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or public.current_user_has_permission(''field.no_burn'')
      )
    $policy$;

    if has_profile_id then
      execute 'drop policy if exists activity_applications_owner_by_profile on public.activity_applications';
      execute $policy$
        create policy activity_applications_owner_by_profile
        on public.activity_applications
        for all
        to authenticated
        using (profile_id = public.current_profile_id())
        with check (profile_id = public.current_profile_id())
      $policy$;
    end if;

    if has_farmer_id then
      execute 'drop policy if exists activity_applications_owner_by_farmer on public.activity_applications';
      execute $policy$
        create policy activity_applications_owner_by_farmer
        on public.activity_applications
        for all
        to authenticated
        using (
          farmer_id in (
            select f.id from public.farmers f where f.profile_id = public.current_profile_id()
          )
        )
        with check (
          farmer_id in (
            select f.id from public.farmers f where f.profile_id = public.current_profile_id()
          )
        )
      $policy$;
    end if;

    execute 'drop policy if exists activity_applications_delete_admin on public.activity_applications';
    execute $policy$
      create policy activity_applications_delete_admin
      on public.activity_applications
      for delete
      to authenticated
      using (public.current_user_is_admin())
    $policy$;
  end if;

  -- ---------------------------------------------------------------------------
  -- inspection_tasks
  -- Supports assignment checks only for columns that exist.
  -- ---------------------------------------------------------------------------
  if public._kfarm_table_exists('inspection_tasks') then
    has_assigned_to_profile_id := public._kfarm_column_exists('inspection_tasks', 'assigned_to_profile_id');
    has_inspector_profile_id := public._kfarm_column_exists('inspection_tasks', 'inspector_profile_id');
    has_service_provider_profile_id := public._kfarm_column_exists('inspection_tasks', 'service_provider_profile_id');

    execute 'alter table public.inspection_tasks enable row level security';

    execute 'drop policy if exists inspection_tasks_select_admin_staff on public.inspection_tasks';
    execute $policy$
      create policy inspection_tasks_select_admin_staff
      on public.inspection_tasks
      for select
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.view'')
      )
    $policy$;

    execute 'drop policy if exists inspection_tasks_insert_assigner on public.inspection_tasks';
    execute $policy$
      create policy inspection_tasks_insert_assigner
      on public.inspection_tasks
      for insert
      to authenticated
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or public.current_user_has_permission(''field.no_burn'')
      )
    $policy$;

    execute 'drop policy if exists inspection_tasks_update_admin_staff on public.inspection_tasks';
    execute $policy$
      create policy inspection_tasks_update_admin_staff
      on public.inspection_tasks
      for update
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
      )
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
      )
    $policy$;

    if has_assigned_to_profile_id then
      execute 'drop policy if exists inspection_tasks_assigned_to_profile on public.inspection_tasks';
      execute $policy$
        create policy inspection_tasks_assigned_to_profile
        on public.inspection_tasks
        for select
        to authenticated
        using (assigned_to_profile_id = public.current_profile_id())
      $policy$;

      execute 'drop policy if exists inspection_tasks_update_assigned_to_profile on public.inspection_tasks';
      execute $policy$
        create policy inspection_tasks_update_assigned_to_profile
        on public.inspection_tasks
        for update
        to authenticated
        using (assigned_to_profile_id = public.current_profile_id())
        with check (assigned_to_profile_id = public.current_profile_id())
      $policy$;
    end if;

    if has_inspector_profile_id then
      execute 'drop policy if exists inspection_tasks_inspector_profile on public.inspection_tasks';
      execute $policy$
        create policy inspection_tasks_inspector_profile
        on public.inspection_tasks
        for select
        to authenticated
        using (inspector_profile_id = public.current_profile_id())
      $policy$;

      execute 'drop policy if exists inspection_tasks_update_inspector_profile on public.inspection_tasks';
      execute $policy$
        create policy inspection_tasks_update_inspector_profile
        on public.inspection_tasks
        for update
        to authenticated
        using (inspector_profile_id = public.current_profile_id())
        with check (inspector_profile_id = public.current_profile_id())
      $policy$;
    end if;

    if has_service_provider_profile_id then
      execute 'drop policy if exists inspection_tasks_service_provider_profile on public.inspection_tasks';
      execute $policy$
        create policy inspection_tasks_service_provider_profile
        on public.inspection_tasks
        for select
        to authenticated
        using (service_provider_profile_id = public.current_profile_id())
      $policy$;

      execute 'drop policy if exists inspection_tasks_update_service_provider_profile on public.inspection_tasks';
      execute $policy$
        create policy inspection_tasks_update_service_provider_profile
        on public.inspection_tasks
        for update
        to authenticated
        using (service_provider_profile_id = public.current_profile_id())
        with check (service_provider_profile_id = public.current_profile_id())
      $policy$;
    end if;

    execute 'drop policy if exists inspection_tasks_delete_admin on public.inspection_tasks';
    execute $policy$
      create policy inspection_tasks_delete_admin
      on public.inspection_tasks
      for delete
      to authenticated
      using (public.current_user_is_admin())
    $policy$;
  end if;

  -- ---------------------------------------------------------------------------
  -- audit_logs
  -- ---------------------------------------------------------------------------
  if public._kfarm_table_exists('audit_logs') then
    execute 'alter table public.audit_logs enable row level security';

    execute 'drop policy if exists audit_logs_select_admin on public.audit_logs';
    execute $policy$
      create policy audit_logs_select_admin
      on public.audit_logs
      for select
      to authenticated
      using (public.current_user_is_admin())
    $policy$;

    execute 'drop policy if exists audit_logs_insert_authenticated on public.audit_logs';
    execute $policy$
      create policy audit_logs_insert_authenticated
      on public.audit_logs
      for insert
      to authenticated
      with check (
        public.current_profile_id() is not null
        or public.current_user_is_admin()
      )
    $policy$;

    execute 'drop policy if exists audit_logs_no_update on public.audit_logs';
    execute $policy$
      create policy audit_logs_no_update
      on public.audit_logs
      for update
      to authenticated
      using (false)
      with check (false)
    $policy$;

    execute 'drop policy if exists audit_logs_delete_admin on public.audit_logs';
    execute $policy$
      create policy audit_logs_delete_admin
      on public.audit_logs
      for delete
      to authenticated
      using (public.current_user_is_admin())
    $policy$;
  end if;
end $$;

-- Remove temporary migration helper functions.
drop function if exists public._kfarm_column_exists(text, text);
drop function if exists public._kfarm_table_exists(text);

commit;

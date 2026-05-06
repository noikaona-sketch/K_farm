-- Complete RLS policies for remaining Admin/Staff workflow tables.
-- Covers: farmers, farms, activity_applications, inspection_tasks, audit_logs.
-- Requires:
--   20260506_add_supabase_auth_profiles.sql
--   20260506_rls_admin_core_tables.sql

begin;

-- -----------------------------------------------------------------------------
-- Helper: safely check whether a table exists before applying policies.
-- This migration uses dynamic SQL so it can be run even if some optional workflow
-- tables have not been created in a given environment yet.
-- -----------------------------------------------------------------------------

do $$
begin
  -- ---------------------------------------------------------------------------
  -- farmers
  -- ---------------------------------------------------------------------------
  if to_regclass('public.farmers') is not null then
    execute 'alter table public.farmers enable row level security';

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
  -- ---------------------------------------------------------------------------
  if to_regclass('public.farms') is not null then
    execute 'alter table public.farms enable row level security';

    execute 'drop policy if exists farms_select_owner_or_admin on public.farms';
    execute $policy$
      create policy farms_select_owner_or_admin
      on public.farms
      for select
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''member.view'')
        or public.current_user_has_permission(''inspection.view'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
    $policy$;

    execute 'drop policy if exists farms_insert_owner_or_admin on public.farms';
    execute $policy$
      create policy farms_insert_owner_or_admin
      on public.farms
      for insert
      to authenticated
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
    $policy$;

    execute 'drop policy if exists farms_update_owner_or_admin on public.farms';
    execute $policy$
      create policy farms_update_owner_or_admin
      on public.farms
      for update
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''member.approve'')
        or public.current_user_has_permission(''inspection.edit'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''member.approve'')
        or public.current_user_has_permission(''inspection.edit'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
    $policy$;

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
  -- ---------------------------------------------------------------------------
  if to_regclass('public.activity_applications') is not null then
    execute 'alter table public.activity_applications enable row level security';

    execute 'drop policy if exists activity_applications_select_self_or_admin on public.activity_applications';
    execute $policy$
      create policy activity_applications_select_self_or_admin
      on public.activity_applications
      for select
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.view'')
        or public.current_user_has_permission(''field.no_burn'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
    $policy$;

    execute 'drop policy if exists activity_applications_insert_self_or_admin on public.activity_applications';
    execute $policy$
      create policy activity_applications_insert_self_or_admin
      on public.activity_applications
      for insert
      to authenticated
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''field.no_burn'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
    $policy$;

    execute 'drop policy if exists activity_applications_update_reviewer_or_owner on public.activity_applications';
    execute $policy$
      create policy activity_applications_update_reviewer_or_owner
      on public.activity_applications
      for update
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or public.current_user_has_permission(''field.no_burn'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or public.current_user_has_permission(''field.no_burn'')
        or profile_id = public.current_profile_id()
        or farmer_id in (
          select f.id from public.farmers f where f.profile_id = public.current_profile_id()
        )
      )
    $policy$;

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
  -- ---------------------------------------------------------------------------
  if to_regclass('public.inspection_tasks') is not null then
    execute 'alter table public.inspection_tasks enable row level security';

    execute 'drop policy if exists inspection_tasks_select_assigned_or_admin on public.inspection_tasks';
    execute $policy$
      create policy inspection_tasks_select_assigned_or_admin
      on public.inspection_tasks
      for select
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.view'')
        or assigned_to_profile_id = public.current_profile_id()
        or inspector_profile_id = public.current_profile_id()
        or service_provider_profile_id = public.current_profile_id()
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

    execute 'drop policy if exists inspection_tasks_update_assigned_or_admin on public.inspection_tasks';
    execute $policy$
      create policy inspection_tasks_update_assigned_or_admin
      on public.inspection_tasks
      for update
      to authenticated
      using (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or assigned_to_profile_id = public.current_profile_id()
        or inspector_profile_id = public.current_profile_id()
        or service_provider_profile_id = public.current_profile_id()
      )
      with check (
        public.current_user_is_admin()
        or public.current_user_has_permission(''inspection.edit'')
        or assigned_to_profile_id = public.current_profile_id()
        or inspector_profile_id = public.current_profile_id()
        or service_provider_profile_id = public.current_profile_id()
      )
    $policy$;

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
  if to_regclass('public.audit_logs') is not null then
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

commit;

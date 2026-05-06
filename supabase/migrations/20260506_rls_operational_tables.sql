-- RLS policies for operational K-Farm workflows.
-- Covers: farmers, farms, activity_applications, inspection_tasks, audit_logs.
-- Requires: 20260506_add_supabase_auth_profiles.sql

begin;

-- -----------------------------------------------------------------------------
-- farmers
-- -----------------------------------------------------------------------------
alter table public.farmers enable row level security;

drop policy if exists farmers_select_self_or_admin on public.farmers;
create policy farmers_select_self_or_admin
on public.farmers
for select
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('member.view')
  or exists (
    select 1 from public.profiles p
    where p.id = farmers.profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists farmers_insert_admin_or_member_editor on public.farmers;
create policy farmers_insert_admin_or_member_editor
on public.farmers
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('member.approve')
  or public.current_user_has_permission('member.set_role')
);

drop policy if exists farmers_update_admin_or_member_editor on public.farmers;
create policy farmers_update_admin_or_member_editor
on public.farmers
for update
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('member.approve')
  or public.current_user_has_permission('member.set_role')
)
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('member.approve')
  or public.current_user_has_permission('member.set_role')
);

-- -----------------------------------------------------------------------------
-- farms
-- -----------------------------------------------------------------------------
alter table public.farms enable row level security;

drop policy if exists farms_select_self_or_admin on public.farms;
create policy farms_select_self_or_admin
on public.farms
for select
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.view')
  or public.current_user_has_permission('member.view')
  or exists (
    select 1 from public.profiles p
    where p.id = farms.profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists farms_insert_self_or_admin on public.farms;
create policy farms_insert_self_or_admin
on public.farms
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or public.current_user_has_permission('field.farm_inspection')
  or exists (
    select 1 from public.profiles p
    where p.id = farms.profile_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists farms_update_self_or_admin_or_inspection on public.farms;
create policy farms_update_self_or_admin_or_inspection
on public.farms
for update
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or public.current_user_has_permission('field.farm_inspection')
  or exists (
    select 1 from public.profiles p
    where p.id = farms.profile_id
      and p.auth_user_id = auth.uid()
  )
)
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or public.current_user_has_permission('field.farm_inspection')
  or exists (
    select 1 from public.profiles p
    where p.id = farms.profile_id
      and p.auth_user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- activity_applications
-- -----------------------------------------------------------------------------
alter table public.activity_applications enable row level security;

drop policy if exists activity_applications_select_self_or_admin on public.activity_applications;
create policy activity_applications_select_self_or_admin
on public.activity_applications
for select
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.view')
  or exists (
    select 1 from public.profiles p
    where p.id = activity_applications.member_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists activity_applications_insert_self_or_admin on public.activity_applications;
create policy activity_applications_insert_self_or_admin
on public.activity_applications
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = activity_applications.member_id
      and p.auth_user_id = auth.uid()
  )
);

drop policy if exists activity_applications_update_admin_or_inspection on public.activity_applications;
create policy activity_applications_update_admin_or_inspection
on public.activity_applications
for update
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or public.current_user_has_permission('field.no_burn')
)
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or public.current_user_has_permission('field.no_burn')
);

-- -----------------------------------------------------------------------------
-- inspection_tasks
-- -----------------------------------------------------------------------------
alter table public.inspection_tasks enable row level security;

drop policy if exists inspection_tasks_select_assigned_or_admin on public.inspection_tasks;
create policy inspection_tasks_select_assigned_or_admin
on public.inspection_tasks
for select
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.view')
  or exists (
    select 1 from public.profiles p
    where p.id = inspection_tasks.member_id
      and p.auth_user_id = auth.uid()
      and (
        coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect'
        or (
          inspection_tasks.inspection_type = 'no_burn'
          and coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect_no_burn'
        )
      )
  )
);

drop policy if exists inspection_tasks_insert_admin_or_inspection_editor on public.inspection_tasks;
create policy inspection_tasks_insert_admin_or_inspection_editor
on public.inspection_tasks
for insert
to authenticated
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or public.current_user_has_permission('field.no_burn')
);

drop policy if exists inspection_tasks_update_assigned_or_admin on public.inspection_tasks;
create policy inspection_tasks_update_assigned_or_admin
on public.inspection_tasks
for update
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or exists (
    select 1 from public.profiles p
    where p.id = inspection_tasks.member_id
      and p.auth_user_id = auth.uid()
      and (
        coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect'
        or (
          inspection_tasks.inspection_type = 'no_burn'
          and coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect_no_burn'
        )
      )
  )
)
with check (
  public.current_user_is_admin()
  or public.current_user_has_permission('inspection.edit')
  or exists (
    select 1 from public.profiles p
    where p.id = inspection_tasks.member_id
      and p.auth_user_id = auth.uid()
      and (
        coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect'
        or (
          inspection_tasks.inspection_type = 'no_burn'
          and coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect_no_burn'
        )
      )
  )
);

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin
on public.audit_logs
for select
to authenticated
using (
  public.current_user_is_admin()
  or public.current_user_has_permission('report.view')
);

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
on public.audit_logs
for insert
to authenticated
with check (
  auth.uid() is not null
);

commit;

-- Diagnostics for staff_profiles <-> profiles sync.
-- Use this to debug cases where a staff record appears but no matching profiles row is visible.

-- 1) staff_profiles rows that do not have a matching profiles row.
select
  s.id as staff_profile_id,
  s.profile_id,
  s.department,
  s.level,
  s.can_fieldwork,
  s.created_at,
  s.updated_at
from public.staff_profiles s
left join public.profiles p on p.id = s.profile_id
where p.id is null
order by s.created_at desc;

-- 2) profiles that are staff and should appear in admin roles/staff flows.
select
  p.id,
  p.auth_user_id,
  p.email,
  p.full_name,
  p.phone,
  p.id_card,
  p.role,
  p.base_type,
  p.capabilities,
  p.department,
  p.permissions,
  p.status,
  p.updated_at
from public.profiles p
where p.base_type = 'staff'
   or p.role in ('admin', 'field', 'inspector')
   or coalesce(p.capabilities, '[]'::jsonb) ? 'manage_all'
   or coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect'
   or coalesce(p.capabilities, '[]'::jsonb) ? 'can_inspect_no_burn'
order by p.updated_at desc nulls last;

-- 3) staff_profiles joined to profiles for UI verification.
select
  s.id as staff_profile_id,
  s.profile_id,
  p.full_name,
  p.phone,
  p.role,
  p.base_type,
  p.capabilities,
  p.department as profile_department,
  s.department as staff_department,
  s.level,
  s.can_fieldwork,
  s.permissions as staff_permissions,
  p.permissions as profile_permissions,
  s.updated_at as staff_updated_at,
  p.updated_at as profile_updated_at
from public.staff_profiles s
left join public.profiles p on p.id = s.profile_id
order by s.updated_at desc nulls last, s.created_at desc;

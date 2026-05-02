-- Ensure profiles schema for role/permission and LINE identity
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS grade text DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS line_user_id text,
  ADD COLUMN IF NOT EXISTS line_uid text,
  ADD COLUMN IF NOT EXISTS user_group text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sub_role text,
  ADD COLUMN IF NOT EXISTS department_role text,
  ADD COLUMN IF NOT EXISTS can_access_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_admin';

ALTER TABLE profiles
  ALTER COLUMN grade SET DEFAULT 'C',
  ALTER COLUMN user_group SET DEFAULT 'pending',
  ALTER COLUMN can_access_admin SET DEFAULT false,
  ALTER COLUMN status SET DEFAULT 'pending_admin';

-- Ensure farmers schema
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS grade text DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_leader',
  ADD COLUMN IF NOT EXISTS member_status text DEFAULT 'pending_leader';

ALTER TABLE farmers
  ALTER COLUMN grade SET DEFAULT 'C',
  ALTER COLUMN role SET DEFAULT 'member',
  ALTER COLUMN status SET DEFAULT 'pending_leader',
  ALTER COLUMN member_status SET DEFAULT 'pending_leader';

-- Ensure service_providers schema
ALTER TABLE service_providers
  ADD COLUMN IF NOT EXISTS profile_id uuid,
  ADD COLUMN IF NOT EXISTS provider_type text,
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS sub_role text,
  ADD COLUMN IF NOT EXISTS grade text DEFAULT 'C',
  ADD COLUMN IF NOT EXISTS can_inspect_farm boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by_admin boolean DEFAULT false;

ALTER TABLE service_providers
  ALTER COLUMN grade SET DEFAULT 'C',
  ALTER COLUMN can_inspect_farm SET DEFAULT false,
  ALTER COLUMN approved_by_admin SET DEFAULT false;

-- K-Farm: เพิ่ม department + permissions ลงใน profiles
-- รัน SQL นี้ใน Supabase → SQL Editor

-- 1. เพิ่ม columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 2. index สำหรับ query เร็ว
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);

-- 3. ตั้ง default permissions ตาม department (trigger)
CREATE OR REPLACE FUNCTION set_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.department IS NOT NULL AND (NEW.permissions IS NULL OR NEW.permissions = '[]'::jsonb) THEN
    NEW.permissions := CASE NEW.department
      WHEN 'agri'       THEN '["member.view","member.approve","seed.view","inspection.view","inspection.edit","report.view"]'::jsonb
      WHEN 'sales'      THEN '["member.view","price.view","price.edit","seed.view","seed.sales","report.view","report.export"]'::jsonb
      WHEN 'stock'      THEN '["seed.view","seed.edit","seed.stock","seed.sales","service.view","report.view"]'::jsonb
      WHEN 'accounting' THEN '["member.view","price.view","report.view","report.export"]'::jsonb
      WHEN 'inspection' THEN '["member.view","inspection.view","inspection.edit","report.view"]'::jsonb
      WHEN 'service'    THEN '["service.view","service.edit","member.view","report.view"]'::jsonb
      WHEN 'it'         THEN '["system.all"]'::jsonb
      ELSE '[]'::jsonb
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_default_permissions ON profiles;
CREATE TRIGGER trg_default_permissions
  BEFORE INSERT OR UPDATE OF department ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_default_permissions();

-- 4. อัปเดต super admin (ใส่ id จริง)
-- UPDATE profiles SET department = 'it', permissions = '["system.all"]' WHERE role = 'admin';

-- ตรวจสอบ
-- SELECT id, full_name, role, department, permissions FROM profiles LIMIT 10;

-- seed_bookings: จองเมล็ดพันธุ์
CREATE TABLE IF NOT EXISTS seed_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  variety_id      TEXT NOT NULL,            -- ชื่อ/id พันธุ์
  variety_name    TEXT NOT NULL,
  quantity_kg     NUMERIC NOT NULL,         -- กก. ที่จอง
  booked_by       UUID REFERENCES profiles(id),  -- ใครกด (ถ้าไม่ใช่ตัวเอง = sales/leader)
  booked_by_role  TEXT,                     -- 'self' | 'sales' | 'leader'
  pickup_date     DATE,                     -- วันนัดรับ
  pickup_note     TEXT,
  status          TEXT DEFAULT 'pending',   -- pending | confirmed | received | cancelled
  stock_deducted  BOOLEAN DEFAULT FALSE,    -- ตัด stock เมื่อ received
  price_per_kg    NUMERIC,
  total_price     NUMERIC GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
  admin_note      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seed_bookings_profile ON seed_bookings(profile_id);
CREATE INDEX IF NOT EXISTS idx_seed_bookings_status  ON seed_bookings(status);
CREATE INDEX IF NOT EXISTS idx_seed_bookings_pickup  ON seed_bookings(pickup_date);

-- auto update updated_at
CREATE OR REPLACE FUNCTION update_seed_bookings_ts()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_bookings_ts ON seed_bookings;
CREATE TRIGGER trg_seed_bookings_ts
  BEFORE UPDATE ON seed_bookings
  FOR EACH ROW EXECUTE FUNCTION update_seed_bookings_ts();

-- ตัด stock อัตโนมัติเมื่อ status = 'received'
-- (ต้องมี seed_stock table ก่อน — ทำ phase 2)
-- CREATE OR REPLACE FUNCTION deduct_seed_stock() ...

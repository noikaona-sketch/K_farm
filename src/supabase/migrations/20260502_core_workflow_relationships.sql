-- Core workflow relationships and logic for K-Farm

-- 1) Foreign keys
ALTER TABLE IF EXISTS public.seed_reservations
  ADD CONSTRAINT IF NOT EXISTS seed_reservations_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id);

ALTER TABLE IF EXISTS public.seed_sales
  ADD CONSTRAINT IF NOT EXISTS seed_sales_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
  ADD CONSTRAINT IF NOT EXISTS seed_sales_lot_id_fkey
  FOREIGN KEY (lot_id) REFERENCES public.seed_stock_lots(id),
  ADD CONSTRAINT IF NOT EXISTS seed_sales_reservation_id_fkey
  FOREIGN KEY (reservation_id) REFERENCES public.seed_reservations(id);

ALTER TABLE IF EXISTS public.harvest_appointments
  ADD CONSTRAINT IF NOT EXISTS harvest_appointments_service_provider_id_fkey
  FOREIGN KEY (service_provider_id) REFERENCES public.service_providers(id);

ALTER TABLE IF EXISTS public.crop_quality_records
  ADD CONSTRAINT IF NOT EXISTS crop_quality_records_harvester_id_fkey
  FOREIGN KEY (harvester_provider_id) REFERENCES public.service_providers(id);

ALTER TABLE IF EXISTS public.service_provider_ratings
  ADD CONSTRAINT IF NOT EXISTS service_provider_ratings_service_provider_id_fkey
  FOREIGN KEY (service_provider_id) REFERENCES public.service_providers(id);

-- 2) Status enum constraints
ALTER TABLE IF EXISTS public.seed_reservations
  ADD CONSTRAINT IF NOT EXISTS seed_reservations_status_check
  CHECK (status IN ('requested', 'approved', 'converted', 'cancelled'));

ALTER TABLE IF EXISTS public.harvest_appointments
  DROP CONSTRAINT IF EXISTS harvest_appointments_status_check,
  ADD CONSTRAINT harvest_appointments_status_check
  CHECK (status IN ('scheduled', 'in_progress', 'completed'));

-- 4) Crop quality fields alignment
ALTER TABLE IF EXISTS public.crop_quality_records
  ADD COLUMN IF NOT EXISTS moisture numeric,
  ADD COLUMN IF NOT EXISTS impurity numeric,
  ADD COLUMN IF NOT EXISTS broken_kernel numeric;

-- backfill aliases from previous columns
UPDATE public.crop_quality_records
SET
  moisture = COALESCE(moisture, moisture_percent),
  impurity = COALESCE(impurity, impurity_percent),
  broken_kernel = COALESCE(broken_kernel, broken_kernel_percent)
WHERE moisture IS NULL OR impurity IS NULL OR broken_kernel IS NULL;

-- 5) rating score/comment/grade auto-calc
ALTER TABLE IF EXISTS public.service_provider_ratings
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS grade text;

CREATE OR REPLACE FUNCTION public.kfarm_rating_grade_from_score(score_value numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF score_value IS NULL THEN
    RETURN NULL;
  ELSIF score_value >= 4.5 THEN
    RETURN 'A';
  ELSIF score_value >= 3 THEN
    RETURN 'B';
  ELSE
    RETURN 'C';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_set_service_provider_rating_grade()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.grade := public.kfarm_rating_grade_from_score(NEW.score);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_service_provider_rating_grade ON public.service_provider_ratings;
CREATE TRIGGER set_service_provider_rating_grade
BEFORE INSERT OR UPDATE OF score ON public.service_provider_ratings
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_service_provider_rating_grade();

notify pgrst, 'reload schema';

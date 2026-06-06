-- ══════════════════════════════════════════════════════════════════
-- LAKER DETAILING — Loyalty v2 Migration
-- Verified against actual schema on 2026-06-03
--
-- KAKO POKRENUTI:
--   1. Otvori Supabase Dashboard → SQL Editor (leva navigacija)
--   3. Klikni: New query
--   4. Zalepi ceo ovaj fajl
--   5. Klikni: Run (ili Ctrl+Enter)
-- ══════════════════════════════════════════════════════════════════

-- ── KORAK 1: Dodaj plan_type u loyalty_customers ─────────────────
ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS plan_type TEXT;

-- ── KORAK 2: Dodaj car_size u loyalty_customers ──────────────────
ALTER TABLE public.loyalty_customers
  ADD COLUMN IF NOT EXISTS car_size TEXT;

-- ── KORAK 3: Popuni plan_type iz postojeće care_plan kolone ──────
--   care_plan = 'care_god' ili 'care_god_vs' → plan_type = 'god'
--   care_plan = 'care_mes' ili 'care_mes_vs' → plan_type = 'mes'
UPDATE public.loyalty_customers
SET plan_type = CASE
  WHEN care_plan LIKE '%god%' THEN 'god'
  WHEN care_plan LIKE '%mes%' THEN 'mes'
  ELSE NULL
END
WHERE plan_type IS NULL AND care_plan IS NOT NULL;

-- ── KORAK 4: Popuni car_size iz postojeće care_plan kolone ───────
--   care_plan = 'care_mes_vs' ili 'care_god_vs' → car_size = 'vs'
--   ostalo → car_size = 'ms'
UPDATE public.loyalty_customers
SET car_size = CASE
  WHEN care_plan LIKE '%_vs' THEN 'vs'
  ELSE 'ms'
END
WHERE car_size IS NULL AND care_plan IS NOT NULL;

-- ── KORAK 5: Dodaj service_date u loyalty_washes ─────────────────
ALTER TABLE public.loyalty_washes
  ADD COLUMN IF NOT EXISTS service_date DATE DEFAULT CURRENT_DATE;

-- ── KORAK 6: Popuni service_date iz created_at za stare redove ───
UPDATE public.loyalty_washes
SET service_date = created_at::DATE
WHERE service_date IS NULL;

-- ── GOTOVO ───────────────────────────────────────────────────────
-- Posle pokretanja, provjeri:
SELECT
  (SELECT COUNT(*) FROM public.loyalty_customers WHERE plan_type IS NOT NULL) AS customers_with_plan_type,
  (SELECT COUNT(*) FROM public.loyalty_washes WHERE service_date IS NOT NULL)  AS washes_with_service_date;

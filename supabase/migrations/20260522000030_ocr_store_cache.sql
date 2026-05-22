-- ocr_store_cache: PP-OCRv3 × 3-layer pipeline store-level cache
-- Mirrors category_rag: (household_id, store_key) → payee + hints

CREATE TABLE public.ocr_store_cache (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  store_key    text        NOT NULL,
  payee        text        NOT NULL,
  hints        jsonb       NOT NULL DEFAULT '{}',
  confidence   real        NOT NULL DEFAULT 0.85,
  hit_count    integer     NOT NULL DEFAULT 1,
  last_seen    date        NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, store_key)
);

ALTER TABLE public.ocr_store_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ocr_store_cache: own household"
  ON public.ocr_store_cache FOR ALL
  USING (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ))
  WITH CHECK (household_id IN (
    SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_store_cache TO authenticated;

CREATE INDEX idx_ocr_store_cache_household_key
  ON public.ocr_store_cache(household_id, store_key);

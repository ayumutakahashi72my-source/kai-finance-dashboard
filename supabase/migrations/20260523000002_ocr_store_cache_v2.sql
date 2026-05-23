-- ocr_store_cache v2: add structured columns for fingerprint & engine tracking
-- hints jsonb already stores these but explicit columns allow indexing / filtering

ALTER TABLE public.ocr_store_cache
  ADD COLUMN IF NOT EXISTS normalized_name    text,
  ADD COLUMN IF NOT EXISTS canonical_chain    text,
  ADD COLUMN IF NOT EXISTS phone              text,
  ADD COLUMN IF NOT EXISTS zipcode            text,
  ADD COLUMN IF NOT EXISTS layout_hash        text,
  ADD COLUMN IF NOT EXISTS last_ocr_engine    text;

CREATE INDEX IF NOT EXISTS idx_ocr_store_cache_canonical
  ON public.ocr_store_cache(household_id, canonical_chain);

-- Merchant embedding cache: global SHA-256-keyed vector store.
-- Deterministic embeddings (same normalized key → identical vector) are shared
-- across all households, eliminating redundant Voyage AI calls.

CREATE TABLE merchant_embedding_cache (
  normalized_hash text        PRIMARY KEY,  -- SHA-256 hex of normalizeKeyword output
  normalized_key  text        NOT NULL,     -- the actual normalized string
  embedding       vector(512) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE merchant_embedding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_select" ON merchant_embedding_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cache_insert" ON merchant_embedding_cache
  FOR INSERT TO authenticated WITH CHECK (true);

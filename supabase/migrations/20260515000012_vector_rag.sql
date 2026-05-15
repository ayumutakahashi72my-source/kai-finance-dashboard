-- =============================================
-- pgvector: category_rag にベクトル検索を追加
-- =============================================

-- pgvector 拡張を有効化
create extension if not exists vector;

-- embedding カラム追加（voyage-3-lite = 512次元）
alter table public.category_rag
  add column if not exists embedding vector(512);

-- HNSWインデックス（小〜中規模データセットに最適）
create index if not exists idx_category_rag_embedding
  on public.category_rag
  using hnsw (embedding vector_cosine_ops);

-- ベクトル類似検索 RPC
-- コサイン類似度でしきい値以上のキャッシュエントリを返す
create or replace function match_category_rag(
  query_embedding vector(512),
  p_household_id  uuid,
  match_threshold float default 0.85,
  match_count     int   default 1
)
returns table (
  payee_key   text,
  category_id uuid,
  confidence  real,
  similarity  float
)
language sql stable security invoker
as $$
  select
    cr.payee_key,
    cr.category_id,
    cr.confidence,
    1 - (cr.embedding <=> query_embedding) as similarity
  from public.category_rag cr
  where cr.household_id = p_household_id
    and cr.embedding is not null
    and 1 - (cr.embedding <=> query_embedding) > match_threshold
  order by cr.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_category_rag to authenticated;

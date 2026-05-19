-- merchant_embedding_cache に GRANT が欠落していたため追加
-- RLS ポリシー (cache_select / cache_insert) は存在するが
-- GRANT がないと authenticated ロールはテーブルにアクセスできない

GRANT SELECT, INSERT ON public.merchant_embedding_cache TO authenticated;

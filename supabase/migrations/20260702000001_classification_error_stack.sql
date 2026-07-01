-- 運用性向上: 分類失敗時のスタックトレースを保存する。
-- 従来は error_message（メッセージのみ）で、原因調査時にどのコードパスで
-- 失敗したか特定できなかった。stack は 2000 文字に切り詰めて書き込む（JS側）。
ALTER TABLE public.ai_classification_logs
  ADD COLUMN IF NOT EXISTS error_stack text;

-- ai_classification_logs への GRANT が欠落していたため修正
-- authenticated ロールに SELECT（RLSポリシーが管理者のみに絞る）と INSERT を付与

GRANT SELECT, INSERT ON public.ai_classification_logs TO authenticated;

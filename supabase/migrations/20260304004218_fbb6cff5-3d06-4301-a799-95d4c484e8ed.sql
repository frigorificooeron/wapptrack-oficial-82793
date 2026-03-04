
CREATE TABLE IF NOT EXISTS public.llm_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.llm_provider_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keys" ON public.llm_provider_keys
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_llm_keys_user ON public.llm_provider_keys(user_id, provider);

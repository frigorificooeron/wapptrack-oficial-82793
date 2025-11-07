-- Criar tabela campaign_clicks para rastreamento centralizado
CREATE TABLE IF NOT EXISTS public.campaign_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  campaign_id UUID NOT NULL,
  tracking_id TEXT NOT NULL,
  
  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Ad Platform IDs
  fbclid TEXT,
  gclid TEXT,
  ctwa_clid TEXT,
  
  -- Facebook Ad Details
  facebook_ad_id TEXT,
  facebook_adset_id TEXT,
  facebook_campaign_id TEXT,
  
  -- Device & Session Data
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  
  -- CTWA specific
  source_url TEXT,
  source_id TEXT,
  
  -- Conversion tracking
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  lead_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_token ON public.campaign_clicks(token);
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_campaign_id ON public.campaign_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_tracking_id ON public.campaign_clicks(tracking_id);
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_fbclid ON public.campaign_clicks(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_clicks_clicked_at ON public.campaign_clicks(clicked_at DESC);

-- RLS Policies (permitir inserção pública para tracking, leitura autenticada)
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert for tracking"
  ON public.campaign_clicks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow read for all users"
  ON public.campaign_clicks
  FOR SELECT
  USING (true);

CREATE POLICY "Allow update for conversion"
  ON public.campaign_clicks
  FOR UPDATE
  USING (true);

-- Comentário da tabela
COMMENT ON TABLE public.campaign_clicks IS 'Rastreamento centralizado de cliques em campanhas com captura de UTMs, FBCLID e CTWA';
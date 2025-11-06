-- Create campaign_tokens table to map invisible tokens to campaigns
CREATE TABLE IF NOT EXISTS public.campaign_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  campaign_id UUID NOT NULL,
  lead_tracking_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired'))
);

-- Enable RLS
ALTER TABLE public.campaign_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on campaign_tokens"
  ON public.campaign_tokens
  FOR ALL
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_campaign_tokens_token ON public.campaign_tokens(token);
CREATE INDEX idx_campaign_tokens_campaign_id ON public.campaign_tokens(campaign_id);
CREATE INDEX idx_campaign_tokens_lead_tracking_id ON public.campaign_tokens(lead_tracking_id);

-- Add comment
COMMENT ON TABLE public.campaign_tokens IS 'Maps invisible zero-width tokens to campaigns for lead tracking';

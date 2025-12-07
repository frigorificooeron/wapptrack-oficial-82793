-- Add Facebook OAuth columns to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS facebook_access_token TEXT,
ADD COLUMN IF NOT EXISTS facebook_pixel_id TEXT;
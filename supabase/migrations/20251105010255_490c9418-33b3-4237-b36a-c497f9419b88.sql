-- Adicionar campo para foto do perfil do WhatsApp na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
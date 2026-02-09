-- Adicionar campo unread_count na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Adicionar campo is_read na tabela lead_messages
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Trigger para incrementar contador quando mensagem chega
CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_from_me = false THEN
    UPDATE public.leads SET unread_count = COALESCE(unread_count, 0) + 1 WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para incrementar contador automaticamente
DROP TRIGGER IF EXISTS on_new_message_increment_unread ON public.lead_messages;
CREATE TRIGGER on_new_message_increment_unread
AFTER INSERT ON public.lead_messages
FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count();
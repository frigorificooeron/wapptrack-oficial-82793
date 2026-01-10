-- Atualizar base_url de todas as instâncias WhatsApp para a URL correta
UPDATE public.whatsapp_instances 
SET base_url = 'https://evoapi.workidigital.tech',
    updated_at = now()
WHERE base_url = 'https://evolutionapi.workidigital.tech' 
   OR base_url IS NULL 
   OR base_url = '';
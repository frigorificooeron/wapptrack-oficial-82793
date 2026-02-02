-- ============================================
-- MIGRAÇÃO DE SEGURANÇA PROFISSIONAL
-- Fase 1: Corrigir search_path das funções SECURITY DEFINER
-- ============================================

-- 1.1 Recriar função get_token_permissions com search_path seguro
CREATE OR REPLACE FUNCTION public.get_token_permissions(p_token character varying)
 RETURNS TABLE(id uuid, permissions jsonb, name character varying, description text, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    sat.id,
    sat.permissions,
    sat.name,
    sat.description,
    sat.created_at,
    sat.expires_at
  FROM public.shared_access_tokens sat
  WHERE sat.token = p_token 
    AND sat.is_active = true 
    AND (sat.expires_at IS NULL OR sat.expires_at > NOW());
END;
$function$;

-- 1.2 Recriar função deactivate_shared_token com search_path seguro
CREATE OR REPLACE FUNCTION public.deactivate_shared_token(p_token_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.shared_access_tokens 
  SET is_active = false 
  WHERE id = p_token_id AND created_by = auth.uid();
  
  RETURN FOUND;
END;
$function$;

-- 1.3 Recriar função create_shared_access_token com search_path seguro
CREATE OR REPLACE FUNCTION public.create_shared_access_token(
  p_name character varying, 
  p_description text DEFAULT NULL::text, 
  p_permissions jsonb DEFAULT '{}'::jsonb, 
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
 RETURNS TABLE(id uuid, token character varying, created_at timestamp with time zone, expires_at timestamp with time zone, permissions jsonb, name character varying, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  new_token VARCHAR(255);
  new_id UUID;
BEGIN
  -- Generate a secure random token using base64 encoding
  new_token := encode(gen_random_bytes(32), 'base64');
  
  -- Insert the new token
  INSERT INTO public.shared_access_tokens (
    token, 
    created_by, 
    name, 
    description, 
    permissions, 
    expires_at
  )
  VALUES (
    new_token,
    auth.uid(),
    p_name,
    p_description,
    p_permissions,
    p_expires_at
  )
  RETURNING shared_access_tokens.id INTO new_id;
  
  -- Return the created token data
  RETURN QUERY
  SELECT 
    sat.id,
    sat.token,
    sat.created_at,
    sat.expires_at,
    sat.permissions,
    sat.name,
    sat.description
  FROM public.shared_access_tokens sat
  WHERE sat.id = new_id;
END;
$function$;

-- 1.4 Recriar função get_user_by_instance com search_path seguro
CREATE OR REPLACE FUNCTION public.get_user_by_instance(instance_name_param text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    user_uuid uuid;
BEGIN
    SELECT DISTINCT c.user_id INTO user_uuid
    FROM public.campaigns c 
    WHERE c.active = true 
    AND c.user_id IS NOT NULL
    LIMIT 1;
    
    IF user_uuid IS NULL THEN
        SELECT id INTO user_uuid 
        FROM auth.users 
        ORDER BY created_at ASC 
        LIMIT 1;
    END IF;
    
    RETURN user_uuid;
END;
$function$;

-- ============================================
-- Fase 2: Corrigir Políticas RLS Permissivas
-- ============================================

-- 2.1 Campaign Clicks - Restringir SELECT para owners + service_role
DROP POLICY IF EXISTS "Allow read for all users" ON campaign_clicks;
CREATE POLICY "Users view clicks from their campaigns" ON campaign_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c 
      WHERE c.id::text = campaign_clicks.campaign_id::text 
      AND c.user_id = auth.uid()
    )
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

-- 2.2 Campaign Clicks - Restringir UPDATE para service_role apenas
DROP POLICY IF EXISTS "Allow update for conversion" ON campaign_clicks;
CREATE POLICY "Service role updates clicks" ON campaign_clicks
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'service_role')
  );

-- 2.3 Pending Leads - Restringir INSERT para service_role (webhooks)
DROP POLICY IF EXISTS "Users insert pending leads" ON pending_leads;
CREATE POLICY "Service role inserts pending leads" ON pending_leads
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role' = 'service_role')
  );

-- 2.4 Campaign Tokens - Restringir UPDATE para service_role
DROP POLICY IF EXISTS "Allow public update campaign_tokens" ON campaign_tokens;
CREATE POLICY "Service role updates campaign tokens" ON campaign_tokens
  FOR UPDATE USING (
    (auth.jwt() ->> 'role' = 'service_role')
  );
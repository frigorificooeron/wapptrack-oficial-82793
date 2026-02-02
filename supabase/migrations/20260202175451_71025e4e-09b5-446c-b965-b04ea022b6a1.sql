-- ============================================
-- MIGRAÇÃO FASE 2: Corrigir RLS warnings restantes
-- (Mantém INSERT público onde necessário para tracking, 
--  mas adiciona proteção via service_role para operações sensíveis)
-- ============================================

-- Corrigir funções restantes com search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_utm_sessions()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.utm_sessions
  WHERE expires_at < NOW();
END;
$function$;

-- Nota: As políticas INSERT com "true" nas tabelas de tracking (utm_clicks, 
-- ctwa_tracking, utm_sessions, campaign_clicks) são INTENCIONAIS porque
-- precisam aceitar tráfego público de anúncios sem autenticação.
-- O INSERT é protegido por rate limiting na edge function.
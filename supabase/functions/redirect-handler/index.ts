import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOG_LEVEL = Deno.env.get('LOG_LEVEL') || 'info'; // 'debug', 'info', 'warn', 'error'

// Zero-Width Unicode characters for invisible token encoding
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\uFEFF'  // Zero Width No-Break Space
];

// Log levels hierarchy
const LOG_LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function shouldLog(level: string): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL];
}

function logDebug(message: string, data?: any) {
  if (shouldLog('debug')) {
    console.log(`🔍 [DEBUG] ${message}`, data ? JSON.stringify(data) : '');
  }
}

function logInfo(message: string, data?: any) {
  if (shouldLog('info')) {
    console.log(`📍 [INFO] ${message}`, data ? JSON.stringify(data) : '');
  }
}

function logWarn(message: string, data?: any) {
  if (shouldLog('warn')) {
    console.warn(`⚠️ [WARN] ${message}`, data ? JSON.stringify(data) : '');
  }
}

function logError(message: string, data?: any) {
  if (shouldLog('error')) {
    console.error(`❌ [ERROR] ${message}`, data ? JSON.stringify(data) : '');
  }
}

function encodeInvisibleToken(trackingId: string): string {
  let encoded = '';
  for (const char of trackingId) {
    const charCode = char.charCodeAt(0);
    const binary = charCode.toString(2).padStart(8, '0');
    for (const bit of binary) {
      encoded += bit === '0' ? ZERO_WIDTH_CHARS[0] : ZERO_WIDTH_CHARS[1];
    }
  }
  return encoded;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('t');
    const campaignId = url.searchParams.get('id');

    logInfo('Processando redirect', { trackingId, campaignId });

    if (!trackingId || !campaignId) {
      return new Response(
        JSON.stringify({ error: 'Missing trackingId or campaignId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Capturar dados da requisição (privacy-preserving)
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      req.headers.get('x-real-ip') || 
                      req.headers.get('cf-connecting-ip') || 
                      'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // 🌍 Geolocalização automática por IP
    let geoData = { city: null, region: null, country: null, isp: null };
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,isp,query`);
      if (geoResponse.ok) {
        const geoJson = await geoResponse.json();
        if (geoJson.status === 'success') {
          geoData = {
            city: geoJson.city || null,
            region: geoJson.regionName || null,
            country: geoJson.country || null,
            isp: geoJson.isp || null
          };
          logDebug('Geolocalização obtida', { city: geoData.city, country: geoData.country });
        }
      }
    } catch (geoError) {
      logWarn('Erro ao buscar geolocalização');
    }

    // Capturar UTMs e parâmetros de anúncios
    const utmSource = url.searchParams.get('utm_source');
    const utmMedium = url.searchParams.get('utm_medium');
    const utmCampaign = url.searchParams.get('utm_campaign');
    const utmContent = url.searchParams.get('utm_content');
    const utmTerm = url.searchParams.get('utm_term');
    const fbclid = url.searchParams.get('fbclid');
    const gclid = url.searchParams.get('gclid');
    const ctwaClid = url.searchParams.get('ctwa_clid');
    const sourceUrl = url.searchParams.get('source_url') || req.headers.get('referer');
    const sourceId = url.searchParams.get('source_id');

    // IDs de anúncios do Facebook
    const facebookAdId = url.searchParams.get('ad_id') || url.searchParams.get('facebook_ad_id');
    const facebookAdsetId = url.searchParams.get('adset_id') || url.searchParams.get('facebook_adset_id');
    const facebookCampaignId = url.searchParams.get('campaign_id') || url.searchParams.get('facebook_campaign_id');

    // Gerar token invisível
    const invisibleToken = encodeInvisibleToken(trackingId);

    // Privacy-preserving logging: only log metadata, not PII values
    logInfo('Click processado', {
      hasIp: !!ipAddress && ipAddress !== 'unknown',
      city: geoData.city,
      country: geoData.country,
      utmSource,
      utmMedium,
      hasFbclid: !!fbclid,
      hasGclid: !!gclid,
      hasCtwaClid: !!ctwaClid
    });

    // Inicializar Supabase com service role para bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Salvar dados do clique em campaign_clicks
    const { data: clickData, error: clickError } = await supabase
      .from('campaign_clicks')
      .insert({
        token: invisibleToken,
        campaign_id: campaignId,
        tracking_id: trackingId,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        fbclid: fbclid,
        gclid: gclid,
        ctwa_clid: ctwaClid,
        facebook_ad_id: facebookAdId,
        facebook_adset_id: facebookAdsetId,
        facebook_campaign_id: facebookCampaignId,
        ip_address: ipAddress,
        user_agent: userAgent,
        source_url: sourceUrl,
        source_id: sourceId,
        device_info: {
          city: geoData.city,
          region: geoData.region,
          country: geoData.country,
          isp: geoData.isp
        }
      })
      .select()
      .single();

    if (clickError) {
      logError('Erro ao salvar clique', { error: clickError.message });
    } else {
      logDebug('Clique salvo', { id: clickData?.id });
    }

    // Buscar dados da campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      logError('Campanha não encontrada', { campaignId });
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Disparar evento PageView via CAPI se habilitado
    if (campaign.conversion_api_enabled && campaign.pixel_id && campaign.facebook_access_token) {
      logDebug('Disparando PageView via CAPI');
      
      try {
        const capiResponse = await fetch(`${SUPABASE_URL}/functions/v1/facebook-conversions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            pixelId: campaign.pixel_id,
            accessToken: campaign.facebook_access_token,
            eventName: 'PageView',
            userData: {
              clientIp: ipAddress,
              userAgent: userAgent,
              fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined
            },
            customData: {
              source_url: sourceUrl || url.toString(),
              campaign_id: campaignId,
              tracking_id: trackingId
            }
          })
        });

        if (capiResponse.ok) {
          logDebug('PageView enviado via CAPI');
        } else {
          logWarn('Erro ao enviar PageView via CAPI');
        }
      } catch (error) {
        logWarn('Exceção ao enviar PageView via CAPI');
      }
    }

    // Construir URL do WhatsApp com token invisível
    let whatsappUrl = `https://api.whatsapp.com/send?phone=${campaign.whatsapp_number}`;
    
    if (campaign.custom_message) {
      const messageWithToken = `${invisibleToken}${campaign.custom_message}`;
      whatsappUrl += `&text=${encodeURIComponent(messageWithToken)}`;
    } else {
      whatsappUrl += `&text=${encodeURIComponent(invisibleToken + 'Olá! Vim através do anúncio.')}`;
    }

    logInfo('Redirecionando para WhatsApp');

    // Redirecionar para WhatsApp (302 redirect)
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': whatsappUrl
      }
    });

  } catch (error) {
    logError('Erro no redirect', { message: (error as Error)?.message });
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

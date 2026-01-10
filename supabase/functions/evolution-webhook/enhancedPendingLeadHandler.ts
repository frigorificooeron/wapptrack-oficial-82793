import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { getTrackingDataBySession } from './sessionTrackingHandler.ts';
import { handleCTWACorrelation } from './ctwaCorrelationHandler.ts';
import { fetchAndUpdateLeadProfilePicture } from './profilePictureHandler.ts';

// 🆕 HANDLER MELHORADO COM campaign_clicks + CAPI
export const handleEnhancedPendingLeadConversion = async (
  supabase: any, 
  phone: string, 
  messageText: string, 
  messageId: string, 
  status: string, 
  contactName?: string,
  invisibleToken?: string
) => {
  console.log('🔍 [ENHANCED PENDING] handleEnhancedPendingLeadConversion iniciado:', {
    phone,
    messageText: messageText.substring(0, 50),
    messageId,
    status,
    contactName,
    hasInvisibleToken: !!invisibleToken
  });

  if (!invisibleToken) {
    console.warn('⚠️ [ENHANCED PENDING] Token invisível não fornecido, tentando métodos alternativos...');
    // Continuar com métodos antigos de fallback...
    return await fallbackConversion(supabase, phone, messageText, messageId, status, contactName);
  }

  // 🎯 MÉTODO 1: BUSCAR NA TABELA campaign_clicks PRIMEIRO
  console.log('🔍 [ENHANCED PENDING] Método 1: Buscando token em campaign_clicks...');
  
  const { data: clickData, error: clickError } = await supabase
    .from('campaign_clicks')
    .select('*')
    .eq('token', invisibleToken)
    .single();

  let campaignIdFromClick: string | null = null;
  let leadTrackingId: string | null = null;
  let utmData: any = null;

  if (clickData && !clickError) {
    console.log('✅ [ENHANCED PENDING] Token encontrado em campaign_clicks:', {
      clickId: clickData.id,
      campaignId: clickData.campaign_id,
      trackingId: clickData.tracking_id,
      clicked_at: clickData.clicked_at
    });

    campaignIdFromClick = clickData.campaign_id;
    leadTrackingId = clickData.tracking_id;
    
    // Extrair dados UTM do clique
    utmData = {
      utm_source: clickData.utm_source,
      utm_medium: clickData.utm_medium,
      utm_campaign: clickData.utm_campaign,
      utm_content: clickData.utm_content,
      utm_term: clickData.utm_term,
      ip_address: clickData.ip_address,
      browser: clickData.user_agent,
      facebook_ad_id: clickData.facebook_ad_id,
      facebook_adset_id: clickData.facebook_adset_id,
      facebook_campaign_id: clickData.facebook_campaign_id,
      lead_tracking_id: clickData.tracking_id
    };
  } else {
    console.log('⚠️ [ENHANCED PENDING] Token NÃO encontrado em campaign_clicks, tentando campaign_tokens...');
    
    // 🎯 MÉTODO 2: FALLBACK para campaign_tokens (tabela antiga)
    const { data: tokenData, error: tokenError } = await supabase
      .from('campaign_tokens')
      .select('*')
      .eq('token', invisibleToken)
      .single();

    if (tokenData && !tokenError) {
      console.log('✅ [ENHANCED PENDING] Token encontrado em campaign_tokens (fallback)');
      campaignIdFromClick = tokenData.campaign_id;
      leadTrackingId = tokenData.lead_tracking_id;
    } else {
      console.error('❌ [ENHANCED PENDING] Token não encontrado em nenhuma tabela:', invisibleToken);
      return false;
    }
  }

  if (!campaignIdFromClick) {
    console.error('❌ [ENHANCED PENDING] campaign_id não encontrado');
    return false;
  }

  // Buscar dados da campanha
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignIdFromClick)
    .single();

  if (campaignError || !campaign) {
    console.error('❌ [ENHANCED PENDING] Campanha não encontrada:', campaignError);
    return false;
  }

  console.log('📋 [ENHANCED PENDING] Campanha encontrada:', {
    id: campaign.id,
    name: campaign.name,
    conversion_api_enabled: campaign.conversion_api_enabled
  });

  // Buscar pending leads que correspondem ao telefone
  const { data: pendingLeads, error: pendingError } = await supabase
    .from('pending_leads')
    .select('*')
    .eq('phone', phone)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (pendingError || !pendingLeads || pendingLeads.length === 0) {
    console.warn('⚠️ [ENHANCED PENDING] Nenhum pending lead encontrado para:', phone);
    return false;
  }

  console.log(`🔍 [ENHANCED PENDING] Encontrados ${pendingLeads.length} pending leads para conversão`);

  // Converter cada pending lead
  let convertedCount = 0;
  let leadId: string | null = null;

  for (const pendingLead of pendingLeads) {
    const conversionResult = await supabase.rpc('convert_pending_lead_secure', {
      pending_lead_id: pendingLead.id
    });

    if (conversionResult.error) {
      console.error('❌ [ENHANCED PENDING] Erro ao converter pending lead:', conversionResult.error);
      continue;
    }

    if (conversionResult.data?.success) {
      console.log('✅ [ENHANCED PENDING] Pending lead convertido:', pendingLead.id);
      leadId = conversionResult.data?.lead_id || null;
      convertedCount++;

      // 📸 Buscar e atualizar foto de perfil do lead convertido
      if (leadId) {
        console.log(`📸 [ENHANCED PENDING] Buscando foto de perfil para lead convertido: ${leadId}`);
        await fetchAndUpdateLeadProfilePicture(supabase, leadId, phone);
      }

      // Marcar clique como convertido
      if (clickData) {
        await supabase
          .from('campaign_clicks')
          .update({
            converted: true,
            converted_at: new Date().toISOString(),
            lead_id: leadId
          })
          .eq('id', clickData.id);
        
        console.log('✅ [ENHANCED PENDING] Clique marcado como convertido');
      }

      // 📊 DISPARAR EVENTO CONTACT VIA CAPI
      if (campaign.conversion_api_enabled && campaign.pixel_id && campaign.facebook_access_token) {
        console.log('📊 [ENHANCED PENDING] Disparando evento Contact via CAPI...');
        
        try {
          const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
          const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

          const capiResponse = await fetch(`${SUPABASE_URL}/functions/v1/facebook-conversions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({
              pixelId: campaign.pixel_id,
              accessToken: campaign.facebook_access_token,
              eventName: 'Contact',
              userData: {
                phone: phone,
                clientIp: clickData?.ip_address,
                userAgent: clickData?.user_agent,
                fbc: clickData?.fbclid ? `fb.1.${Date.now()}.${clickData.fbclid}` : undefined
              },
              customData: {
                campaign_id: campaignIdFromClick,
                lead_id: leadId,
                tracking_id: leadTrackingId,
                source_url: clickData?.source_url
              }
            })
          });

          if (capiResponse.ok) {
            const capiResult = await capiResponse.json();
            console.log('✅ [ENHANCED PENDING] Evento Contact enviado via CAPI:', capiResult);
          } else {
            const errorText = await capiResponse.text();
            console.error('❌ [ENHANCED PENDING] Erro ao enviar Contact via CAPI:', errorText);
          }
        } catch (error) {
          console.error('❌ [ENHANCED PENDING] Exceção ao enviar Contact via CAPI:', error);
        }
      }
    }
  }

  console.log(`✅ [ENHANCED PENDING] Conversão concluída: ${convertedCount} leads convertidos`);
  return convertedCount > 0;
};

// Função de fallback para conversão sem token
async function fallbackConversion(
  supabase: any,
  phone: string,
  messageText: string,
  messageId: string,
  status: string,
  contactName?: string
) {
  console.log('🔄 [FALLBACK] Tentando conversão sem token invisível...');
  
  // Tentar correlação CTWA
  const ctwaResult = await handleCTWACorrelation(
    supabase,
    phone,
    messageText,
    messageId,
    status,
    contactName
  );
  
  if (ctwaResult) {
    console.log('✅ [FALLBACK] Conversão via CTWA bem-sucedida');
    return true;
  }
  
  console.log('⚠️ [FALLBACK] Não foi possível converter sem token');
  return false;
}

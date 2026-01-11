
import { getUtmsFromDirectClick, getClickByToken, markClickAsConverted } from './utmHandler.ts';
import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { getContactName } from './helpers.ts';
import { logSecurityEvent } from './security.ts';
import { fetchProfilePicture } from './profilePictureHandler.ts';
import { decodeInvisibleToken, cleanMessageFromInvisibleToken } from './messageProcessors.ts';
import { createPhoneSearchVariations } from './phoneVariations.ts';

export const handleDirectLead = async ({ 
  supabase, 
  message, 
  realPhoneNumber, 
  instanceName 
}: {
  supabase: any;
  message: any;
  realPhoneNumber: string;
  instanceName: string;
}) => {
  console.log(`🆕 [DIRECT LEAD] Processando novo contato direto de: ${realPhoneNumber} (instância: ${instanceName})`);
  
  try {
    // 📝 Extrair conteúdo da mensagem
    const messageContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text || 
                          '';
    
    console.log(`📝 [DIRECT LEAD] Conteúdo da mensagem: "${messageContent.substring(0, 100)}..."`);

    // 🔐 TENTAR DECODIFICAR TOKEN INVISÍVEL DA MENSAGEM
    let invisibleToken: string | null = null;
    let clickData: any = null;
    
    if (messageContent) {
      invisibleToken = decodeInvisibleToken(messageContent);
      if (invisibleToken) {
        console.log(`👻 [DIRECT LEAD] Token invisível detectado: ${invisibleToken}`);
        
        // Buscar clique pelo token
        clickData = await getClickByToken(supabase, invisibleToken);
        if (clickData) {
          console.log(`✅ [DIRECT LEAD] Clique encontrado pelo token:`, {
            click_id: clickData.id,
            campaign_id: clickData.campaign_id,
            utm_source: clickData.utm_source,
            utm_medium: clickData.utm_medium
          });
        } else {
          console.log(`⚠️ [DIRECT LEAD] Nenhum clique encontrado para o token: ${invisibleToken}`);
        }
      } else {
        console.log(`⚠️ [DIRECT LEAD] Nenhum token invisível encontrado na mensagem`);
      }
    }

    // 🔍 BUSCAR CAMPANHA E USUÁRIO PELA INSTÂNCIA
    console.log(`🔍 [DIRECT LEAD] Buscando campanha para instância: ${instanceName}`);
    
    let responsibleUserId: string | null = null;
    let linkedCampaign: any = null;
    
    // Se temos click_data com campaign_id, buscar a campanha específica
    if (clickData?.campaign_id) {
      console.log(`🎯 [DIRECT LEAD] Buscando campanha específica do clique: ${clickData.campaign_id}`);
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', clickData.campaign_id)
        .single();
      
      if (campaign && !campaignError) {
        linkedCampaign = campaign;
        responsibleUserId = campaign.user_id;
        console.log(`✅ [DIRECT LEAD] Campanha do clique encontrada:`, {
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          user_id: responsibleUserId
        });
      }
    }

    // Se não encontrou campanha pelo token, tentar encontrar por instância
    if (!linkedCampaign) {
      try {
        const { data: campaigns, error: campaignError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('active', true)
          .eq('redirect_type', 'whatsapp')
          .not('user_id', 'is', null);

        if (campaigns && campaigns.length > 0 && !campaignError) {
          linkedCampaign = campaigns[0];
          responsibleUserId = linkedCampaign.user_id;
          
          console.log(`✅ [DIRECT LEAD] Campanha WhatsApp encontrada:`, {
            campaign_id: linkedCampaign.id,
            campaign_name: linkedCampaign.name,
            user_id: responsibleUserId,
            instance: instanceName
          });
        } else {
          console.log(`⚠️ [DIRECT LEAD] Nenhuma campanha WhatsApp ativa encontrada`);
        }
      } catch (campaignError) {
        console.log(`❌ [DIRECT LEAD] Erro ao buscar campanhas:`, campaignError);
      }
    }

    // Se não encontrou campanha, usar fallback de usuário
    if (!responsibleUserId) {
      console.log(`🔄 [DIRECT LEAD] Tentando fallback de usuário via get_user_by_instance...`);
      
      try {
        const { data: userData, error: userError } = await supabase.rpc('get_user_by_instance', {
          instance_name_param: instanceName
        });

        if (userData && !userError) {
          responsibleUserId = userData;
          console.log(`✅ [DIRECT LEAD] Usuário encontrado via fallback: ${responsibleUserId}`);
        }
      } catch (funcError) {
        console.log(`❌ [DIRECT LEAD] Erro ao chamar get_user_by_instance:`, funcError);
      }
    }

    if (!responsibleUserId) {
      console.error(`💥 [DIRECT LEAD] CRÍTICO: Não foi possível determinar usuário responsável para instância: ${instanceName}`);
      logSecurityEvent('Critical: No user found for organic lead', {
        instance: instanceName,
        phone: realPhoneNumber
      }, 'high');
      
      console.log(`🛟 [DIRECT LEAD] Tentando criar lead sem campanha vinculada...`);
    }

    // 📞 Verificar se já existe um lead para este telefone
    const phoneVariations = createPhoneSearchVariations(realPhoneNumber);
    
    console.log(`📞 [DIRECT LEAD] Verificando leads existentes para: ${JSON.stringify(phoneVariations)}`);
    
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, name, phone, user_id')
      .in('phone', phoneVariations)
      .limit(1);

    if (existingLeads && existingLeads.length > 0) {
      console.log(`⚠️ [DIRECT LEAD] Lead já existe:`, {
        id: existingLeads[0].id,
        name: existingLeads[0].name,
        phone: existingLeads[0].phone,
        user_id: existingLeads[0].user_id
      });
      
      // Mesmo se o lead já existe, marcar o clique como convertido
      if (clickData?.id) {
        await markClickAsConverted(supabase, clickData.id, existingLeads[0].id);
      }
      
      return;
    }

    // 🔍 Buscar dados do dispositivo associados ao telefone
    console.log(`🔍 [DIRECT LEAD] Buscando dados do dispositivo para: ${realPhoneNumber}`);
    const deviceData = await getDeviceDataByPhone(supabase, realPhoneNumber);
    
    if (deviceData) {
      console.log(`✅ [DIRECT LEAD] Dados do dispositivo encontrados:`, {
        device_type: deviceData.device_type,
        browser: deviceData.browser,
        location: deviceData.location
      });
    } else {
      console.log(`❌ [DIRECT LEAD] Nenhum dado do dispositivo encontrado`);
    }

    // 🎯 Determinar UTMs - PRIORIDADE:
    // 1. Dados do clique (token invisível)
    // 2. UTMs da campanha
    // 3. Busca em campaign_clicks por cliques recentes
    // 4. Fallback orgânico
    
    let finalUtms: any;
    
    if (clickData) {
      // Prioridade 1: Dados do clique encontrado pelo token
      finalUtms = {
        utm_source: clickData.utm_source || linkedCampaign?.utm_source || 'whatsapp',
        utm_medium: clickData.utm_medium || linkedCampaign?.utm_medium || 'click',
        utm_campaign: clickData.utm_campaign || linkedCampaign?.utm_campaign || linkedCampaign?.name,
        utm_content: clickData.utm_content || linkedCampaign?.utm_content,
        utm_term: clickData.utm_term || linkedCampaign?.utm_term,
        tracking_id: clickData.tracking_id,
        fbclid: clickData.fbclid,
        gclid: clickData.gclid,
        ctwa_clid: clickData.ctwa_clid
      };
      console.log(`📋 [DIRECT LEAD] UTMs do clique (token):`, finalUtms);
    } else {
      // Tentar buscar cliques recentes em campaign_clicks
      const recentClick = await getUtmsFromDirectClick(supabase, realPhoneNumber);
      
      if (recentClick) {
        finalUtms = {
          utm_source: recentClick.utm_source || linkedCampaign?.utm_source || 'whatsapp',
          utm_medium: recentClick.utm_medium || linkedCampaign?.utm_medium || 'click',
          utm_campaign: recentClick.utm_campaign || linkedCampaign?.utm_campaign || linkedCampaign?.name,
          utm_content: recentClick.utm_content || linkedCampaign?.utm_content,
          utm_term: recentClick.utm_term || linkedCampaign?.utm_term,
          tracking_id: recentClick.tracking_id,
          fbclid: recentClick.fbclid,
          gclid: recentClick.gclid,
          ctwa_clid: recentClick.ctwa_clid,
          click_id: recentClick.click_id
        };
        clickData = recentClick; // Para marcar como convertido depois
        console.log(`📋 [DIRECT LEAD] UTMs de clique recente:`, finalUtms);
      } else if (linkedCampaign) {
        // Prioridade 2: UTMs da campanha
        finalUtms = {
          utm_source: linkedCampaign.utm_source || 'whatsapp',
          utm_medium: linkedCampaign.utm_medium || 'campaign',
          utm_campaign: linkedCampaign.utm_campaign || linkedCampaign.name,
          utm_content: linkedCampaign.utm_content,
          utm_term: linkedCampaign.utm_term
        };
        console.log(`📋 [DIRECT LEAD] UTMs da campanha:`, finalUtms);
      } else {
        // Prioridade 3: Fallback orgânico
        finalUtms = {
          utm_source: 'whatsapp',
          utm_medium: 'organic', 
          utm_campaign: 'organic',
          utm_content: `instance:${instanceName}`,
          utm_term: null
        };
        console.log(`📋 [DIRECT LEAD] UTMs fallback (orgânico):`, finalUtms);
      }
    }

    // 📸 Buscar foto do perfil do WhatsApp usando handler reutilizável
    const profilePictureUrl = await fetchProfilePicture(supabase, realPhoneNumber, instanceName);

    // Limpar mensagem de tokens invisíveis
    const cleanedMessage = cleanMessageFromInvisibleToken(messageContent);

    // 🆕 Preparar dados do lead
    const leadData: any = {
      name: getContactName(message),
      phone: realPhoneNumber,
      campaign: linkedCampaign?.name || "WhatsApp Orgânico",
      campaign_id: linkedCampaign?.id || null,
      status: 'new',
      first_contact_date: new Date().toISOString(),
      last_message: cleanedMessage || 'Mensagem recebida',
      initial_message: cleanedMessage ? `Primeira mensagem: ${cleanedMessage}` : null,
      profile_picture_url: profilePictureUrl,
      // UTMs finais
      utm_source: finalUtms.utm_source,
      utm_medium: finalUtms.utm_medium,
      utm_campaign: finalUtms.utm_campaign,
      utm_content: finalUtms.utm_content,
      utm_term: finalUtms.utm_term,
      lead_tracking_id: finalUtms.tracking_id || null,
      tracking_method: clickData ? 'token_correlation' : (linkedCampaign ? 'campaign_whatsapp' : 'direct'),
      // Dados do dispositivo se disponíveis
      ...(deviceData && {
        location: deviceData.location,
        ip_address: deviceData.ip_address,
        browser: deviceData.browser,
        os: deviceData.os,
        device_type: deviceData.device_type,
        device_model: deviceData.device_model,
        country: deviceData.country,
        city: deviceData.city,
        screen_resolution: deviceData.screen_resolution,
        timezone: deviceData.timezone,
        language: deviceData.language
      })
    };

    // Adicionar user_id apenas se tivermos um
    if (responsibleUserId) {
      leadData.user_id = responsibleUserId;
    }

    console.log(`🆕 [DIRECT LEAD] Criando lead:`, {
      nome: leadData.name,
      telefone: leadData.phone,
      user_id: leadData.user_id || 'SEM_USER_ID',
      instancia: instanceName,
      utms: {
        source: finalUtms.utm_source,
        medium: finalUtms.utm_medium,
        campaign: finalUtms.utm_campaign
      },
      tracking_method: leadData.tracking_method,
      tem_dados_dispositivo: !!deviceData,
      token_encontrado: !!invisibleToken
    });

    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (leadError) {
      console.error(`❌ [DIRECT LEAD] Erro ao criar lead:`, leadError);
      logSecurityEvent('Failed to create organic lead', {
        error: leadError.message,
        phone: realPhoneNumber,
        instance: instanceName,
        user_id: responsibleUserId
      }, 'high');
      return;
    }

    console.log(`✅ [DIRECT LEAD] Lead criado com sucesso:`, {
      lead_id: newLead.id,
      name: newLead.name,
      phone: newLead.phone,
      user_id: newLead.user_id,
      instance_name: instanceName,
      campaign: newLead.campaign,
      utm_source: newLead.utm_source,
      utm_medium: newLead.utm_medium,
      tracking_method: newLead.tracking_method
    });

    // ✅ MARCAR CLIQUE COMO CONVERTIDO
    if (clickData?.id || clickData?.click_id) {
      const clickIdToMark = clickData.id || clickData.click_id;
      await markClickAsConverted(supabase, clickIdToMark, newLead.id);
      console.log(`✅ [DIRECT LEAD] Clique ${clickIdToMark} marcado como convertido para lead ${newLead.id}`);
    }

    logSecurityEvent('Lead created successfully', {
      lead_id: newLead.id,
      phone: realPhoneNumber,
      instance: instanceName,
      user_id: responsibleUserId,
      tracking_method: leadData.tracking_method,
      has_token: !!invisibleToken
    }, 'low');

  } catch (error) {
    console.error(`💥 [DIRECT LEAD] Erro crítico em handleDirectLead:`, error);
    logSecurityEvent('Critical error in handleDirectLead', {
      error: (error as Error)?.message || 'Unknown error',
      phone: realPhoneNumber,
      instance: instanceName
    }, 'high');
  }
};

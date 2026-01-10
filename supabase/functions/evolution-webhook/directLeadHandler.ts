
import { getUtmsFromDirectClick } from './utmHandler.ts';
import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { getContactName } from './helpers.ts';
import { logSecurityEvent } from './security.ts';
import { fetchProfilePicture } from './profilePictureHandler.ts';

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
    // 🔍 BUSCAR CAMPANHA E USUÁRIO PELA INSTÂNCIA
    console.log(`🔍 [DIRECT LEAD] Buscando campanha para instância: ${instanceName}`);
    
    let responsibleUserId: string | null = null;
    let linkedCampaign: any = null;
    
    // Primeiro: tentar encontrar campanha com redirect_type='whatsapp' para esta instância
    try {
      const { data: campaigns, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('active', true)
        .eq('redirect_type', 'whatsapp')
        .not('user_id', 'is', null);

      if (campaigns && campaigns.length > 0 && !campaignError) {
        // Usar a primeira campanha ativa encontrada
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
    const phoneVariations = [
      realPhoneNumber,
      realPhoneNumber.slice(-10),
      `55${realPhoneNumber.slice(-10)}`,
      `5585${realPhoneNumber.slice(-8)}`
    ];
    
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

    // 🎯 Buscar UTMs de clicks diretos
    const utms = await getUtmsFromDirectClick(supabase, realPhoneNumber);
    
    const finalUtms = utms || {
      utm_source: 'whatsapp',
      utm_medium: 'organic', 
      utm_campaign: 'organic',
      utm_content: `instance:${instanceName}`,
      utm_term: null
    };
    
    console.log(`📋 [DIRECT LEAD] UTMs finais:`, finalUtms);

    // 📸 Buscar foto do perfil do WhatsApp usando handler reutilizável
    const profilePictureUrl = await fetchProfilePicture(supabase, realPhoneNumber, instanceName);

    // 🆕 Preparar dados do lead
    const leadData: any = {
      name: getContactName(message),
      phone: realPhoneNumber,
      campaign: linkedCampaign?.name || "WhatsApp Orgânico",
      campaign_id: linkedCampaign?.id || null,
      status: 'new',
      first_contact_date: new Date().toISOString(),
      last_message: message.message?.conversation || message.message?.extendedTextMessage?.text || 'Mensagem recebida',
      profile_picture_url: profilePictureUrl,
      // 🆕 PRIORIZAR UTMs DA CAMPANHA (Facebook Ads), depois UTM_CLICKS, depois fallback
      utm_source: linkedCampaign?.utm_source || finalUtms.utm_source || 'whatsapp',
      utm_medium: linkedCampaign?.utm_medium || finalUtms.utm_medium || 'organic',
      utm_campaign: linkedCampaign?.utm_campaign || finalUtms.utm_campaign || 'organic',
      utm_content: linkedCampaign?.utm_content || finalUtms.utm_content || linkedCampaign?.name || null,
      utm_term: linkedCampaign?.utm_term || finalUtms.utm_term || null,
      tracking_method: linkedCampaign ? 'campaign_whatsapp' : 'direct',
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

    console.log(`🆕 [DIRECT LEAD] Criando lead orgânico:`, {
      nome: leadData.name,
      telefone: leadData.phone,
      user_id: leadData.user_id || 'SEM_USER_ID',
      instancia: instanceName,
      utms: finalUtms,
      tem_dados_dispositivo: !!deviceData
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

    console.log(`✅ [DIRECT LEAD] Lead orgânico criado com sucesso:`, {
      lead_id: newLead.id,
      name: newLead.name,
      phone: newLead.phone,
      user_id: newLead.user_id,
      instance_name: instanceName,
      campaign: newLead.campaign
    });

    logSecurityEvent('Organic lead created successfully', {
      lead_id: newLead.id,
      phone: realPhoneNumber,
      instance: instanceName,
      user_id: responsibleUserId
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

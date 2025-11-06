import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { getTrackingDataBySession } from './sessionTrackingHandler.ts';
import { handleCTWACorrelation } from './ctwaCorrelationHandler.ts';

// 🆕 HANDLER MELHORADO COM MÉTODOS 0 (ID ÚNICO) + 1 + 2 + CTWA COMBINADOS + LOGS DETALHADOS
export const handleEnhancedPendingLeadConversion = async (
  supabase: any, 
  phone: string, 
  messageText: string, 
  messageId: string, 
  status: string, 
  contactName?: string,
  invisibleToken?: string
) => {
  console.log(`🔄 [ENHANCED PENDING] ===== INICIANDO CONVERSÃO MELHORADA COM TOKEN INVISÍVEL + CTWA =====`);
  console.log(`🔄 [ENHANCED PENDING] Parâmetros recebidos:`, {
    phone,
    messageText: messageText?.substring(0, 100),
    messageId,
    status,
    contactName,
    invisibleToken
  });
  
  try {
    // 🆔 MÉTODO 0: BUSCAR POR TOKEN INVISÍVEL (100% PRECISÃO)
    console.log('👻 [ENHANCED PENDING] ===== MÉTODO 0: BUSCA POR TOKEN INVISÍVEL =====');
    const leadTrackingId = invisibleToken || null;

    if (leadTrackingId) {
      console.log('🎯 [METHOD 0] ID único encontrado na mensagem:', leadTrackingId);
      
      const { data: pendingByTracking, error: trackingError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('lead_tracking_id', leadTrackingId)
        .eq('status', 'pending')
        .maybeSingle();

      if (trackingError) {
        console.error('❌ [METHOD 0] Erro ao buscar por tracking ID:', trackingError);
      }

      if (pendingByTracking) {
        console.log('✅ [METHOD 0] Pending lead encontrado por ID único! Conversão 100% precisa');
        console.log('📋 [METHOD 0] Dados do pending_lead:', {
          id: pendingByTracking.id,
          campaign_id: pendingByTracking.campaign_id,
          name: pendingByTracking.name,
          created_at: pendingByTracking.created_at
        });
        
        // Limpar o ID da mensagem antes de prosseguir
        const cleanedMessage = messageText.replace(/\[([A-Z0-9]{6})\]\s*/, '');
        console.log('🧹 [METHOD 0] Mensagem limpa:', cleanedMessage);
        
        // Usar o pending_lead encontrado e continuar com o fluxo normal
        const matchedPendingLead = pendingByTracking;
        const messageTime = new Date();
        
        // Buscar foto do perfil do WhatsApp
        let profilePictureUrl = null;
        try {
          const cleanPhone = phone.replace('@s.whatsapp.net', '');
          
          const { data: instances } = await supabase
            .from('whatsapp_instances')
            .select('instance_name, base_url')
            .eq('status', 'connected')
            .limit(1);
          
          if (instances && instances.length > 0) {
            const instance = instances[0];
            const apiKey = Deno.env.get('EVOLUTION_API_KEY') || '';
            
            const response = await fetch(
              `${instance.base_url}/chat/fetchProfilePictureUrl/${instance.instance_name}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': apiKey,
                },
                body: JSON.stringify({ number: cleanPhone })
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              profilePictureUrl = data.profilePictureUrl || null;
              console.log(`📸 Foto capturada na conversão: ${profilePictureUrl}`);
            }
          }
        } catch (photoError) {
          console.error('⚠️ Erro ao buscar foto:', photoError);
        }

        // Buscar user_id da campanha
        let campaignUserId = null;
        if (matchedPendingLead.campaign_id) {
          console.log(`🔍 [METHOD 0] Buscando user_id para campaign_id: ${matchedPendingLead.campaign_id}`);
          const { data: campaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('user_id, name')
            .eq('id', matchedPendingLead.campaign_id)
            .maybeSingle();

          if (campaign && !campaignError) {
            campaignUserId = campaign.user_id;
            console.log('✅ [METHOD 0] User ID da campanha encontrado:', campaignUserId);
          }
        }

        // Buscar dados do dispositivo
        const deviceData = await getDeviceDataByPhone(supabase, phone);
        
        // Preparar dados do lead
        const finalName = (matchedPendingLead.name && matchedPendingLead.name !== 'Visitante') 
          ? matchedPendingLead.name 
          : (contactName || 'Lead via WhatsApp');

        // Verificar se já existe lead
        const { data: existingLead } = await supabase
          .from('leads')
          .select('*')
          .eq('phone', phone)
          .limit(1);

        const webhookData = matchedPendingLead.webhook_data || {};
        
        if (existingLead && existingLead.length > 0) {
          // Atualizar lead existente
          console.log('🔄 [METHOD 0] Atualizando lead existente');
          const { error: updateError } = await supabase
            .from('leads')
            .update({
              last_contact_date: new Date().toISOString(),
              last_message: cleanedMessage,
              evolution_message_id: messageId,
              evolution_status: status,
              lead_tracking_id: leadTrackingId,
              profile_picture_url: profilePictureUrl,
              utm_source: matchedPendingLead.utm_source || existingLead[0].utm_source,
              utm_medium: matchedPendingLead.utm_medium || existingLead[0].utm_medium,
              utm_campaign: matchedPendingLead.utm_campaign || existingLead[0].utm_campaign,
              utm_content: matchedPendingLead.utm_content || existingLead[0].utm_content,
              utm_term: matchedPendingLead.utm_term || existingLead[0].utm_term
            })
            .eq('id', existingLead[0].id);

          if (updateError) {
            console.error('❌ [METHOD 0] Erro ao atualizar lead:', updateError);
          } else {
            console.log('✅ [METHOD 0] Lead atualizado com sucesso');
          }
        } else {
          // Criar novo lead
          console.log('➕ [METHOD 0] Criando novo lead');
          const newLeadData = {
            user_id: campaignUserId,
            campaign_id: matchedPendingLead.campaign_id,
            campaign: matchedPendingLead.campaign_name,
            name: finalName,
            phone: phone,
            status: 'new',
            first_contact_date: new Date().toISOString(),
            last_contact_date: new Date().toISOString(),
            initial_message: cleanedMessage,
            last_message: cleanedMessage,
            evolution_message_id: messageId,
            evolution_status: status,
            lead_tracking_id: leadTrackingId,
            utm_source: matchedPendingLead.utm_source || webhookData.site_source_name,
            utm_medium: matchedPendingLead.utm_medium,
            utm_campaign: matchedPendingLead.utm_campaign,
            utm_content: matchedPendingLead.utm_content,
            utm_term: matchedPendingLead.utm_term,
            profile_picture_url: profilePictureUrl,
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
            }),
            facebook_ad_id: webhookData.facebook_ad_id,
            facebook_adset_id: webhookData.facebook_adset_id,
            facebook_campaign_id: webhookData.facebook_campaign_id
          };

          const { error: insertError } = await supabase
            .from('leads')
            .insert(newLeadData);

          if (insertError) {
            console.error('❌ [METHOD 0] Erro ao criar lead:', insertError);
          } else {
            console.log('✅ [METHOD 0] Lead criado com sucesso');
          }
        }

        // Marcar pending_lead como convertido
        const { error: updatePendingError } = await supabase
          .from('pending_leads')
          .update({ 
            status: 'converted',
            phone: phone
          })
          .eq('id', matchedPendingLead.id);

        if (updatePendingError) {
          console.error('❌ [METHOD 0] Erro ao marcar pending_lead como convertido:', updatePendingError);
        } else {
          console.log('✅ [METHOD 0] Pending lead marcado como convertido');
        }

        console.log('🎉 [METHOD 0] CONVERSÃO POR ID ÚNICO CONCLUÍDA COM SUCESSO!');
        return true;
      } else {
        console.log('⚠️ [METHOD 0] ID único não encontrado ou já convertido, tentando outros métodos...');
      }
    } else {
      console.log('ℹ️ [METHOD 0] Nenhum ID único encontrado na mensagem, usando métodos alternativos');
    }

    // 🎯 MÉTODO CTWA: TENTAR CORRELAÇÃO CTWA
    console.log('🎯 [ENHANCED PENDING] ===== TENTANDO CORRELAÇÃO CTWA =====');
    const ctwaCorrelationResult = await handleCTWACorrelation(
      supabase,
      phone,
      messageText,
      messageId,
      status,
      contactName
    );

    if (ctwaCorrelationResult) {
      console.log('🎉 [ENHANCED PENDING] SUCESSO! Correlação CTWA encontrou e converteu o lead');
      return true;
    }

    console.log('ℹ️ [ENHANCED PENDING] Correlação CTWA não encontrou match, tentando métodos tradicionais...');

    // Continue with existing methods if CTWA correlation fails
    const messageTime = new Date();
    const correlationWindow = 60 * 60 * 1000; // 🆕 60 minutos (aumentado de 5 para melhor rastreamento)
    const windowStart = new Date(messageTime.getTime() - correlationWindow);
    
    console.log(`🕒 [ENHANCED PENDING] Janela de correlação tradicional configurada:`, {
      messageTime: messageTime.toISOString(),
      windowStart: windowStart.toISOString(),
      correlationWindowMs: correlationWindow
    });

    // 🎯 MÉTODO 1: BUSCA PENDING_LEADS MELHORADA (mais critérios)
    let matchedPendingLead = null;
    
    console.log(`🔍 [ENHANCED PENDING] ===== MÉTODO 1: BUSCA DIRETA =====`);
    
    // 1.1 - Buscar por telefone exato primeiro
    console.log(`🔍 [ENHANCED PENDING] 1.1 - Buscando por telefone exato: ${phone}`);
    const { data: exactPhoneLeads, error: exactError } = await supabase
      .from('pending_leads')
      .select('*')
      .eq('phone', phone)
      .eq('status', 'pending')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`📋 [ENHANCED PENDING] Resultado busca telefone exato:`, {
      error: exactError,
      count: exactPhoneLeads?.length || 0,
      leads: exactPhoneLeads?.map((lead: any) => ({
        id: lead.id,
        phone: lead.phone,
        created_at: lead.created_at,
        campaign_id: lead.campaign_id
      }))
    });

    if (!exactError && exactPhoneLeads && exactPhoneLeads.length > 0) {
      matchedPendingLead = exactPhoneLeads[0];
      console.log(`✅ [ENHANCED PENDING] Método 1.1 - Match por telefone exato encontrado:`, {
        id: matchedPendingLead.id,
        phone: matchedPendingLead.phone,
        created_at: matchedPendingLead.created_at
      });
    }

    // 1.2 - Buscar PENDING_CONTACT com correlação temporal
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] 1.2 - Buscando PENDING_CONTACT na janela temporal...`);
      const { data: pendingContactLeads, error: pendingError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('phone', 'PENDING_CONTACT')
        .eq('status', 'pending')
        .gte('created_at', windowStart.toISOString())
        .order('created_at', { ascending: false });

      console.log(`📋 [ENHANCED PENDING] Resultado busca PENDING_CONTACT:`, {
        error: pendingError,
        count: pendingContactLeads?.length || 0,
        leads: pendingContactLeads?.map((lead: any) => ({
          id: lead.id,
          phone: lead.phone,
          created_at: lead.created_at,
          campaign_id: lead.campaign_id,
          device_session_id: lead.webhook_data?.device_session_id
        }))
      });

      if (!pendingError && pendingContactLeads && pendingContactLeads.length > 0) {
        matchedPendingLead = pendingContactLeads[0];
        console.log(`✅ [ENHANCED PENDING] Método 1.2 - Match por PENDING_CONTACT encontrado:`, {
          id: matchedPendingLead.id,
          created_at: matchedPendingLead.created_at,
          time_diff_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000)
        });
      }
    }

    // 🎯 MÉTODO 2: CORRELAÇÃO AVANÇADA POR DADOS DE SESSÃO E DISPOSITIVO
    let sessionCorrelationData = null;
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] ===== MÉTODO 2: CORRELAÇÃO AVANÇADA =====`);
      console.log(`🔍 [ENHANCED PENDING] Método 1 falhou, tentando correlação avançada por sessão e dispositivo...`);
      
      // 2.1 - Buscar por device_session_id nos pending_leads
      console.log(`🔍 [ENHANCED PENDING] 2.1 - Tentando correlação direta por webhook_data...`);
      const { data: allPendingWithWebhook, error: webhookError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', windowStart.toISOString())
        .not('webhook_data', 'is', null)
        .order('created_at', { ascending: false });

      if (!webhookError && allPendingWithWebhook && allPendingWithWebhook.length > 0) {
        console.log(`📋 [ENHANCED PENDING] Encontrados ${allPendingWithWebhook.length} pending leads com webhook_data para análise`);
        
        // Tentar correlacionar por user_agent e timestamp próximo
        for (const pending of allPendingWithWebhook) {
          const webhookData = pending.webhook_data || {};
          const pendingTime = new Date(pending.created_at).getTime();
          const messageTimeDiff = Math.abs(messageTime.getTime() - pendingTime);
          
          console.log(`🔍 [ENHANCED PENDING] Analisando pending ${pending.id}:`, {
            time_diff_ms: messageTimeDiff,
            user_agent: webhookData.user_agent?.substring(0, 50),
            device_session_id: webhookData.device_session_id
          });
          
          // Match se tempo for menor que janela de correlação (5 min)
          if (messageTimeDiff <= correlationWindow) {
            matchedPendingLead = pending;
            console.log(`✅ [ENHANCED PENDING] Método 2.1 - Match por timestamp e webhook_data:`, {
              id: pending.id,
              time_diff_seconds: Math.floor(messageTimeDiff / 1000),
              campaign_id: pending.campaign_id
            });
            break;
          }
        }
      }
      
      // 2.2 - Se não encontrou, tentar correlação por tracking_sessions
      if (!matchedPendingLead) {
        console.log(`🔍 [ENHANCED PENDING] 2.2 - Buscando dados de tracking_sessions...`);
        
        // Buscar tracking sessions recentes (últimas 4 horas)
        const trackingWindowStart = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const { data: trackingSessions, error: trackingError } = await supabase
          .from('tracking_sessions')
          .select('*')
          .gte('created_at', trackingWindowStart.toISOString())
          .order('created_at', { ascending: false })
          .limit(50);

        if (!trackingError && trackingSessions && trackingSessions.length > 0) {
          console.log(`📋 [ENHANCED PENDING] Encontradas ${trackingSessions.length} sessões de tracking para análise`);
          
          // Para cada sessão, tentar encontrar pending_lead correspondente
          for (const session of trackingSessions) {
            if (session.campaign_id) {
              const sessionTime = new Date(session.created_at).getTime();
              const messageTimeDiff = Math.abs(messageTime.getTime() - sessionTime);
              
              // Buscar pending_lead com mesmo campaign_id e tempo próximo
              if (messageTimeDiff <= correlationWindow * 2) { // 10 minutos para tracking sessions
                const { data: sessionPending, error: sessionPendingError } = await supabase
                  .from('pending_leads')
                  .select('*')
                  .eq('campaign_id', session.campaign_id)
                  .eq('status', 'pending')
                  .gte('created_at', new Date(sessionTime - correlationWindow).toISOString())
                  .lte('created_at', new Date(sessionTime + correlationWindow).toISOString())
                  .order('created_at', { ascending: false })
                  .limit(1);

                if (!sessionPendingError && sessionPending && sessionPending.length > 0) {
                  matchedPendingLead = sessionPending[0];
                  sessionCorrelationData = {
                    campaign_id: session.campaign_id,
                    session_id: session.id,
                    utm_source: session.utm_source,
                    utm_medium: session.utm_medium,
                    utm_campaign: session.utm_campaign
                  };
                  
                  console.log(`✅ [ENHANCED PENDING] Método 2.2 - Match por tracking_session:`, {
                    pending_id: matchedPendingLead.id,
                    session_id: session.id,
                    campaign_id: session.campaign_id,
                    time_diff_seconds: Math.floor(messageTimeDiff / 1000)
                  });
                  break;
                }
              }
            }
          }
        } else {
          console.log(`❌ [ENHANCED PENDING] Nenhuma tracking_session encontrada`);
        }
      }
      
      // 2.3 - Se ainda não encontrou, tentar por device_data
      if (!matchedPendingLead) {
        console.log(`🔍 [ENHANCED PENDING] 2.3 - Tentando correlação por device_data...`);
        
        // Buscar device_data recentes sem phone específico
        const { data: recentDeviceData, error: deviceError } = await supabase
          .from('device_data')
          .select('*')
          .gte('created_at', windowStart.toISOString())
          .order('created_at', { ascending: false })
          .limit(20);

        if (!deviceError && recentDeviceData && recentDeviceData.length > 0) {
          console.log(`📋 [ENHANCED PENDING] Encontrados ${recentDeviceData.length} registros de device_data para análise`);
          
          // Para cada device_data, tentar buscar tracking_session correspondente
          for (const device of recentDeviceData) {
            const deviceTime = new Date(device.created_at).getTime();
            const messageTimeDiff = Math.abs(messageTime.getTime() - deviceTime);
            
            if (messageTimeDiff <= correlationWindow) {
              // Buscar tracking_session com IPs/user agents similares
              const { data: matchingSessions } = await supabase
                .from('tracking_sessions')
                .select('*')
                .gte('created_at', new Date(deviceTime - 60000).toISOString()) // 1 minuto antes
                .lte('created_at', new Date(deviceTime + 60000).toISOString()) // 1 minuto depois
                .limit(10);

              if (matchingSessions && matchingSessions.length > 0) {
                for (const session of matchingSessions) {
                  if (session.campaign_id) {
                    // Buscar pending_lead com esse campaign_id
                    const { data: devicePending } = await supabase
                      .from('pending_leads')
                      .select('*')
                      .eq('campaign_id', session.campaign_id)
                      .eq('status', 'pending')
                      .gte('created_at', windowStart.toISOString())
                      .order('created_at', { ascending: false })
                      .limit(1);

                    if (devicePending && devicePending.length > 0) {
                      matchedPendingLead = devicePending[0];
                      sessionCorrelationData = {
                        campaign_id: session.campaign_id,
                        correlation_method: 'device_data_to_tracking_session',
                        device_id: device.id
                      };
                      
                      console.log(`✅ [ENHANCED PENDING] Método 2.3 - Match por device_data + tracking_session:`, {
                        pending_id: matchedPendingLead.id,
                        device_id: device.id,
                        campaign_id: session.campaign_id,
                        time_diff_seconds: Math.floor(messageTimeDiff / 1000)
                      });
                      break;
                    }
                  }
                }
                
                if (matchedPendingLead) break;
              }
            }
          }
        } else {
          console.log(`❌ [ENHANCED PENDING] Nenhum device_data recente encontrado`);
        }
      }
      
      if (!matchedPendingLead) {
        console.log(`❌ [ENHANCED PENDING] Método 2 - Nenhuma correlação avançada encontrou match`);
      }
    }

    // 🎯 MÉTODO 3: CORRELAÇÃO ESTENDIDA POR CAMPANHA (ATÉ 24 HORAS)
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] ===== MÉTODO 3: CORRELAÇÃO ESTENDIDA POR CAMPANHA =====`);
      console.log(`🔍 [ENHANCED PENDING] Buscando pending_leads nas últimas 24 horas...`);
      
      const extendedWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
      
      // Buscar todos os pending_leads recentes
      const { data: recentPendingLeads, error: recentError } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', extendedWindow.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!recentError && recentPendingLeads && recentPendingLeads.length > 0) {
        console.log(`📋 [ENHANCED PENDING] Encontrados ${recentPendingLeads.length} pending_leads recentes para análise estendida`);
        
        // Tentar match por similaridade de dados
        for (const pending of recentPendingLeads) {
          if (pending.campaign_id) {
            // Match encontrado se campaign_id existir
            matchedPendingLead = pending;
            console.log(`✅ [ENHANCED PENDING] Método 3 - Match por correlação estendida (24h):`, {
              id: pending.id,
              campaign_id: pending.campaign_id,
              time_diff_hours: Math.floor((Date.now() - new Date(pending.created_at).getTime()) / (1000 * 60 * 60))
            });
            break;
          }
        }
      }
    }

    // 🎯 MÉTODO 4: BUSCAR UTM_SESSION PERSISTENTE (ATÉ 7 DIAS)
    let utmSessionData = null;
    if (!matchedPendingLead) {
      console.log(`🔍 [ENHANCED PENDING] ===== MÉTODO 4: BUSCAR UTM_SESSION PERSISTENTE =====`);
      console.log(`🔍 [ENHANCED PENDING] Buscando utm_sessions válidas (até 7 dias)...`);
      
      // Buscar utm_sessions não expiradas
      const { data: utmSessions, error: utmError } = await supabase
        .from('utm_sessions')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!utmError && utmSessions && utmSessions.length > 0) {
        console.log(`📋 [ENHANCED PENDING] Encontradas ${utmSessions.length} utm_sessions válidas para análise`);
        
        // Tentar correlacionar por campaign_id e device fingerprint
        for (const session of utmSessions) {
          if (session.campaign_id) {
            // Buscar pending_lead correspondente
            const { data: sessionPending } = await supabase
              .from('pending_leads')
              .select('*')
              .eq('campaign_id', session.campaign_id)
              .eq('status', 'pending')
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (sessionPending && sessionPending.length > 0) {
              matchedPendingLead = sessionPending[0];
              utmSessionData = {
                utm_source: session.utm_source,
                utm_medium: session.utm_medium,
                utm_campaign: session.utm_campaign,
                utm_content: session.utm_content,
                utm_term: session.utm_term,
                recovery_method: 'utm_session_persistent'
              };
              
              console.log(`✅ [ENHANCED PENDING] Método 4 - Match por utm_session persistente:`, {
                pending_id: matchedPendingLead.id,
                session_id: session.session_id,
                campaign_id: session.campaign_id,
                age_days: Math.floor((Date.now() - new Date(session.created_at).getTime()) / (1000 * 60 * 60 * 24))
              });
              break;
            }
          }
        }
      }
    }

    // ❌ SE NENHUM MÉTODO FUNCIONOU
    if (!matchedPendingLead) {
      console.log(`❌ [ENHANCED PENDING] ===== FALHA TOTAL (INCLUINDO CTWA) =====`);
      console.log(`❌ [ENHANCED PENDING] Nenhum pending_lead encontrado com todos os métodos`, {
        phone,
        windowStart: windowStart.toISOString(),
        messageTime: messageTime.toISOString(),
        methodsAttempted: ['ctwa_correlation', 'exact_phone', 'pending_contact', 'session_correlation']
      });
      
      // 🔍 DEBUG: Listar todos os pending_leads para análise
      console.log(`🔍 [ENHANCED PENDING] DEBUG: Listando todos os pending_leads recentes...`);
      const { data: allPendingLeads } = await supabase
        .from('pending_leads')
        .select('*')
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // últimos 30 minutos
        .order('created_at', { ascending: false })
        .limit(10);
      
      console.log(`📋 [ENHANCED PENDING] Pending leads recentes encontrados:`, {
        count: allPendingLeads?.length || 0,
        leads: allPendingLeads?.map((lead: any) => ({
          id: lead.id,
          phone: lead.phone,
          created_at: lead.created_at,
          campaign_id: lead.campaign_id,
          name: lead.name
        }))
      });
      
      return false;
    }

    // ✅ CONVERSÃO ENCONTRADA - PROSSEGUIR
    console.log(`🎉 [ENHANCED PENDING] ===== PENDING LEAD ENCONTRADO =====`);
    console.log(`🎉 [ENHANCED PENDING] Iniciando conversão:`, {
      id: matchedPendingLead.id,
      campaign_id: matchedPendingLead.campaign_id,
      method: sessionCorrelationData ? 'session_correlation' : 'direct_search',
      phone_original: matchedPendingLead.phone,
      phone_message: phone,
      time_diff_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000)
    });

    // Buscar user_id da campanha
    let campaignUserId = null;
    if (matchedPendingLead.campaign_id) {
      console.log(`🔍 [ENHANCED PENDING] Buscando user_id para campaign_id: ${matchedPendingLead.campaign_id}`);
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('user_id, name')
        .eq('id', matchedPendingLead.campaign_id)
        .single();

      if (campaign && !campaignError) {
        campaignUserId = campaign.user_id;
        console.log('✅ [ENHANCED PENDING] User ID da campanha encontrado:', {
          user_id: campaignUserId,
          campaign_name: campaign.name
        });
      } else {
        console.log('⚠️ [ENHANCED PENDING] Campanha não encontrada, usando fallback...');
        // Fallback para user default
        try {
          const { data: fallbackUserId, error: fallbackError } = await supabase
            .rpc('get_user_by_instance', { instance_name_param: 'default' });
          
          if (!fallbackError && fallbackUserId) {
            campaignUserId = fallbackUserId;
            console.log('✅ [ENHANCED PENDING] User ID obtido via fallback:', campaignUserId);
          }
        } catch (fallbackErr) {
          console.error('❌ [ENHANCED PENDING] Erro no fallback user_id:', fallbackErr);
        }
      }
    }

    // Buscar dados do dispositivo para enriquecer o lead
    const deviceData = await getDeviceDataByPhone(supabase, phone);

    // Preservar o nome do formulário
    const finalName = (matchedPendingLead.name && matchedPendingLead.name !== 'Visitante') 
      ? matchedPendingLead.name 
      : (contactName || 'Lead via WhatsApp');

    console.log('🔒 [ENHANCED PENDING] ===== PREPARANDO CONVERSÃO =====');
    console.log('🔒 [ENHANCED PENDING] Dados finais para conversão:', {
      finalName,
      phone,
      userId: campaignUserId,
      hasDeviceData: !!deviceData,
      correlationMethod: sessionCorrelationData ? 'session' : 'direct'
    });

    // Verificar se já existe um lead para este telefone
    console.log(`🔍 [ENHANCED PENDING] Verificando se já existe lead para: ${phone}`);
    const { data: existingLead, error: leadCheckError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .limit(1);

    if (leadCheckError) {
      console.error('❌ [ENHANCED PENDING] Erro ao verificar lead existente:', leadCheckError);
      return false;
    }

    console.log(`📋 [ENHANCED PENDING] Resultado verificação lead existente:`, {
      exists: !!(existingLead && existingLead.length > 0),
      count: existingLead?.length || 0,
      existing_lead_id: existingLead?.[0]?.id
    });

    // Extrair dados expandidos do webhook_data
    const webhookData = matchedPendingLead.webhook_data || {};
    const correlationMetadata = {
      conversion_method: sessionCorrelationData ? 'enhanced_session_correlation' : 'enhanced_direct_search',
      correlation_timestamp: new Date().toISOString(),
      original_phone: matchedPendingLead.phone,
      message_delay_seconds: Math.floor((messageTime.getTime() - new Date(matchedPendingLead.created_at).getTime()) / 1000),
      device_session_id: webhookData.device_session_id,
      campaign_click_id: webhookData.campaign_click_id,
      pending_lead_id: matchedPendingLead.id
    };

    if (existingLead && existingLead.length > 0) {
      console.log('📝 [ENHANCED PENDING] ===== ATUALIZANDO LEAD EXISTENTE =====');
      
      const updateData: any = {
        status: 'lead', // Status "lead" quando receber mensagem
        last_contact_date: new Date().toISOString(),
        evolution_message_id: messageId,
        evolution_status: status,
        last_message: messageText,
        initial_message: `Primeira mensagem: ${messageText}`,
        // Adicionar metadados de correlação
        custom_fields: {
          ...existingLead[0].custom_fields,
          correlation_metadata: correlationMetadata,
          device_info: deviceData
        }
      };
      
      // Adicionar dados do dispositivo se disponíveis
      if (deviceData) {
        Object.assign(updateData, {
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
        });
      }

      console.log('💾 [ENHANCED PENDING] Dados que serão atualizados no lead:', {
        id: existingLead[0].id,
        status: updateData.status,
        last_message: updateData.last_message?.substring(0, 100),
        correlation_method: correlationMetadata.conversion_method
      });

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead[0].id);

      if (updateError) {
        console.error('❌ [ENHANCED PENDING] Erro ao atualizar lead existente:', updateError);
        return false;
      } else {
        console.log('✅ [ENHANCED PENDING] Lead existente atualizado para status "lead"');
      }
    } else {
      console.log('🆕 [ENHANCED PENDING] ===== CRIANDO NOVO LEAD =====');
      
      // Criar novo lead com dados expandidos
      const newLeadData = {
        name: finalName,
        phone: phone,
        campaign: matchedPendingLead.campaign_name || 'WhatsApp',
        campaign_id: matchedPendingLead.campaign_id,
        user_id: campaignUserId,
        status: 'lead', // Status "lead" quando criar a partir de mensagem
        last_message: messageText,
        initial_message: `Primeira mensagem: ${messageText}`,
        first_contact_date: new Date().toISOString(),
        last_contact_date: new Date().toISOString(),
        evolution_message_id: messageId,
        evolution_status: status,
        notes: `Lead criado via correlação melhorada (${correlationMetadata.conversion_method})`,
        utm_source: matchedPendingLead.utm_source,
        utm_medium: matchedPendingLead.utm_medium,
        utm_campaign: matchedPendingLead.utm_campaign,
        utm_content: matchedPendingLead.utm_content,
        utm_term: matchedPendingLead.utm_term,
        // Dados expandidos UTM e dispositivo
        ad_account: webhookData.site_source_name || '',
        ad_set_name: webhookData.adset_name || '',
        ad_name: webhookData.ad_name || '',
        tracking_method: correlationMetadata.conversion_method,
        // Incluir dados do dispositivo se disponíveis
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
          language: deviceData.language,
          facebook_ad_id: (deviceData as any)?.facebook_ad_id || webhookData.facebook_ad_id,
          facebook_adset_id: (deviceData as any)?.facebook_adset_id || webhookData.facebook_adset_id,
          facebook_campaign_id: (deviceData as any)?.facebook_campaign_id || webhookData.facebook_campaign_id
        }),
        // Dados de correlação
        custom_fields: { 
          correlation_metadata: correlationMetadata,
          device_info: deviceData,
          utm_expanded: webhookData,
          session_correlation: sessionCorrelationData
        }
      };

      console.log('💾 [ENHANCED PENDING] Dados do novo lead que serão inseridos:', {
        name: newLeadData.name,
        phone: newLeadData.phone,
        campaign: newLeadData.campaign,
        conversion_method: correlationMetadata.conversion_method,
        message_delay: correlationMetadata.message_delay_seconds,
        user_id: newLeadData.user_id,
        campaign_id: newLeadData.campaign_id,
        has_device_data: !!deviceData
      });

      const { data: insertedLead, error: insertError } = await supabase
        .from('leads')
        .insert(newLeadData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ [ENHANCED PENDING] Erro ao criar novo lead:', insertError);
        return false;
      } else {
        console.log('✅ [ENHANCED PENDING] Novo lead criado com sucesso:', {
          id: insertedLead.id,
          name: insertedLead.name,
          phone: insertedLead.phone,
          status: insertedLead.status
        });
      }
    }

    // Marcar pending_lead como convertido
    console.log('🔄 [ENHANCED PENDING] Marcando pending_lead como convertido...');
    const { error: updatePendingError } = await supabase
      .from('pending_leads')
      .update({ 
        status: 'converted',
        phone: phone, // Atualizar com telefone real
        webhook_data: {
          ...webhookData,
          conversion_metadata: correlationMetadata
        }
      })
      .eq('id', matchedPendingLead.id);

    if (updatePendingError) {
      console.error('❌ [ENHANCED PENDING] Erro ao marcar pending_lead como convertido:', updatePendingError);
    } else {
      console.log('✅ [ENHANCED PENDING] Pending lead marcado como convertido');
    }

    console.log('🎉 [ENHANCED PENDING] ===== CONVERSÃO CONCLUÍDA COM SUCESSO =====');
    return true;

  } catch (error) {
    console.error('❌ [ENHANCED PENDING] ERRO GERAL na conversão melhorada com CTWA:', error);
    return false;
  }
};

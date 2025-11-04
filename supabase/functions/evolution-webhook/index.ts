
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getMessageContent, getContactName } from "./helpers.ts";
import { createPhoneSearchVariations } from "./phoneVariations.ts";
import { processComercialMessage, processClientMessage, handleDirectLead } from "./handlers.ts";
import { 
  corsHeaders, 
  checkRateLimit, 
  sanitizePhoneNumber, 
  sanitizeMessageContent, 
  sanitizeInstanceName,
  logSecurityEvent,
  validateWebhookPayload 
} from "./security.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Rate limiting based on IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      logSecurityEvent('Rate limit exceeded', { ip: clientIP }, 'medium');
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Use only the current Supabase project
    const supabase = createClient(
      'https://bwicygxyhkdgrypqrijo.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const body = await req.json();
    
    // Validate webhook payload
    if (!validateWebhookPayload(body)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Evolution webhook received:', JSON.stringify(body, null, 2));

    if (body.event === 'messages.upsert' && body.data) {
      const message = body.data;
      const remoteJid = message.key?.remoteJid;
      let instanceName: string;
      const isFromMe = message.key?.fromMe;
      
      try {
        instanceName = sanitizeInstanceName(body.instance);
      } catch (error) {
        logSecurityEvent('Invalid instance name in webhook', { 
          instance: body.instance, 
          error: (error as Error)?.message || 'Unknown error'
        }, 'high');
        return new Response(
          JSON.stringify({ error: 'Invalid instance name' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
      
      if (remoteJid) {
        // 🚫 FILTRAR MENSAGENS DE GRUPO (terminam com @g.us)
        if (remoteJid.endsWith('@g.us')) {
          console.log(`🚫 Ignorando mensagem de grupo: ${remoteJid}`);
          return new Response(JSON.stringify({ success: true, message: 'Group message ignored' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        let realPhoneNumber: string;
        let messageContent: string;
        
        try {
          realPhoneNumber = sanitizePhoneNumber(remoteJid.replace('@s.whatsapp.net', ''));
          messageContent = sanitizeMessageContent(getMessageContent(message));
        } catch (error) {
          logSecurityEvent('Invalid phone number or message content', { 
            remoteJid, 
            error: (error as Error)?.message || 'Unknown error'
          }, 'medium');
          return new Response(
            JSON.stringify({ error: 'Invalid phone number or message format' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log(`📱 Processando mensagem de: ${realPhoneNumber} (instância: ${instanceName})`);

        // 🆔 MÉTODO 0: TENTAR CORRELAÇÃO VIA ID ÚNICO PRIMEIRO (PRIORIDADE MÁXIMA)
        const trackingIdMatch = messageContent.match(/\[([A-Z0-9]{6})\]/);
        if (trackingIdMatch && !isFromMe) {
          const leadTrackingId = trackingIdMatch[1];
          console.log(`🎯 [ID ÚNICO] ID detectado na mensagem: ${leadTrackingId}`);
          
          // Buscar pending_lead com este ID
          const { data: pendingWithId, error: pendingError } = await supabase
            .from('pending_leads')
            .select('*')
            .eq('lead_tracking_id', leadTrackingId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (pendingWithId && pendingWithId.length > 0 && !pendingError) {
            console.log(`✅ [ID ÚNICO] Pending lead encontrado via ID! Convertendo...`, {
              pending_lead_id: pendingWithId[0].id,
              campaign_id: pendingWithId[0].campaign_id,
              phone: realPhoneNumber
            });
            
            // Limpar mensagem removendo o ID
            const cleanedMessage = messageContent.replace(/\[([A-Z0-9]{6})\]\s*/, '');
            console.log(`🧹 [ID ÚNICO] Mensagem limpa: "${cleanedMessage}"`);
            
            // Chamar handleEnhancedPendingLeadConversion diretamente
            const { handleEnhancedPendingLeadConversion } = await import('./enhancedPendingLeadHandler.ts');
            await handleEnhancedPendingLeadConversion(
              supabase,
              realPhoneNumber,
              cleanedMessage,
              message.key?.id || '',
              message.status || 'received',
              message.pushName
            );
            
            console.log(`✅ [ID ÚNICO] Conversão concluída via ID único - taxa de sucesso esperada: 95-98%`);
            
            // Retornar sucesso e SAIR do fluxo
            return new Response(JSON.stringify({ 
              success: true, 
              method: 'tracking_id',
              tracking_id: leadTrackingId
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          } else {
            console.log(`⚠️ [ID ÚNICO] Nenhum pending_lead encontrado com ID: ${leadTrackingId}`);
          }
        }

        // Create phone variations and look for matching leads
        const phoneVariations = createPhoneSearchVariations(realPhoneNumber);

        const { data: matchedLeads } = await supabase
          .from('leads')
          .select('*, campaigns!leads_campaign_id_fkey(conversion_keywords, cancellation_keywords)')
          .in('phone', phoneVariations);

        if (matchedLeads && matchedLeads.length > 0) {
          console.log(`✅ Lead existente encontrado para ${realPhoneNumber}`);
          if (isFromMe) {
            await processComercialMessage({
              supabase, message, realPhoneNumber, matchedLeads, messageContent
            });
          } else {
            await processClientMessage({
              supabase, message, realPhoneNumber, matchedLeads, messageContent
            });
          }
        } else {
          // No lead found; direct WhatsApp message
          if (!isFromMe) {
            console.log(`🆕 Novo contato direto de: ${realPhoneNumber} (instância: ${instanceName})`);
            await handleDirectLead({ 
              supabase, 
              message, 
              realPhoneNumber, 
              instanceName 
            });
          } else {
            console.log(`📤 Mensagem enviada por mim para: ${realPhoneNumber} - ignorando`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    logSecurityEvent('Webhook processing error', { 
      error: (error as Error)?.message || 'Unknown error',
      stack: (error as Error)?.stack
    }, 'high');
    
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

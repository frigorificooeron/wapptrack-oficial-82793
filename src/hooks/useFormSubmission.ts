
import { trackRedirect } from '@/services/trackingService';
import { toast } from 'sonner';
import { sendWebhookData } from '@/services/webhookService';
import { Lead } from '@/types';
import { Campaign } from '@/types';
import { useEnhancedPixelTracking } from './useEnhancedPixelTracking';
import { collectUrlParameters } from '@/lib/dataCollection';
import { encodeInvisibleToken } from '@/lib/utils';

export const useFormSubmission = (
  campaignId: string | null,
  campaign: Campaign | null,
  pixelInitialized: boolean
) => {
  const { trackEnhancedLead } = useEnhancedPixelTracking(campaign);

  // 🆔 Gerar ID único de rastreamento (6 caracteres alfanuméricos)
  const generateTrackingId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };

  const updateLeadWhatsAppStatus = async (leadId: string, delivered: boolean) => {
    try {
      const status: Lead['status'] = delivered ? 'contacted' : 'new';
      const updateData: Partial<Lead> = {
        status,
        whatsapp_delivery_attempts: delivered ? 1 : 1,
        last_whatsapp_attempt: new Date().toISOString()
      };
      
      const { updateLead } = await import('@/services/leadService');
      await updateLead(leadId, updateData);
      console.log(`✅ [FORM SUBMISSION] Lead status updated to: ${status}`);
    } catch (error) {
      console.error('❌ [FORM SUBMISSION] Error updating lead WhatsApp status:', error);
    }
  };

  const handleFormSubmit = async (phone: string, name: string, email?: string) => {
    if (!campaignId) {
      console.error('❌ [FORM SUBMISSION] ID da campanha não encontrado');
      toast.error('Erro: ID da campanha não encontrado');
      throw new Error('ID da campanha não encontrado');
    }

    if (!campaign) {
      console.error('❌ [FORM SUBMISSION] Dados da campanha não encontrados');
      toast.error('Erro: Dados da campanha não encontrados');
      throw new Error('Dados da campanha não encontrados');
    }

    console.log('📝 [FORM SUBMISSION] Processando envio do formulário...', {
      campaignId,
      phone,
      name,
      campaign: campaign.name
    });

    // Verificar se o número do WhatsApp está configurado
    if (!campaign.whatsapp_number) {
      console.error('❌ [FORM SUBMISSION] Número de WhatsApp não configurado para esta campanha');
      toast.error('Número de WhatsApp não configurado para esta campanha');
      throw new Error('Número de WhatsApp não configurado');
    }

    try {
      // Track enhanced lead event BEFORE processing
      if (campaign && trackEnhancedLead) {
        try {
          console.log('📊 [FORM SUBMISSION] Executando tracking avançado de lead...');
          await trackEnhancedLead({
            name,
            phone,
            email,
            value: 100
          });
          console.log('✅ [FORM SUBMISSION] Tracking avançado de lead concluído');
        } catch (trackingError) {
          console.warn('⚠️ [FORM SUBMISSION] Tracking avançado falhou, continuando com processamento:', trackingError);
        }
      }

      // Send data via external webhook if configured
      try {
        const webhookConfig = localStorage.getItem('webhook_config');
        if (webhookConfig) {
          const config = JSON.parse(webhookConfig);
          if (config.webhook_url) {
            const webhookData = {
              campaign_id: campaignId,
              campaign_name: campaign.name,
              lead_name: name,
              lead_phone: phone,
              lead_email: email,
              timestamp: new Date().toISOString(),
              event_type: campaign.event_type
            };
            
            await sendWebhookData(config.webhook_url, webhookData);
            console.log('✅ [FORM SUBMISSION] Dados enviados via webhook externo com sucesso');
          }
        }
      } catch (error) {
        console.error('❌ [FORM SUBMISSION] Erro ao enviar dados via webhook externo:', error);
      }

      // 🎯 COLETA UTMs E PARÂMETROS EXPANDIDOS
      const utms = collectUrlParameters();
      console.log('🌐 [FORM SUBMISSION] UTMs e parâmetros coletados:', utms);

      console.log('📱 [FORM SUBMISSION] Processando formulário via trackRedirect...');
      
      const result = await trackRedirect(
        campaignId, 
        phone, 
        name, 
        campaign.event_type,
        utms
      );
      
      console.log('✅ [FORM SUBMISSION] trackRedirect executado com sucesso:', result);
      
      // 🆔 Gerar ID único e incluir na mensagem (INVISÍVEL)
      const leadTrackingId = generateTrackingId();
      const invisibleToken = encodeInvisibleToken(leadTrackingId);
      console.log('🆔 [FORM] ID único gerado:', leadTrackingId);
      console.log('👻 [FORM] Token invisível gerado (caracteres zero-width)');

      // Build WhatsApp URL with custom message + invisible token
      let whatsappUrl = `https://wa.me/${campaign.whatsapp_number}`;
      
      if (campaign.custom_message) {
        let message = campaign.custom_message;
        if (name) {
          message = message.replace(/\{nome\}/gi, name);
        }
        message = message.replace(/\{telefone\}/gi, phone);
        
        // 🆔 Incluir token invisível no início da mensagem
        const messageWithToken = `${invisibleToken}${message}`;
        const encodedMessage = encodeURIComponent(messageWithToken);
        whatsappUrl += `?text=${encodedMessage}`;
      }
      
      console.log('↗️ [FORM SUBMISSION] Redirecionando para WhatsApp:', whatsappUrl);
      
      toast.success('Lead salvo! Redirecionando para o WhatsApp...');
      
      // Garantir que o redirecionamento aconteça imediatamente
      setTimeout(() => {
        console.log('🚀 [FORM SUBMISSION] Executando redirecionamento...');
        window.location.href = whatsappUrl;
      }, 500);
      
      console.log('✅ [FORM SUBMISSION] Redirecionamento WhatsApp iniciado');
      
    } catch (error) {
      console.error('❌ [FORM SUBMISSION] Erro no trackRedirect ou redirecionamento WhatsApp:', error);
      toast.error('Erro ao processar redirecionamento. Tentando novamente...');
      
      // Fallback: tentar redirecionamento direto
      setTimeout(() => {
        console.log('🔄 [FORM SUBMISSION] Executando redirecionamento de fallback...');
        window.location.href = `https://wa.me/${campaign.whatsapp_number}`;
      }, 1000);
      
      throw new Error('Erro ao processar redirecionamento');
    }
  };

  return {
    handleFormSubmit,
    updateLeadWhatsAppStatus
  };
};

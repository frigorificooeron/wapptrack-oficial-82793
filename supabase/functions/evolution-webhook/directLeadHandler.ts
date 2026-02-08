// Refactored Direct Lead Handler - Uses modular components
import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { logSecurityEvent } from './security.ts';
import { createPhoneSearchVariations } from './phoneVariations.ts';
import { resolveUtmsFromMessage, markClickConverted } from './utmResolver.ts';
import { resolveCampaign } from './campaignResolver.ts';
import { createLead, checkExistingLead } from './leadCreator.ts';

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
  console.log(`🆕 [DIRECT LEAD] Processing new direct contact from: ${realPhoneNumber} (instance: ${instanceName})`);
  
  try {
    // Extract message content
    const messageContent = message.message?.conversation || 
                          message.message?.extendedTextMessage?.text || 
                          '';
    
    console.log(`📝 [DIRECT LEAD] Message content: "${messageContent.substring(0, 100)}..."`);

    // Step 1: Resolve campaign and user
    const { campaign: initialCampaign, userId: initialUserId } = await resolveCampaign(
      supabase, 
      null, // No click data yet
      instanceName
    );

    // Step 2: Resolve UTMs from message (may update campaign via token)
    const { utms, clickData, invisibleToken, cleanedMessage } = await resolveUtmsFromMessage(
      supabase,
      messageContent,
      realPhoneNumber,
      initialCampaign,
      instanceName
    );

    // If we found a campaign from click data, use that instead
    let linkedCampaign = initialCampaign;
    let responsibleUserId = initialUserId;
    
    if (clickData?.campaign_id && clickData.campaign_id !== initialCampaign?.id) {
      const { campaign, userId } = await resolveCampaign(supabase, clickData, instanceName);
      if (campaign) {
        linkedCampaign = campaign;
        responsibleUserId = userId || responsibleUserId;
      }
    }

    if (!responsibleUserId) {
      console.error(`💥 [DIRECT LEAD] CRITICAL: Could not determine responsible user for instance: ${instanceName}`);
      console.log(`🛟 [DIRECT LEAD] Attempting to create lead without linked campaign...`);
    }

    // Step 3: Check for existing lead
    const phoneVariations = createPhoneSearchVariations(realPhoneNumber);
    const existingLead = await checkExistingLead(supabase, phoneVariations);

    if (existingLead) {
      console.log(`⚠️ [DIRECT LEAD] Lead already exists: ${existingLead.id}`);
      if (clickData) {
        await markClickConverted(supabase, clickData, existingLead.id);
      }
      return;
    }

    // Step 4: Get device data
    console.log(`🔍 [DIRECT LEAD] Fetching device data for: ${realPhoneNumber}`);
    const deviceData = await getDeviceDataByPhone(supabase, realPhoneNumber);
    
    if (deviceData) {
      console.log(`✅ [DIRECT LEAD] Device data found`);
    }

    // Step 5: Create the lead
    const newLead = await createLead(
      supabase,
      message,
      realPhoneNumber,
      utms,
      cleanedMessage,
      linkedCampaign,
      responsibleUserId,
      deviceData,
      instanceName
    );

    if (!newLead) {
      return;
    }

    // Step 5.1: Save the first inbound message into chat history
    if (cleanedMessage?.trim()) {
      const { error: messageError } = await supabase
        .from('lead_messages')
        .insert({
          lead_id: newLead.id,
          message_text: cleanedMessage,
          is_from_me: false,
          whatsapp_message_id: message.key?.id || null,
          instance_name: instanceName,
          status: 'received',
        });

      if (messageError) {
        console.error('❌ [DIRECT LEAD] Failed to save first message in lead_messages:', messageError);
      } else {
        console.log('✅ [DIRECT LEAD] First message saved in lead_messages');
      }
    }

    // Step 6: Mark click as converted
    if (clickData) {
      await markClickConverted(supabase, clickData, newLead.id);
    }

    console.log(`✅ [DIRECT LEAD] Lead created successfully:`, {
      lead_id: newLead.id,
      name: newLead.name,
      tracking_method: newLead.tracking_method,
      has_token: !!invisibleToken
    });

  } catch (error) {
    console.error(`💥 [DIRECT LEAD] Critical error in handleDirectLead:`, error);
    logSecurityEvent('Critical error in handleDirectLead', {
      error: (error as Error)?.message || 'Unknown error',
      phone: realPhoneNumber,
      instance: instanceName
    }, 'high');
  }
};

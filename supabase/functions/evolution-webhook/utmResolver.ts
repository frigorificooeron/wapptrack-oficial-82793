
// UTM Resolution module - Resolves UTM parameters for lead attribution
import { getUtmsFromDirectClick, getClickByToken, markClickAsConverted } from './utmHandler.ts';
import { decodeInvisibleToken, cleanMessageFromInvisibleToken } from './messageProcessors.ts';

export interface ResolvedUtms {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  tracking_id: string | null;
  fbclid: string | null;
  gclid: string | null;
  ctwa_clid: string | null;
  click_id: string | null;
  tracking_method: string;
}

export interface UtmResolutionResult {
  utms: ResolvedUtms;
  clickData: any | null;
  invisibleToken: string | null;
  cleanedMessage: string;
}

/**
 * Resolves UTMs from message content using multiple strategies:
 * 1. Invisible token decoding
 * 2. Recent click lookup
 * 3. Campaign defaults
 * 4. Organic fallback
 */
export async function resolveUtmsFromMessage(
  supabase: any,
  messageContent: string,
  realPhoneNumber: string,
  linkedCampaign: any | null,
  instanceName: string
): Promise<UtmResolutionResult> {
  console.log(`🔍 [UTM RESOLVER] Starting UTM resolution for: ${realPhoneNumber}`);
  
  let invisibleToken: string | null = null;
  let clickData: any = null;
  
  // Strategy 1: Try to decode invisible token from message
  if (messageContent) {
    invisibleToken = decodeInvisibleToken(messageContent);
    if (invisibleToken) {
      console.log(`👻 [UTM RESOLVER] Invisible token detected: ${invisibleToken}`);
      clickData = await getClickByToken(supabase, invisibleToken);
      if (clickData) {
        console.log(`✅ [UTM RESOLVER] Click found by token:`, {
          click_id: clickData.id,
          campaign_id: clickData.campaign_id
        });
      }
    }
  }

  // Strategy 2: Search recent clicks if no token match
  if (!clickData) {
    const recentClick = await getUtmsFromDirectClick(supabase, realPhoneNumber);
    if (recentClick) {
      clickData = {
        id: recentClick.click_id,
        ...recentClick
      };
      console.log(`📋 [UTM RESOLVER] Recent click found`);
    }
  }

  // Determine final UTMs based on resolution priority
  let finalUtms: ResolvedUtms;
  
  if (clickData) {
    finalUtms = {
      utm_source: clickData.utm_source || linkedCampaign?.utm_source || 'whatsapp',
      utm_medium: clickData.utm_medium || linkedCampaign?.utm_medium || 'click',
      utm_campaign: clickData.utm_campaign || linkedCampaign?.utm_campaign || linkedCampaign?.name || null,
      utm_content: clickData.utm_content || linkedCampaign?.utm_content || null,
      utm_term: clickData.utm_term || linkedCampaign?.utm_term || null,
      tracking_id: clickData.tracking_id || null,
      fbclid: clickData.fbclid || null,
      gclid: clickData.gclid || null,
      ctwa_clid: clickData.ctwa_clid || null,
      click_id: clickData.id || clickData.click_id || null,
      tracking_method: 'token_correlation'
    };
  } else if (linkedCampaign) {
    finalUtms = {
      utm_source: linkedCampaign.utm_source || 'whatsapp',
      utm_medium: linkedCampaign.utm_medium || 'campaign',
      utm_campaign: linkedCampaign.utm_campaign || linkedCampaign.name || null,
      utm_content: linkedCampaign.utm_content || null,
      utm_term: linkedCampaign.utm_term || null,
      tracking_id: null,
      fbclid: null,
      gclid: null,
      ctwa_clid: null,
      click_id: null,
      tracking_method: 'campaign_whatsapp'
    };
  } else {
    finalUtms = {
      utm_source: 'whatsapp',
      utm_medium: 'organic',
      utm_campaign: 'organic',
      utm_content: `instance:${instanceName}`,
      utm_term: null,
      tracking_id: null,
      fbclid: null,
      gclid: null,
      ctwa_clid: null,
      click_id: null,
      tracking_method: 'direct'
    };
  }

  console.log(`📋 [UTM RESOLVER] Final UTMs resolved:`, {
    source: finalUtms.utm_source,
    medium: finalUtms.utm_medium,
    method: finalUtms.tracking_method
  });

  return {
    utms: finalUtms,
    clickData,
    invisibleToken,
    cleanedMessage: cleanMessageFromInvisibleToken(messageContent)
  };
}

/**
 * Marks a click as converted and associates it with a lead
 */
export async function markClickConverted(
  supabase: any,
  clickData: any,
  leadId: string
): Promise<void> {
  if (!clickData) return;
  
  const clickId = clickData.id || clickData.click_id;
  if (!clickId) return;
  
  await markClickAsConverted(supabase, clickId, leadId);
  console.log(`✅ [UTM RESOLVER] Click ${clickId} marked as converted for lead ${leadId}`);
}

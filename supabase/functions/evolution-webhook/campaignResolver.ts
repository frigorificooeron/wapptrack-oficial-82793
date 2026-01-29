
// Campaign Resolution module - Finds campaign and user for lead attribution

import { logSecurityEvent } from './security.ts';

export interface CampaignResolutionResult {
  campaign: any | null;
  userId: string | null;
}

/**
 * Resolves campaign and user from click data or instance
 */
export async function resolveCampaign(
  supabase: any,
  clickData: any | null,
  instanceName: string
): Promise<CampaignResolutionResult> {
  console.log(`🔍 [CAMPAIGN RESOLVER] Starting resolution for instance: ${instanceName}`);
  
  let responsibleUserId: string | null = null;
  let linkedCampaign: any = null;
  
  // Strategy 1: Get campaign from click data
  if (clickData?.campaign_id) {
    console.log(`🎯 [CAMPAIGN RESOLVER] Looking up campaign from click: ${clickData.campaign_id}`);
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', clickData.campaign_id)
      .single();
    
    if (campaign && !error) {
      linkedCampaign = campaign;
      responsibleUserId = campaign.user_id;
      console.log(`✅ [CAMPAIGN RESOLVER] Campaign found from click:`, {
        id: campaign.id,
        name: campaign.name
      });
    }
  }

  // Strategy 2: Find active WhatsApp campaign
  if (!linkedCampaign) {
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('active', true)
        .eq('redirect_type', 'whatsapp')
        .not('user_id', 'is', null)
        .limit(1);

      if (campaigns && campaigns.length > 0 && !error) {
        linkedCampaign = campaigns[0];
        responsibleUserId = linkedCampaign.user_id;
        console.log(`✅ [CAMPAIGN RESOLVER] Active WhatsApp campaign found:`, {
          id: linkedCampaign.id,
          name: linkedCampaign.name
        });
      }
    } catch (err) {
      console.log(`❌ [CAMPAIGN RESOLVER] Error searching campaigns:`, err);
    }
  }

  // Strategy 3: Fallback to user lookup by instance
  if (!responsibleUserId) {
    console.log(`🔄 [CAMPAIGN RESOLVER] Trying user fallback via get_user_by_instance...`);
    try {
      const { data: userData, error } = await supabase.rpc('get_user_by_instance', {
        instance_name_param: instanceName
      });

      if (userData && !error) {
        responsibleUserId = userData;
        console.log(`✅ [CAMPAIGN RESOLVER] User found via fallback: ${responsibleUserId}`);
      }
    } catch (err) {
      console.log(`❌ [CAMPAIGN RESOLVER] Error calling get_user_by_instance:`, err);
    }
  }

  if (!responsibleUserId) {
    logSecurityEvent('Critical: No user found for organic lead', {
      instance: instanceName
    }, 'high');
  }

  return {
    campaign: linkedCampaign,
    userId: responsibleUserId
  };
}

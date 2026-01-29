
// Lead Creator module - Creates leads from WhatsApp messages

import { getContactName } from './helpers.ts';
import { logSecurityEvent } from './security.ts';
import { fetchProfilePicture } from './profilePictureHandler.ts';
import { ResolvedUtms } from './utmResolver.ts';

export interface LeadCreationData {
  name: string;
  phone: string;
  campaign: string;
  campaign_id: string | null;
  status: string;
  first_contact_date: string;
  last_message: string | null;
  initial_message: string | null;
  profile_picture_url: string | null;
  user_id?: string;
  // UTMs
  utm_source: string;
  utm_medium: string;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  lead_tracking_id: string | null;
  tracking_method: string;
  // Device data
  location?: string;
  ip_address?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  device_model?: string;
  country?: string;
  city?: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
}

/**
 * Creates a new lead in the database
 */
export async function createLead(
  supabase: any,
  message: any,
  realPhoneNumber: string,
  utms: ResolvedUtms,
  cleanedMessage: string,
  linkedCampaign: any | null,
  responsibleUserId: string | null,
  deviceData: any | null,
  instanceName: string
): Promise<any | null> {
  console.log(`🆕 [LEAD CREATOR] Creating lead for: ${realPhoneNumber}`);
  
  // Fetch profile picture
  const profilePictureUrl = await fetchProfilePicture(supabase, realPhoneNumber, instanceName);
  
  // Prepare lead data
  const leadData: LeadCreationData = {
    name: getContactName(message),
    phone: realPhoneNumber,
    campaign: linkedCampaign?.name || "WhatsApp Orgânico",
    campaign_id: linkedCampaign?.id || null,
    status: 'new',
    first_contact_date: new Date().toISOString(),
    last_message: cleanedMessage || 'Mensagem recebida',
    initial_message: cleanedMessage ? `Primeira mensagem: ${cleanedMessage}` : null,
    profile_picture_url: profilePictureUrl,
    // UTMs
    utm_source: utms.utm_source,
    utm_medium: utms.utm_medium,
    utm_campaign: utms.utm_campaign,
    utm_content: utms.utm_content,
    utm_term: utms.utm_term,
    lead_tracking_id: utms.tracking_id,
    tracking_method: utms.tracking_method,
  };

  // Add user_id if available
  if (responsibleUserId) {
    leadData.user_id = responsibleUserId;
  }

  // Add device data if available
  if (deviceData) {
    Object.assign(leadData, {
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

  console.log(`🆕 [LEAD CREATOR] Lead data prepared:`, {
    name: leadData.name,
    phone: leadData.phone,
    campaign: leadData.campaign,
    tracking_method: leadData.tracking_method,
    has_device_data: !!deviceData
  });

  // Insert lead
  const { data: newLead, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single();

  if (error) {
    console.error(`❌ [LEAD CREATOR] Error creating lead:`, error);
    logSecurityEvent('Failed to create lead', {
      error: error.message,
      phone: realPhoneNumber,
      instance: instanceName
    }, 'high');
    return null;
  }

  console.log(`✅ [LEAD CREATOR] Lead created successfully:`, {
    id: newLead.id,
    name: newLead.name,
    tracking_method: newLead.tracking_method
  });

  logSecurityEvent('Lead created successfully', {
    lead_id: newLead.id,
    phone: realPhoneNumber,
    instance: instanceName,
    tracking_method: leadData.tracking_method
  }, 'low');

  return newLead;
}

/**
 * Checks if a lead already exists for the given phone variations
 */
export async function checkExistingLead(
  supabase: any,
  phoneVariations: string[]
): Promise<any | null> {
  console.log(`📞 [LEAD CREATOR] Checking existing leads for: ${JSON.stringify(phoneVariations)}`);
  
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('id, name, phone, user_id')
    .in('phone', phoneVariations)
    .limit(1);

  if (existingLeads && existingLeads.length > 0) {
    console.log(`⚠️ [LEAD CREATOR] Lead already exists:`, {
      id: existingLeads[0].id,
      name: existingLeads[0].name
    });
    return existingLeads[0];
  }

  return null;
}

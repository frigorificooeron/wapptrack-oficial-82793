export interface User {
  id: string;
  name?: string;
  email: string;
  image?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  campaign: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiating' | 'converted' | 'lost' | 'cancelled';
  created_at: string;
  updated_at?: string;
  custom_fields?: Record<string, string>;
  notes?: string;
  first_contact_date?: string;
  last_contact_date?: string;
  last_message?: string;
  evolution_message_id?: string;
  evolution_status?: string;
  whatsapp_delivery_attempts?: number;
  last_whatsapp_attempt?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  // Campos de dispositivo e localização
  location?: string;
  ip_address?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  device_model?: string;
  tracking_method?: string;
  ad_account?: string;
  ad_set_name?: string;
  ad_name?: string;
  initial_message?: string;
  country?: string;
  city?: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
  // 🎯 CAMPOS DO FACEBOOK ADS
  facebook_ad_id?: string;
  facebook_adset_id?: string;
  facebook_campaign_id?: string;
  // 🆕 CAMPO USER_ID
  user_id?: string;
  // 🆕 CAMPOS EXPANDIDOS UTM
  site_source_name?: string;
  adset_name?: string;
  campaign_name?: string;
  ad_name_expanded?: string;
  placement?: string;
  gclid?: string;
  fbclid?: string;
  // 📸 FOTO DO PERFIL DO WHATSAPP
  profile_picture_url?: string;
}

export interface Campaign {
  id: string;
  name: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  pixel_id?: string;
  facebook_access_token?: string;
  whatsapp_number?: string;
  event_type?: 'contact' | 'lead' | 'page_view' | 'sale';
  active?: boolean;
  custom_message?: string;
  company_title?: string;
  company_subtitle?: string;
  logo_url?: string;
  redirect_type?: 'whatsapp' | 'form';
  pixel_integration_type?: 'direct' | 'form';
  conversion_api_enabled?: boolean;
  advanced_matching_enabled?: boolean;
  server_side_api_enabled?: boolean;
  test_event_code?: string;
  custom_audience_pixel_id?: string;
  tracking_domain?: string;
  external_id?: string;
  data_processing_options?: string[];
  data_processing_options_country?: number;
  data_processing_options_state?: number;
  conversion_keywords?: string[];
  cancellation_keywords?: string[];
  created_at?: string;
  // 🆕 CAMPO USER_ID
  user_id?: string;
}

export interface Sale {
  id: string;
  value: number; // Maps to database 'amount' field
  date: string; // Maps to database 'sale_date' field
  lead_name?: string;
  campaign?: string;
  product?: string;
  notes?: string;
  lead_id?: string;
  status?: 'confirmed' | 'pending' | 'cancelled'; // Add status field
  created_at: string;
  updated_at: string;
  // 🆕 CAMPOS PARA PRESERVAR DADOS DO LEAD
  custom_fields?: Record<string, any>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ad_account?: string;
  ad_set_name?: string;
  ad_name?: string;
  tracking_method?: string;
  device_type?: string;
  location?: string;
}

export type CompanySettings = {
  id?: string;
  company_name: string;
  company_subtitle: string;
  logo_url?: string;
  theme: Theme;
  created_at?: string;
  updated_at?: string;
};

export type Theme = 'light' | 'dark' | 'system';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface TrendData {
  trend: 'up' | 'down' | 'flat';
  percentage: number;
}

export interface DashboardStats {
  totalLeads: number;
  totalSales: number;
  conversionRate: number;
  totalRevenue: number;
  todaysLeads: number;
  confirmedSales: number;
  pendingConversations: number;
  monthlyLeads: number;
  monthlyRevenue: number;
  monthlyLeadsTrend?: TrendData;
  monthlyRevenueTrend?: TrendData;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  leads: number;
  sales: number;
  revenue: number;
  conversionRate: number;
}

export interface TimelineDataPoint {
  date: string;
  leads: number;
  sales: number;
  revenue: number;
}

export interface MonthlyStats {
  currentMonth: {
    leads: number;
    revenue: number;
  };
  previousMonth: {
    leads: number;
    revenue: number;
  };
}

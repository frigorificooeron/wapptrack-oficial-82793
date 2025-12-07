export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      campaign_clicks: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          converted: boolean | null
          converted_at: string | null
          created_at: string | null
          ctwa_clid: string | null
          device_info: Json | null
          facebook_ad_id: string | null
          facebook_adset_id: string | null
          facebook_campaign_id: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip_address: string | null
          language: string | null
          lead_id: string | null
          screen_resolution: string | null
          source_id: string | null
          source_url: string | null
          timezone: string | null
          token: string
          tracking_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          ctwa_clid?: string | null
          device_info?: Json | null
          facebook_ad_id?: string | null
          facebook_adset_id?: string | null
          facebook_campaign_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          lead_id?: string | null
          screen_resolution?: string | null
          source_id?: string | null
          source_url?: string | null
          timezone?: string | null
          token: string
          tracking_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string | null
          ctwa_clid?: string | null
          device_info?: Json | null
          facebook_ad_id?: string | null
          facebook_adset_id?: string | null
          facebook_campaign_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          lead_id?: string | null
          screen_resolution?: string | null
          source_id?: string | null
          source_url?: string | null
          timezone?: string | null
          token?: string
          tracking_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      campaign_tokens: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          lead_tracking_id: string
          phone: string | null
          status: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          lead_tracking_id: string
          phone?: string | null
          status?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          lead_tracking_id?: string
          phone?: string | null
          status?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          active: boolean | null
          advanced_matching_enabled: boolean | null
          cancellation_keywords: string[] | null
          company_name: string | null
          company_subtitle: string | null
          conversion_api_enabled: boolean | null
          conversion_keywords: string[] | null
          created_at: string
          custom_audience_pixel_id: string | null
          custom_message: string | null
          data_processing_options: string[] | null
          data_processing_options_country: number | null
          data_processing_options_state: number | null
          event_type: string | null
          external_id: string | null
          facebook_access_token: string | null
          id: string
          name: string
          pixel_id: string | null
          pixel_integration_type: string | null
          redirect_type: string | null
          server_side_api_enabled: boolean | null
          test_event_code: string | null
          tracking_domain: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp_number: string | null
        }
        Insert: {
          active?: boolean | null
          advanced_matching_enabled?: boolean | null
          cancellation_keywords?: string[] | null
          company_name?: string | null
          company_subtitle?: string | null
          conversion_api_enabled?: boolean | null
          conversion_keywords?: string[] | null
          created_at?: string
          custom_audience_pixel_id?: string | null
          custom_message?: string | null
          data_processing_options?: string[] | null
          data_processing_options_country?: number | null
          data_processing_options_state?: number | null
          event_type?: string | null
          external_id?: string | null
          facebook_access_token?: string | null
          id?: string
          name: string
          pixel_id?: string | null
          pixel_integration_type?: string | null
          redirect_type?: string | null
          server_side_api_enabled?: boolean | null
          test_event_code?: string | null
          tracking_domain?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          active?: boolean | null
          advanced_matching_enabled?: boolean | null
          cancellation_keywords?: string[] | null
          company_name?: string | null
          company_subtitle?: string | null
          conversion_api_enabled?: boolean | null
          conversion_keywords?: string[] | null
          created_at?: string
          custom_audience_pixel_id?: string | null
          custom_message?: string | null
          data_processing_options?: string[] | null
          data_processing_options_country?: number | null
          data_processing_options_state?: number | null
          event_type?: string | null
          external_id?: string | null
          facebook_access_token?: string | null
          id?: string
          name?: string
          pixel_id?: string | null
          pixel_integration_type?: string | null
          redirect_type?: string | null
          server_side_api_enabled?: boolean | null
          test_event_code?: string | null
          tracking_domain?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          company_name: string | null
          company_subtitle: string | null
          created_at: string
          facebook_access_token: string | null
          facebook_pixel_id: string | null
          id: string
          logo_url: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          company_subtitle?: string | null
          created_at?: string
          facebook_access_token?: string | null
          facebook_pixel_id?: string | null
          id?: string
          logo_url?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          company_name?: string | null
          company_subtitle?: string | null
          created_at?: string
          facebook_access_token?: string | null
          facebook_pixel_id?: string | null
          id?: string
          logo_url?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ctwa_tracking: {
        Row: {
          campaign_id: string
          clicked_at: string
          created_at: string
          ctwa_clid: string
          device_info: Json | null
          id: string
          ip_address: string | null
          language: string | null
          screen_resolution: string | null
          source_id: string | null
          source_url: string | null
          timezone: string | null
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string
          created_at?: string
          ctwa_clid: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          language?: string | null
          screen_resolution?: string | null
          source_id?: string | null
          source_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string
          created_at?: string
          ctwa_clid?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          language?: string | null
          screen_resolution?: string | null
          source_id?: string | null
          source_url?: string | null
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      device_data: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device_model: string | null
          device_type: string | null
          facebook_ad_id: string | null
          facebook_adset_id: string | null
          facebook_campaign_id: string | null
          id: string
          ip_address: string | null
          language: string | null
          location: string | null
          os: string | null
          phone: string
          screen_resolution: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          facebook_ad_id?: string | null
          facebook_adset_id?: string | null
          facebook_campaign_id?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          location?: string | null
          os?: string | null
          phone: string
          screen_resolution?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device_model?: string | null
          device_type?: string | null
          facebook_ad_id?: string | null
          facebook_adset_id?: string | null
          facebook_campaign_id?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          location?: string | null
          os?: string | null
          phone?: string
          screen_resolution?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_messages: {
        Row: {
          created_at: string
          id: string
          instance_name: string | null
          is_from_me: boolean
          lead_id: string
          message_text: string
          sent_at: string
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name?: string | null
          is_from_me?: boolean
          lead_id: string
          message_text: string
          sent_at?: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string | null
          is_from_me?: boolean
          lead_id?: string
          message_text?: string
          sent_at?: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_account: string | null
          ad_name: string | null
          ad_set_name: string | null
          browser: string | null
          campaign: string | null
          campaign_id: string | null
          city: string | null
          country: string | null
          created_at: string
          custom_fields: Json | null
          device_model: string | null
          device_type: string | null
          evolution_message_id: string | null
          evolution_status: string | null
          facebook_ad_id: string | null
          facebook_adset_id: string | null
          facebook_campaign_id: string | null
          first_contact_date: string | null
          id: string
          initial_message: string | null
          ip_address: string | null
          language: string | null
          last_contact_date: string | null
          last_message: string | null
          last_whatsapp_attempt: string | null
          lead_tracking_id: string | null
          location: string | null
          name: string
          notes: string | null
          os: string | null
          phone: string
          profile_picture_url: string | null
          screen_resolution: string | null
          status: string | null
          timezone: string | null
          tracking_method: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp_delivery_attempts: number | null
        }
        Insert: {
          ad_account?: string | null
          ad_name?: string | null
          ad_set_name?: string | null
          browser?: string | null
          campaign?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          device_model?: string | null
          device_type?: string | null
          evolution_message_id?: string | null
          evolution_status?: string | null
          facebook_ad_id?: string | null
          facebook_adset_id?: string | null
          facebook_campaign_id?: string | null
          first_contact_date?: string | null
          id?: string
          initial_message?: string | null
          ip_address?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_message?: string | null
          last_whatsapp_attempt?: string | null
          lead_tracking_id?: string | null
          location?: string | null
          name: string
          notes?: string | null
          os?: string | null
          phone: string
          profile_picture_url?: string | null
          screen_resolution?: string | null
          status?: string | null
          timezone?: string | null
          tracking_method?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_delivery_attempts?: number | null
        }
        Update: {
          ad_account?: string | null
          ad_name?: string | null
          ad_set_name?: string | null
          browser?: string | null
          campaign?: string | null
          campaign_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          custom_fields?: Json | null
          device_model?: string | null
          device_type?: string | null
          evolution_message_id?: string | null
          evolution_status?: string | null
          facebook_ad_id?: string | null
          facebook_adset_id?: string | null
          facebook_campaign_id?: string | null
          first_contact_date?: string | null
          id?: string
          initial_message?: string | null
          ip_address?: string | null
          language?: string | null
          last_contact_date?: string | null
          last_message?: string | null
          last_whatsapp_attempt?: string | null
          lead_tracking_id?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          os?: string | null
          phone?: string
          profile_picture_url?: string | null
          screen_resolution?: string | null
          status?: string | null
          timezone?: string | null
          tracking_method?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_delivery_attempts?: number | null
        }
        Relationships: []
      }
      pending_leads: {
        Row: {
          campaign_id: string
          campaign_name: string | null
          created_at: string
          id: string
          lead_tracking_id: string | null
          name: string
          phone: string
          status: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          webhook_data: Json | null
          webhook_sent_at: string | null
        }
        Insert: {
          campaign_id: string
          campaign_name?: string | null
          created_at?: string
          id?: string
          lead_tracking_id?: string | null
          name: string
          phone: string
          status?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_data?: Json | null
          webhook_sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          campaign_name?: string | null
          created_at?: string
          id?: string
          lead_tracking_id?: string | null
          name?: string
          phone?: string
          status?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          webhook_data?: Json | null
          webhook_sent_at?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string
          custom_fields: Json | null
          id: string
          lead_id: string | null
          notes: string | null
          sale_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          sale_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          custom_fields?: Json | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          sale_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      utm_clicks: {
        Row: {
          created_at: string
          id: string
          phone: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          phone: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      utm_sessions: {
        Row: {
          campaign_id: string
          created_at: string | null
          device_fingerprint: Json | null
          expires_at: string | null
          id: string
          ip_address: string | null
          session_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          device_fingerprint?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          session_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          device_fingerprint?: Json | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          session_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          base_url: string
          created_at: string
          description: string | null
          id: string
          instance_name: string
          status: string
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          base_url?: string
          created_at?: string
          description?: string | null
          id?: string
          instance_name: string
          status?: string
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string
          description?: string | null
          id?: string
          instance_name?: string
          status?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_utm_sessions: { Args: never; Returns: undefined }
      create_shared_access_token: {
        Args: {
          p_description?: string
          p_expires_at?: string
          p_name: string
          p_permissions?: Json
        }
        Returns: {
          created_at: string
          description: string
          expires_at: string
          id: string
          name: string
          permissions: Json
          token: string
        }[]
      }
      deactivate_shared_token: {
        Args: { p_token_id: string }
        Returns: boolean
      }
      get_token_permissions: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          description: string
          expires_at: string
          id: string
          name: string
          permissions: Json
        }[]
      }
      get_user_by_instance: {
        Args: { instance_name_param: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

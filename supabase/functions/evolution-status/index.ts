import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized - Missing or invalid authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the JWT token using getUser with token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      console.error('Authentication failed:', userError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized - Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;
    console.log('✅ Authenticated user:', userId);

    const { instanceId } = await req.json();

    if (!instanceId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'instanceId is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Evolution API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = Deno.env.get('EVOLUTION_API_URL') || "https://evoapi.workidigital.tech";
    const url = `${baseUrl}/instance/connectionState/${instanceId}`;
    console.log(`Getting status for instance: ${instanceId} by user: ${userId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Evolution API status response:', data);

    if (data.instance && data.instance.state) {
      return new Response(JSON.stringify({
        success: true,
        status: data.instance.state,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error("Unexpected API status response:", data);
      return new Response(JSON.stringify({
        success: false,
        error: 'Unexpected response format from Evolution API status'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error getting instance status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error)?.message || 'Failed to get instance status'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

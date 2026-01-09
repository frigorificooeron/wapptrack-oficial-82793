import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  try {
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

    const baseUrl = "https://evoapi.workidigital.tech";
    const url = `${baseUrl}/instance/connectionState/${instanceId}`;
    console.log(`Getting status for instance: ${instanceId}`);

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


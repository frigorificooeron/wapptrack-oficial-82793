import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Evolution API key not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const baseUrl = "https://evoapi.workidigital.tech";
    const url = `${baseUrl}/instance/connect/${instanceId}`;
    console.log(`Getting QR code for instance: ${instanceId}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    const data = await response.json();
    console.log('Evolution API response:', data);

    let qrcodeData = '';
    if (data.base64) {
      qrcodeData = data.base64;
      // Remove o prefixo 'data:image/png;base64,' se existir
      if (qrcodeData.startsWith('data:image/png;base64,')) {
        qrcodeData = qrcodeData.substring('data:image/png;base64,'.length);
      }
    } else if (data.qrcode) {
      qrcodeData = data.qrcode;
    } else if (data.code) {
      let rawQrcodeString = data.code;
      const base64Regex = /^[A-Za-z0-9+/=]+$/;
      let qrcodeBase64 = '';
      if (rawQrcodeString.startsWith('2@')) {
        rawQrcodeString = rawQrcodeString.substring(2);
      }
      const parts = rawQrcodeString.split(',');
      for (const part of parts){
        let cleanedPart = part.endsWith(':1') ? part.slice(0, -2) : part;
        if (base64Regex.test(cleanedPart)) {
          qrcodeBase64 = cleanedPart;
          break;
        }
      }
      qrcodeData = qrcodeBase64;
    }

    if (qrcodeData) {
      return new Response(JSON.stringify({
        success: true,
        qrcode: qrcodeData,
        pairingCode: data.pairingCode || null
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      console.error("Could not extract valid QR code from Evolution API response:", data);
      return new Response(JSON.stringify({
        success: false,
        error: 'Could not extract valid QR code from API response'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('Error getting QR code:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error)?.message || 'Failed to get QR code'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});


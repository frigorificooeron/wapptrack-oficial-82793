import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversionEvent {
  event_name: string
  event_time: number
  action_source: string
  user_data: {
    em?: string[]      // hashed email
    ph?: string[]      // hashed phone
    fn?: string[]      // hashed first name
    ln?: string[]      // hashed last name
    ct?: string[]      // hashed city
    st?: string[]      // hashed state
    zp?: string[]      // hashed zip
    country?: string[] // hashed country
    client_ip_address?: string
    client_user_agent?: string
    fbc?: string       // Facebook click ID
    fbp?: string       // Facebook browser ID
  }
  custom_data?: {
    value?: number
    currency?: string
    content_name?: string
    content_category?: string
    content_ids?: string[]
    source_url?: string
    campaign_id?: string
    lead_id?: string
  }
  event_source_url?: string
  opt_out?: boolean
}

interface ConversionRequest {
  pixel_id: string
  access_token: string
  events: ConversionEvent[]
  test_event_code?: string
}

// Simple hash function for user data (SHA-256)
async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Normalize and hash user data for Advanced Matching
async function processUserData(userData: any): Promise<any> {
  const processed: any = {}
  
  if (userData.email) {
    processed.em = [await hashData(userData.email)]
  }
  
  if (userData.phone) {
    // Remove all non-digits and add country code if missing
    let phone = userData.phone.replace(/\D/g, '')
    if (phone.startsWith('85') && phone.length === 11) {
      phone = '55' + phone
    } else if (!phone.startsWith('55') && phone.length === 11) {
      phone = '55' + phone
    }
    processed.ph = [await hashData(phone)]
  }
  
  if (userData.firstName) {
    processed.fn = [await hashData(userData.firstName)]
  }
  
  if (userData.lastName) {
    processed.ln = [await hashData(userData.lastName)]
  }
  
  if (userData.city) {
    processed.ct = [await hashData(userData.city)]
  }
  
  if (userData.state) {
    processed.st = [await hashData(userData.state)]
  }
  
  if (userData.zipCode) {
    processed.zp = [await hashData(userData.zipCode)]
  }
  
  if (userData.country) {
    processed.country = [await hashData(userData.country)]
  }
  
  // Client data (not hashed)
  if (userData.clientIp) {
    processed.client_ip_address = userData.clientIp
  }
  
  if (userData.userAgent) {
    processed.client_user_agent = userData.userAgent
  }
  
  if (userData.fbc) {
    processed.fbc = userData.fbc
  }
  
  if (userData.fbp) {
    processed.fbp = userData.fbp
  }
  
  return processed
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Missing or invalid authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the JWT token using getUser
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log('✅ Authenticated user:', userId);

    const { 
      pixelId, 
      accessToken, 
      eventName, 
      userData = {}, 
      customData = {},
      testEventCode 
    } = await req.json()

    console.log('Facebook Conversions API request:', {
      pixelId,
      eventName,
      userData: { ...userData, email: userData.email ? '[HASHED]' : undefined, phone: userData.phone ? '[HASHED]' : undefined },
      customData
    })

    if (!pixelId || !accessToken || !eventName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pixelId, accessToken, eventName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process user data for Advanced Matching
    const processedUserData = await processUserData(userData)
    
    // Build the conversion event
    const event: ConversionEvent = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: processedUserData,
      custom_data: {
        currency: 'BRL',
        ...customData
      }
    }

    // Add source URL if available
    if (userData.sourceUrl) {
      event.event_source_url = userData.sourceUrl
    }

    const conversionPayload: ConversionRequest = {
      pixel_id: pixelId,
      access_token: accessToken,
      events: [event]
    }

    // Add test event code if in test mode
    if (testEventCode) {
      conversionPayload.test_event_code = testEventCode
    }

    // Send to Facebook Conversions API
    const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conversionPayload)
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Facebook Conversions API error:', result)
      return new Response(
        JSON.stringify({ 
          error: 'Facebook API error', 
          details: result,
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Facebook Conversions API success:', result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        event_name: eventName,
        events_received: result.events_received || 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Conversions API error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

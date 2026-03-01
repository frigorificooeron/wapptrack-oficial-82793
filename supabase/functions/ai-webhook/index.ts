import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getMessageContent(message: any): string {
  return (
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    ''
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();

    console.log('🤖 AI Webhook received:', JSON.stringify(body).substring(0, 500));

    // 1. Validate event
    if (body.event !== 'messages.upsert' || !body.data) {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const message = body.data;
    const remoteJid = message.key?.remoteJid;
    const isFromMe = message.key?.fromMe;
    const instanceName = body.instance;

    // 2. Ignore own messages and groups
    if (isFromMe || !remoteJid || remoteJid.endsWith('@g.us')) {
      console.log('🚫 Ignored: fromMe or group');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    const messageContent = getMessageContent(message);
    const contactName = message.pushName || 'Lead';
    const serverUrl = body.server_url;
    const apiKey = body.apikey;

    if (!messageContent) {
      console.log('🚫 Empty message, ignoring');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    console.log(`📱 Message from ${phone} (${contactName}): ${messageContent.substring(0, 100)}`);

    // 4. Find active agent for this instance
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('instance_name', instanceName)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (agentError || !agent) {
      console.log(`🚫 No active agent for instance ${instanceName}`);
      return new Response(JSON.stringify({ success: true, message: 'No agent configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    console.log(`🤖 Agent found: ${agent.name} (model: ${agent.model})`);

    // Find or create lead
    let leadId: string | null = null;
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .eq('user_id', agent.user_id)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Create lead
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          phone,
          name: contactName,
          user_id: agent.user_id,
          status: 'new',
          initial_message: messageContent,
          first_contact_date: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (newLead) leadId = newLead.id;
    }

    // 3. Check human_takeover
    if (leadId) {
      const { data: takeover } = await supabase
        .from('human_takeovers')
        .select('id')
        .eq('lead_id', leadId)
        .eq('is_active', true)
        .maybeSingle();

      if (takeover) {
        console.log(`🙋 Human takeover active for lead ${leadId}, skipping AI`);
        // Still save the user message
        await supabase.from('conversation_messages').insert({
          lead_id: leadId,
          agent_id: agent.id,
          role: 'user',
          content: messageContent,
          phone,
          instance_name: instanceName,
          whatsapp_message_id: message.key?.id,
        });
        // Also save to lead_messages for the existing chat system
        await supabase.from('lead_messages').insert({
          lead_id: leadId,
          message_text: messageContent,
          is_from_me: false,
          whatsapp_message_id: message.key?.id,
          instance_name: instanceName,
        });
        // Update lead
        await supabase.from('leads').update({
          last_message: messageContent,
          last_contact_date: new Date().toISOString(),
        }).eq('id', leadId);
        
        return new Response(JSON.stringify({ success: true, message: 'Human takeover active' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }
    }

    // Save user message to conversation_messages
    await supabase.from('conversation_messages').insert({
      lead_id: leadId,
      agent_id: agent.id,
      role: 'user',
      content: messageContent,
      phone,
      instance_name: instanceName,
      whatsapp_message_id: message.key?.id,
    });

    // Also save to lead_messages
    if (leadId) {
      await supabase.from('lead_messages').insert({
        lead_id: leadId,
        message_text: messageContent,
        is_from_me: false,
        whatsapp_message_id: message.key?.id,
        instance_name: instanceName,
      });
    }

    // 5. Load last N messages for context
    const { data: history } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('phone', phone)
      .eq('instance_name', instanceName)
      .order('created_at', { ascending: false })
      .limit(agent.max_history_messages || 20);

    const conversationHistory = (history || []).reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // 6. Detect funnel stage by keywords (optional)
    let funnelContext = '';
    if (agent.funnel_keywords && typeof agent.funnel_keywords === 'object') {
      const keywords = agent.funnel_keywords as Record<string, string[]>;
      const lowerMsg = messageContent.toLowerCase();
      for (const [stage, words] of Object.entries(keywords)) {
        if (Array.isArray(words) && words.some((w: string) => lowerMsg.includes(w.toLowerCase()))) {
          funnelContext = `\n[O cliente está no estágio: ${stage}]`;
          // Update lead status if we have a lead
          if (leadId) {
            await supabase.from('leads').update({ status: stage }).eq('id', leadId);
          }
          break;
        }
      }
    }

    // 7. Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const systemPrompt = `${agent.system_prompt}${funnelContext}\n\nNome do contato: ${contactName}`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // If the last message in history is not the current user message, add it
    const lastInHistory = conversationHistory[conversationHistory.length - 1];
    if (!lastInHistory || lastInHistory.content !== messageContent) {
      aiMessages.push({ role: 'user', content: messageContent });
    }

    console.log(`🧠 Sending ${aiMessages.length} messages to AI (model: ${agent.model})`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'google/gemini-3-flash-preview',
        messages: aiMessages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`❌ AI Gateway error ${aiResponse.status}: ${errText}`);
      return new Response(JSON.stringify({ error: 'AI Gateway error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      console.error('❌ No content in AI response');
      return new Response(JSON.stringify({ error: 'Empty AI response' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    console.log(`💬 AI Response: ${assistantMessage.substring(0, 100)}...`);

    // 8. Save assistant response to conversation_messages
    await supabase.from('conversation_messages').insert({
      lead_id: leadId,
      agent_id: agent.id,
      role: 'assistant',
      content: assistantMessage,
      phone,
      instance_name: instanceName,
    });

    // 9. Apply humanized delay
    const delayMs = agent.response_delay_ms || 1500;
    console.log(`⏳ Applying ${delayMs}ms delay...`);
    await delay(delayMs);

    // 10. Send response via Evolution API
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || serverUrl;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || apiKey;

    const sendUrl = `${evolutionUrl}/message/sendText/${instanceName}`;
    console.log(`📤 Sending to Evolution: ${sendUrl}`);

    const evoResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: assistantMessage,
      }),
    });

    const evoData = await evoResponse.json();
    console.log(`✅ Evolution response:`, JSON.stringify(evoData).substring(0, 200));

    const whatsappMessageId = evoData?.key?.id || null;

    // Save AI response to lead_messages too
    if (leadId) {
      await supabase.from('lead_messages').insert({
        lead_id: leadId,
        message_text: assistantMessage,
        is_from_me: true,
        whatsapp_message_id: whatsappMessageId,
        instance_name: instanceName,
      });

      // Update lead
      await supabase.from('leads').update({
        last_message: messageContent,
        last_contact_date: new Date().toISOString(),
      }).eq('id', leadId);
    }

    return new Response(JSON.stringify({ success: true, message: 'AI response sent' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('💥 AI Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

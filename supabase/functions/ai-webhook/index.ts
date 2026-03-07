import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildSystemPrompt, routeMessage, processAIResponse } from './agentLogic.ts';

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

function splitIntoChunks(text: string, maxLen = 200): string[] {
  // First split on double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const para of paragraphs) {
    // If paragraph is short enough, keep as-is
    if (para.length <= maxLen) {
      chunks.push(para);
      continue;
    }

    // Split on sentence boundaries
    const sentences = para.split(/(?<=[.!?])\s+/);
    let current = '';

    for (const sentence of sentences) {
      // URLs and questions always get their own chunk
      const isUrl = /https?:\/\/\S+/.test(sentence);
      const isQuestion = sentence.trim().endsWith('?');

      if (isUrl || isQuestion) {
        if (current.trim()) {
          chunks.push(current.trim());
          current = '';
        }
        chunks.push(sentence.trim());
        continue;
      }

      if ((current + ' ' + sentence).trim().length <= maxLen) {
        current = (current + ' ' + sentence).trim();
      } else {
        if (current.trim()) chunks.push(current.trim());
        current = sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

async function sendChunkedMessages(
  evolutionUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  phone: string,
  fullText: string,
  supabase: any,
  leadId: string,
): Promise<void> {
  const chunks = splitIntoChunks(fullText, 200);
  console.log(`📨 Sending ${chunks.length} chunks to ${phone}`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // 1. Show "typing..." presence
    try {
      await fetch(`${evolutionUrl}/chat/updatePresence/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
        body: JSON.stringify({ number: phone, presence: 'composing' }),
      });
    } catch (e) {
      console.warn('⚠️ Failed to set typing presence:', e);
    }

    // 2. Typing delay proportional to chunk length (2-4s + ~15ms per char)
    const typingDelay = 2000 + Math.random() * 2000 + chunk.length * 15;
    await delay(typingDelay);

    // 3. Send the chunk
    const evoResponse = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ number: phone, text: chunk }),
    });

    const evoData = await evoResponse.json();
    const sentMsgId = evoData?.key?.id || null;

    // 4. Save each chunk as a separate message in DB
    await supabase.from('lead_messages').insert({
      lead_id: leadId,
      message_text: chunk,
      is_from_me: true,
      whatsapp_message_id: sentMsgId,
      instance_name: instanceName,
    });

    console.log(`  ✅ Chunk ${i + 1}/${chunks.length} sent (${chunk.length} chars)`);

    // 5. Breathing pause between chunks (1-2s)
    if (i < chunks.length - 1) {
      await delay(1000 + Math.random() * 1000);
    }
  }
}

// Multi-provider LLM call
async function callLLM(
  supabase: any,
  userId: string,
  modelString: string,
  messages: { role: string; content: string }[]
): Promise<{ success: boolean; content?: string; error?: string }> {
  // Parse provider/model: "lovable/google/gemini-3-flash-preview" or "google/gemini-2.5-flash" or "anthropic/claude-sonnet-4-20250514"
  let provider: string;
  let model: string;

  if (modelString.startsWith('lovable/')) {
    provider = 'lovable';
    model = modelString.replace('lovable/', '');
  } else {
    const parts = modelString.split('/');
    provider = parts[0] || 'lovable';
    model = parts.slice(1).join('/') || modelString;
  }

  let apiKey: string | null = null;
  let apiUrl: string;

  if (provider === 'lovable') {
    apiKey = Deno.env.get('LOVABLE_API_KEY') || null;
    apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
  } else {
    // Fetch user's API key from llm_provider_keys
    const { data: keyData } = await supabase
      .from('llm_provider_keys')
      .select('api_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('is_active', true)
      .maybeSingle();

    apiKey = keyData?.api_key || null;

    if (!apiKey) {
      // Fallback to lovable gateway
      console.log(`⚠️ No ${provider} key found, falling back to Lovable Gateway`);
      apiKey = Deno.env.get('LOVABLE_API_KEY') || null;
      apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      // Keep original model format for gateway
      model = modelString.startsWith('lovable/') ? modelString.replace('lovable/', '') : modelString;
    } else {
      switch (provider) {
        case 'google':
          apiUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
          break;
        case 'openai':
          apiUrl = 'https://api.openai.com/v1/chat/completions';
          break;
        case 'anthropic':
          apiUrl = 'https://api.anthropic.com/v1/messages';
          break;
        default:
          apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
      }
    }
  }

  if (!apiKey) {
    return { success: false, error: 'No API key configured' };
  }

  try {
    if (provider === 'anthropic' && !apiUrl.includes('lovable')) {
      // Anthropic uses different format
      const systemMsg = messages.find(m => m.role === 'system');
      const nonSystemMsgs = messages.filter(m => m.role !== 'system');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemMsg?.content || '',
          messages: nonSystemMsgs,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `Anthropic error ${response.status}: ${errText}` };
      }

      const data = await response.json();
      return { success: true, content: data.content?.[0]?.text };
    } else {
      // OpenAI-compatible format (OpenAI, Google, Lovable Gateway)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (provider === 'google' && !apiUrl.includes('lovable')) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: false }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { success: false, error: `AI error ${response.status}: ${errText}` };
      }

      const data = await response.json();
      return { success: true, content: data.choices?.[0]?.message?.content };
    }
  } catch (err) {
    return { success: false, error: `AI call failed: ${err}` };
  }
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

    if (body.event !== 'messages.upsert' || !body.data) {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const message = body.data;
    const remoteJid = message.key?.remoteJid;
    const remoteJidAlt = message.key?.remoteJidAlt || message.key?.participantAlt;
    const isFromMe = message.key?.fromMe;
    const instanceName = body.instance;

    if (isFromMe || !remoteJid || remoteJid.endsWith('@g.us')) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    const jidForPhone = remoteJid?.endsWith('@lid') && remoteJidAlt ? remoteJidAlt : remoteJid;
    const phone = (jidForPhone || '').replace(/@(s\.whatsapp\.net|lid|c\.us)$/i, '');
    const messageContent = getMessageContent(message);
    const contactName = message.pushName || 'Lead';
    const serverUrl = body.server_url;
    const apiKey = body.apikey;

    if (!messageContent) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    console.log(`📱 Message from ${phone} (${contactName}): ${messageContent.substring(0, 100)}`);

    // Find or create lead — try to find the owner via the instance
    let userId: string | null = null;
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('user_id')
      .eq('instance_name', instanceName)
      .maybeSingle();

    if (instance) {
      userId = instance.user_id;
    } else {
      // Fallback: get user from agents linked to this channel
      const { data: ch } = await supabase
        .from('agent_channels')
        .select('agent_id, agents(instance_id, whatsapp_instances(user_id))')
        .eq('channel_type', 'whatsapp')
        .eq('channel_id', instanceName)
        .limit(1)
        .maybeSingle();

      if (ch) {
        userId = (ch as any)?.agents?.whatsapp_instances?.user_id || null;
      }
    }

    if (!userId) {
      // Last resort
      const { data: fallbackUser } = await supabase.rpc('get_user_by_instance', { instance_name_param: instanceName });
      userId = fallbackUser;
    }

    if (!userId) {
      console.log('❌ No user found for instance', instanceName);
      return new Response(JSON.stringify({ success: true, message: 'No user found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Find or create lead
    const phoneVariations = [phone, phone.replace(/^55/, ''), `55${phone}`];
    let leadId: string | null = null;

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('user_id', userId)
      .in('phone', phoneVariations)
      .maybeSingle();

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          phone,
          name: contactName,
          user_id: userId,
          status: 'new',
          initial_message: messageContent,
          first_contact_date: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (newLead) leadId = newLead.id;
    }

    if (!leadId) {
      console.error('❌ Failed to create/find lead');
      return new Response(JSON.stringify({ error: 'Lead creation failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Check human takeover
    const { data: takeover } = await supabase
      .from('human_takeovers')
      .select('id')
      .eq('lead_id', leadId)
      .eq('is_active', true)
      .maybeSingle();

    // Save incoming message to lead_messages
    const whatsappMsgId = message.key?.id;
    let skipInsert = false;
    if (whatsappMsgId) {
      const { data: existing } = await supabase
        .from('lead_messages')
        .select('id')
        .eq('whatsapp_message_id', whatsappMsgId)
        .limit(1);
      if (existing && existing.length > 0) skipInsert = true;
    }

    if (!skipInsert) {
      await supabase.from('lead_messages').insert({
        lead_id: leadId,
        message_text: messageContent,
        is_from_me: false,
        whatsapp_message_id: whatsappMsgId,
        instance_name: instanceName,
      });
    }

    // Update lead
    await supabase.from('leads').update({
      last_message: messageContent,
      last_contact_date: new Date().toISOString(),
    }).eq('id', leadId);

    if (takeover) {
      console.log(`🙋 Human takeover active for lead ${leadId}, skipping AI`);
      return new Response(JSON.stringify({ success: true, message: 'Human takeover active' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Route message to agent
    const routing = await routeMessage(supabase, leadId, instanceName, messageContent);

    if (!routing.agentId) {
      // Also try legacy ai_agents table
      const { data: legacyAgent } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('instance_name', instanceName)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!legacyAgent) {
        console.log(`🚫 No agent for instance ${instanceName}`);
        return new Response(JSON.stringify({ success: true, message: 'No agent configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        });
      }

      // Legacy flow using ai_agents
      return await handleLegacyAgent(supabase, legacyAgent, leadId, phone, contactName, messageContent, instanceName, serverUrl, apiKey, message);
    }

    // Determine which model to use from lead's agent config
    // We need the model from the ai_agents or agents table
    let agentModel = 'lovable/google/gemini-3-flash-preview'; // default
    const { data: agentConfig } = await supabase
      .from('agents')
      .select('is_active')
      .eq('id', routing.agentId)
      .single();

    if (!agentConfig?.is_active) {
      console.log(`🚫 Agent ${routing.agentId} is inactive`);
      return new Response(JSON.stringify({ success: true, message: 'Agent inactive' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    console.log(`🤖 Agent routed: ${routing.agentId}, stage: ${routing.stageId}`);

    // Build system prompt
    const systemPrompt = await buildSystemPrompt(
      supabase, routing.agentId, routing.stageId, routing.collected, contactName
    );

    if (!systemPrompt) {
      console.error('❌ Failed to build prompt');
      return new Response(JSON.stringify({ error: 'Prompt build failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Load conversation history
    const { data: history } = await supabase
      .from('lead_messages')
      .select('message_text, is_from_me')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);

    const conversationHistory = (history || []).reverse().map((m: any) => ({
      role: m.is_from_me ? 'assistant' : 'user',
      content: m.message_text,
    }));

    // Call AI with multi-provider support
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    console.log(`🧠 Sending ${aiMessages.length} messages to AI, model: ${agentModel}`);

    const aiResult = await callLLM(supabase, userId, agentModel, aiMessages);

    if (!aiResult.success) {
      console.error(`❌ AI error: ${aiResult.error}`);
      return new Response(JSON.stringify({ error: aiResult.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    const rawAssistantMessage = aiResult.content;

    if (!rawAssistantMessage) {
      console.error('❌ Empty AI response');
      return new Response(JSON.stringify({ error: 'Empty AI response' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      });
    }

    // Process response (extract vars, advance stages)
    const processed = await processAIResponse(
      supabase, leadId, routing.agentId, routing.stageId, rawAssistantMessage, routing.collected
    );

    console.log(`💬 AI Response: ${processed.cleanResponse.substring(0, 100)}... | stageAdvanced: ${processed.stageAdvanced}`);

    // Send chunked messages with typing simulation
    const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || serverUrl;
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || apiKey;

    await sendChunkedMessages(evolutionUrl, evolutionApiKey, instanceName, phone, processed.cleanResponse, supabase, leadId);

    return new Response(JSON.stringify({ success: true, message: 'AI response sent', stageAdvanced: processed.stageAdvanced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error) {
    console.error('💥 AI Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});

// Legacy handler for old ai_agents table
async function handleLegacyAgent(
  supabase: any, agent: any, leadId: string, phone: string,
  contactName: string, messageContent: string, instanceName: string,
  serverUrl: string, apiKey: string, message: any
) {
  // Save to conversation_messages
  await supabase.from('conversation_messages').insert({
    lead_id: leadId,
    agent_id: agent.id,
    role: 'user',
    content: messageContent,
    phone,
    instance_name: instanceName,
    whatsapp_message_id: message.key?.id,
  });

  // Load history
  const { data: history } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('phone', phone)
    .eq('instance_name', instanceName)
    .order('created_at', { ascending: false })
    .limit(agent.max_history_messages || 20);

  const conversationHistory = (history || []).reverse().map((m: any) => ({
    role: m.role, content: m.content,
  }));

  // Use callLLM with multi-provider support
  const systemPrompt = `${agent.system_prompt}\n\nNome do contato: ${contactName}`;
  const aiMessages = [{ role: 'system', content: systemPrompt }, ...conversationHistory];
  const modelStr = agent.model || 'lovable/google/gemini-3-flash-preview';

  const aiResult = await callLLM(supabase, agent.user_id, modelStr, aiMessages);

  if (!aiResult.success || !aiResult.content) {
    console.error(`❌ Legacy AI error: ${aiResult.error}`);
    return new Response(JSON.stringify({ error: aiResult.error || 'Empty response' }), {
      headers: { 'Content-Type': 'application/json' }, status: 500,
    });
  }

  const assistantMessage = aiResult.content;

  await supabase.from('conversation_messages').insert({
    lead_id: leadId, agent_id: agent.id, role: 'assistant',
    content: assistantMessage, phone, instance_name: instanceName,
  });

  // Send chunked messages with typing simulation
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL') || serverUrl;
  const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY') || apiKey;

  await sendChunkedMessages(evolutionUrl, evolutionApiKey, instanceName, phone, assistantMessage, supabase, leadId);

  return new Response(JSON.stringify({ success: true, message: 'Legacy AI response sent' }), {
    headers: { 'Content-Type': 'application/json' }, status: 200,
  });
}

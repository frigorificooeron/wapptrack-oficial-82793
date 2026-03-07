import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function buildSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  agentId: string,
  stageId: string | null,
  collected: Record<string, any>,
  contactName: string,
) {
  // Fetch agent
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent) return null;

  let prompt = `Você é ${agent.persona_name || 'um assistente'}, um agente chamado ${agent.name}.\n`;
  if (agent.function) prompt += `Sua função é: ${agent.function}.\n`;
  if (agent.behavior_rules) prompt += `\nRegras de comportamento:\n${agent.behavior_rules}\n`;

  // Embedded knowledge
  let knowledge = agent.knowledge_content || '';

  // External knowledge bases
  const { data: kbs } = await supabase
    .from('agent_knowledge_bases')
    .select('knowledge_bases(name, content)')
    .eq('agent_id', agentId)
    .eq('is_enabled', true);

  if (kbs) {
    for (const kb of kbs) {
      const base = (kb as any).knowledge_bases;
      if (base?.content) {
        knowledge += `\n\n--- ${base.name} ---\n${base.content}`;
      }
    }
  }

  if (knowledge) prompt += `\nBase de conhecimento:\n${knowledge}\n`;

  // Current stage
  if (stageId) {
    const { data: stage } = await supabase
      .from('agent_stages')
      .select('*, stage_variables(*), stage_examples(*)')
      .eq('id', stageId)
      .single();

    if (stage) {
      prompt += `\n--- ETAPA ATUAL: ${stage.name} (Etapa ${stage.stage_order}) ---`;
      if (stage.objective) prompt += `\nObjetivo: ${stage.objective}`;
      if (stage.ia_context) prompt += `\nContexto: ${stage.ia_context}`;

      const vars = stage.stage_variables || [];
      const coletadas = vars.filter((v: any) => collected[v.field_name]);
      const pendentes = vars.filter((v: any) => !collected[v.field_name]);

      if (coletadas.length > 0) {
        prompt += '\n\nVariáveis já coletadas:';
        for (const v of coletadas) {
          prompt += `\n  ✅ ${v.field_name}: ${collected[v.field_name]}`;
        }
      }

      if (pendentes.length > 0) {
        prompt += '\n\nVariáveis que FALTAM coletar:';
        for (const v of pendentes) {
          prompt += `\n  ❌ ${v.field_name} — ${v.description || ''}`;
        }
      }

      const examples = stage.stage_examples || [];
      if (examples.length > 0) {
        prompt += '\n\nExemplos de mensagem:';
        for (const ex of examples) {
          prompt += `\n  [${ex.role}]: ${ex.message}`;
        }
      }

      if (stage.success_criteria) {
        prompt += `\n\nCritério para avançar: ${stage.success_criteria}`;
      }
    }
  }

  prompt += `\n\nNome do contato: ${contactName}`;

  prompt += `\n\n--- INSTRUÇÕES DE SISTEMA ---
- Responda de forma curta e natural, como uma conversa real de WhatsApp.
- Use frases curtas. Separe ideias em parágrafos com quebra de linha dupla.
- Nunca envie blocos longos de texto. Máximo 2-3 frases por parágrafo.
- Links e CTAs devem estar em linhas separadas.
- Perguntas devem estar em linhas separadas.
- O tom deve ser humano, acolhedor e conversacional.

Ao identificar informações do lead na conversa, retorne um JSON no final da mensagem:
<!--VARIABLES:{"campo": "valor"}-->
Só inclua variáveis que foram claramente informadas pelo lead.
Não invente dados. Continue coletando o que falta.`;

  return prompt;
}

export async function routeMessage(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  instanceName: string,
  message: string,
) {
  // Check if lead already has an agent
  const { data: lead } = await supabase
    .from('leads')
    .select('agent_id, current_stage_id, collected_variables')
    .eq('id', leadId)
    .single();

  let agentId = lead?.agent_id;
  let stageId = lead?.current_stage_id;
  let collected = lead?.collected_variables || {};

  if (!agentId) {
    // Search triggers by channel (instance name)
    const { data: channels } = await supabase
      .from('agent_channels')
      .select('agent_id')
      .eq('channel_type', 'whatsapp')
      .eq('channel_id', instanceName)
      .eq('is_enabled', true);

    const candidateAgentIds = (channels || []).map((c: any) => c.agent_id);

    if (candidateAgentIds.length > 0) {
      // Check triggers
      const { data: triggers } = await supabase
        .from('agent_triggers')
        .select('agent_id, phrase')
        .in('agent_id', candidateAgentIds)
        .eq('is_enabled', true);

      const lowerMsg = message.toLowerCase();
      const matched = (triggers || []).find((t: any) =>
        lowerMsg.includes(t.phrase.toLowerCase())
      );

      if (matched) {
        agentId = matched.agent_id;
      } else {
        // Use default agent for this channel (first active one)
        const { data: defaultAgent } = await supabase
          .from('agents')
          .select('id')
          .in('id', candidateAgentIds)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (defaultAgent) agentId = defaultAgent.id;
      }
    }

    if (agentId) {
      // Get first stage
      const { data: firstStage } = await supabase
        .from('agent_stages')
        .select('id')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('stage_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      stageId = firstStage?.id || null;
      collected = {};

      await supabase
        .from('leads')
        .update({
          agent_id: agentId,
          current_stage_id: stageId,
          collected_variables: collected,
        })
        .eq('id', leadId);
    }
  }

  return { agentId, stageId, collected };
}

export async function processAIResponse(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  agentId: string,
  stageId: string | null,
  aiResponse: string,
  currentCollected: Record<string, any>,
) {
  // Extract variables
  const match = aiResponse.match(/<!--VARIABLES:(.*?)-->/);
  let newVars: Record<string, any> = {};
  if (match) {
    try { newVars = JSON.parse(match[1]); } catch {}
  }

  const merged = { ...currentCollected, ...newVars };
  let nextStageId = stageId;
  let stageAdvanced = false;

  if (stageId) {
    // Check if all required vars are collected
    const { data: requiredVars } = await supabase
      .from('stage_variables')
      .select('field_name')
      .eq('stage_id', stageId)
      .eq('is_required', true);

    const allCollected = (requiredVars || []).every((v: any) => merged[v.field_name]);

    if (allCollected && (requiredVars || []).length > 0) {
      const { data: currentStage } = await supabase
        .from('agent_stages')
        .select('stage_order')
        .eq('id', stageId)
        .single();

      if (currentStage) {
        const { data: nextStage } = await supabase
          .from('agent_stages')
          .select('id')
          .eq('agent_id', agentId)
          .eq('is_active', true)
          .gt('stage_order', currentStage.stage_order)
          .order('stage_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextStage) {
          nextStageId = nextStage.id;
          stageAdvanced = true;
        }
      }
    }
  }

  // Update lead
  await supabase
    .from('leads')
    .update({
      current_stage_id: nextStageId,
      collected_variables: merged,
    })
    .eq('id', leadId);

  // Clean response
  const cleanResponse = aiResponse.replace(/<!--VARIABLES:.*?-->/, '').trim();

  return { cleanResponse, collected: merged, stageAdvanced };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgentChannel {
  id: string;
  agent_id: string;
  channel_type: string;
  channel_id: string;
  is_enabled: boolean | null;
}

export interface AgentTrigger {
  id: string;
  agent_id: string;
  phrase: string;
  is_enabled: boolean | null;
}

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  content: string | null;
}

export interface AgentKnowledgeBase {
  id: string;
  agent_id: string;
  knowledge_base_id: string;
  is_enabled: boolean | null;
  knowledge_bases?: KnowledgeBase;
}

export function useAgentConnections(agentId: string | null) {
  const [channels, setChannels] = useState<AgentChannel[]>([]);
  const [triggers, setTriggers] = useState<AgentTrigger[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<AgentKnowledgeBase[]>([]);
  const [allKnowledgeBases, setAllKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!agentId) return;
    setLoading(true);

    const [chRes, trRes, kbRes, allKbRes] = await Promise.all([
      supabase.from('agent_channels').select('*').eq('agent_id', agentId),
      supabase.from('agent_triggers').select('*').eq('agent_id', agentId),
      supabase.from('agent_knowledge_bases').select('*, knowledge_bases(*)').eq('agent_id', agentId),
      supabase.from('knowledge_bases').select('*'),
    ]);

    setChannels((chRes.data || []) as AgentChannel[]);
    setTriggers((trRes.data || []) as AgentTrigger[]);
    setKnowledgeBases((kbRes.data || []) as unknown as AgentKnowledgeBase[]);
    setAllKnowledgeBases((allKbRes.data || []) as KnowledgeBase[]);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Channels
  const addChannel = async (channelType: string, channelId: string) => {
    if (!agentId) return;
    const { error } = await supabase.from('agent_channels').insert({ agent_id: agentId, channel_type: channelType, channel_id: channelId });
    if (error) { toast.error('Erro ao adicionar canal'); return; }
    await fetchAll();
  };

  const removeChannel = async (id: string) => {
    const { error } = await supabase.from('agent_channels').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover canal'); return; }
    await fetchAll();
  };

  const toggleChannel = async (id: string, enabled: boolean) => {
    await supabase.from('agent_channels').update({ is_enabled: enabled }).eq('id', id);
    await fetchAll();
  };

  // Triggers
  const addTrigger = async (phrase: string) => {
    if (!agentId) return;
    const { error } = await supabase.from('agent_triggers').insert({ agent_id: agentId, phrase });
    if (error) { toast.error('Erro ao adicionar frase'); return; }
    await fetchAll();
  };

  const removeTrigger = async (id: string) => {
    await supabase.from('agent_triggers').delete().eq('id', id);
    await fetchAll();
  };

  const toggleTrigger = async (id: string, enabled: boolean) => {
    await supabase.from('agent_triggers').update({ is_enabled: enabled }).eq('id', id);
    await fetchAll();
  };

  // Knowledge bases
  const linkKnowledgeBase = async (kbId: string) => {
    if (!agentId) return;
    const { error } = await supabase.from('agent_knowledge_bases').insert({ agent_id: agentId, knowledge_base_id: kbId });
    if (error) { toast.error('Erro ao vincular base'); return; }
    await fetchAll();
  };

  const unlinkKnowledgeBase = async (id: string) => {
    await supabase.from('agent_knowledge_bases').delete().eq('id', id);
    await fetchAll();
  };

  return {
    channels, triggers, knowledgeBases, allKnowledgeBases, loading,
    addChannel, removeChannel, toggleChannel,
    addTrigger, removeTrigger, toggleTrigger,
    linkKnowledgeBase, unlinkKnowledgeBase,
    fetchAll,
  };
}

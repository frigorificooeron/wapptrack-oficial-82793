import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Agent {
  id: string;
  instance_id: string | null;
  name: string;
  persona_name: string | null;
  function: string | null;
  behavior_rules: string | null;
  knowledge_content: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar agentes');
      console.error(error);
    } else {
      setAgents((data || []) as Agent[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const createAgent = async (instanceId: string) => {
    const { data, error } = await supabase
      .from('agents')
      .insert({
        name: 'Novo Agente',
        instance_id: instanceId,
        persona_name: '',
        function: '',
        behavior_rules: '',
        knowledge_content: '',
        is_active: false,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar agente');
      return null;
    }
    toast.success('Agente criado!');
    await fetchAgents();
    return data as Agent;
  };

  const updateAgent = async (id: string, updates: Partial<Agent>) => {
    const { error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao salvar agente');
      return false;
    }
    toast.success('Agente salvo!');
    await fetchAgents();
    return true;
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir agente');
      return false;
    }
    toast.success('Agente excluído!');
    await fetchAgents();
    return true;
  };

  return { agents, loading, fetchAgents, createAgent, updateAgent, deleteAgent };
}

export function useAgentDetail(agentId: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) { setAgent(null); return; }
    setLoading(true);
    supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()
      .then(({ data, error }) => {
        if (error) toast.error('Erro ao carregar agente');
        else setAgent(data as Agent);
        setLoading(false);
      });
  }, [agentId]);

  return { agent, loading, setAgent };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StageVariable {
  id: string;
  stage_id: string;
  field_name: string;
  description: string | null;
  field_type: string | null;
  is_required: boolean | null;
}

export interface StageExample {
  id: string;
  stage_id: string;
  role: string | null;
  message: string;
}

export interface AgentStage {
  id: string;
  agent_id: string;
  name: string;
  stage_order: number;
  objective: string | null;
  ia_context: string | null;
  success_criteria: string | null;
  funnel_status: string | null;
  is_active: boolean | null;
  stage_variables?: StageVariable[];
  stage_examples?: StageExample[];
}

export function useAgentStages(agentId: string | null) {
  const [stages, setStages] = useState<AgentStage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStages = useCallback(async () => {
    if (!agentId) { setStages([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('agent_stages')
      .select('*, stage_variables(*), stage_examples(*)')
      .eq('agent_id', agentId)
      .order('stage_order', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar etapas');
    } else {
      setStages((data || []) as unknown as AgentStage[]);
    }
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  const createStage = async (name: string) => {
    if (!agentId) return null;
    const nextOrder = stages.length > 0 ? Math.max(...stages.map(s => s.stage_order)) + 1 : 1;
    const { data, error } = await supabase
      .from('agent_stages')
      .insert({ agent_id: agentId, name, stage_order: nextOrder })
      .select()
      .single();

    if (error) { toast.error('Erro ao criar etapa'); return null; }
    toast.success('Etapa criada!');
    await fetchStages();
    return data;
  };

  const updateStage = async (stageId: string, updates: Partial<AgentStage>) => {
    const { error } = await supabase
      .from('agent_stages')
      .update(updates)
      .eq('id', stageId);

    if (error) { toast.error('Erro ao salvar etapa'); return false; }
    await fetchStages();
    return true;
  };

  const deleteStage = async (stageId: string) => {
    const { error } = await supabase
      .from('agent_stages')
      .delete()
      .eq('id', stageId);

    if (error) { toast.error('Erro ao excluir etapa'); return false; }
    toast.success('Etapa excluída!');
    await fetchStages();
    return true;
  };

  // Stage variables
  const addVariable = async (stageId: string, fieldName: string, description: string, fieldType: string, isRequired: boolean) => {
    const { error } = await supabase
      .from('stage_variables')
      .insert({ stage_id: stageId, field_name: fieldName, description, field_type: fieldType, is_required: isRequired });

    if (error) { toast.error('Erro ao adicionar variável'); return false; }
    await fetchStages();
    return true;
  };

  const removeVariable = async (varId: string) => {
    const { error } = await supabase.from('stage_variables').delete().eq('id', varId);
    if (error) { toast.error('Erro ao remover variável'); return false; }
    await fetchStages();
    return true;
  };

  // Stage examples
  const addExample = async (stageId: string, role: string, message: string) => {
    const { error } = await supabase
      .from('stage_examples')
      .insert({ stage_id: stageId, role, message });

    if (error) { toast.error('Erro ao adicionar exemplo'); return false; }
    await fetchStages();
    return true;
  };

  const removeExample = async (exId: string) => {
    const { error } = await supabase.from('stage_examples').delete().eq('id', exId);
    if (error) { toast.error('Erro ao remover exemplo'); return false; }
    await fetchStages();
    return true;
  };

  return {
    stages, loading, fetchStages,
    createStage, updateStage, deleteStage,
    addVariable, removeVariable,
    addExample, removeExample,
  };
}

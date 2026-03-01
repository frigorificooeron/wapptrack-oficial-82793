import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Bot, Plus, Trash2, Power, PowerOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AiAgent {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  model: string;
  instance_name: string;
  response_delay_ms: number;
  max_history_messages: number;
  is_active: boolean;
  funnel_keywords: Record<string, string[]> | null;
  created_at: string;
  updated_at: string;
}

const MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Rápido)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Equilibrado)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5', label: 'GPT-5 (Premium)' },
];

const AIAgents = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<{ instance_name: string }[]>([]);
  const [editingAgent, setEditingAgent] = useState<Partial<AiAgent> | null>(null);

  useEffect(() => {
    fetchAgents();
    fetchInstances();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar agentes');
    } else {
      setAgents((data || []) as AiAgent[]);
    }
    setLoading(false);
  };

  const fetchInstances = async () => {
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('instance_name');
    setInstances((data || []) as { instance_name: string }[]);
  };

  const createAgent = async () => {
    if (!user) return;
    const newAgent = {
      user_id: user.id,
      name: 'Novo Agente',
      system_prompt: 'Você é um assistente útil e amigável. Responda de forma clara e objetiva.',
      model: 'google/gemini-3-flash-preview',
      instance_name: instances[0]?.instance_name || '',
      response_delay_ms: 1500,
      max_history_messages: 20,
      is_active: false,
    };

    const { data, error } = await supabase
      .from('ai_agents')
      .insert(newAgent)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar agente');
    } else {
      setAgents(prev => [data as AiAgent, ...prev]);
      setEditingAgent(data as AiAgent);
      toast.success('Agente criado!');
    }
  };

  const updateAgent = async (agent: AiAgent) => {
    const { error } = await supabase
      .from('ai_agents')
      .update({
        name: agent.name,
        system_prompt: agent.system_prompt,
        model: agent.model,
        instance_name: agent.instance_name,
        response_delay_ms: agent.response_delay_ms,
        max_history_messages: agent.max_history_messages,
        is_active: agent.is_active,
        funnel_keywords: agent.funnel_keywords,
      })
      .eq('id', agent.id);

    if (error) {
      toast.error('Erro ao salvar');
    } else {
      setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
      toast.success('Agente salvo!');
    }
  };

  const deleteAgent = async (id: string) => {
    const { error } = await supabase.from('ai_agents').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      setAgents(prev => prev.filter(a => a.id !== id));
      if (editingAgent?.id === id) setEditingAgent(null);
      toast.success('Agente excluído');
    }
  };

  const toggleActive = async (agent: AiAgent) => {
    const updated = { ...agent, is_active: !agent.is_active };
    await updateAgent(updated);
  };

  const webhookUrl = `https://bwicygxyhkdgrypqrijo.supabase.co/functions/v1/ai-webhook`;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agentes IA</h1>
              <p className="text-sm text-muted-foreground">Configure agentes de IA para responder automaticamente no WhatsApp</p>
            </div>
          </div>
          <Button onClick={createAgent}>
            <Plus className="h-4 w-4 mr-2" /> Novo Agente
          </Button>
        </div>

        {/* Webhook URL info */}
        <Card className="border-dashed">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Configure este URL como webhook na sua instância Evolution API:
            </p>
            <code className="text-xs bg-muted px-3 py-2 rounded-lg block break-all font-mono">
              {webhookUrl}
            </code>
          </CardContent>
        </Card>

        {/* Agent List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : agents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhum agente configurado</p>
                <Button onClick={createAgent} variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" /> Criar primeiro agente
                </Button>
              </CardContent>
            </Card>
          ) : (
            agents.map(agent => (
              <Card key={agent.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                        {agent.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(agent)} title={agent.is_active ? 'Desativar' : 'Ativar'}>
                        {agent.is_active ? <Power className="h-4 w-4 text-emerald-500" /> : <PowerOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingAgent(editingAgent?.id === agent.id ? null : agent)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAgent(agent.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Instância: <span className="font-mono">{agent.instance_name}</span> • Modelo: {agent.model}
                  </p>
                </CardHeader>

                {editingAgent?.id === agent.id && (
                  <CardContent className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome do Agente</Label>
                        <Input
                          value={editingAgent.name || ''}
                          onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Instância WhatsApp</Label>
                        <Select
                          value={editingAgent.instance_name || ''}
                          onValueChange={v => setEditingAgent({ ...editingAgent, instance_name: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {instances.map(i => (
                              <SelectItem key={i.instance_name} value={i.instance_name}>{i.instance_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Modelo de IA</Label>
                        <Select
                          value={editingAgent.model || ''}
                          onValueChange={v => setEditingAgent({ ...editingAgent, model: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MODELS.map(m => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Delay (ms)</Label>
                          <Input
                            type="number"
                            value={editingAgent.response_delay_ms || 1500}
                            onChange={e => setEditingAgent({ ...editingAgent, response_delay_ms: parseInt(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Histórico (msgs)</Label>
                          <Input
                            type="number"
                            value={editingAgent.max_history_messages || 20}
                            onChange={e => setEditingAgent({ ...editingAgent, max_history_messages: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Prompt do Sistema</Label>
                      <Textarea
                        rows={6}
                        value={editingAgent.system_prompt || ''}
                        onChange={e => setEditingAgent({ ...editingAgent, system_prompt: e.target.value })}
                        placeholder="Defina a personalidade e instruções do agente..."
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => updateAgent(editingAgent as AiAgent)}>
                        <Save className="h-4 w-4 mr-2" /> Salvar Alterações
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default AIAgents;

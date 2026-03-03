import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { useAgents, type Agent } from '@/hooks/agents/useAgent';
import { useAgentStages } from '@/hooks/agents/useAgentStages';
import { useAgentConnections } from '@/hooks/agents/useAgentConnections';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bot, Plus, Trash2, Power, PowerOff, ArrowLeft,
  User, Layers, Link2, BookOpen, Columns3
} from 'lucide-react';
import BehaviorTab from '@/components/agents/BehaviorTab';
import StagesTab from '@/components/agents/StagesTab';
import ConnectionsTab from '@/components/agents/ConnectionsTab';
import KnowledgeTab from '@/components/agents/KnowledgeTab';
import AgentKanban from '@/components/agents/AgentKanban';

const Agents = () => {
  const { agents, loading, createAgent, updateAgent, deleteAgent } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [instances, setInstances] = useState<{ id: string; instance_name: string }[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [activeTab, setActiveTab] = useState('behavior');

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  const {
    stages, loading: stagesLoading,
    createStage, updateStage, deleteStage,
    addVariable, removeVariable, addExample, removeExample,
  } = useAgentStages(selectedAgentId);

  const {
    channels, triggers, knowledgeBases, allKnowledgeBases,
    addChannel, removeChannel, toggleChannel,
    addTrigger, removeTrigger, toggleTrigger,
    linkKnowledgeBase, unlinkKnowledgeBase,
  } = useAgentConnections(selectedAgentId);

  useEffect(() => {
    supabase.from('whatsapp_instances').select('id, instance_name').then(({ data }) => {
      const ins = (data || []) as { id: string; instance_name: string }[];
      setInstances(ins);
      if (ins.length > 0 && !selectedInstance) setSelectedInstance(ins[0].id);
    });
  }, []);

  const handleCreate = async () => {
    if (!selectedInstance) return;
    const agent = await createAgent(selectedInstance);
    if (agent) setSelectedAgentId(agent.id);
  };

  const handleSave = async (updates: Partial<Agent>) => {
    if (!selectedAgentId) return false;
    return updateAgent(selectedAgentId, updates);
  };

  const handleToggleActive = async (agent: Agent) => {
    await updateAgent(agent.id, { is_active: !agent.is_active });
  };

  const handleDelete = async (id: string) => {
    await deleteAgent(id);
    if (selectedAgentId === id) setSelectedAgentId(null);
  };

  // Agent list view
  if (!selectedAgentId) {
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
                <p className="text-sm text-muted-foreground">Configure agentes inteligentes com funil, etapas e base de conhecimento</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {instances.length > 1 && (
                <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Instância" /></SelectTrigger>
                  <SelectContent>
                    {instances.map(i => <SelectItem key={i.id} value={i.id}>{i.instance_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button onClick={handleCreate} disabled={!selectedInstance}>
                <Plus className="h-4 w-4 mr-2" /> Novo Agente
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-center py-12 text-muted-foreground">Carregando...</p>
          ) : agents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Bot className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium mb-1">Nenhum agente configurado</h3>
                <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro agente IA para automatizar conversas</p>
                <Button onClick={handleCreate} disabled={!selectedInstance}>
                  <Plus className="h-4 w-4 mr-2" /> Criar primeiro agente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {agents.map(agent => {
                const instance = instances.find(i => i.id === agent.instance_id);
                return (
                  <Card key={agent.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedAgentId(agent.id)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{agent.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {agent.persona_name && <span>{agent.persona_name} · </span>}
                              {instance?.instance_name || 'Sem instância'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                            {agent.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <Button variant="ghost" size="icon" onClick={() => handleToggleActive(agent)}>
                            {agent.is_active ? <Power className="h-4 w-4 text-emerald-500" /> : <PowerOff className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {agent.function && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{agent.function}</p>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // Agent detail view with tabs
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedAgentId(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">{selectedAgent?.name || 'Agente'}</h1>
            {selectedAgent && (
              <Badge variant={selectedAgent.is_active ? 'default' : 'secondary'}>
                {selectedAgent.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            )}
          </div>
        </div>

        {selectedAgent && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="behavior" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Comportamento</span>
              </TabsTrigger>
              <TabsTrigger value="stages" className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Etapas</span>
              </TabsTrigger>
              <TabsTrigger value="connections" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Conexões</span>
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Conhecimento</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="behavior" className="mt-4">
              <BehaviorTab agent={selectedAgent} onSave={handleSave} />
            </TabsContent>

            <TabsContent value="stages" className="mt-4">
              <StagesTab
                stages={stages}
                loading={stagesLoading}
                onCreateStage={createStage}
                onUpdateStage={updateStage}
                onDeleteStage={deleteStage}
                onAddVariable={addVariable}
                onRemoveVariable={removeVariable}
                onAddExample={addExample}
                onRemoveExample={removeExample}
              />
            </TabsContent>

            <TabsContent value="connections" className="mt-4">
              <ConnectionsTab
                channels={channels}
                triggers={triggers}
                knowledgeBases={knowledgeBases}
                allKnowledgeBases={allKnowledgeBases}
                onAddChannel={addChannel}
                onRemoveChannel={removeChannel}
                onToggleChannel={toggleChannel}
                onAddTrigger={addTrigger}
                onRemoveTrigger={removeTrigger}
                onToggleTrigger={toggleTrigger}
                onLinkKnowledgeBase={linkKnowledgeBase}
                onUnlinkKnowledgeBase={unlinkKnowledgeBase}
              />
            </TabsContent>

            <TabsContent value="knowledge" className="mt-4">
              <KnowledgeTab agent={selectedAgent} onSave={handleSave} />
            </TabsContent>

            <TabsContent value="kanban" className="mt-4">
              <AgentKanban agentId={selectedAgentId} stages={stages} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
};

export default Agents;

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, GripVertical,
  Variable, MessageSquare, Target
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { AgentStage, StageVariable } from '@/hooks/agents/useAgentStages';

interface Props {
  stages: AgentStage[];
  loading: boolean;
  onCreateStage: (name: string) => Promise<any>;
  onUpdateStage: (id: string, updates: Partial<AgentStage>) => Promise<boolean>;
  onDeleteStage: (id: string) => Promise<boolean>;
  onAddVariable: (stageId: string, fieldName: string, description: string, fieldType: string, isRequired: boolean) => Promise<boolean>;
  onRemoveVariable: (varId: string) => Promise<boolean>;
  onAddExample: (stageId: string, role: string, message: string) => Promise<boolean>;
  onRemoveExample: (exId: string) => Promise<boolean>;
}

const StagesTab: React.FC<Props> = ({
  stages, loading, onCreateStage, onUpdateStage, onDeleteStage,
  onAddVariable, onRemoveVariable, onAddExample, onRemoveExample,
}) => {
  const [newStageName, setNewStageName] = useState('');
  const [openStages, setOpenStages] = useState<Record<string, boolean>>({});
  const [editingStage, setEditingStage] = useState<Record<string, Partial<AgentStage>>>({});
  const [newVars, setNewVars] = useState<Record<string, { name: string; desc: string; type: string; required: boolean }>>({});
  const [newExamples, setNewExamples] = useState<Record<string, { role: string; message: string }>>({});

  const toggleOpen = (id: string) => setOpenStages(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCreateStage = async () => {
    if (!newStageName.trim()) return;
    await onCreateStage(newStageName.trim());
    setNewStageName('');
  };

  const getEditForm = (stage: AgentStage) => editingStage[stage.id] || {
    name: stage.name,
    objective: stage.objective || '',
    ia_context: stage.ia_context || '',
    success_criteria: stage.success_criteria || '',
    funnel_status: stage.funnel_status || '',
  };

  const setEditField = (stageId: string, field: string, value: string) => {
    setEditingStage(prev => ({
      ...prev,
      [stageId]: { ...getEditForm(stages.find(s => s.id === stageId)!), [field]: value },
    }));
  };

  const handleSaveStage = async (stage: AgentStage) => {
    const form = getEditForm(stage);
    await onUpdateStage(stage.id, form);
  };

  const getNewVar = (stageId: string) => newVars[stageId] || { name: '', desc: '', type: 'text', required: true };
  const getNewExample = (stageId: string) => newExamples[stageId] || { role: 'assistant', message: '' };

  return (
    <div className="space-y-4">
      {/* Add stage */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="Nome da nova etapa (ex: Qualificação)"
              onKeyDown={e => e.key === 'Enter' && handleCreateStage()}
            />
            <Button onClick={handleCreateStage} disabled={!newStageName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-center text-muted-foreground py-8">Carregando...</p>}

      {stages.map((stage, idx) => {
        const form = getEditForm(stage);
        const nv = getNewVar(stage.id);
        const ne = getNewExample(stage.id);

        return (
          <Collapsible key={stage.id} open={openStages[stage.id]} onOpenChange={() => toggleOpen(stage.id)}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    <Badge variant="outline" className="font-mono text-xs">{stage.stage_order}</Badge>
                    <CardTitle className="text-base">{stage.name}</CardTitle>
                    {stage.objective && (
                      <span className="text-xs text-muted-foreground hidden md:inline">— {stage.objective}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {(stage.stage_variables || []).length} vars
                    </Badge>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        {openStages[stage.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteStage(stage.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="space-y-5 border-t pt-4">
                  {/* Stage details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da Etapa</Label>
                      <Input value={form.name || ''} onChange={e => setEditField(stage.id, 'name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status do Funil</Label>
                      <Input value={form.funnel_status || ''} onChange={e => setEditField(stage.id, 'funnel_status', e.target.value)} placeholder="Ex: qualificacao, agendamento" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Target className="h-4 w-4" /> Objetivo</Label>
                    <Input value={form.objective || ''} onChange={e => setEditField(stage.id, 'objective', e.target.value)} placeholder="O que o agente deve alcançar nesta etapa" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contexto para a IA</Label>
                    <Textarea rows={3} value={form.ia_context || ''} onChange={e => setEditField(stage.id, 'ia_context', e.target.value)} placeholder="Contexto situacional e instruções específicas" />
                  </div>
                  <div className="space-y-2">
                    <Label>Critério de Sucesso</Label>
                    <Input value={form.success_criteria || ''} onChange={e => setEditField(stage.id, 'success_criteria', e.target.value)} placeholder="Quando considerar a etapa concluída" />
                  </div>

                  <Button size="sm" onClick={() => handleSaveStage(stage)}>
                    <Save className="h-3 w-3 mr-1" /> Salvar Etapa
                  </Button>

                  {/* Variables */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <Variable className="h-4 w-4 text-primary" /> Variáveis a Coletar
                    </h4>
                    <div className="space-y-2">
                      {(stage.stage_variables || []).map(v => (
                        <div key={v.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                          <Badge variant="outline" className="font-mono text-xs">{v.field_type || 'text'}</Badge>
                          <span className="font-medium text-sm">{v.field_name}</span>
                          {v.description && <span className="text-xs text-muted-foreground">— {v.description}</span>}
                          {v.is_required && <Badge className="text-[10px] h-4">Obrigatório</Badge>}
                          <div className="flex-1" />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveVariable(v.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {/* Add variable form */}
                      <div className="flex flex-wrap gap-2 items-end mt-2">
                        <Input className="w-32" placeholder="Campo" value={nv.name}
                          onChange={e => setNewVars(p => ({ ...p, [stage.id]: { ...nv, name: e.target.value } }))} />
                        <Input className="w-48" placeholder="Descrição" value={nv.desc}
                          onChange={e => setNewVars(p => ({ ...p, [stage.id]: { ...nv, desc: e.target.value } }))} />
                        <Select value={nv.type} onValueChange={v => setNewVars(p => ({ ...p, [stage.id]: { ...nv, type: v } }))}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Telefone</SelectItem>
                            <SelectItem value="number">Número</SelectItem>
                            <SelectItem value="boolean">Sim/Não</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Switch checked={nv.required}
                            onCheckedChange={v => setNewVars(p => ({ ...p, [stage.id]: { ...nv, required: v } }))} />
                          <span className="text-xs">Obrig.</span>
                        </div>
                        <Button size="sm" variant="outline"
                          disabled={!nv.name.trim()}
                          onClick={async () => {
                            await onAddVariable(stage.id, nv.name, nv.desc, nv.type, nv.required);
                            setNewVars(p => ({ ...p, [stage.id]: { name: '', desc: '', type: 'text', required: true } }));
                          }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" /> Exemplos de Mensagem
                    </h4>
                    <div className="space-y-2">
                      {(stage.stage_examples || []).map(ex => (
                        <div key={ex.id} className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2">
                          <Badge variant={ex.role === 'assistant' ? 'default' : 'secondary'} className="text-[10px] mt-0.5">{ex.role}</Badge>
                          <span className="text-sm flex-1">{ex.message}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveExample(ex.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 items-end mt-2">
                        <Select value={ne.role} onValueChange={v => setNewExamples(p => ({ ...p, [stage.id]: { ...ne, role: v } }))}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assistant">Assistente</SelectItem>
                            <SelectItem value="user">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input className="flex-1" placeholder="Mensagem de exemplo" value={ne.message}
                          onChange={e => setNewExamples(p => ({ ...p, [stage.id]: { ...ne, message: e.target.value } }))} />
                        <Button size="sm" variant="outline"
                          disabled={!ne.message.trim()}
                          onClick={async () => {
                            await onAddExample(stage.id, ne.role, ne.message);
                            setNewExamples(p => ({ ...p, [stage.id]: { role: 'assistant', message: '' } }));
                          }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {!loading && stages.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhuma etapa configurada. Adicione a primeira acima.</p>
      )}
    </div>
  );
};

export default StagesTab;

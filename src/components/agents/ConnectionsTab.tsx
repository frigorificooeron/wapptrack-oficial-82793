import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Zap, BookOpen, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { AgentChannel, AgentTrigger, AgentKnowledgeBase, KnowledgeBase } from '@/hooks/agents/useAgentConnections';

interface Props {
  channels: AgentChannel[];
  triggers: AgentTrigger[];
  knowledgeBases: AgentKnowledgeBase[];
  allKnowledgeBases: KnowledgeBase[];
  onAddChannel: (type: string, id: string) => Promise<void>;
  onRemoveChannel: (id: string) => Promise<void>;
  onToggleChannel: (id: string, enabled: boolean) => Promise<void>;
  onAddTrigger: (phrase: string) => Promise<void>;
  onRemoveTrigger: (id: string) => Promise<void>;
  onToggleTrigger: (id: string, enabled: boolean) => Promise<void>;
  onLinkKnowledgeBase: (kbId: string) => Promise<void>;
  onUnlinkKnowledgeBase: (id: string) => Promise<void>;
}

const ConnectionsTab: React.FC<Props> = ({
  channels, triggers, knowledgeBases, allKnowledgeBases,
  onAddChannel, onRemoveChannel, onToggleChannel,
  onAddTrigger, onRemoveTrigger, onToggleTrigger,
  onLinkKnowledgeBase, onUnlinkKnowledgeBase,
}) => {
  const [instances, setInstances] = useState<{ id: string; instance_name: string }[]>([]);
  const [newChannelType, setNewChannelType] = useState('whatsapp');
  const [newChannelId, setNewChannelId] = useState('');
  const [newTriggerPhrase, setNewTriggerPhrase] = useState('');
  const [selectedKb, setSelectedKb] = useState('');

  useEffect(() => {
    supabase.from('whatsapp_instances').select('id, instance_name').then(({ data }) => {
      setInstances((data || []) as { id: string; instance_name: string }[]);
    });
  }, []);

  const linkedKbIds = knowledgeBases.map(kb => kb.knowledge_base_id);
  const availableKbs = allKnowledgeBases.filter(kb => !linkedKbIds.includes(kb.id));

  return (
    <div className="space-y-6">
      {/* Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Canais Conectados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {channels.map(ch => (
            <div key={ch.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
              <Badge variant="outline">{ch.channel_type}</Badge>
              <span className="font-mono text-sm">{ch.channel_id}</span>
              <div className="flex-1" />
              <Switch checked={ch.is_enabled ?? true} onCheckedChange={v => onToggleChannel(ch.id, v)} />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveChannel(ch.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 items-end pt-2">
            <Select value={newChannelType} onValueChange={setNewChannelType}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            {newChannelType === 'whatsapp' ? (
              <Select value={newChannelId} onValueChange={setNewChannelId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione instância" /></SelectTrigger>
                <SelectContent>
                  {instances.map(i => (
                    <SelectItem key={i.id} value={i.instance_name}>{i.instance_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input className="flex-1" placeholder="ID do canal" value={newChannelId} onChange={e => setNewChannelId(e.target.value)} />
            )}
            <Button size="sm" disabled={!newChannelId} onClick={() => { onAddChannel(newChannelType, newChannelId); setNewChannelId(''); }}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Frases de Ativação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Quando o lead enviar uma mensagem contendo essas frases, este agente será ativado automaticamente.</p>
          {triggers.map(tr => (
            <div key={tr.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
              <span className="text-sm flex-1">"{tr.phrase}"</span>
              <Switch checked={tr.is_enabled ?? true} onCheckedChange={v => onToggleTrigger(tr.id, v)} />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveTrigger(tr.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Input value={newTriggerPhrase} onChange={e => setNewTriggerPhrase(e.target.value)}
              placeholder="Ex: Assessoria Worki Digital"
              onKeyDown={e => { if (e.key === 'Enter' && newTriggerPhrase.trim()) { onAddTrigger(newTriggerPhrase.trim()); setNewTriggerPhrase(''); } }}
            />
            <Button size="sm" disabled={!newTriggerPhrase.trim()} onClick={() => { onAddTrigger(newTriggerPhrase.trim()); setNewTriggerPhrase(''); }}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Bases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Bases de Conhecimento Vinculadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {knowledgeBases.map(kb => (
            <div key={kb.id} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{(kb.knowledge_bases as any)?.name || kb.knowledge_base_id}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUnlinkKnowledgeBase(kb.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {availableKbs.length > 0 && (
            <div className="flex gap-2 pt-2">
              <Select value={selectedKb} onValueChange={setSelectedKb}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Vincular base..." /></SelectTrigger>
                <SelectContent>
                  {availableKbs.map(kb => (
                    <SelectItem key={kb.id} value={kb.id}>{kb.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!selectedKb} onClick={() => { onLinkKnowledgeBase(selectedKb); setSelectedKb(''); }}>
                <Plus className="h-3 w-3 mr-1" /> Vincular
              </Button>
            </div>
          )}
          {allKnowledgeBases.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma base de conhecimento cadastrada. Crie uma na aba "Base de Conhecimento".</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConnectionsTab;

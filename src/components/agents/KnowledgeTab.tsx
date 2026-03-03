import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, BookOpen, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import type { Agent } from '@/hooks/agents/useAgent';

interface Props {
  agent: Agent;
  onSave: (updates: Partial<Agent>) => Promise<boolean>;
}

interface KnowledgeBase {
  id: string;
  name: string;
  content: string | null;
  user_id: string;
}

const KnowledgeTab: React.FC<Props> = ({ agent, onSave }) => {
  const { user } = useAuth();
  const [knowledgeContent, setKnowledgeContent] = useState(agent.knowledge_content || '');
  const [saving, setSaving] = useState(false);
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [newBaseName, setNewBaseName] = useState('');
  const [editingBase, setEditingBase] = useState<KnowledgeBase | null>(null);

  useEffect(() => {
    setKnowledgeContent(agent.knowledge_content || '');
  }, [agent]);

  useEffect(() => {
    fetchBases();
  }, []);

  const fetchBases = async () => {
    const { data } = await supabase.from('knowledge_bases').select('*').order('created_at', { ascending: false });
    setBases((data || []) as KnowledgeBase[]);
  };

  const handleSaveEmbedded = async () => {
    setSaving(true);
    await onSave({ knowledge_content: knowledgeContent });
    setSaving(false);
  };

  const createBase = async () => {
    if (!user || !newBaseName.trim()) return;
    const { error } = await supabase.from('knowledge_bases').insert({ name: newBaseName.trim(), user_id: user.id, content: '' });
    if (error) { toast.error('Erro ao criar base'); return; }
    toast.success('Base criada!');
    setNewBaseName('');
    await fetchBases();
  };

  const saveBase = async (base: KnowledgeBase) => {
    const { error } = await supabase.from('knowledge_bases').update({ name: base.name, content: base.content }).eq('id', base.id);
    if (error) { toast.error('Erro ao salvar'); return; }
    toast.success('Base salva!');
    setEditingBase(null);
    await fetchBases();
  };

  const deleteBase = async (id: string) => {
    const { error } = await supabase.from('knowledge_bases').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Base excluída');
    if (editingBase?.id === id) setEditingBase(null);
    await fetchBases();
  };

  return (
    <div className="space-y-6">
      {/* Embedded knowledge */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Conhecimento do Agente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Informações exclusivas deste agente que serão incluídas no prompt.</p>
          <Textarea
            rows={12}
            value={knowledgeContent}
            onChange={e => setKnowledgeContent(e.target.value)}
            placeholder={`Insira aqui todas as informações que o agente precisa saber:\n\n- Produtos e serviços\n- Preços e condições\n- Perguntas frequentes\n- Procedimentos internos`}
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveEmbedded} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reusable knowledge bases */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Bases Reutilizáveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Crie bases de conhecimento que podem ser vinculadas a múltiplos agentes na aba "Conexões".</p>

          {bases.map(base => (
            <div key={base.id}>
              {editingBase?.id === base.id ? (
                <div className="border rounded-lg p-3 space-y-2">
                  <Input value={editingBase.name} onChange={e => setEditingBase({ ...editingBase, name: e.target.value })} />
                  <Textarea rows={8} value={editingBase.content || ''} onChange={e => setEditingBase({ ...editingBase, content: e.target.value })} />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEditingBase(null)}>Cancelar</Button>
                    <Button size="sm" onClick={() => saveBase(editingBase)}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/50" onClick={() => setEditingBase(base)}>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 font-medium">{base.name}</span>
                  <span className="text-xs text-muted-foreground">{(base.content || '').length} chars</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); deleteBase(base.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Input value={newBaseName} onChange={e => setNewBaseName(e.target.value)} placeholder="Nome da nova base"
              onKeyDown={e => e.key === 'Enter' && createBase()} />
            <Button size="sm" disabled={!newBaseName.trim()} onClick={createBase}>
              <Plus className="h-3 w-3 mr-1" /> Criar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeTab;

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, User, Briefcase, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Agent } from '@/hooks/agents/useAgent';

interface Props {
  agent: Agent;
  onSave: (updates: Partial<Agent>) => Promise<boolean>;
}

const BehaviorTab: React.FC<Props> = ({ agent, onSave }) => {
  const [form, setForm] = useState({
    name: '',
    persona_name: '',
    function: '',
    behavior_rules: '',
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: agent.name || '',
      persona_name: agent.persona_name || '',
      function: agent.function || '',
      behavior_rules: agent.behavior_rules || '',
      is_active: agent.is_active ?? true,
    });
  }, [agent]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Identidade do Agente
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="is-active" className="text-sm text-muted-foreground">Ativo</Label>
              <Switch
                id="is-active"
                checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Agente</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: SDR, Suporte, Vendas..."
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Persona</Label>
              <Input
                value={form.persona_name}
                onChange={e => setForm(f => ({ ...f, persona_name: e.target.value }))}
                placeholder="Ex: Bryan, Ana..."
              />
              <p className="text-xs text-muted-foreground">Como o agente se apresenta</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Função
            </Label>
            <Input
              value={form.function}
              onChange={e => setForm(f => ({ ...f, function: e.target.value }))}
              placeholder="Ex: Qualificar leads e agendar reuniões"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Regras de Comportamento
            </Label>
            <Textarea
              rows={8}
              value={form.behavior_rules}
              onChange={e => setForm(f => ({ ...f, behavior_rules: e.target.value }))}
              placeholder={`- Seja cordial e profissional\n- Não invente informações\n- Use emojis com moderação\n- Sempre pergunte antes de avançar`}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Comportamento'}
        </Button>
      </div>
    </div>
  );
};

export default BehaviorTab;

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Eye, EyeOff, Save, Trash2, CheckCircle2 } from 'lucide-react';
import { PROVIDER_MODELS } from '@/hooks/useLLMProviders';

interface ProviderKey {
  id?: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}

const PROVIDERS = [
  {
    id: 'lovable',
    name: 'Lovable AI Gateway',
    placeholder: 'Configurado automaticamente',
    description: 'Gateway integrado — usa LOVABLE_API_KEY (já configurado). Suporta modelos Google e OpenAI.',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    placeholder: 'AIzaSy...',
    description: 'API Key do Google AI Studio (aistudio.google.com)',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    placeholder: 'sk-...',
    description: 'API Key da OpenAI (platform.openai.com)',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    description: 'API Key da Anthropic (console.anthropic.com)',
  },
];

const LLMProviderSettings = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Record<string, ProviderKey>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchKeys();
      // Load saved default model
      const saved = localStorage.getItem(`default_model_${user.id}`);
      if (saved) setSelectedModel(saved);
    }
  }, [user]);

  const fetchKeys = async () => {
    const { data } = await supabase
      .from('llm_provider_keys')
      .select('*')
      .eq('user_id', user!.id);

    const map: Record<string, ProviderKey> = {};
    (data || []).forEach((k: any) => {
      map[k.provider] = { id: k.id, provider: k.provider, api_key: k.api_key, is_active: k.is_active };
    });
    if (!map['lovable']) {
      map['lovable'] = { provider: 'lovable', api_key: 'auto', is_active: true };
    }
    setKeys(map);
  };

  const handleSave = async (provider: string) => {
    if (!user) return;
    const key = keys[provider];
    if (!key || !key.api_key || key.api_key === 'auto') {
      toast.error('Insira uma API key válida');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('llm_provider_keys')
      .upsert({
        user_id: user.id,
        provider,
        api_key: key.api_key,
        is_active: key.is_active ?? true,
      }, { onConflict: 'user_id,provider' });

    if (error) toast.error('Erro ao salvar chave');
    else {
      toast.success(`Chave ${provider} salva!`);
      await fetchKeys();
    }
    setSaving(false);
  };

  const handleDelete = async (provider: string) => {
    if (!user) return;
    await supabase.from('llm_provider_keys').delete().eq('user_id', user.id).eq('provider', provider);
    setKeys(prev => {
      const copy = { ...prev };
      delete copy[provider];
      return copy;
    });
    toast.success('Chave removida');
  };

  const toggleVisibility = (provider: string) => {
    setVisibleKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const updateKey = (provider: string, field: keyof ProviderKey, value: any) => {
    setKeys(prev => ({
      ...prev,
      [provider]: { ...prev[provider], provider, [field]: value, is_active: prev[provider]?.is_active ?? true },
    }));
  };

  // Build all available models from active providers
  const getAvailableModels = () => {
    const models: { provider: string; providerName: string; value: string; label: string }[] = [];
    for (const p of PROVIDERS) {
      const isActive = p.id === 'lovable' || keys[p.id]?.is_active;
      if (!isActive) continue;
      const providerModels = PROVIDER_MODELS[p.id] || [];
      providerModels.forEach(m => models.push({ ...m, provider: p.id, providerName: p.name }));
    }
    return models;
  };

  const availableModels = getAvailableModels();

  const handleModelSelect = (value: string) => {
    setSelectedModel(value);
    if (user) {
      localStorage.setItem(`default_model_${user.id}`, value);
    }
    toast.success('Modelo padrão definido!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Provedores de IA (LLM)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as API keys dos provedores e selecione o modelo padrão para seus agentes
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Model Selector */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <Label className="text-base font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Modelo Padrão
          </Label>
          <p className="text-xs text-muted-foreground">
            Selecione o modelo de IA que será usado por padrão nos novos agentes
          </p>
          <Select value={selectedModel} onValueChange={handleModelSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um modelo..." />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map(p => {
                const isActive = p.id === 'lovable' || keys[p.id]?.is_active;
                if (!isActive) return null;
                const models = PROVIDER_MODELS[p.id] || [];
                if (models.length === 0) return null;
                return (
                  <React.Fragment key={p.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {p.name}
                    </div>
                    {models.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                );
              })}
            </SelectContent>
          </Select>
          {selectedModel && (
            <p className="text-xs text-muted-foreground">
              Modelo selecionado: <span className="font-mono text-foreground">{selectedModel}</span>
            </p>
          )}
        </div>

        {/* Provider Cards */}
        {PROVIDERS.map(provider => {
          const key = keys[provider.id];
          const isLovable = provider.id === 'lovable';
          const isVisible = visibleKeys[provider.id];
          const models = PROVIDER_MODELS[provider.id] || [];

          return (
            <div key={provider.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{provider.name}</span>
                  {key?.id && (
                    <Badge variant={key.is_active ? 'default' : 'secondary'} className="text-xs">
                      {key.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  )}
                  {isLovable && (
                    <Badge variant="outline" className="text-xs">Integrado</Badge>
                  )}
                </div>
                {!isLovable && key?.id && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={v => updateKey(provider.id, 'is_active', v)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(provider.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{provider.description}</p>

              {!isLovable && (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type={isVisible ? 'text' : 'password'}
                      placeholder={provider.placeholder}
                      value={key?.api_key || ''}
                      onChange={e => updateKey(provider.id, 'api_key', e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleVisibility(provider.id)}
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSave(provider.id)}
                    disabled={saving}
                  >
                    <Save className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {models.map(m => (
                  <Badge
                    key={m.value}
                    variant={selectedModel === m.value ? 'default' : 'outline'}
                    className="text-xs font-mono cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleModelSelect(m.value)}
                  >
                    {m.label}
                    {selectedModel === m.value && ' ✓'}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default LLMProviderSettings;

export const LLM_PROVIDERS = PROVIDERS;

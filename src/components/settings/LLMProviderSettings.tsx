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
import { Brain, Eye, EyeOff, Save, Trash2 } from 'lucide-react';

interface ProviderKey {
  id?: string;
  provider: string;
  api_key: string;
  is_active: boolean;
}

const PROVIDERS = [
  {
    id: 'google',
    name: 'Google Gemini',
    placeholder: 'AIzaSy...',
    description: 'API Key do Google AI Studio (aistudio.google.com)',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-flash-preview', 'gemini-3-pro-preview'],
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    placeholder: 'sk-...',
    description: 'API Key da OpenAI (platform.openai.com)',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    description: 'API Key da Anthropic (console.anthropic.com)',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  },
  {
    id: 'lovable',
    name: 'Lovable AI Gateway',
    placeholder: 'Configurado automaticamente',
    description: 'Gateway integrado — usa LOVABLE_API_KEY (já configurado)',
    models: ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro', 'openai/gpt-5-mini', 'openai/gpt-5'],
  },
];

const LLMProviderSettings = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Record<string, ProviderKey>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchKeys();
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
    // Always show lovable as active
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

  const maskKey = (key: string) => {
    if (!key || key === 'auto') return '••••••••';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 6) + '•'.repeat(Math.min(20, key.length - 10)) + key.substring(key.length - 4);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Provedores de IA (LLM)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as API keys dos provedores de IA para seus agentes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map(provider => {
          const key = keys[provider.id];
          const isLovable = provider.id === 'lovable';
          const isVisible = visibleKeys[provider.id];

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
                {provider.models.map(m => (
                  <Badge key={m} variant="outline" className="text-xs font-mono">{m}</Badge>
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

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface LLMProviderKey {
  provider: string;
  is_active: boolean;
}

export const PROVIDER_MODELS: Record<string, { label: string; value: string }[]> = {
  lovable: [
    { value: 'lovable/google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Gateway)' },
    { value: 'lovable/google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Gateway)' },
    { value: 'lovable/google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Gateway)' },
    { value: 'lovable/openai/gpt-5-mini', label: 'GPT-5 Mini (Gateway)' },
    { value: 'lovable/openai/gpt-5', label: 'GPT-5 (Gateway)' },
  ],
  google: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
  ],
  openai: [
    { value: 'openai/gpt-4o', label: 'GPT-4o' },
    { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'openai/gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'openai/o1', label: 'O1' },
    { value: 'openai/o1-mini', label: 'O1 Mini' },
  ],
  anthropic: [
    { value: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'anthropic/claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'anthropic/claude-3-opus-20240229', label: 'Claude 3 Opus' },
  ],
};

export function useLLMProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<LLMProviderKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProviders();
  }, [user]);

  const fetchProviders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('llm_provider_keys')
      .select('provider, is_active')
      .eq('user_id', user!.id)
      .eq('is_active', true);

    // Always include lovable
    const active: LLMProviderKey[] = [{ provider: 'lovable', is_active: true }];
    (data || []).forEach((k: any) => {
      if (k.provider !== 'lovable') active.push(k);
    });
    setProviders(active);
    setLoading(false);
  };

  const getAvailableModels = () => {
    const models: { provider: string; value: string; label: string }[] = [];
    for (const p of providers) {
      const providerModels = PROVIDER_MODELS[p.provider] || [];
      providerModels.forEach(m => models.push({ ...m, provider: p.provider }));
    }
    return models;
  };

  return { providers, loading, getAvailableModels, refetch: fetchProviders };
}

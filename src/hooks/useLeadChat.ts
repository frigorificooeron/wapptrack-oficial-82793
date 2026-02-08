import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeWhatsAppNumber } from '@/lib/whatsapp';

export interface LeadMessage {
  id: string;
  lead_id: string;
  message_text: string;
  is_from_me: boolean;
  sent_at: string;
  status: string;
  whatsapp_message_id: string | null;
  instance_name: string | null;
  created_at: string;
}

// Cache de instância para evitar múltiplas queries
let cachedInstance: { name: string; expiresAt: number } | null = null;

const getCachedInstance = async (): Promise<string | null> => {
  const now = Date.now();
  if (cachedInstance && cachedInstance.expiresAt > now) {
    return cachedInstance.name;
  }

  const { data: instances, error } = await supabase
    .from('whatsapp_instances')
    .select('instance_name')
    .eq('status', 'connected')
    .limit(1);

  if (error || !instances || instances.length === 0) {
    cachedInstance = null;
    return null;
  }

  cachedInstance = {
    name: instances[0].instance_name,
    expiresAt: now + 60_000, // Cache por 1 minuto
  };

  return cachedInstance.name;
};

export const useLeadChat = (leadId: string, leadPhone: string) => {
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const optimisticIdsRef = useRef<Set<string>>(new Set());

  const fetchMessages = useCallback(async () => {
    if (!leadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar histórico de mensagens');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!leadId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`lead-messages-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as LeadMessage;
            // Se é uma mensagem otimista que já foi confirmada, atualiza em vez de duplicar
            setMessages((prev) => {
              const optimisticIdx = prev.findIndex(
                (m) => optimisticIdsRef.current.has(m.id) && m.message_text === newMsg.message_text
              );
              if (optimisticIdx !== -1) {
                optimisticIdsRef.current.delete(prev[optimisticIdx].id);
                const updated = [...prev];
                updated[optimisticIdx] = newMsg;
                return updated;
              }
              // Evita duplicatas reais
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? (payload.new as LeadMessage) : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, fetchMessages]);

  // Enviar mensagem de texto com atualização otimista
  const sendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || !leadId) return;

      const instanceName = await getCachedInstance();
      if (!instanceName) {
        toast.error('Nenhuma instância WhatsApp conectada');
        return;
      }

      const normalizedPhone = normalizeWhatsAppNumber(leadPhone);
      if (!normalizedPhone) {
        toast.error('Número de telefone inválido');
        return;
      }

      // Criar mensagem otimista IMEDIATAMENTE
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: LeadMessage = {
        id: optimisticId,
        lead_id: leadId,
        message_text: messageText,
        is_from_me: true,
        sent_at: new Date().toISOString(),
        status: 'sending',
        whatsapp_message_id: null,
        instance_name: instanceName,
        created_at: new Date().toISOString(),
      };

      optimisticIdsRef.current.add(optimisticId);
      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const { data, error } = await supabase.functions.invoke('evolution-send-message', {
          body: {
            instanceName,
            phone: normalizedPhone,
            message: messageText,
            leadId,
          },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || 'Erro ao enviar mensagem');
        }

        // Atualizar mensagem otimista com dados reais
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticId
              ? { ...msg, id: data.message?.id || optimisticId, status: 'sent' }
              : msg
          )
        );
        optimisticIdsRef.current.delete(optimisticId);
      } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        // Marcar como falha
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticId ? { ...msg, status: 'failed' } : msg))
        );
        toast.error('Erro ao enviar mensagem');
      } finally {
        setSending(false);
      }
    },
    [leadId, leadPhone]
  );

  // Enviar mídia com atualização otimista
  const sendMediaMessage = useCallback(
    async (file: File, mediaType: 'image' | 'video' | 'audio', caption?: string) => {
      if (!leadId) return;

      const instanceName = await getCachedInstance();
      if (!instanceName) {
        toast.error('Nenhuma instância WhatsApp conectada');
        return;
      }

      const normalizedPhone = normalizeWhatsAppNumber(leadPhone);
      if (!normalizedPhone) {
        toast.error('Número de telefone inválido');
        return;
      }

      const displayText =
        caption || (mediaType === 'image' ? '[Imagem]' : mediaType === 'video' ? '[Vídeo]' : '[Áudio]');

      // Mensagem otimista
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: LeadMessage = {
        id: optimisticId,
        lead_id: leadId,
        message_text: displayText,
        is_from_me: true,
        sent_at: new Date().toISOString(),
        status: 'sending',
        whatsapp_message_id: null,
        instance_name: instanceName,
        created_at: new Date().toISOString(),
      };

      optimisticIdsRef.current.add(optimisticId);
      setMessages((prev) => [...prev, optimisticMessage]);
      setSending(true);

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error } = await supabase.functions.invoke('evolution-send-message', {
          body: {
            instanceName,
            phone: normalizedPhone,
            leadId,
            mediaType,
            mediaBase64: base64,
            mimeType: file.type,
            fileName: file.name,
            caption,
          },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || 'Erro ao enviar mídia');
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === optimisticId
              ? { ...msg, id: data.message?.id || optimisticId, status: 'sent' }
              : msg
          )
        );
        optimisticIdsRef.current.delete(optimisticId);
      } catch (error) {
        console.error('❌ Erro ao enviar mídia:', error);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticId ? { ...msg, status: 'failed' } : msg))
        );
        toast.error('Erro ao enviar mídia');
      } finally {
        setSending(false);
      }
    },
    [leadId, leadPhone]
  );

  return {
    messages,
    loading,
    sending,
    sendMessage,
    sendMediaMessage,
  };
};


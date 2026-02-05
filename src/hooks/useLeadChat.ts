import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const useLeadChat = (leadId: string, leadPhone: string) => {
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Buscar mensagens iniciais
  const fetchMessages = async () => {
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
  };

  // Inscrever-se para atualizações em tempo real
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
          console.log('📨 Nova mensagem em tempo real:', payload);
          
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as LeadMessage]);
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
  }, [leadId]);

  // Enviar mensagem de texto
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    try {
      setSending(true);

      // Buscar instância ativa do usuário
      const { data: instances, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('status', 'connected')
        .limit(1);

      if (instanceError || !instances || instances.length === 0) {
        toast.error('Nenhuma instância WhatsApp conectada');
        return;
      }

      const instanceName = instances[0].instance_name;

      // Chamar edge function para enviar mensagem
      const { data, error } = await supabase.functions.invoke('evolution-send-message', {
        body: {
          instanceName,
          phone: leadPhone,
          message: messageText,
          leadId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      console.log('✅ Mensagem enviada com sucesso:', data);
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  // Enviar mensagem com mídia
  const sendMediaMessage = async (
    file: File,
    mediaType: 'image' | 'video' | 'audio',
    caption?: string
  ) => {
    try {
      setSending(true);

      // Buscar instância ativa do usuário
      const { data: instances, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('status', 'connected')
        .limit(1);

      if (instanceError || !instances || instances.length === 0) {
        toast.error('Nenhuma instância WhatsApp conectada');
        return;
      }

      const instanceName = instances[0].instance_name;

      // Converter arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Chamar edge function para enviar mídia
      const { data, error } = await supabase.functions.invoke('evolution-send-message', {
        body: {
          instanceName,
          phone: leadPhone,
          leadId,
          mediaType,
          mediaBase64: base64,
          mimeType: file.type,
          fileName: file.name,
          caption,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar mídia');
      }

      console.log('✅ Mídia enviada com sucesso:', data);
      toast.success('Mídia enviada!');
    } catch (error) {
      console.error('❌ Erro ao enviar mídia:', error);
      toast.error('Erro ao enviar mídia');
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    sendMediaMessage,
  };
};

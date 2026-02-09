import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import { Lead } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationChat } from '@/components/conversations/ConversationChat';
import { MessageSquare } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface LeadWithUnread extends Lead {
  unread_count?: number;
}

const Conversations = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadWithUnread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadWithUnread | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { playNotificationSound } = useNotificationSound();
  const { markAsRead } = useUnreadMessages();

  const navSelectedLeadId = useMemo(() => {
    const state = location.state as { selectedLeadId?: string } | null;
    return state?.selectedLeadId ?? null;
  }, [location.state]);

  const lastConsumedNavIdRef = useRef<string | null>(null);
  const selectedLeadIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedLeadIdRef.current = selectedLead?.id ?? null;
  }, [selectedLead]);

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setLeads((data || []) as LeadWithUnread[]);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar leads uma vez
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Consumir state de navegação (Leads -> Conversas)
  useEffect(() => {
    if (!navSelectedLeadId) return;
    if (lastConsumedNavIdRef.current === navSelectedLeadId) return;
    if (leads.length === 0) return;

    const leadToSelect = leads.find((l) => l.id === navSelectedLeadId) ?? null;
    if (leadToSelect) {
      setSelectedLead(leadToSelect);
      // Marcar como lido ao selecionar via navegação
      markAsRead(leadToSelect.id);
    }

    lastConsumedNavIdRef.current = navSelectedLeadId;
    navigate(location.pathname, { replace: true, state: null });
  }, [navSelectedLeadId, leads, navigate, location.pathname, markAsRead]);

  // Assinatura realtime para leads
  useEffect(() => {
    const channel = supabase
      .channel('conversations-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as LeadWithUnread;
            setLeads((prev) => [newLead, ...prev]);
            return;
          }

          if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as LeadWithUnread;
            setLeads((prev) => prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead)));
            setSelectedLead((prev) => (prev?.id === updatedLead.id ? updatedLead : prev));
            return;
          }

          if (payload.eventType === 'DELETE') {
            const deletedLead = payload.old as LeadWithUnread;
            setLeads((prev) => prev.filter((lead) => lead.id !== deletedLead.id));
            setSelectedLead((prev) => (prev?.id === deletedLead.id ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Assinatura realtime para novas mensagens (para tocar som)
  useEffect(() => {
    const channel = supabase
      .channel('new-messages-notification')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_messages',
        },
        (payload) => {
          const newMessage = payload.new as { lead_id: string; is_from_me: boolean };
          
          // Só tocar som para mensagens recebidas (não enviadas por mim)
          if (!newMessage.is_from_me) {
            // Se a conversa atual é diferente da mensagem, tocar som
            if (selectedLeadIdRef.current !== newMessage.lead_id) {
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playNotificationSound]);

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.toLowerCase().includes(searchLower) ||
      (lead.last_message && lead.last_message.toLowerCase().includes(searchLower))
    );
  });

  // Ordenar por não lidas primeiro, depois por data
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      // Primeiro: leads com mensagens não lidas
      const aUnread = a.unread_count ?? 0;
      const bUnread = b.unread_count ?? 0;
      if (aUnread > 0 && bUnread === 0) return -1;
      if (bUnread > 0 && aUnread === 0) return 1;
      
      // Depois: ordenar por data de atualização
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filteredLeads]);

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(lead =>
      lead.id === updatedLead.id ? updatedLead : lead
    ));
    setSelectedLead(updatedLead);
  };

  const handleSelectLead = useCallback((lead: LeadWithUnread) => {
    setSelectedLead(lead);
    // Marcar mensagens como lidas ao selecionar conversa
    if ((lead.unread_count ?? 0) > 0) {
      markAsRead(lead.id);
      // Atualizar localmente para feedback imediato
      setLeads(prev => prev.map(l => 
        l.id === lead.id ? { ...l, unread_count: 0 } : l
      ));
    }
  }, [markAsRead]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
            <p className="text-sm text-muted-foreground">Gerencie suas conversas com leads</p>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="h-[calc(100vh-12rem)]">
          <ResizablePanelGroup 
            direction="horizontal" 
            className="h-full rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
          >
            {/* Lista de conversas */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={45}>
              <ConversationList
                leads={sortedLeads}
                isLoading={isLoading}
                selectedLead={selectedLead}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectLead={handleSelectLead}
              />
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border/30 hover:bg-border/50 transition-colors" />

            {/* Painel de chat */}
            <ResizablePanel defaultSize={65} minSize={50}>
              <ConversationChat lead={selectedLead} onLeadUpdate={handleLeadUpdate} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </MainLayout>
  );
};

export default Conversations;

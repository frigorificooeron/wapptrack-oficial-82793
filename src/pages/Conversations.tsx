import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
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

const Conversations = () => {
  const location = useLocation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const leadsData = (data || []) as Lead[];
      setLeads(leadsData);

      // Se veio um lead selecionado via navegação, seleciona ele
      const state = location.state as { selectedLeadId?: string } | null;
      if (state?.selectedLeadId) {
        const leadToSelect = leadsData.find(l => l.id === state.selectedLeadId);
        if (leadToSelect) {
          setSelectedLead(leadToSelect);
        }
        // Limpar o state para não selecionar novamente em reloads
        window.history.replaceState({}, document.title);
      }
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const channel = supabase
      .channel('conversations-leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            setLeads(prev => [newLead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            setLeads(prev => prev.map(lead =>
              lead.id === updatedLead.id ? updatedLead : lead
            ));
            
            if (selectedLead && selectedLead.id === updatedLead.id) {
              setSelectedLead(updatedLead);
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedLead = payload.old as Lead;
            setLeads(prev => prev.filter(lead => lead.id !== deletedLead.id));
            
            if (selectedLead && selectedLead.id === deletedLead.id) {
              setSelectedLead(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedLead, location.state]);

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.toLowerCase().includes(searchLower) ||
      (lead.last_message && lead.last_message.toLowerCase().includes(searchLower))
    );
  });

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(lead =>
      lead.id === updatedLead.id ? updatedLead : lead
    ));
    setSelectedLead(updatedLead);
  };

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
                leads={filteredLeads}
                isLoading={isLoading}
                selectedLead={selectedLead}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectLead={setSelectedLead}
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

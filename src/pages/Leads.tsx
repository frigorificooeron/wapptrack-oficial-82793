
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeads, getCampaigns } from '@/services/dataService';
import { Lead, Campaign } from '@/types';
import { Plus, Table2, LayoutGrid } from 'lucide-react';
import { useLeadOperations } from '@/hooks/useLeadOperations';
import { useBulkLeadOperations } from '@/hooks/useBulkLeadOperations';
import LeadsTable from '@/components/leads/LeadsTable';
import LeadDialog from '@/components/leads/LeadDialog';
import LeadDetailDialog from '@/components/leads/LeadDetailDialog';
import BulkActionsBar from '@/components/leads/BulkActionsBar';
import { KanbanBoard } from '@/components/leads/KanbanBoard';
import { LeadChatDialog } from '@/components/leads/LeadChatDialog';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [chatLead, setChatLead] = useState<Lead | null>(null);

  const {
    isDialogOpen,
    setIsDialogOpen,
    isDetailDialogOpen,
    setIsDetailDialogOpen,
    dialogMode,
    currentLead,
    selectedLead,
    selectedLeads,
    handleInputChange,
    handlePhoneChange,
    handleSelectChange,
    handleOpenAddDialog,
    handleOpenEditDialog,
    handleOpenViewDialog,
    handleSaveLead,
    handleSaveFromDetailDialog,
    handleDeleteLead,
    handleSelectLead,
    handleSelectAll,
    handleDeleteSelected,
    openWhatsApp,
    setSelectedLeads
  } = useLeadOperations(leads, setLeads);

  // Bulk operations hook
  const { 
    handleBulkDelete, 
    handleBulkStatusUpdate, 
    handleExportCSV 
  } = useBulkLeadOperations(leads, setLeads, selectedLeads, setSelectedLeads);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Iniciando busca de dados...');
      
      const [leadsData, campaignsData] = await Promise.all([
        getLeads(),
        getCampaigns()
      ]);
      
      console.log('📋 Dados brutos do getLeads():', leadsData);
      
      // Garantir que os dados estão sendo processados corretamente
      const processedLeads = leadsData.map(lead => {
        console.log(`🔍 Processando lead ${lead.name}:`, {
          id: lead.id,
          last_message: lead.last_message,
          last_message_type: typeof lead.last_message,
          last_message_raw: JSON.stringify(lead.last_message)
        });
        
        return {
          ...lead,
          last_message: lead.last_message || null
        };
      });
      
      console.log('✅ Leads processados:', processedLeads);
      setLeads(processedLeads);
      setCampaigns(campaignsData);
      
      console.log('📊 Estado final dos leads:', processedLeads.map(lead => ({
        name: lead.name,
        phone: lead.phone,
        last_message: lead.last_message,
        status: lead.status
      })));
    } catch (error) {
      console.error('Error fetching leads data:', error);
      toast.error('Erro ao carregar dados dos leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Configurar escuta em tempo real para mudanças na tabela de leads
    console.log('🎧 Configurando escuta em tempo real para leads...');
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          console.log('📡 Mudança detectada na tabela leads:', payload);
          console.log('📡 Payload completo:', JSON.stringify(payload, null, 2));
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Novo lead adicionado:', payload.new);
            const newLead = payload.new as Lead;
            console.log('➕ Detalhes da mensagem no INSERT:', {
              last_message: newLead.last_message,
              type: typeof newLead.last_message,
              raw: JSON.stringify(newLead.last_message)
            });
            
            // Garantir que a mensagem seja preservada
            const processedLead = {
              ...newLead,
              last_message: newLead.last_message || null
            };
            console.log('➕ Lead processado para insert:', processedLead);
            
            setLeads(prev => {
              const newLeads = [processedLead, ...prev];
              console.log('➕ Estado atualizado após INSERT:', newLeads);
              return newLeads;
            });
            toast.success(`Novo lead adicionado: ${processedLead.name}`);
          } 
          else if (payload.eventType === 'UPDATE') {
            console.log('📝 Lead atualizado:', payload.new);
            console.log('📝 Lead anterior:', payload.old);
            
            const updatedLead = payload.new as Lead;
            const oldLead = payload.old as Lead;
            
            console.log('📝 Comparação de mensagens:', {
              old_message: oldLead.last_message,
              new_message: updatedLead.last_message,
              old_type: typeof oldLead.last_message,
              new_type: typeof updatedLead.last_message,
              old_raw: JSON.stringify(oldLead.last_message),
              new_raw: JSON.stringify(updatedLead.last_message)
            });
            
            // Garantir que a mensagem seja preservada
            const processedLead = {
              ...updatedLead,
              last_message: updatedLead.last_message || null
            };
            
            console.log('📝 Lead processado para update:', processedLead);
            
            setLeads(prev => {
              const updatedLeads = prev.map(lead => 
                lead.id === processedLead.id ? processedLead : lead
              );
              console.log('📝 Estado atualizado após UPDATE:', updatedLeads);
              return updatedLeads;
            });
            
            // Se uma mensagem foi adicionada, mostrar notificação
            if (processedLead.last_message && processedLead.last_message !== oldLead.last_message) {
              console.log('💬 Nova mensagem detectada:', processedLead.last_message);
              toast.info(`Nova mensagem de ${processedLead.name}: ${processedLead.last_message.substring(0, 50)}${processedLead.last_message.length > 50 ? '...' : ''}`);
            }
          }
          else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Lead removido:', payload.old);
            const deletedLead = payload.old as Lead;
            setLeads(prev => prev.filter(lead => lead.id !== deletedLead.id));
            toast.info(`Lead removido: ${deletedLead.name}`);
          }
        }
      )
      .subscribe();

    // Cleanup: remover a escuta quando o componente for desmontado
    return () => {
      console.log('🔌 Removendo escuta em tempo real...');
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.name.toLowerCase().includes(searchLower) ||
      lead.phone.toLowerCase().includes(searchLower) ||
      lead.campaign.toLowerCase().includes(searchLower) ||
      lead.status.toLowerCase().includes(searchLower) ||
      (lead.last_message && lead.last_message.toLowerCase().includes(searchLower))
    );
  });

  console.log('🎯 Leads filtrados sendo passados para a tabela:', filteredLeads.map(lead => ({
    name: lead.name,
    last_message: lead.last_message,
    type: typeof lead.last_message
  })));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">Gerencie todos os seus leads de WhatsApp</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOpenAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Novo Lead
            </Button>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'kanban')} className="w-full">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Input
              placeholder="Buscar leads por nome, telefone, campanha, status ou mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-lg"
            />
            <TabsList>
              <TabsTrigger value="kanban" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <Table2 className="h-4 w-4" />
                Tabela
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="kanban" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <KanbanBoard
                leads={filteredLeads}
                onLeadClick={handleOpenViewDialog}
                onOpenChat={(lead) => {
                  setChatLead(lead);
                  setChatDialogOpen(true);
                }}
                onLeadUpdate={fetchData}
              />
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-0">
            <BulkActionsBar
              selectedLeads={selectedLeads}
              leads={filteredLeads}
              onDeleteSelected={handleBulkDelete}
              onUpdateStatus={handleBulkStatusUpdate}
              onExportCSV={handleExportCSV}
            />
            <LeadsTable
              leads={filteredLeads}
              isLoading={isLoading}
              selectedLeads={selectedLeads}
              onSelectLead={handleSelectLead}
              onSelectAll={handleSelectAll}
              onDeleteSelected={handleDeleteSelected}
              onView={handleOpenViewDialog}
              onDelete={handleDeleteLead}
              onOpenWhatsApp={openWhatsApp}
            />
          </TabsContent>
        </Tabs>

        <LeadDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          mode={dialogMode}
          currentLead={currentLead}
          campaigns={campaigns}
          onSave={handleSaveLead}
          onInputChange={handleInputChange}
          onPhoneChange={handlePhoneChange}
          onSelectChange={handleSelectChange}
        />

        <LeadDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          lead={selectedLead}
          onSave={handleSaveFromDetailDialog}
          onOpenWhatsApp={openWhatsApp}
        />

        {chatLead && (
          <LeadChatDialog
            lead={chatLead}
            open={chatDialogOpen}
            onOpenChange={setChatDialogOpen}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Leads;

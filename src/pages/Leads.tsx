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
import { ChatPanel } from '@/components/leads/ChatPanel';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
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

  const { 
    handleBulkDelete, 
    handleBulkStatusUpdate, 
    handleExportCSV 
  } = useBulkLeadOperations(leads, setLeads, selectedLeads, setSelectedLeads);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [leadsData, campaignsData] = await Promise.all([
        getLeads(),
        getCampaigns()
      ]);
      
      const processedLeads = leadsData.map(lead => ({
        ...lead,
        last_message: lead.last_message || null
      }));
      
      setLeads(processedLeads);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error fetching leads data:', error);
      toast.error('Erro ao carregar dados dos leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('leads-changes')
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
            const processedLead = {
              ...newLead,
              last_message: newLead.last_message || null
            };
            setLeads(prev => [processedLead, ...prev]);
            toast.success(`Novo lead adicionado: ${processedLead.name}`);
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            const oldLead = payload.old as Lead;
            const processedLead = {
              ...updatedLead,
              last_message: updatedLead.last_message || null
            };
            
            setLeads(prev => prev.map(lead => 
              lead.id === processedLead.id ? processedLead : lead
            ));
            
            // Atualizar chatLead se for o mesmo lead
            if (chatLead && chatLead.id === processedLead.id) {
              setChatLead(processedLead);
            }
            
            if (processedLead.last_message && processedLead.last_message !== oldLead.last_message) {
              toast.info(`Nova mensagem de ${processedLead.name}: ${processedLead.last_message.substring(0, 50)}${processedLead.last_message.length > 50 ? '...' : ''}`);
            }
          }
          else if (payload.eventType === 'DELETE') {
            const deletedLead = payload.old as Lead;
            setLeads(prev => prev.filter(lead => lead.id !== deletedLead.id));
            
            // Fechar chat se o lead foi deletado
            if (chatLead && chatLead.id === deletedLead.id) {
              setChatLead(null);
            }
            
            toast.info(`Lead removido: ${deletedLead.name}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatLead]);

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

  const handleOpenChat = (lead: Lead) => {
    setChatLead(lead);
  };

  const handleCloseChat = () => {
    setChatLead(null);
  };

  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          {/* Painel de Leads */}
          <ResizablePanel defaultSize={chatLead ? 60 : 100} minSize={40}>
            <div className="h-full flex flex-col p-4 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
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

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'kanban')} className="flex-1 flex flex-col overflow-hidden">
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

                <TabsContent value="kanban" className="mt-0 flex-1 overflow-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <KanbanBoard
                      leads={filteredLeads}
                      onLeadClick={handleOpenViewDialog}
                      onOpenChat={handleOpenChat}
                      onLeadUpdate={fetchData}
                    />
                  )}
                </TabsContent>

                <TabsContent value="table" className="mt-0 flex-1 overflow-auto">
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
            </div>
          </ResizablePanel>

          {/* Painel de Chat */}
          {chatLead && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
                <ChatPanel lead={chatLead} onClose={handleCloseChat} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

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
      </div>
    </MainLayout>
  );
};

export default Leads;


import { Lead } from '@/types';
import { updateLead, deleteLead } from '@/services/dataService';
import { toast } from "sonner";
import { format } from 'date-fns';

export const useBulkLeadOperations = (
  leads: Lead[], 
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>,
  selectedLeads: string[],
  setSelectedLeads: React.Dispatch<React.SetStateAction<string[]>>
) => {

  const handleBulkDelete = async () => {
    if (selectedLeads.length === 0) return;

    const confirmMessage = `Tem certeza que deseja excluir ${selectedLeads.length} lead(s)?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await Promise.all(selectedLeads.map(id => deleteLead(id)));
      setLeads(leads.filter(lead => !selectedLeads.includes(lead.id)));
      setSelectedLeads([]);
      toast.success(`${selectedLeads.length} lead(s) excluído(s) com sucesso`);
    } catch (error) {
      console.error('Error deleting selected leads:', error);
      toast.error('Erro ao excluir leads selecionados');
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedLeads.length === 0) return;

    const statusLabels: Record<string, string> = {
      'new': 'Novo',
      'contacted': 'Contactado',
      'negotiating': 'Em Negociação',
      'converted': 'Convertido',
      'cancelled': 'Cancelado'
    };

    const confirmMessage = `Marcar ${selectedLeads.length} lead(s) como "${statusLabels[newStatus] || newStatus}"?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const updatePromises = selectedLeads.map(id => 
        updateLead(id, { status: newStatus as Lead['status'] })
      );
      
      const updatedLeads = await Promise.all(updatePromises);
      
      setLeads(leads.map(lead => {
        const updated = updatedLeads.find(u => u.id === lead.id);
        return updated || lead;
      }));
      
      setSelectedLeads([]);
      toast.success(`${selectedLeads.length} lead(s) atualizado(s) para "${statusLabels[newStatus]}"`);
    } catch (error) {
      console.error('Error updating leads status:', error);
      toast.error('Erro ao atualizar status dos leads');
    }
  };

  const handleExportCSV = () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione pelo menos um lead para exportar');
      return;
    }

    const leadsToExport = leads.filter(lead => selectedLeads.includes(lead.id));
    
    // Define CSV headers
    const headers = [
      'Nome',
      'Telefone',
      'Campanha',
      'Status',
      'UTM Source',
      'UTM Medium',
      'UTM Campaign',
      'UTM Content',
      'UTM Term',
      'Data Criação',
      'Primeiro Contato',
      'Último Contato',
      'Última Mensagem',
      'Cidade',
      'País',
      'Dispositivo',
      'Navegador',
      'Notas'
    ];

    // Convert leads to CSV rows
    const rows = leadsToExport.map(lead => [
      lead.name || '',
      lead.phone || '',
      lead.campaign || '',
      lead.status || '',
      lead.utm_source || '',
      lead.utm_medium || '',
      lead.utm_campaign || '',
      lead.utm_content || '',
      lead.utm_term || '',
      lead.created_at ? format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm') : '',
      lead.first_contact_date ? format(new Date(lead.first_contact_date), 'dd/MM/yyyy HH:mm') : '',
      lead.last_contact_date ? format(new Date(lead.last_contact_date), 'dd/MM/yyyy HH:mm') : '',
      (lead.last_message || '').replace(/"/g, '""'), // Escape quotes
      lead.city || '',
      lead.country || '',
      lead.device_type || '',
      lead.browser || '',
      (lead.notes || '').replace(/"/g, '""') // Escape quotes
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${leadsToExport.length} lead(s) exportado(s) com sucesso`);
  };

  return {
    handleBulkDelete,
    handleBulkStatusUpdate,
    handleExportCSV
  };
};

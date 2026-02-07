
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSales, addSale, updateSale, deleteSale, getLeads, getCampaigns } from '@/services/dataService';
import { Sale, Lead, Campaign } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trash2, Edit, DollarSign, Search } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentSale, setCurrentSale] = useState<Partial<Sale>>({
    value: 0,
    date: new Date().toISOString().split('T')[0],
    lead_id: '',
    lead_name: '',
    campaign: '',
    product: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Sales - Iniciando busca de dados...');
      
      const [salesData, leadsData, campaignsData] = await Promise.all([
        getSales(),
        getLeads(),
        getCampaigns()
      ]);
      
      console.log('📊 Sales - Dados carregados:', {
        salesCount: salesData.length,
        leadsCount: leadsData.length,
        campaignsCount: campaignsData.length
      });
      
      setSales(salesData);
      setLeads(leadsData);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('❌ Sales - Erro ao carregar dados:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Configurar escuta em tempo real para mudanças na tabela de vendas
    console.log('🎧 Sales - Configurando escuta em tempo real para vendas...');
    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'sales'
        },
        (payload) => {
          console.log('📡 Sales - Mudança detectada na tabela sales:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ Sales - Nova venda adicionada:', payload.new);
            const newSale = payload.new as Sale;
            setSales(prev => [newSale, ...prev]);
            toast.success(`Nova venda criada: ${newSale.lead_name} - ${formatCurrency(newSale.value)}`);
          } 
          else if (payload.eventType === 'UPDATE') {
            console.log('📝 Sales - Venda atualizada:', payload.new);
            const updatedSale = payload.new as Sale;
            setSales(prev => prev.map(sale => 
              sale.id === updatedSale.id ? updatedSale : sale
            ));
            toast.info(`Venda atualizada: ${updatedSale.lead_name}`);
          }
          else if (payload.eventType === 'DELETE') {
            console.log('🗑️ Sales - Venda removida:', payload.old);
            const deletedSale = payload.old as Sale;
            setSales(prev => prev.filter(sale => sale.id !== deletedSale.id));
            toast.info(`Venda removida: ${deletedSale.lead_name}`);
          }
        }
      )
      .subscribe();

    // Cleanup: remover a escuta quando o componente for desmontado
    return () => {
      console.log('🔌 Sales - Removendo escuta em tempo real...');
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredSales = sales.filter((sale) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      sale.lead_name.toLowerCase().includes(searchLower) ||
      sale.campaign.toLowerCase().includes(searchLower) ||
      (sale.product && sale.product.toLowerCase().includes(searchLower)) ||
      formatCurrency(sale.value).includes(searchLower)
    );
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'value') {
      // Handle numeric input
      const numericValue = parseFloat(value);
      setCurrentSale({ ...currentSale, [name]: isNaN(numericValue) ? 0 : numericValue });
    } else {
      setCurrentSale({ ...currentSale, [name]: value });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'lead_id') {
      const selectedLead = leads.find(lead => lead.id === value);
      setCurrentSale({ 
        ...currentSale, 
        [name]: value,
        lead_name: selectedLead?.name || '',
        campaign: selectedLead?.campaign || currentSale.campaign || ''
      });
    } else {
      setCurrentSale({ ...currentSale, [name]: value });
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentSale({
      value: 0,
      date: new Date().toISOString().split('T')[0],
      lead_id: '',
      lead_name: '',
      campaign: '',
      product: '',
      notes: ''
    });
    setDialogMode('add');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (sale: Sale) => {
    // Format the date to YYYY-MM-DD for the input field
    const formattedDate = sale.date ? new Date(sale.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
    setCurrentSale({ 
      ...sale,
      date: formattedDate 
    });
    setDialogMode('edit');
    setIsDialogOpen(true);
  };

  const handleSaveSale = async () => {
    try {
      // Validate required fields
      if (!currentSale.value || !currentSale.date || !currentSale.lead_id || !currentSale.campaign) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Ensure value is a number
      const saleValue = typeof currentSale.value === 'string' 
        ? parseFloat(currentSale.value) 
        : currentSale.value;

      if (dialogMode === 'add') {
        const newSale = await addSale({
          ...currentSale,
          value: saleValue,
          date: new Date(currentSale.date as string).toISOString(),
        } as Omit<Sale, 'id'>);
        
        setSales([...sales, newSale]);
        toast.success('Venda adicionada com sucesso');
      } else {
        if (!currentSale.id) return;
        
        const updatedSale = await updateSale(currentSale.id, {
          ...currentSale,
          value: saleValue,
          date: new Date(currentSale.date as string).toISOString(),
        });
        
        setSales(sales.map(sale => sale.id === updatedSale.id ? updatedSale : sale));
        toast.success('Venda atualizada com sucesso');
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving sale:', error);
      toast.error('Erro ao salvar venda');
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda?')) {
      return;
    }

    try {
      await deleteSale(id);
      setSales(sales.filter(sale => sale.id !== id));
      toast.success('Venda excluída com sucesso');
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error('Erro ao excluir venda');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center ring-1 ring-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vendas</h1>
              <p className="text-sm text-muted-foreground">Gerencie as vendas realizadas para seus leads</p>
            </div>
          </div>
          <Button onClick={handleOpenAddDialog} className="premium-button gap-2">
            <Plus className="h-4 w-4" /> Nova Venda
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 input-premium"
          />
        </div>

        {/* Table */}
        <Card className="glass-card-hover border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                    <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campanha</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                    <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center">
                        <div className="premium-loader mx-auto" />
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Nenhuma venda encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4 font-medium text-foreground">{sale.lead_name}</td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold">
                            {formatCurrency(sale.value)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-sm">
                            {sale.campaign}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{sale.product || '-'}</td>
                        <td className="p-4 text-muted-foreground">{sale.date ? formatDate(sale.date) : '-'}</td>
                        <td className="p-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditDialog(sale)}
                            title="Editar venda"
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSale(sale.id)}
                            title="Excluir venda"
                            className="hover:bg-rose-500/10 hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {dialogMode === 'add' ? 'Adicionar Nova Venda' : 'Editar Venda'}
              </DialogTitle>
              <DialogDescription>
                {dialogMode === 'add' 
                  ? 'Preencha os detalhes para registrar uma nova venda.' 
                  : 'Atualize os detalhes da venda.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="value">Valor*</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentSale.value}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="input-premium"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Data*</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={currentSale.date as string}
                  onChange={handleInputChange}
                  className="input-premium"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lead_id">Lead*</Label>
                <Select 
                  value={currentSale.lead_id} 
                  onValueChange={(value) => handleSelectChange('lead_id', value)}
                >
                  <SelectTrigger className="input-premium">
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="campaign">Campanha*</Label>
                <Select 
                  value={currentSale.campaign} 
                  onValueChange={(value) => handleSelectChange('campaign', value)}
                >
                  <SelectTrigger className="input-premium">
                    <SelectValue placeholder="Selecione uma campanha" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.name}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product">Produto</Label>
                <Input
                  id="product"
                  name="product"
                  value={currentSale.product || ''}
                  onChange={handleInputChange}
                  placeholder="Nome do produto vendido"
                  className="input-premium"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={currentSale.notes || ''}
                  onChange={handleInputChange}
                  placeholder="Observações sobre a venda"
                  className="input-premium min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSale} className="premium-button">
                {dialogMode === 'add' ? 'Adicionar' : 'Atualizar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Sales;

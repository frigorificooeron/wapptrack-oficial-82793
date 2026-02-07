import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Button } from "@/components/ui/button";
import { getCampaigns, addCampaign, updateCampaign, deleteCampaign } from '@/services/campaignService';
import { Campaign } from '@/types';
import { buildUtmUrl, generateTrackingUrl } from '@/lib/utils';
import { Plus, Tags, Link2 } from 'lucide-react';
import { toast } from "sonner";
import GlobalKeywordsSettings from '@/components/campaigns/GlobalKeywordsSettings';
import CampaignForm from '@/components/campaigns/CampaignForm';
import CampaignTable from '@/components/campaigns/CampaignTable';
import CampaignFilters from '@/components/campaigns/CampaignFilters';

const getDefaultUtmVariables = () => ({
  utm_source: "{{site_source_name}}",
  utm_medium: "{{adset.name}}",
  utm_campaign: "{{campaign.name}}",
  utm_content: "{{ad.name}}",
  utm_term: "{{placement}}",
  gclid: "",
  fbclid: "",
});

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentCampaign, setCurrentCampaign] = useState<Partial<Campaign>>({
    name: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
    pixel_id: '',
    facebook_access_token: '',
    whatsapp_number: '',
    event_type: 'lead',
    active: true,
    custom_message: '',
    company_title: '',
    company_subtitle: '',
    redirect_type: 'whatsapp',
    pixel_integration_type: 'direct',
    conversion_api_enabled: true,
    advanced_matching_enabled: true,
    server_side_api_enabled: true,
    test_event_code: '',
    custom_audience_pixel_id: '',
    tracking_domain: '',
    external_id: '',
    data_processing_options: [],
    data_processing_options_country: 0,
    data_processing_options_state: 0
  });
  const [baseUrl, setBaseUrl] = useState('https://seusite.com');
  const [isGlobalKeywordsOpen, setIsGlobalKeywordsOpen] = useState(false);
  const [customUtms, setCustomUtms] = useState({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    gclid: "",
    fbclid: "",
  });
  const [showCustomUtm, setShowCustomUtm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Atualiza os UTMs conforme a campanha selecionada
  useEffect(() => {
    if (selectedCampaign) {
      // Use valores guardados OU os padrões caso vazio
      setCustomUtms({
        utm_source: selectedCampaign.utm_source || "{{site_source_name}}",
        utm_medium: selectedCampaign.utm_medium || "{{adset.name}}",
        utm_campaign: selectedCampaign.utm_campaign || "{{campaign.name}}",
        utm_content: selectedCampaign.utm_content || "{{ad.name}}",
        utm_term: selectedCampaign.utm_term || "{{placement}}",
        gclid: "",
        fbclid: "",
      });
    }
  }, [selectedCampaign]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const campaignsData = await getCampaigns();
        setCampaigns(campaignsData);
      } catch (error) {
        console.error('Error fetching campaigns data:', error);
        toast.error('Erro ao carregar campanhas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCampaigns = campaigns.filter((campaign) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      campaign.name.toLowerCase().includes(searchLower) ||
      (campaign.utm_source && campaign.utm_source.toLowerCase().includes(searchLower)) ||
      (campaign.utm_medium && campaign.utm_medium.toLowerCase().includes(searchLower)) ||
      (campaign.utm_campaign && campaign.utm_campaign.toLowerCase().includes(searchLower))
    );
  });

  const handleOpenAddDialog = () => {
    setCurrentCampaign({
      name: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_content: '',
      utm_term: '',
      pixel_id: '',
      facebook_access_token: '',
      whatsapp_number: '',
      event_type: 'lead',
      active: true,
      custom_message: '',
      company_title: '',
      company_subtitle: '',
      redirect_type: 'whatsapp',
      pixel_integration_type: 'direct',
      conversion_api_enabled: true,
      advanced_matching_enabled: true,
      server_side_api_enabled: true,
      test_event_code: '',
      custom_audience_pixel_id: '',
      tracking_domain: '',
      external_id: '',
      data_processing_options: [],
      data_processing_options_country: 0,
      data_processing_options_state: 0
    });
    setCustomUtms(getDefaultUtmVariables());
    setDialogMode('add');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (campaign: Campaign) => {
    setCurrentCampaign({ ...campaign });
    setDialogMode('edit');
    setIsDialogOpen(true);
  };

  const handleSaveCampaign = async () => {
    try {
      // Validate required fields
      if (!currentCampaign.name) {
        toast.error('O nome da campanha é obrigatório');
        return;
      }

      if (dialogMode === 'add') {
        const newCampaign = await addCampaign(currentCampaign as Omit<Campaign, 'id' | 'created_at'>);
        setCampaigns([...campaigns, newCampaign]);
        toast.success('Campanha adicionada com sucesso');
      } else {
        if (!currentCampaign.id) return;
        const updatedCampaign = await updateCampaign(currentCampaign.id, currentCampaign);
        setCampaigns(campaigns.map(campaign => campaign.id === updatedCampaign.id ? updatedCampaign : campaign));
        toast.success('Campanha atualizada com sucesso');
      }
      
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Erro ao salvar campanha');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) {
      return;
    }

    try {
      await deleteCampaign(id);
      setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      toast.success('Campanha excluída com sucesso');
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      toast.error(error.message || 'Erro ao excluir campanha');
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(message))
      .catch(err => {
        console.error('Error copying text: ', err);
        toast.error('Erro ao copiar para o clipboard');
      });
  };

  // Função para gerar URL LIMPA (sem UTMs)
  const getTrackingUrl = (campaign: Campaign) => {
    const currentUrl = window.location.origin;
    return `${currentUrl}/ir?id=${campaign.id}`;
  };

  // Função para gerar URL com UTMs customizados (incluindo gclid e fbclid)
  const getCustomUtmTrackingUrl = (campaign: Campaign, utms: Partial<Record<string, string>>) => {
    const currentUrl = window.location.origin;
    const params = new URLSearchParams();
    params.append("id", campaign.id);
    if (utms.utm_source) params.append("utm_source", utms.utm_source);
    if (utms.utm_medium) params.append("utm_medium", utms.utm_medium);
    if (utms.utm_campaign) params.append("utm_campaign", utms.utm_campaign);
    if (utms.utm_content) params.append("utm_content", utms.utm_content);
    if (utms.utm_term) params.append("utm_term", utms.utm_term);
    if (utms.gclid) params.append("gclid", utms.gclid);
    if (utms.fbclid) params.append("fbclid", utms.fbclid);
    return `${currentUrl}/ir?${params.toString()}`;
  };

  const handleCopyTrackingUrl = (campaign: Campaign) => {
    copyToClipboard(getTrackingUrl(campaign), 'URL de rastreamento copiada');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Links de rastreamento</h1>
              <p className="text-sm text-muted-foreground">Crie e gerencie links com tracking avançado</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsGlobalKeywordsOpen(true)}
              title="Configurações de Tags Globais"
              className="border-border/50 hover:bg-muted/50"
            >
              <Tags className="mr-2 h-4 w-4" /> Configurar Tags
            </Button>
            <Button onClick={handleOpenAddDialog} className="premium-button gap-2">
              <Plus className="h-4 w-4" /> Novo Link
            </Button>
          </div>
        </div>

        {/* BLOCO PARA VISUALIZAR LINK LIMPO DA CAMPANHA SELECIONADA */}
        {selectedCampaign && (
          <div className="glass-card-hover rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-foreground text-sm">Link de rastreamento selecionado</span>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border border-border/50 rounded-lg bg-muted/50 text-foreground text-sm font-mono"
                readOnly
                value={getTrackingUrl(selectedCampaign)}
              />
              <Button variant="outline" onClick={() => handleCopyTrackingUrl(selectedCampaign)} className="shrink-0">
                Copiar
              </Button>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowCustomUtm((v) => !v)}
              className="text-xs"
            >
              {showCustomUtm ? "Fechar UTMs customizados" : "Gerar link com UTMs customizados"}
            </Button>
            {showCustomUtm && (
              <div className="mt-3 space-y-3 pt-3 border-t border-border/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input className="input-premium text-sm" placeholder="utm_source"
                    value={customUtms.utm_source}
                    onChange={e => setCustomUtms({ ...customUtms, utm_source: e.target.value })}
                  />
                  <input className="input-premium text-sm" placeholder="utm_medium"
                    value={customUtms.utm_medium}
                    onChange={e => setCustomUtms({ ...customUtms, utm_medium: e.target.value })}
                  />
                  <input className="input-premium text-sm" placeholder="utm_campaign"
                    value={customUtms.utm_campaign}
                    onChange={e => setCustomUtms({ ...customUtms, utm_campaign: e.target.value })}
                  />
                  <input className="input-premium text-sm" placeholder="utm_content"
                    value={customUtms.utm_content}
                    onChange={e => setCustomUtms({ ...customUtms, utm_content: e.target.value })}
                  />
                  <input className="input-premium text-sm" placeholder="utm_term"
                    value={customUtms.utm_term}
                    onChange={e => setCustomUtms({ ...customUtms, utm_term: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input className="input-premium text-sm" placeholder="gclid (Google Ads)"
                    value={customUtms.gclid}
                    onChange={e => setCustomUtms({ ...customUtms, gclid: e.target.value })}
                  />
                  <input className="input-premium text-sm" placeholder="fbclid (Facebook Ads)"
                    value={customUtms.fbclid}
                    onChange={e => setCustomUtms({ ...customUtms, fbclid: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => copyToClipboard(getCustomUtmTrackingUrl(selectedCampaign, customUtms), "Link com UTMs copiado")}
                >
                  Copiar link com UTMs
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <CampaignFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Tabela de campanhas (ao clicar seleciona para exibir link limpo) */}
        <CampaignTable
          campaigns={filteredCampaigns}
          isLoading={isLoading}
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteCampaign}
          onCopyTrackingUrl={campaign => {
            setSelectedCampaign(campaign); // Selecionar para ver o link limpo acima
            handleCopyTrackingUrl(campaign);
          }}
        />

        <CampaignForm
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          mode={dialogMode}
          campaign={currentCampaign}
          onCampaignChange={setCurrentCampaign}
          onSave={handleSaveCampaign}
          baseUrl={baseUrl}
          onBaseUrlChange={setBaseUrl}
        />

        <GlobalKeywordsSettings 
          open={isGlobalKeywordsOpen}
          onOpenChange={setIsGlobalKeywordsOpen}
        />
      </div>
    </MainLayout>
  );
};

export default Campaigns;

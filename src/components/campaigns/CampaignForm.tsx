
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { Campaign } from '@/types/campaign';

interface CampaignFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  campaign: Partial<Campaign>;
  onCampaignChange: (campaign: Partial<Campaign>) => void;
  onSave: () => void;
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
}

const CampaignForm: React.FC<CampaignFormProps> = ({
  isOpen,
  onOpenChange,
  mode,
  campaign,
  onCampaignChange,
  onSave,
  baseUrl,
  onBaseUrlChange
}) => {
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onCampaignChange({ ...campaign, [name]: value });
  };

  const handleSwitchChange = (checked: boolean) => {
    onCampaignChange({ ...campaign, active: checked });
  };

  const handleEventTypeChange = (value: string) => {
    onCampaignChange({ ...campaign, event_type: value as Campaign['event_type'] });
  };


  const handlePixelIntegrationTypeChange = (value: string) => {
    onCampaignChange({ ...campaign, pixel_integration_type: value as Campaign['pixel_integration_type'] });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `campaign-logo-${Math.random()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      onCampaignChange({
        ...campaign,
        logo_url: data.publicUrl
      });

      toast.success('Logo enviada com sucesso!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Adicionar Novo Link de rastreamento' : 'Editar Link de rastreamento'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'add' 
              ? 'Configure seu link de rastreamento com tracking avançado e máximos parâmetros.' 
              : 'Atualize os detalhes do link de rastreamento e configurações de tracking.'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="integration">Integração</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            {/* Identidade da Empresa */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Identidade da Empresa</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="company_title">Nome da empresa</Label>
                <Input
                  id="company_title"
                  name="company_title"
                  value={campaign.company_title || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: Minha Empresa"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="company_subtitle">Subtítulo</Label>
                <Input
                  id="company_subtitle"
                  name="company_subtitle"
                  value={campaign.company_subtitle || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: Sistema de Marketing Digital"
                />
              </div>

              <div className="grid gap-2">
                <Label>Logo (upload se aplicável)</Label>
                <div className="flex items-start space-x-4">
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={uploading}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Escolher Arquivo'}
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Formatos aceitos: PNG, JPG, JPEG (máx. 5MB)
                    </p>
                  </div>
                  {campaign.logo_url && (
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg border overflow-hidden">
                        <img
                          src={campaign.logo_url}
                          alt="Logo da campanha"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Link de rastreamento*</Label>
              <Input
                id="name"
                name="name"
                value={campaign.name || ''}
                onChange={handleInputChange}
                placeholder="Ex: Instagram - Stories Junho"
                required
              />
              <p className="text-xs text-muted-foreground">
                Este nome serve apenas como identificação interna do link de rastreamento.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t">
              <Switch
                id="active"
                checked={campaign.active || false}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="active">Link de rastreamento Ativo</Label>
            </div>
          </TabsContent>

          {/* Integração e Link */}
          <TabsContent value="integration" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Integração e Link</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="custom_message">Mensagem personalizada</Label>
                <Textarea
                  id="custom_message"
                  name="custom_message"
                  value={campaign.custom_message || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: Olá! Vi seu interesse no nosso produto..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Essa mensagem será enviada automaticamente quando o lead clicar para conversar.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="event_type">Tipo de Evento</Label>
                <Select
                  value={campaign.event_type || 'lead'}
                  onValueChange={handleEventTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contact">Contato</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="page_view">Visualização de Página</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="whatsapp_number">Número do WhatsApp</Label>
                <Input
                  id="whatsapp_number"
                  name="whatsapp_number"
                  value={campaign.whatsapp_number || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: 5511999887766"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pixel_id">ID do Facebook Pixel</Label>
                <Input
                  id="pixel_id"
                  name="pixel_id"
                  value={campaign.pixel_id || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: 123456789012345"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="facebook_access_token">Facebook Access Token</Label>
                <Input
                  id="facebook_access_token"
                  name="facebook_access_token"
                  type="password"
                  value={campaign.facebook_access_token || ''}
                  onChange={handleInputChange}
                  placeholder="Ex: EAABwzLixn..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pixel_integration_type">Integração do Pixel</Label>
                <Select
                  value={campaign.pixel_integration_type || 'direct'}
                  onValueChange={handlePixelIntegrationTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de integração" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direto</SelectItem>
                    <SelectItem value="form">Formulário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="baseUrl">URL Base</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => onBaseUrlChange(e.target.value)}
                  placeholder="https://seusite.com"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            {mode === 'add' ? 'Adicionar' : 'Atualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignForm;

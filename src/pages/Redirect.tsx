
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { togglePixelDebug } from '@/lib/fbPixel';
import BrandingSection from '@/components/BrandingSection';
import LoadingScreen from '@/components/LoadingScreen';
import ContactForm from '@/components/ContactForm';
import { useCampaignData } from '@/hooks/useCampaignData';

const Redirect = () => {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');
  const debug = searchParams.get('debug') === 'true';
  
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorState, setErrorState] = useState<string | null>(null);
  const redirectExecuted = useRef(false);

  const {
    campaign,
    isLoading,
    error,
    companyBranding,
    handleFormSubmit
  } = useCampaignData(campaignId, debug);

  const handleDirectWhatsAppRedirect = async () => {
    if (!campaign || redirectExecuted.current || !campaignId) return;
    
    redirectExecuted.current = true;
    console.log('🔄 [REDIRECT] Iniciando redirecionamento SERVER-SIDE...');
    
    setShowLoadingScreen(true);
    
    // Simular carregamento por 1 segundo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Gerar tracking ID único
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let trackingId = '';
      for (let i = 0; i < 6; i++) {
        trackingId += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Coletar UTMs da URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams = new URLSearchParams();
      
      // Copiar todos os parâmetros UTM e de ads
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 
       'fbclid', 'gclid', 'ctwa_clid', 'source_url', 'source_id',
       'ad_id', 'adset_id', 'campaign_id'].forEach(param => {
        const value = urlParams.get(param);
        if (value) utmParams.set(param, value);
      });

      // Construir URL do redirect handler
      const SUPABASE_URL = 'https://bwicygxyhkdgrypqrijo.supabase.co';
      const redirectUrl = `${SUPABASE_URL}/functions/v1/redirect-handler?t=${trackingId}&id=${campaignId}&${utmParams.toString()}`;
      
      console.log('↗️ [REDIRECT] Redirecionando para:', redirectUrl);
      
      // Redirecionar (o edge function fará o resto)
      window.location.href = redirectUrl;
      
    } catch (err) {
      console.error('❌ [REDIRECT] Erro no redirecionamento:', err);
      setErrorState('Erro ao processar redirecionamento. Por favor, tente novamente.');
      setShowLoadingScreen(false);
    }
  };

  useEffect(() => {
    // Handle direct WhatsApp redirect - só executar uma vez quando a campanha for carregada
    if (campaign && 
        campaign.redirect_type === 'whatsapp' && 
        !isLoading && 
        !redirectExecuted.current) {
      
      handleDirectWhatsAppRedirect();
    }
  }, [campaign, isLoading, handleDirectWhatsAppRedirect]);

  const onFormSubmit = async (phone: string, name: string) => {
    console.log('📝 [REDIRECT] Envio de formulário iniciado para:', { phone, name, campaignId });
    setLoading(true);
    try {
      await handleFormSubmit(phone, name);
      console.log('✅ [REDIRECT] Formulário processado com sucesso');
    } catch (err) {
      console.error('❌ [REDIRECT] Erro no envio do formulário:', err);
      setLoading(false);
    }
  };

  // Function to toggle debug mode
  const handleToggleDebug = () => {
    togglePixelDebug(!debug);
    const newUrl = new URL(window.location.href);
    if (!debug) {
      newUrl.searchParams.set('debug', 'true');
    } else {
      newUrl.searchParams.delete('debug');
    }
    window.history.replaceState({}, '', newUrl.toString());
    window.location.reload();
  };

  // Show loading screen for direct WhatsApp redirect
  if (showLoadingScreen && campaign?.redirect_type === 'whatsapp') {
    return <LoadingScreen progress={loadingProgress} />;
  }

  const displayError = error || errorState;
  
  if (displayError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>Ocorreu um problema ao processar seu redirecionamento</CardDescription>
          </CardHeader>
          <CardContent>{displayError}</CardContent>
          <CardFooter>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Voltar ao Início
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Se ainda está carregando a campanha, mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <BrandingSection
            isLoading={true}
            logo={companyBranding.logo}
            title={companyBranding.title}
            subtitle={companyBranding.subtitle}
            campaignName=""
          />
        </div>
      </div>
    );
  }

  // Se é redirecionamento direto e já está processando, não mostrar o formulário
  if (campaign?.redirect_type === 'whatsapp' && showLoadingScreen) {
    return null;
  }

  // Mostrar formulário para campanhas de formulário ou se não há redirecionamento direto
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <BrandingSection
          isLoading={isLoading}
          logo={companyBranding.logo}
          title={companyBranding.title}
          subtitle={companyBranding.subtitle}
          campaignName={campaign?.name}
        />

        {/* Hidden debug information */}
        <div style={{ display: 'none' }}>
          <div className="mt-2">
            <button 
              className="text-xs text-gray-500 underline"
              onClick={handleToggleDebug}
            >
              {debug ? 'Desativar Debug' : 'Ativar Debug'}
            </button>
          </div>
        </div>
        
        <ContactForm onSubmit={onFormSubmit} loading={loading} />
      </div>
    </div>
  );
};

export default Redirect;

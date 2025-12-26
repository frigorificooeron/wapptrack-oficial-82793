
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import BrandingSection from '@/components/BrandingSection';
import LoadingScreen from '@/components/LoadingScreen';
import { useCampaignLoader } from '@/hooks/useCampaignLoader';

const Redirect = () => {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');
  const debug = searchParams.get('debug') === 'true';
  
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const redirectExecuted = useRef(false);

  const {
    campaign,
    isLoading,
    error
  } = useCampaignLoader(campaignId, debug);

  // Default company branding
  const companyBranding = {
    logo: campaign?.logo_url || "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150&q=80",
    title: campaign?.company_title || "Sua Empresa",
    subtitle: campaign?.company_subtitle || "Sistema de Marketing Digital"
  };

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
    if (campaign && !isLoading && !redirectExecuted.current) {
      handleDirectWhatsAppRedirect();
    }
  }, [campaign, isLoading]);

  // Show loading screen for direct WhatsApp redirect
  if (showLoadingScreen) {
    return <LoadingScreen progress={0} />;
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

  // Redirecionamento sempre acontece automaticamente
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
      </div>
    </div>
  );
};

export default Redirect;

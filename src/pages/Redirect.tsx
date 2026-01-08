
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SUPABASE_URL = 'https://bwicygxyhkdgrypqrijo.supabase.co';

const Redirect = () => {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setError('ID da campanha não encontrado na URL');
      return;
    }

    // Gerar tracking ID único
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let trackingId = '';
    for (let i = 0; i < 6; i++) {
      trackingId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Construir URL do redirect handler
    const redirectUrl = new URL(`${SUPABASE_URL}/functions/v1/redirect-handler`);
    redirectUrl.searchParams.set('t', trackingId);
    redirectUrl.searchParams.set('id', campaignId);

    // Copiar todos os UTMs e parâmetros de tracking
    const urlParams = new URLSearchParams(window.location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
     'fbclid', 'gclid', 'ctwa_clid', 'source_url', 'source_id',
     'ad_id', 'adset_id', 'campaign_id'].forEach(param => {
      const value = urlParams.get(param);
      if (value) redirectUrl.searchParams.set(param, value);
    });

    console.log('🚀 Redirecionando para:', redirectUrl.toString());

    // Redirecionar imediatamente para o edge function
    window.location.href = redirectUrl.toString();
  }, [campaignId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
            <CardDescription>Ocorreu um problema ao processar seu redirecionamento</CardDescription>
          </CardHeader>
          <CardContent>{error}</CardContent>
          <CardFooter>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Voltar ao Início
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading enquanto redireciona
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
};

export default Redirect;

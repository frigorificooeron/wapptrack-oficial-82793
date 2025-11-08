import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function FacebookOAuth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      toast.error(`Erro na autenticação: ${errorDescription || error}`);
      setStatus('error');
      setTimeout(() => navigate('/settings'), 3000);
      return;
    }

    if (!code) {
      toast.error('Código de autenticação não encontrado');
      setStatus('error');
      setTimeout(() => navigate('/settings'), 3000);
      return;
    }

    try {
      setStatus('processing');

      // Chamar edge function para trocar código por access token
      const { data, error: functionError } = await supabase.functions.invoke(
        'facebook-oauth-callback',
        {
          body: { 
            code,
            redirectUri: `${window.location.origin}/auth/facebook/callback`
          }
        }
      );

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao processar autenticação');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setStatus('success');
      toast.success('Conectado com Facebook com sucesso!');
      
      // Redirecionar para settings após 1 segundo
      setTimeout(() => navigate('/settings'), 1000);
      
    } catch (error: any) {
      console.error('Erro no callback OAuth:', error);
      toast.error(error.message || 'Erro ao processar autenticação do Facebook');
      setStatus('error');
      setTimeout(() => navigate('/settings'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Processando autenticação...</h2>
            <p className="text-muted-foreground">Aguarde enquanto conectamos sua conta do Facebook</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">Conectado com sucesso!</h2>
            <p className="text-muted-foreground">Redirecionando para configurações...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Erro na autenticação</h2>
            <p className="text-muted-foreground">Redirecionando para configurações...</p>
          </>
        )}
      </div>
    </div>
  );
}

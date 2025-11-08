import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Facebook, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface FacebookPixel {
  id: string;
  name: string;
}

export default function FacebookMetaSettings() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pixels, setPixels] = useState<FacebookPixel[]>([]);
  const [selectedPixel, setSelectedPixel] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar configurações da empresa para ver se já tem token
      const { data: settings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settings?.facebook_access_token) {
        setAccessToken(settings.facebook_access_token);
        setIsConnected(true);
        await fetchPixels(settings.facebook_access_token);
      }
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPixels = async (token: string) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/adspixels?access_token=${token}`
      );
      const data = await response.json();
      
      if (data.data) {
        setPixels(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar pixels:', error);
      toast.error('Erro ao buscar pixels do Facebook');
    }
  };

  const handleConnect = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
    if (!appId) {
      toast.error('Facebook App ID não configurado');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/facebook/callback`;
    const scope = 'ads_management,ads_read,business_management';
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`;
    
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('company_settings')
        .update({
          facebook_access_token: null,
          facebook_pixel_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      setPixels([]);
      setSelectedPixel('');
      setAccessToken('');
      toast.success('Desconectado do Facebook com sucesso!');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar do Facebook');
    }
  };

  const handleSavePixel = async () => {
    if (!selectedPixel) {
      toast.error('Selecione um pixel');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('company_settings')
        .update({
          facebook_pixel_id: selectedPixel,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Pixel salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar pixel:', error);
      toast.error('Erro ao salvar pixel');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5" />
            Integração com Facebook/Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5" />
          Integração com Facebook/Meta
        </CardTitle>
        <CardDescription>
          Conecte sua conta do Facebook para sincronizar pixels e campanhas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {isConnected ? 'Conectado' : 'Não conectado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected 
                  ? 'Sua conta do Facebook está conectada' 
                  : 'Conecte sua conta para acessar pixels e campanhas'
                }
              </p>
            </div>
          </div>
          
          {isConnected ? (
            <Button variant="outline" onClick={handleDisconnect}>
              Desconectar
            </Button>
          ) : (
            <Button onClick={handleConnect} className="gap-2">
              <Facebook className="h-4 w-4" />
              Conectar com Facebook
            </Button>
          )}
        </div>

        {isConnected && pixels.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="pixel-select">Selecionar Pixel</Label>
              <Select value={selectedPixel} onValueChange={setSelectedPixel}>
                <SelectTrigger id="pixel-select">
                  <SelectValue placeholder="Escolha um pixel do Facebook" />
                </SelectTrigger>
                <SelectContent>
                  {pixels.map((pixel) => (
                    <SelectItem key={pixel.id} value={pixel.id}>
                      {pixel.name} ({pixel.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSavePixel} disabled={!selectedPixel}>
              Salvar Pixel Selecionado
            </Button>
          </div>
        )}

        {isConnected && pixels.length === 0 && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Nenhum pixel encontrado na sua conta do Facebook.
              Crie um pixel no Gerenciador de Eventos do Facebook primeiro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

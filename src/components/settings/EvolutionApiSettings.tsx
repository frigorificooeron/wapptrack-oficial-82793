import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react'; // Adicionado Loader2 e RefreshCw
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { evolutionService } from '@/services/evolutionService';
import { toast } from 'sonner';

const EvolutionApiSettings = () => {
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);
  const [qrError, setQrError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Instance name is configurable, URL comes from Supabase secrets via edge functions
  const EVOLUTION_INSTANCE_NAME = 'Herickson';

  const fetchInstanceStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await evolutionService.getInstanceStatus(EVOLUTION_INSTANCE_NAME);
      if (response.success && response.status === 'open') {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error: any) {
      console.error('Erro ao buscar status da instância:', error);
      setIsConnected(false);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchInstanceStatus();
  }, []);

  const handleGetQRCode = async () => {
    setIsLoadingQR(true);
    setQrError('');
    setQrCode('');

    try {
      const response = await evolutionService.getQRCode(EVOLUTION_INSTANCE_NAME);

      if (response.success) {
        const qrCodeData = response.qrcode;
        if (qrCodeData) {
          setQrCode(qrCodeData);
          setIsConnected(true);
          toast.success('QR Code gerado com sucesso!');
        } else {
          setQrError('QR Code não encontrado na resposta da API');
        }
      } else {
        setQrError(response.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      setQrError(error.message || 'Erro ao gerar QR Code');
    } finally {
      setIsLoadingQR(false);
      fetchInstanceStatus(); // Atualiza o status após tentar gerar QR
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    
    try {
      const response = await evolutionService.disconnectInstance(EVOLUTION_INSTANCE_NAME);

      if (response.success) {
        setIsConnected(false);
        setQrCode("");
        setQrError("");
        toast.success("Desconectado com sucesso!");
      } else {
        toast.error("Erro ao desconectar: " + (response.error || "Erro desconhecido"));
      }
    } catch (error: any) {
      toast.error('Erro ao desconectar: ' + error.message);
    } finally {
      setIsDisconnecting(false);
      fetchInstanceStatus(); // Atualiza o status após tentar desconectar
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>WhatsApp Integration</span>
        </CardTitle>
        <CardDescription>
          Conecte-se ao WhatsApp para automatizar o processo de validação de leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {isLoadingStatus ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                Status da Conexão
              </p>
              <p className="text-sm text-muted-foreground">
                {isLoadingStatus ? 'Carregando...' : isConnected ? 'Conectado ao WhatsApp' : 'Desconectado'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {!isConnected ? (
              <Button 
                onClick={handleGetQRCode} 
                disabled={isLoadingQR || isLoadingStatus}
                className="flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{isLoadingQR ? 'Gerando...' : 'Conectar WhatsApp'}</span>
              </Button>
            ) : (
              <Button 
                onClick={handleDisconnect} 
                disabled={isDisconnecting || isLoadingStatus}
                variant="destructive"
                className="flex items-center space-x-2"
              >
                <WifiOff className="w-4 h-4" />
                <span>{isDisconnecting ? 'Desconectando...' : 'Desconectar'}</span>
              </Button>
            )}
          </div>
        </div>

        {(qrCode || isLoadingQR || qrError) && (
          <QRCodeDisplay
            qrCode={qrCode}
            isLoading={isLoadingQR}
            error={qrError}
            onRefresh={handleGetQRCode}
          />
        )}

        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Como usar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Clique em "Conectar WhatsApp" para gerar o QR Code</li>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Vá em Configurações → Aparelhos conectados</li>
            <li>Escaneie o QR Code que aparecerá na tela</li>
            <li>Aguarde a confirmação da conexão</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvolutionApiSettings;



import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      instanceName, 
      phone, 
      message, 
      leadId, 
      mediaType, 
      mediaBase64, 
      mimeType, 
      fileName, 
      caption 
    } = await req.json();
    
    console.log('📤 Enviando mensagem:', { 
      instanceName, 
      phone, 
      hasMessage: !!message, 
      mediaType, 
      leadId 
    });

    if (!instanceName || !phone || !leadId) {
      throw new Error('Parâmetros obrigatórios: instanceName, phone, leadId');
    }

    if (!message && !mediaBase64) {
      throw new Error('Mensagem ou mídia é obrigatória');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar instância ativa
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_name', instanceName)
      .eq('status', 'connected')
      .single();

    if (instanceError || !instance) {
      console.error('❌ Instância não encontrada ou desconectada:', instanceError);
      throw new Error('Instância WhatsApp não disponível');
    }

    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!evolutionApiKey) {
      throw new Error('EVOLUTION_API_KEY não configurada');
    }

    let evolutionData: any;
    let messageText = message;

    // Enviar mensagem via Evolution API
    if (mediaBase64) {
      // Enviar mídia
      let endpoint = '';
      let body: any = {
        number: phone,
      };

      if (mediaType === 'image') {
        endpoint = 'sendMedia';
        body = {
          number: phone,
          mediatype: 'image',
          mimetype: mimeType || 'image/jpeg',
          caption: caption || '',
          media: mediaBase64,
          fileName: fileName || 'image.jpg',
        };
        messageText = caption || '[Imagem]';
      } else if (mediaType === 'video') {
        endpoint = 'sendMedia';
        body = {
          number: phone,
          mediatype: 'video',
          mimetype: mimeType || 'video/mp4',
          caption: caption || '',
          media: mediaBase64,
          fileName: fileName || 'video.mp4',
        };
        messageText = caption || '[Vídeo]';
      } else if (mediaType === 'audio') {
        endpoint = 'sendWhatsAppAudio';
        body = {
          number: phone,
          audioMessage: {
            audio: mediaBase64,
          },
        };
        messageText = '[Áudio]';
      }

      const evolutionUrl = `${instance.base_url}/message/${endpoint}/${instanceName}`;
      console.log('🌐 Chamando Evolution API (mídia):', evolutionUrl, { mediaType });

      const evolutionResponse = await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify(body),
      });

      if (!evolutionResponse.ok) {
        const errorText = await evolutionResponse.text();
        console.error('❌ Erro na Evolution API:', errorText);
        throw new Error(`Evolution API error: ${evolutionResponse.status}`);
      }

      evolutionData = await evolutionResponse.json();
      console.log('✅ Resposta Evolution API (mídia):', evolutionData);
    } else {
      // Enviar texto
      const evolutionUrl = `${instance.base_url}/message/sendText/${instanceName}`;
      console.log('🌐 Chamando Evolution API (texto):', evolutionUrl);

      const evolutionResponse = await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
        body: JSON.stringify({
          number: phone,
          text: message,
        }),
      });

      if (!evolutionResponse.ok) {
        const errorText = await evolutionResponse.text();
        console.error('❌ Erro na Evolution API:', errorText);
        throw new Error(`Evolution API error: ${evolutionResponse.status}`);
      }

      evolutionData = await evolutionResponse.json();
      console.log('✅ Resposta Evolution API (texto):', evolutionData);
    }

    // Salvar mensagem no banco de dados
    const { data: savedMessage, error: saveError } = await supabase
      .from('lead_messages')
      .insert({
        lead_id: leadId,
        message_text: messageText,
        is_from_me: true,
        status: 'sent',
        whatsapp_message_id: evolutionData.key?.id || null,
        instance_name: instanceName,
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Erro ao salvar mensagem:', saveError);
      throw saveError;
    }

    console.log('✅ Mensagem salva:', savedMessage);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: savedMessage,
        evolutionResponse: evolutionData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error)?.message || 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

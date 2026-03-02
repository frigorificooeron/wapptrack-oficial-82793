
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { fetchProfilePicture } from './profilePictureHandler.ts';

// Limpar caracteres invisíveis do texto (nova função)
export function cleanMessageFromInvisibleToken(message: string): string {
  // Remove todos os caracteres zero-width
  return message.replace(/[\u200B\u200C\u200D\uFEFF]+/g, '');
}

// 🔐 Decodifica token invisível de caracteres zero-width
export function decodeInvisibleToken(text: string): string | null {
  const reverseMap: Record<string, string> = {
    '\u200B': '0',
    '\u200C': '1',
    '\u200D': '2',
    '\u200B\u200B': '3',
    '\u200B\u200C': '4',
    '\u200B\u200D': '5',
    '\u200C\u200B': '6',
    '\u200C\u200C': '7',
    '\u200C\u200D': '8',
    '\u200D\u200B': '9',
    '\u200D\u200C': 'A',
    '\u200D\u200D': 'B',
    '\u200B\u200B\u200B': 'C',
    '\u200B\u200B\u200C': 'D',
    '\u200B\u200B\u200D': 'E',
    '\u200B\u200C\u200B': 'F',
    '\u200B\u200C\u200C': 'G',
    '\u200B\u200C\u200D': 'H',
    '\u200B\u200D\u200B': 'I',
    '\u200B\u200D\u200C': 'J',
    '\u200B\u200D\u200D': 'K',
    '\u200C\u200B\u200B': 'L',
    '\u200C\u200B\u200C': 'M',
    '\u200C\u200B\u200D': 'N',
    '\u200C\u200C\u200B': 'O',
    '\u200C\u200C\u200C': 'P',
    '\u200C\u200C\u200D': 'Q',
    '\u200C\u200D\u200B': 'R',
    '\u200C\u200D\u200C': 'S',
    '\u200C\u200D\u200D': 'T',
    '\u200D\u200B\u200B': 'U',
    '\u200D\u200B\u200C': 'V',
    '\u200D\u200B\u200D': 'W',
    '\u200D\u200C\u200B': 'X',
    '\u200D\u200C\u200C': 'Y',
    '\u200D\u200D\u200B': 'Z'
  };
  
  const zeroWidthChars = text.match(/[\u200B\u200C\u200D]+/g);
  if (!zeroWidthChars) return null;
  
  let decoded = '';
  let i = 0;
  const fullZeroWidth = zeroWidthChars.join('');
  
  while (i < fullZeroWidth.length) {
    const triple = fullZeroWidth.slice(i, i + 3);
    if (reverseMap[triple]) {
      decoded += reverseMap[triple];
      i += 3;
      continue;
    }
    
    const double = fullZeroWidth.slice(i, i + 2);
    if (reverseMap[double]) {
      decoded += reverseMap[double];
      i += 2;
      continue;
    }
    
    const single = fullZeroWidth[i];
    if (reverseMap[single]) {
      decoded += reverseMap[single];
      i += 1;
      continue;
    }
    
    i++;
  }
  
  return decoded || null;
}

// ✅ FUNÇÃO ATUALIZADA PARA PROCESSAR MENSAGENS DE CLIENTE (AGORA SALVA A MENSAGEM)
export const processClientMessage = async (params: {
  supabase: any;
  message: any;
  realPhoneNumber: string;
  matchedLeads: any[];
  messageContent: string;
}) => {
  const { supabase, message, realPhoneNumber, matchedLeads, messageContent } = params;
  
  console.log(`📱 Processing client message from: ${realPhoneNumber}`);
  
  // 👻 Tentar decodificar token invisível
  const invisibleToken = decodeInvisibleToken(messageContent);
  if (invisibleToken) {
    console.log(`👻 Token invisível detectado: ${invisibleToken}`);
  }
  
  // Primeiro, tentar conversão de pending_lead (fluxo formulário)
  const { handlePendingLeadConversion } = await import('./pendingLeadHandler.ts');
  await handlePendingLeadConversion(
    supabase,
    realPhoneNumber,
    messageContent,
    message.key?.id || '',
    message.status || 'received',
    message.pushName,
    invisibleToken || undefined
  );
  
  // Atualizar leads existentes com mensagem e data de contato
  for (const lead of matchedLeads) {
    try {
      // 📸 Buscar foto do perfil do WhatsApp via handler reutilizável
      let profilePictureUrl = lead.profile_picture_url;
      
      if (!profilePictureUrl) {
        console.log(`📸 [CLIENT MESSAGE] Lead ${lead.id} sem foto, buscando...`);
        profilePictureUrl = await fetchProfilePicture(supabase, realPhoneNumber);
      }
      
      // Limpar mensagem de tokens invisíveis antes de salvar
      const cleanedMessage = cleanMessageFromInvisibleToken(messageContent);
      
      const updateData: any = {
        last_contact_date: new Date().toISOString(),
        evolution_message_id: message.key?.id,
        evolution_status: message.status,
        last_message: cleanedMessage,
        profile_picture_url: profilePictureUrl,
      };

      // Se é a primeira mensagem do lead, definir como initial_message também
      if (!lead.initial_message) {
        updateData.initial_message = `Primeira mensagem: ${cleanedMessage}`;
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) {
        console.error(`❌ Error updating lead ${lead.id}:`, updateError);
      } else {
        console.log(`✅ Updated lead ${lead.id} with message: ${cleanedMessage.substring(0, 50)}...`);
      }

      // Salvar mensagem no histórico de chat (mensagem limpa, evitar duplicatas)
      const clientMsgId = message.key?.id;
      let skipClientInsert = false;
      if (clientMsgId) {
        const { data: existingMsg } = await supabase
          .from('lead_messages')
          .select('id')
          .eq('whatsapp_message_id', clientMsgId)
          .limit(1);
        if (existingMsg && existingMsg.length > 0) {
          skipClientInsert = true;
          console.log(`⏭️ Client message ${clientMsgId} already exists, skipping`);
        }
      }

      if (!skipClientInsert) {
        const { error: messageError } = await supabase
          .from('lead_messages')
          .insert({
            lead_id: lead.id,
            message_text: cleanedMessage,
            is_from_me: false,
            whatsapp_message_id: clientMsgId,
            instance_name: message.key?.remoteJid?.split('@')[0] || null,
          });

        if (messageError) {
          console.error(`❌ Error saving message for lead ${lead.id}:`, messageError);
        } else {
          console.log(`✅ Message saved in chat history for lead ${lead.id}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing lead ${lead.id}:`, error);
    }
  }
};

// ✅ FUNÇÃO ATUALIZADA PARA PROCESSAR MENSAGENS COMERCIAIS (SEM ATUALIZAR last_message)
export const processComercialMessage = async (params: {
  supabase: any;
  message: any;
  realPhoneNumber: string;
  matchedLeads: any[];
  messageContent: string;
}) => {
  const { supabase, message, realPhoneNumber, matchedLeads, messageContent } = params;
  
  console.log(`💼 Processing commercial message to: ${realPhoneNumber}`);
  
  // Verificar palavras-chave de conversão e cancelamento
  for (const lead of matchedLeads) {
    const campaign = lead.campaigns;
    let newStatus = lead.status;
    
    if (campaign?.conversion_keywords) {
      const hasConversionKeyword = campaign.conversion_keywords.some((keyword: string) =>
        messageContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasConversionKeyword) {
        newStatus = 'converted';
        console.log(`🎉 Conversion detected for lead ${lead.id}`);
      }
    }
    
    if (campaign?.cancellation_keywords) {
      const hasCancellationKeyword = campaign.cancellation_keywords.some((keyword: string) =>
        messageContent.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasCancellationKeyword) {
        newStatus = 'cancelled';
        console.log(`❌ Cancellation detected for lead ${lead.id}`);
      }
    }
    
    // Atualizar lead APENAS com data de contato e status (preservar primeira mensagem)
    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          last_contact_date: new Date().toISOString(),
          evolution_message_id: message.key?.id,
          evolution_status: message.status,
          status: newStatus,
        })
        .eq('id', lead.id);

      if (updateError) {
        console.error(`❌ Error updating lead ${lead.id}:`, updateError);
      } else {
        console.log(`✅ Updated lead ${lead.id} with status: ${newStatus} (preserving first message)`);
      }

      // Salvar mensagem comercial no histórico de chat (evitar duplicata se já salva pelo evolution-send-message)
      const whatsappMsgId = message.key?.id;
      let skipInsert = false;
      if (whatsappMsgId) {
        const { data: existing } = await supabase
          .from('lead_messages')
          .select('id')
          .eq('whatsapp_message_id', whatsappMsgId)
          .limit(1);
        if (existing && existing.length > 0) {
          skipInsert = true;
          console.log(`⏭️ Message ${whatsappMsgId} already exists, skipping duplicate insert`);
        }
      }

      if (!skipInsert) {
        const { error: messageError } = await supabase
          .from('lead_messages')
          .insert({
            lead_id: lead.id,
            message_text: messageContent,
            is_from_me: true,
            whatsapp_message_id: whatsappMsgId,
            instance_name: message.key?.remoteJid?.split('@')[0] || null,
          });

        if (messageError) {
          console.error(`❌ Error saving commercial message for lead ${lead.id}:`, messageError);
        } else {
          console.log(`✅ Commercial message saved in chat history for lead ${lead.id}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing lead ${lead.id}:`, error);
    }
  }
};

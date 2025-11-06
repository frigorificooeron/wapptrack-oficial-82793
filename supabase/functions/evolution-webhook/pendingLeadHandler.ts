import { getDeviceDataByPhone } from './deviceDataHandler.ts';
import { handleEnhancedPendingLeadConversion } from './enhancedPendingLeadHandler.ts';

export const handlePendingLeadConversion = async (supabase: any, phone: string, messageText: string, messageId: string, status: string, contactName?: string, invisibleToken?: string) => {
  console.log(`🔄 [PENDING LEAD] handlePendingLeadConversion - Redirecionando para versão melhorada`);
  
  if (invisibleToken) {
    console.log(`👻 [PENDING LEAD] Token invisível recebido: ${invisibleToken}`);
  }
  
  // 🆕 USAR O HANDLER MELHORADO COM MÉTODOS 1 + 2
  return await handleEnhancedPendingLeadConversion(
    supabase, 
    phone, 
    messageText, 
    messageId, 
    status, 
    contactName,
    invisibleToken
  );
};

// ✅ FUNÇÃO ATUALIZADA PARA USAR A FUNÇÃO SUPABASE
export const convertPendingLeadToLead = async (supabase: any, pendingLead: any) => {
  console.log('🔄 [PENDING LEAD] convertPendingLeadToLead - Convertendo usando função Supabase:', pendingLead.id);
  
  try {
    // Usar a nova função Supabase para conversão segura
    const { data: result, error } = await supabase.rpc('convert_pending_lead_secure', {
      pending_lead_id: pendingLead.id
    });

    if (error) {
      console.error('❌ [PENDING LEAD] Erro ao executar função Supabase:', error);
      return false;
    }

    console.log('📋 [PENDING LEAD] Resultado da conversão:', result);

    if (result?.success) {
      console.log('✅ [PENDING LEAD] Conversão automática via função Supabase bem-sucedida');
      return true;
    } else {
      console.error('❌ [PENDING LEAD] Falha na conversão via função Supabase:', result?.error);
      return false;
    }
  } catch (error) {
    console.error('❌ [PENDING LEAD] Erro em convertPendingLeadToLead:', error);
    return false;
  }
};

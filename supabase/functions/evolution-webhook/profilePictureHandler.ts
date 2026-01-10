// 📸 Handler reutilizável para buscar foto de perfil do WhatsApp via Evolution API

const EVOLUTION_BASE_URL = "https://evoapi.workidigital.tech";

export interface ProfilePictureResult {
  url: string | null;
  error?: string;
}

/**
 * Busca a foto de perfil do WhatsApp para um número de telefone
 * 
 * @param supabase - Cliente Supabase
 * @param phone - Número de telefone (pode conter @s.whatsapp.net)
 * @param preferredInstanceName - Nome da instância preferida (opcional)
 * @returns URL da foto de perfil ou null
 */
export async function fetchProfilePicture(
  supabase: any,
  phone: string,
  preferredInstanceName?: string
): Promise<string | null> {
  console.log(`📸 [PROFILE PICTURE] Iniciando busca de foto para: ${phone}`);
  
  try {
    // Limpar número de telefone
    const cleanPhone = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    console.log(`📸 [PROFILE PICTURE] Telefone limpo: ${cleanPhone}`);
    
    // Buscar API key
    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    if (!apiKey) {
      console.error('❌ [PROFILE PICTURE] EVOLUTION_API_KEY não configurada');
      return null;
    }
    
    // Buscar instância conectada
    let instanceName: string | null = null;
    let baseUrl: string = EVOLUTION_BASE_URL;
    
    // Se foi passada uma instância preferida, tentar usá-la primeiro
    if (preferredInstanceName) {
      const { data: preferredInstance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, base_url, status')
        .eq('instance_name', preferredInstanceName)
        .eq('status', 'connected')
        .single();
      
      if (preferredInstance) {
        instanceName = preferredInstance.instance_name;
        baseUrl = preferredInstance.base_url || EVOLUTION_BASE_URL;
        console.log(`📸 [PROFILE PICTURE] Usando instância preferida: ${instanceName}`);
      }
    }
    
    // Se não encontrou instância preferida, buscar qualquer uma conectada
    if (!instanceName) {
      const { data: instances, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, base_url')
        .eq('status', 'connected')
        .limit(1);
      
      if (instanceError || !instances || instances.length === 0) {
        console.warn('⚠️ [PROFILE PICTURE] Nenhuma instância WhatsApp conectada encontrada');
        return null;
      }
      
      instanceName = instances[0].instance_name;
      baseUrl = instances[0].base_url || EVOLUTION_BASE_URL;
      console.log(`📸 [PROFILE PICTURE] Usando primeira instância conectada: ${instanceName}`);
    }
    
    // Garantir que estamos usando a URL correta da API
    if (baseUrl.includes('evolutionapi.workidigital.tech')) {
      baseUrl = EVOLUTION_BASE_URL;
      console.log(`📸 [PROFILE PICTURE] URL corrigida para: ${baseUrl}`);
    }
    
    // Fazer requisição para a Evolution API
    const url = `${baseUrl}/chat/fetchProfilePictureUrl/${instanceName}`;
    console.log(`📸 [PROFILE PICTURE] Chamando API: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({ number: cleanPhone })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [PROFILE PICTURE] Erro na API (${response.status}): ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    const profilePictureUrl = data.profilePictureUrl || data.picture || null;
    
    if (profilePictureUrl) {
      console.log(`✅ [PROFILE PICTURE] Foto encontrada: ${profilePictureUrl.substring(0, 50)}...`);
    } else {
      console.log(`⚠️ [PROFILE PICTURE] Nenhuma foto encontrada para: ${cleanPhone}`);
    }
    
    return profilePictureUrl;
    
  } catch (error) {
    console.error(`❌ [PROFILE PICTURE] Erro ao buscar foto:`, error);
    return null;
  }
}

/**
 * Busca e atualiza a foto de perfil de um lead no banco de dados
 * 
 * @param supabase - Cliente Supabase
 * @param leadId - ID do lead
 * @param phone - Número de telefone
 * @param instanceName - Nome da instância (opcional)
 * @returns true se atualizou, false caso contrário
 */
export async function fetchAndUpdateLeadProfilePicture(
  supabase: any,
  leadId: string,
  phone: string,
  instanceName?: string
): Promise<boolean> {
  console.log(`📸 [UPDATE PROFILE] Atualizando foto do lead: ${leadId}`);
  
  try {
    const profilePictureUrl = await fetchProfilePicture(supabase, phone, instanceName);
    
    if (!profilePictureUrl) {
      console.log(`⚠️ [UPDATE PROFILE] Nenhuma foto para atualizar no lead: ${leadId}`);
      return false;
    }
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({ profile_picture_url: profilePictureUrl })
      .eq('id', leadId);
    
    if (updateError) {
      console.error(`❌ [UPDATE PROFILE] Erro ao atualizar lead ${leadId}:`, updateError);
      return false;
    }
    
    console.log(`✅ [UPDATE PROFILE] Foto atualizada com sucesso para lead: ${leadId}`);
    return true;
    
  } catch (error) {
    console.error(`❌ [UPDATE PROFILE] Erro ao atualizar foto do lead:`, error);
    return false;
  }
}

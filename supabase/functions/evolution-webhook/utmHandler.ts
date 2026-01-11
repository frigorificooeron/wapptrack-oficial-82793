
import { createPhoneSearchVariations } from './phoneVariations.ts';

/**
 * Busca UTMs de cliques registrados em campaign_clicks
 * Procura cliques recentes (últimos 30 minutos) não convertidos
 */
export const getUtmsFromDirectClick = async (supabase: any, phone: string): Promise<{
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  click_id?: string;
  tracking_id?: string;
  fbclid?: string;
  gclid?: string;
  ctwa_clid?: string;
} | null> => {
  console.log(`🔍 [UTM HANDLER] Buscando UTMs para telefone: ${phone}`);
  
  try {
    // Criar variações do telefone para busca flexível
    const phoneVariations = createPhoneSearchVariations(phone);
    console.log(`📞 [UTM HANDLER] Variações de telefone: ${JSON.stringify(phoneVariations)}`);
    
    // Calcular timestamp de 30 minutos atrás
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    // Buscar cliques recentes não convertidos
    const { data: clicks, error } = await supabase
      .from('campaign_clicks')
      .select('*')
      .eq('converted', false)
      .gte('clicked_at', thirtyMinutesAgo)
      .order('clicked_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error(`❌ [UTM HANDLER] Erro ao buscar campaign_clicks:`, error);
      return null;
    }

    if (!clicks || clicks.length === 0) {
      console.log(`⚠️ [UTM HANDLER] Nenhum clique recente encontrado`);
      return null;
    }

    console.log(`📊 [UTM HANDLER] ${clicks.length} cliques recentes encontrados, analisando...`);

    // Encontrar clique com melhor correspondência
    // Primeiro por token (se tiver), depois por tracking_id (se tiver)
    const matchedClick = clicks[0]; // Por enquanto, usar o mais recente
    
    if (matchedClick) {
      console.log(`✅ [UTM HANDLER] Clique encontrado:`, {
        click_id: matchedClick.id,
        tracking_id: matchedClick.tracking_id,
        utm_source: matchedClick.utm_source,
        utm_medium: matchedClick.utm_medium,
        utm_campaign: matchedClick.utm_campaign,
        clicked_at: matchedClick.clicked_at
      });

      return {
        utm_source: matchedClick.utm_source,
        utm_medium: matchedClick.utm_medium,
        utm_campaign: matchedClick.utm_campaign,
        utm_content: matchedClick.utm_content,
        utm_term: matchedClick.utm_term,
        click_id: matchedClick.id,
        tracking_id: matchedClick.tracking_id,
        fbclid: matchedClick.fbclid,
        gclid: matchedClick.gclid,
        ctwa_clid: matchedClick.ctwa_clid
      };
    }

    console.log(`⚠️ [UTM HANDLER] Nenhum clique correspondente encontrado`);
    return null;

  } catch (err) {
    console.error(`❌ [UTM HANDLER] Erro crítico:`, err);
    return null;
  }
};

/**
 * Busca clique por token específico
 */
export const getClickByToken = async (supabase: any, token: string): Promise<{
  id: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  tracking_id?: string;
  fbclid?: string;
  gclid?: string;
  ctwa_clid?: string;
  campaign_id?: string;
} | null> => {
  console.log(`🔍 [UTM HANDLER] Buscando clique por token: ${token}`);
  
  try {
    const { data: click, error } = await supabase
      .from('campaign_clicks')
      .select('*')
      .eq('token', token)
      .eq('converted', false)
      .single();

    if (error || !click) {
      console.log(`⚠️ [UTM HANDLER] Clique não encontrado para token: ${token}`);
      return null;
    }

    console.log(`✅ [UTM HANDLER] Clique encontrado por token:`, {
      id: click.id,
      campaign_id: click.campaign_id,
      tracking_id: click.tracking_id
    });

    return {
      id: click.id,
      utm_source: click.utm_source,
      utm_medium: click.utm_medium,
      utm_campaign: click.utm_campaign,
      utm_content: click.utm_content,
      utm_term: click.utm_term,
      tracking_id: click.tracking_id,
      fbclid: click.fbclid,
      gclid: click.gclid,
      ctwa_clid: click.ctwa_clid,
      campaign_id: click.campaign_id
    };

  } catch (err) {
    console.error(`❌ [UTM HANDLER] Erro ao buscar por token:`, err);
    return null;
  }
};

/**
 * Marca um clique como convertido
 */
export const markClickAsConverted = async (supabase: any, clickId: string, leadId?: string): Promise<boolean> => {
  console.log(`✅ [UTM HANDLER] Marcando clique ${clickId} como convertido`);
  
  try {
    const updateData: any = {
      converted: true,
      converted_at: new Date().toISOString()
    };

    if (leadId) {
      updateData.lead_id = leadId;
    }

    const { error } = await supabase
      .from('campaign_clicks')
      .update(updateData)
      .eq('id', clickId);

    if (error) {
      console.error(`❌ [UTM HANDLER] Erro ao marcar clique como convertido:`, error);
      return false;
    }

    console.log(`✅ [UTM HANDLER] Clique ${clickId} marcado como convertido`);
    return true;

  } catch (err) {
    console.error(`❌ [UTM HANDLER] Erro crítico ao converter clique:`, err);
    return false;
  }
};

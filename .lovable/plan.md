
# Plano Completo para App 100% Profissional

Este plano aborda **segurança, configuração, performance e qualidade de código** para transformar seu sistema em uma solução de nível empresarial.

---

## Resumo Executivo

Identifiquei **5 áreas críticas** que precisam de atenção para o funcionamento profissional completo:

| Área | Problemas Encontrados | Prioridade |
|------|----------------------|------------|
| Segurança do Banco | 6 políticas RLS muito permissivas | Alta |
| Vulnerabilidades de Funções | 3 funções SECURITY DEFINER sem proteção | Alta |
| URLs Hardcoded | 4 arquivos com URLs fixas que deveriam usar secrets | Média |
| Configuração do Supabase | OTP longo, senhas vazadas sem proteção | Média |
| Logs com Dados Sensíveis | IP, user agent, fbclid expostos em logs | Média |

---

## Fase 1: Correções de Segurança (Crítico)

### 1.1 Corrigir Políticas RLS Permissivas

**Problema**: Tabelas `campaign_clicks`, `pending_leads`, `utm_sessions`, `ctwa_tracking`, `utm_clicks`, `campaign_tokens` têm políticas `WITH CHECK (true)` ou `USING (true)` permitindo acesso irrestrito.

**Correções**:

- **campaign_clicks**: Restringir SELECT/UPDATE para verificar ownership via campaigns
- **pending_leads**: Restringir INSERT para validar campaign_id pertence ao usuário ou webhook
- **ctwa_tracking/utm_sessions/utm_clicks**: Manter INSERT público (necessário para tracking) mas proteger dados sensíveis

### 1.2 Proteger Funções SECURITY DEFINER

**Problema**: Funções `get_token_permissions`, `deactivate_shared_token`, `create_shared_access_token` não têm `SET search_path`, permitindo ataques de privilege escalation.

**Correção**:
```sql
ALTER FUNCTION get_token_permissions(VARCHAR) SET search_path = public;
ALTER FUNCTION deactivate_shared_token(UUID) SET search_path = public;
ALTER FUNCTION create_shared_access_token(...) SET search_path = public;
```

### 1.3 Corrigir Autenticação da Edge Function facebook-conversions

**Problema**: Linha 145 usa `getUser()` sem token, causando falhas de autenticação.

**Correção**: Extrair token do header e passar para `getUser(token)`.

---

## Fase 2: Configuração de URLs e Secrets

### 2.1 Remover URLs Hardcoded da Evolution API

**Arquivos afetados**:
- `profilePictureHandler.ts` (linha 3): URL hardcoded
- `EvolutionApiSettings.tsx` (linha 20): URL hardcoded

**Correção**: Usar `EVOLUTION_API_URL` secret em todos os lugares.

### 2.2 Atualizar profilePictureHandler.ts

Substituir:
```typescript
const EVOLUTION_BASE_URL = "https://evoapi.workidigital.tech";
```
Por:
```typescript
const EVOLUTION_BASE_URL = Deno.env.get('EVOLUTION_API_URL') || "https://evoapi.workidigital.tech";
```

---

## Fase 3: Logs e Privacidade (LGPD/GDPR)

### 3.1 Reduzir Logging de Dados Sensíveis

**Problema**: `redirect-handler` loga IPs, user agents e fbclid em produção.

**Correção**: Implementar log levels e hash de identificadores:

```typescript
const LOG_LEVEL = Deno.env.get('LOG_LEVEL') || 'info';

// Hash para logs de debug
function hashForLogging(value: string): string {
  const hash = crypto.subtle.digestSync('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
}

console.log('🔍 [REDIRECT] Click processado:', {
  hasIp: !!ipAddress,
  city: geoData.city,  // OK - não é PII isolado
  country: geoData.country,
  utmSource,  // OK - não é dado pessoal
  hasFbclid: !!fbclid  // Não logar valor real
});
```

---

## Fase 4: Configurações do Supabase

### 4.1 Habilitar Proteção contra Senhas Vazadas

**Ação**: No dashboard Supabase, ir em Authentication > Settings e habilitar "Leaked Password Protection".

### 4.2 Reduzir Tempo de Expiração do OTP

**Ação**: Reduzir de 3600s para 600s (10 minutos) nas configurações de autenticação.

### 4.3 Atualizar Versão do Postgres

**Ação**: Verificar se há patches disponíveis e aplicar upgrade no dashboard Supabase.

---

## Fase 5: Melhorias de Código e Arquitetura

### 5.1 Finalizar Migração do directLeadHandler

O arquivo ainda tem ~160 linhas e pode importar as funções modulares já criadas:

```typescript
// directLeadHandler.ts - Versão otimizada
import { resolveUtmsFromMessage, markClickConverted } from './utmResolver.ts';
import { resolveCampaign } from './campaignResolver.ts';
import { createLead, checkExistingLead } from './leadCreator.ts';
```

### 5.2 Remover Código Duplicado entre handlers.ts e módulos

O arquivo `handlers.ts` agora apenas re-exporta. Verificar se todos os imports nos outros arquivos estão atualizados.

---

## Fase 6: Checklist de Deploy

### Antes de ir para produção:

- [ ] Migração SQL com correções de search_path executada
- [ ] Políticas RLS corrigidas aplicadas
- [ ] Secret `EVOLUTION_API_URL` configurada no Supabase
- [ ] Secret `LOG_LEVEL` configurada como "info" (ou "warn" em produção)
- [ ] Edge functions re-deployadas
- [ ] Proteção de senhas vazadas habilitada
- [ ] Tempo de OTP reduzido
- [ ] Postgres atualizado

---

## Arquivos a Serem Modificados

| Arquivo | Tipo de Alteração |
|---------|------------------|
| Nova migração SQL | Corrigir RLS e search_path |
| `profilePictureHandler.ts` | Usar secret EVOLUTION_API_URL |
| `facebook-conversions/index.ts` | Corrigir autenticação |
| `redirect-handler/index.ts` | Reduzir logging sensível |
| `EvolutionApiSettings.tsx` | Usar secret ou buscar do backend |

---

## Detalhes Técnicos

### Migração SQL Necessária

```sql
-- 1. Corrigir search_path das funções SECURITY DEFINER
ALTER FUNCTION public.get_token_permissions(VARCHAR) SET search_path = public;
ALTER FUNCTION public.deactivate_shared_token(UUID) SET search_path = public;
ALTER FUNCTION public.create_shared_access_token(VARCHAR, TEXT, JSONB, TIMESTAMPTZ) SET search_path = public;

-- 2. Melhorar política de campaign_clicks para SELECT
DROP POLICY IF EXISTS "Allow read for all users" ON campaign_clicks;
CREATE POLICY "Users view clicks from their campaigns" ON campaign_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c 
      WHERE c.id::text = campaign_clicks.campaign_id::text 
      AND c.user_id = auth.uid()
    )
    OR (auth.jwt() ->> 'role' = 'service_role')
  );

-- 3. Melhorar política de pending_leads para INSERT
DROP POLICY IF EXISTS "Users insert pending leads" ON pending_leads;
CREATE POLICY "Service role or webhook insert pending leads" ON pending_leads
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'role' = 'service_role')
  );
```

### Edge Function facebook-conversions - Correção

```typescript
// Linha 140-145 corrigida
const token = authHeader.replace('Bearer ', '');
const { data: userData, error: userError } = await supabase.auth.getUser(token);

if (userError || !userData?.user) {
  console.error('Authentication failed:', userError);
  return new Response(JSON.stringify({
    error: 'Unauthorized - Invalid token'
  }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
```

---

## Resultado Esperado

Após implementar todas as fases:

- **Segurança**: Sistema protegido contra ataques comuns (SQL injection via search_path, RLS bypass, spam de dados)
- **Privacidade**: Conformidade com LGPD/GDPR através de logs reduzidos
- **Configuração**: URLs centralizadas em secrets, fáceis de alterar
- **Performance**: Código modular, fácil de manter e escalar
- **Monitoramento**: Logs estruturados com níveis apropriados


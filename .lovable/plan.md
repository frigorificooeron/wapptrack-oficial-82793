

# Plano: Sistema Completo de Conversas com Notificações e Sons

## Resumo do Problema

O sistema de conversas precisa de melhorias para funcionar como o WhatsApp:
1. As mensagens não estão aparecendo corretamente no histórico
2. Não há indicador de mensagens não lidas
3. Não há som quando chega uma mensagem nova

---

## Solução Proposta

### 1. Corrigir Exibição de Mensagens

**Diagnóstico:** O banco de dados está funcionando corretamente (confirmado via query direta). O problema pode estar na query de RLS ou na forma como os dados são carregados.

**Mudanças:**
- Adicionar logs detalhados para debug no hook `useLeadChat`
- Verificar se a política RLS está bloqueando acesso
- Garantir que o `lead_id` passado está correto

---

### 2. Sistema de Mensagens Não Lidas

**Arquitetura:**

```text
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                            │
├─────────────────────────────────────────────────────────────┤
│  leads                                                       │
│  └── unread_count (INTEGER, default 0)                      │
│                                                              │
│  lead_messages                                               │
│  └── is_read (BOOLEAN, default false para is_from_me=false) │
└─────────────────────────────────────────────────────────────┘
```

**Novos Campos no Banco:**
- `leads.unread_count` (INTEGER) - Contador de mensagens não lidas
- `lead_messages.is_read` (BOOLEAN) - Se a mensagem foi lida

**Trigger Automático:**
- Quando uma nova mensagem chega (`is_from_me = false`), incrementa `unread_count`
- Quando o usuário abre a conversa, zera `unread_count` e marca mensagens como lidas

---

### 3. Sistema de Sons de Notificação

**5 Sons Disponíveis:**
1. `notification-1.mp3` - Som clássico (tipo WhatsApp)
2. `notification-2.mp3` - Som suave
3. `notification-3.mp3` - Som moderno
4. `notification-4.mp3` - Som discreto
5. `notification-5.mp3` - Som alegre

**Configuração:**
- Nova opção em Configurações para escolher o som
- Opção para desativar sons
- Armazenado em `localStorage` para persistência

---

## Arquivos a Serem Criados/Modificados

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useNotificationSound.ts` | Hook para reproduzir sons de notificação |
| `src/hooks/useUnreadMessages.ts` | Hook global para gerenciar contagem de não lidas |
| `src/components/settings/NotificationSoundSettings.tsx` | Componente para escolher som |
| `public/sounds/notification-1.mp3` | Som de notificação 1 |
| `public/sounds/notification-2.mp3` | Som de notificação 2 |
| `public/sounds/notification-3.mp3` | Som de notificação 3 |
| `public/sounds/notification-4.mp3` | Som de notificação 4 |
| `public/sounds/notification-5.mp3` | Som de notificação 5 |

### Arquivos Modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/hooks/useLeadChat.ts` | Adicionar lógica para marcar mensagens como lidas ao abrir conversa |
| `src/components/conversations/ConversationList.tsx` | Adicionar badge de não lidas ao lado do nome do contato |
| `src/pages/Conversations.tsx` | Integrar hook de sons e atualizar contagem ao abrir conversa |
| `src/pages/Settings.tsx` | Adicionar seção de configuração de sons |

---

## Detalhes Técnicos

### Hook useNotificationSound

```typescript
export const useNotificationSound = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('notification-1');
  
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    const audio = new Audio(`/sounds/${selectedSound}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(console.error);
  }, [soundEnabled, selectedSound]);
  
  return { playNotificationSound, soundEnabled, setSoundEnabled, selectedSound, setSelectedSound };
};
```

### Modificação na ConversationList

```typescript
// Dentro do componente de cada lead na lista
<div className="relative">
  <Avatar>...</Avatar>
  {lead.unread_count > 0 && (
    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
      {lead.unread_count > 9 ? '9+' : lead.unread_count}
    </span>
  )}
</div>
```

### Migração SQL

```sql
-- Adicionar campo unread_count na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Adicionar campo is_read na tabela lead_messages
ALTER TABLE lead_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Trigger para incrementar contador quando mensagem chega
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_from_me = false THEN
    UPDATE leads SET unread_count = unread_count + 1 WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message_increment_unread
AFTER INSERT ON lead_messages
FOR EACH ROW EXECUTE FUNCTION increment_unread_count();
```

---

## Fluxo de Funcionamento

1. **Mensagem chega via webhook** → Salva em `lead_messages` com `is_from_me = false`
2. **Trigger dispara** → Incrementa `unread_count` no lead
3. **Realtime propaga** → Frontend recebe a nova mensagem e o contador atualizado
4. **Som toca** → Hook `useNotificationSound` reproduz o som selecionado
5. **Badge aparece** → Lista de conversas mostra o número de não lidas
6. **Usuário abre conversa** → `unread_count` é zerado e mensagens marcadas como lidas

---

## Ordem de Implementação

1. Adicionar campos no banco de dados (migração SQL)
2. Criar arquivos de som no `/public/sounds/`
3. Criar hook `useNotificationSound`
4. Criar hook `useUnreadMessages`
5. Atualizar `ConversationList` com badge de não lidas
6. Atualizar `Conversations.tsx` para tocar som e zerar contador
7. Criar componente de configuração de sons
8. Atualizar página de Settings


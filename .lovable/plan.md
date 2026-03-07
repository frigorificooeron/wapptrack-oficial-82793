

## Plan: Message Chunking with Typing Simulation

### What changes

**Single file**: `supabase/functions/ai-webhook/index.ts`

Both the new agent flow (lines 410-436) and the legacy flow (lines 501-518) currently send one big message. We need to replace both with a `sendChunkedMessages` helper that:

1. **Splits the AI response** into short chunks (~200 chars max), breaking on sentence boundaries (`. `, `! `, `? `, `\n`). Links, CTAs, and questions get their own separate message.

2. **For each chunk**:
   - Calls Evolution API's **presence endpoint** (`POST /chat/updatePresence/{instance}`) with `{ number, presence: "composing" }` to show "typing..." indicator
   - Waits a **random delay between 2-4 seconds** (proportional to chunk length, simulating real typing speed)
   - Sends the chunk via `sendText`
   - Waits **1-2 seconds** between chunks (breathing pause)

3. **Saves each chunk as a separate `lead_messages` row** so the frontend displays them individually, matching what the lead sees on WhatsApp.

### Helper function (new)

```typescript
async function sendChunkedMessages(
  evolutionUrl: string, evolutionApiKey: string, 
  instanceName: string, phone: string, 
  fullText: string, supabase: any, leadId: string
) {
  const chunks = splitIntoChunks(fullText, 200);
  
  for (const chunk of chunks) {
    // 1. Send "typing..." presence
    await fetch(`${evolutionUrl}/chat/updatePresence/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ number: phone, presence: 'composing' }),
    });
    
    // 2. Typing delay (2-4s based on length)
    await delay(2000 + Math.random() * 2000 + chunk.length * 15);
    
    // 3. Send chunk
    const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, { ... });
    const evoData = await evoRes.json();
    
    // 4. Save to DB
    await supabase.from('lead_messages').insert({ lead_id, message_text: chunk, is_from_me: true, ... });
    
    // 5. Pause between chunks (1-2s)
    if (notLastChunk) await delay(1000 + Math.random() * 1000);
  }
}
```

### Chunk splitting logic

```typescript
function splitIntoChunks(text: string, maxLen: number): string[] {
  // Split on double newlines first, then sentences
  // Keep URLs/links as standalone chunks
  // Keep questions (ending with ?) as standalone chunks
  // Each chunk <= 200 chars
}
```

### Also update `agentLogic.ts` system prompt

Add to the system prompt instructions (line ~91):
```
- Responda de forma curta e natural, como uma conversa real de WhatsApp.
- Use frases curtas. Separe ideias em parágrafos com quebra de linha.
- Nunca envie blocos longos de texto.
- Links e perguntas devem estar em linhas separadas.
```

This instructs the LLM to already produce shorter, more conversational text, making the chunking work even better.

### Files to modify
- `supabase/functions/ai-webhook/index.ts` — Add `splitIntoChunks` and `sendChunkedMessages`, replace single-send in both flows
- `supabase/functions/ai-webhook/agentLogic.ts` — Add conversational style instructions to system prompt


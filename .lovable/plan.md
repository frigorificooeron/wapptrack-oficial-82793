

## Diagnosis

I found the root causes by examining edge function logs and code:

### Problem 1: `evolution-webhook` crashes on every incoming message
The logs show: `"instanceName is not defined"` (line 45-49 of logs). In `evolution-webhook/index.ts` line 63, the code does `instanceName = sanitizeInstanceName(body.instance)` but `instanceName` was never declared with `let`. This crashes the function, so **no messages are saved to the database at all** (confirmed: 0 rows in `lead_messages`, 0 rows in `leads`).

### Problem 2: `ai-webhook` is never called
The Evolution API webhook URL points to `evolution-webhook`. The `ai-webhook` function has zero logs. So even if messages were saved, no AI processing would happen.

### Problem 3: No fallback for Realtime
If Realtime subscriptions miss events, there's no polling fallback.

---

## Plan

### 1. Fix the `instanceName` declaration bug in `evolution-webhook/index.ts`
Add `let instanceName: string;` before the try block where it's assigned. This is the critical fix that will unblock everything.

### 2. Chain `evolution-webhook` to call `ai-webhook`
After `evolution-webhook` processes and saves the incoming message, have it forward the original webhook payload to the `ai-webhook` Edge Function via an internal HTTP call. This way:
- `evolution-webhook` handles lead creation, message persistence, UTM tracking
- `ai-webhook` handles AI agent routing, prompt building, and response sending
- Both functions stay focused on their responsibilities

### 3. Add fallback polling in `useLeadChat.ts`
Add a secondary polling mechanism (every 3s, with exponential backoff to 30s) alongside Realtime. This guarantees messages appear even if Realtime drops.

### 4. Redeploy both Edge Functions
Deploy `evolution-webhook` and `ai-webhook` with the fixes, then verify via logs.

---

### Summary of changes:
- **`supabase/functions/evolution-webhook/index.ts`** — Fix `let instanceName` declaration; add forwarding call to `ai-webhook` for incoming client messages
- **`src/hooks/useLeadChat.ts`** — Add fallback polling alongside Realtime subscription


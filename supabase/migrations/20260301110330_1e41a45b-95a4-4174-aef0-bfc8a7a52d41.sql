
-- AI Agents table
CREATE TABLE public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL DEFAULT 'Você é um assistente útil e amigável.',
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  instance_name TEXT NOT NULL,
  response_delay_ms INTEGER NOT NULL DEFAULT 1500,
  max_history_messages INTEGER NOT NULL DEFAULT 20,
  is_active BOOLEAN NOT NULL DEFAULT true,
  funnel_keywords JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ai_agents" ON public.ai_agents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages ai_agents" ON public.ai_agents FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Conversation Messages table (AI chat history)
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  phone TEXT NOT NULL,
  instance_name TEXT,
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages conversation_messages" ON public.conversation_messages FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Users view own conversation_messages" ON public.conversation_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = conversation_messages.lead_id AND l.user_id = auth.uid())
);

CREATE INDEX idx_conversation_messages_phone ON public.conversation_messages(phone);
CREATE INDEX idx_conversation_messages_lead_id ON public.conversation_messages(lead_id);

-- Human Takeovers table
CREATE TABLE public.human_takeovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.human_takeovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own human_takeovers" ON public.human_takeovers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages human_takeovers" ON public.human_takeovers FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role');

CREATE INDEX idx_human_takeovers_lead_active ON public.human_takeovers(lead_id) WHERE is_active = true;

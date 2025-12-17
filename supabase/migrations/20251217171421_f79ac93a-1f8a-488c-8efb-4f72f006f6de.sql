-- Fix campaigns table RLS - restrict to user's own campaigns
DROP POLICY IF EXISTS "Allow all operations on campaigns" ON campaigns;
CREATE POLICY "Users view own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- Fix company_settings table RLS - restrict to user's own settings
DROP POLICY IF EXISTS "Allow all operations on company_settings" ON company_settings;
CREATE POLICY "Users manage own company settings" ON company_settings FOR ALL USING (auth.uid() = user_id);

-- Fix leads table RLS - restrict to user's own leads
DROP POLICY IF EXISTS "Allow all operations on leads" ON leads;
CREATE POLICY "Users view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

-- Fix lead_messages table RLS - users can only access messages from their leads
DROP POLICY IF EXISTS "Allow all operations on lead_messages" ON lead_messages;
CREATE POLICY "Users view own lead messages" ON lead_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_messages.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "Users insert own lead messages" ON lead_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_messages.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "Users update own lead messages" ON lead_messages FOR UPDATE 
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_messages.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "Users delete own lead messages" ON lead_messages FOR DELETE 
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_messages.lead_id AND leads.user_id = auth.uid()));

-- Fix sales table RLS - restrict to user's own sales (via leads)
DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;
CREATE POLICY "Users view own sales" ON sales FOR SELECT 
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = sales.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "Users insert own sales" ON sales FOR INSERT 
WITH CHECK (lead_id IS NULL OR EXISTS (SELECT 1 FROM leads WHERE leads.id = sales.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "Users update own sales" ON sales FOR UPDATE 
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = sales.lead_id AND leads.user_id = auth.uid()));
CREATE POLICY "Users delete own sales" ON sales FOR DELETE 
USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = sales.lead_id AND leads.user_id = auth.uid()));

-- Fix pending_leads table RLS
DROP POLICY IF EXISTS "Allow all operations on pending_leads" ON pending_leads;
CREATE POLICY "Users view own pending leads" ON pending_leads FOR SELECT 
USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id::text = pending_leads.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users insert pending leads" ON pending_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users update own pending leads" ON pending_leads FOR UPDATE 
USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id::text = pending_leads.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users delete own pending leads" ON pending_leads FOR DELETE 
USING (EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id::text = pending_leads.campaign_id AND campaigns.user_id = auth.uid()));

-- Fix utm_clicks table RLS
DROP POLICY IF EXISTS "Allow all operations on utm_clicks" ON utm_clicks;
CREATE POLICY "Allow public insert utm_clicks" ON utm_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select utm_clicks" ON utm_clicks FOR SELECT USING (true);

-- Fix campaign_tokens table RLS
DROP POLICY IF EXISTS "Allow all operations on campaign_tokens" ON campaign_tokens;
CREATE POLICY "Allow public insert campaign_tokens" ON campaign_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select campaign_tokens" ON campaign_tokens FOR SELECT USING (true);
CREATE POLICY "Allow public update campaign_tokens" ON campaign_tokens FOR UPDATE USING (true);
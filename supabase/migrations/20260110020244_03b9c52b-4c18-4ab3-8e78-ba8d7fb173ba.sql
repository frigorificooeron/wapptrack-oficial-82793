-- Fix PUBLIC_DATA_EXPOSURE: Restrict device_data table access
-- The device_data table currently has public read access which exposes PII

-- 1. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Allow device data reading" ON device_data;

-- 2. Drop the overly permissive INSERT policy  
DROP POLICY IF EXISTS "Allow device data insertion" ON device_data;

-- 3. Create policy for service role to manage device data (used by edge functions)
-- Edge functions use SUPABASE_SERVICE_ROLE_KEY which has full access
-- This policy allows authenticated service role access
CREATE POLICY "Service role manages device data"
ON device_data FOR ALL
USING (
  (auth.jwt() ->> 'role') = 'service_role'
);

-- 4. Create policy for users to view device data related to their leads
-- Users can only see device data for phones that belong to their leads
CREATE POLICY "Users view device data from their leads"
ON device_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.phone = device_data.phone
    AND l.user_id = auth.uid()
  )
);

-- Note: INSERT is now only allowed via service role (edge functions)
-- This is appropriate since device data is captured during the tracking flow
-- which runs through edge functions with service role keys
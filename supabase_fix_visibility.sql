-- FIX: Allow public read access to restore visibility
-- The previous policy might have been too restrictive if the app fetches data without an active session in some contexts.

-- 1. Reset policies for 'packages'
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.packages;

-- Allow public (anon + authenticated) to VIEW (Select) packages
CREATE POLICY "Allow public read access" ON public.packages
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow ONLY authenticated users to MODIFY (Insert/Update/Delete) packages
-- Note: "FOR ALL" includes SELECT, but since we have a separate SELECT policy for everyone, this ensures Auth users get full rights.
CREATE POLICY "Allow authenticated full access" ON public.packages
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 2. Reset policies for 'finance_settings'
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.finance_settings;

-- Allow public read access (if needed for UI rendering before full auth or consistent behavior)
CREATE POLICY "Allow public read access" ON public.finance_settings
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow authenticated users full control
CREATE POLICY "Allow authenticated full access" ON public.finance_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

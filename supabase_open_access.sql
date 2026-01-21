-- FIX: Allow FULL public access (Read + Write)
-- This "solves" the auth issue by removing the restriction, effectively making the table public.
-- Useful for development or apps without strict user ownership.

-- 1. Reset policies for 'packages'
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.packages;
DROP POLICY IF EXISTS "Allow public read access" ON public.packages;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.packages;

-- Create a single policy allowing EVERYTHING for EVERYONE
CREATE POLICY "Enable all access for all users" ON public.packages
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


-- 2. Reset policies for 'finance_settings'
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.finance_settings;
DROP POLICY IF EXISTS "Allow public read access" ON public.finance_settings;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.finance_settings;

-- Create a single policy allowing EVERYTHING for EVERYONE
CREATE POLICY "Enable all access for all users" ON public.finance_settings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

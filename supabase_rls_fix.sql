-- RLS Fix for 'packages' table
-- Issue: Table public.packages is public, but RLS has not been enabled.
-- Fix: Enable RLS and add policy for authenticated users.

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow full access to authenticated users
-- (Adjust this if you need public read access, e.g. change TO authenticated -> TO public or anon)
CREATE POLICY "Enable all access for authenticated users" ON public.packages
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- RLS Fix for 'finance_settings' table
-- Issue: Table public.finance_settings is public, but RLS has not been enabled.
-- Fix: Enable RLS and add policy for authenticated users.

ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow full access to authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.finance_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- STRICT SECURITY POLICY
-- Use this AFTER you have successfully logged in via the new Login page.
-- This revokes public access and ensures ONLY authenticated users can access data.

-- 1. Packages Table
DROP POLICY IF EXISTS "Enable all access for all users" ON public.packages;
DROP POLICY IF EXISTS "Allow public read access" ON public.packages;

CREATE POLICY "Authenticated users only" ON public.packages
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Finance Settings Table
DROP POLICY IF EXISTS "Enable all access for all users" ON public.finance_settings;
DROP POLICY IF EXISTS "Allow public read access" ON public.finance_settings;

CREATE POLICY "Authenticated users only" ON public.finance_settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Projects Table (If not already secured)
-- Checking previous schema, it might have been open. Let's secure it too to be safe.
DROP POLICY IF EXISTS "Enable all access for all users" ON public.projects;

CREATE POLICY "Authenticated users only" ON public.projects
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

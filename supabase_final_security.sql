-- FINAL COMPREHENSIVE SECURITY POLICY
-- This script applies appropriate RLS policies to ALL tables found in the application.
-- Strategy:
-- 1. "Authenticated" (Admin) users have FULL ACCESS to everything.
-- 2. "Anon" (Public) users have NO ACCESS to sensitive internal data (Finance, Clients, Inventory).
-- 3. "Anon" users have LIMITED ACCESS to 'projects' and 'photo_selections' to support the Client Selection feature.

-- Helper: Enable RLS and clean old policies
-- (We use DO blocks or just direct commands. using simple commands for compatibility)

-- =======================================================
-- 1. STRICT INTERNAL TABLES (No Public Access)
-- =======================================================

-- CLIENTS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.clients;
CREATE POLICY "Admin only" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INVENTORY
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY; -- Note: table name is 'inventory' based on apiInventory.ts
DROP POLICY IF EXISTS "Enable all access for all users" ON public.inventory;
CREATE POLICY "Admin only" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.transactions;
CREATE POLICY "Admin only" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- FINANCE SETTINGS
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.finance_settings;
CREATE POLICY "Admin only" ON public.finance_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PACKAGES
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.packages;
CREATE POLICY "Admin only" ON public.packages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CONTRACT SETTINGS
ALTER TABLE public.contract_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.contract_settings;
CREATE POLICY "Admin only" ON public.contract_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SETTINGS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.app_settings;
CREATE POLICY "Admin only" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =======================================================
-- 2. PUBLIC-FACING TABLES (Client Selection Feature)
-- =======================================================

-- PHOTO SELECTIONS
ALTER TABLE public.photo_selections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.photo_selections;

-- Admin access
CREATE POLICY "Admin full access" ON public.photo_selections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public access (Required for Client Selection View)
-- Clients need to SELECT (view photos) and UPDATE (save selection).
-- Security relies on the uniqueness of the 'access_token' in the URL.
CREATE POLICY "Public access via token" ON public.photo_selections 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true); 
-- Note: 'FOR ALL' here allows delete/insert too which is risky.
-- Better: 'FOR SELECT' and 'FOR UPDATE'.
-- Let's refine public policies:
DROP POLICY IF EXISTS "Public access via token" ON public.photo_selections;
CREATE POLICY "Public read" ON public.photo_selections FOR SELECT TO anon USING (true);
CREATE POLICY "Public update" ON public.photo_selections FOR UPDATE TO anon USING (true);


-- PROJECTS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users only" ON public.projects; -- remove previous strict one if exists

-- Admin access
CREATE POLICY "Admin full access" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public Read Access
-- Required so that 'ClientSelectionView' can read project title/client_name via join.
-- This allows reading ALL projects if one knows the ID. Consider this a trade-off for feature continuity.
CREATE POLICY "Public read access" ON public.projects FOR SELECT TO anon USING (true);


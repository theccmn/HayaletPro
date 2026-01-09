-- Enable pgcrypto just in case (usually enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure permissions for photo_selections
ALTER TABLE photo_selections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can update photo selections" ON photo_selections;
CREATE POLICY "Public can update photo selections"
ON photo_selections FOR UPDATE
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can select photo selections" ON photo_selections;
CREATE POLICY "Public can select photo selections"
ON photo_selections FOR SELECT
USING (true);

-- 2. Grant usage on sequence/tables to anon (sometimes needed)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE photo_selections TO anon, authenticated, service_role;
GRANT ALL ON TABLE notifications TO anon, authenticated, service_role;

-- 3. Check notifications table policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow insert by anyone (for the trigger to work smoothly if context switches, though SECURITY DEFINER handles it)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON notifications;
-- Actually, we generally don't want public inserting notifications directly, 
-- but we DO want the Trigger to work. 
-- Since the trigger is SECURITY DEFINER, it bypasses RLS.
-- But let's Ensure RLS doesn't block updates if something is weird.

-- 4. Verify Project ID Logic (Fix potential FK issues if project doesn't exist)
-- This query checks if there are orphaned selections
SELECT ps.id, ps.project_id, p.title 
FROM photo_selections ps 
LEFT JOIN projects p ON ps.project_id = p.id 
WHERE p.id IS NULL;

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
    is_read BOOLEAN DEFAULT FALSE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop prior policies to ensure clean state
DROP POLICY IF EXISTS "Allow authenticated read" ON notifications;
DROP POLICY IF EXISTS "Allow authenticated update" ON notifications;
DROP POLICY IF EXISTS "Allow all read" ON notifications;
DROP POLICY IF EXISTS "Allow all update" ON notifications;

-- Create Policies (public access for simplicity)
CREATE POLICY "Allow all read" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Allow all update" ON notifications
    FOR UPDATE USING (true) WITH CHECK (true);

-- Function: handle_selection_completion
-- Fixed variable names to avoid conflict with column names
CREATE OR REPLACE FUNCTION handle_selection_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_project_title TEXT;
    v_client_name TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
        BEGIN
            SELECT p.title, p.client_name INTO v_project_title, v_client_name
            FROM projects p
            WHERE p.id = NEW.project_id;

            INSERT INTO notifications (title, message, type, project_id)
            VALUES (
                'Seçim Tamamlandı: ' || COALESCE(v_client_name, 'Müşteri'),
                COALESCE(v_project_title, 'Proje') || ' projesi için fotoğraf seçimi tamamlandı.',
                'success',
                NEW.project_id
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Notification trigger failed: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_selection_completed ON photo_selections;
CREATE TRIGGER on_selection_completed
    AFTER UPDATE ON photo_selections
    FOR EACH ROW
    EXECUTE FUNCTION handle_selection_completion();

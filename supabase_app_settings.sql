-- =============================================
-- APP SETTINGS - Migration Script
-- Stores application branding and preferences
-- =============================================

-- 1. App Settings Tablosu
DROP TABLE IF EXISTS app_settings CASCADE;
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT DEFAULT 'Kullanıcı',
    app_title TEXT DEFAULT 'Hayalet Pro',
    logo_url TEXT,
    theme TEXT DEFAULT 'light', -- 'light', 'dark', 'system' vb.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan ayar (Tek satır mantığı)
INSERT INTO app_settings (user_name, app_title, theme)
VALUES ('Kullanıcı', 'Hayalet Pro', 'light')
ON CONFLICT DO NOTHING;

-- 2. RLS Politikaları
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON app_settings;

CREATE POLICY "Allow all for authenticated users"
ON app_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- İzinler
GRANT ALL ON app_settings TO authenticated;
GRANT ALL ON app_settings TO service_role;

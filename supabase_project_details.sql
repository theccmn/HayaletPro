-- =============================================
-- PROJE DETAY GELİŞTİRMELERİ - Migration Script (GÜNCELLENMİŞ)
-- Location Types, Locations, Projects Update
-- RLS Policy Fixes
-- =============================================

-- 1. Location Types Tablosu
CREATE TABLE IF NOT EXISTS location_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    color TEXT DEFAULT 'bg-gray-100 text-gray-700',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan veriler
INSERT INTO location_types (label, color, order_index) VALUES
    ('Stüdyo', 'bg-blue-100 text-blue-700', 0),
    ('Dış Çekim', 'bg-green-100 text-green-700', 1),
    ('Karma', 'bg-purple-100 text-purple-700', 2)
ON CONFLICT DO NOTHING;

-- 2. Locations Tablosu
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Varsayılan veriler
INSERT INTO locations (name, order_index) VALUES
    ('Ana Stüdyo', 0),
    ('Sahil', 1),
    ('Orman', 2),
    ('Şehir Merkezi', 3)
ON CONFLICT DO NOTHING;

-- 3. Projects Tablosu Güncellemeleri
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_type_id UUID REFERENCES location_types(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- 4. RLS ve İzinler (Hata Önleyici Drop Komutları ile)

-- Location Types
ALTER TABLE location_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON location_types;
CREATE POLICY "Allow all for authenticated users"
ON location_types
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON location_types TO authenticated;
GRANT ALL ON location_types TO service_role;

-- Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON locations;
CREATE POLICY "Allow all for authenticated users"
ON locations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON locations TO authenticated;
GRANT ALL ON locations TO service_role;

-- 5. Transactions Tablosu Düzeltmesi (Saat 03:00 Hatası Çözümü)
-- 'date' sütunu eğer 'DATE' tipindeyse saat bilgisini kaybeder.
-- Bunu 'TIMESTAMP WITH TIME ZONE' yaparak saat bilgisini koruyoruz.
DO $$
BEGIN
    BEGIN
        ALTER TABLE transactions ALTER COLUMN date TYPE TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN OTHERS THEN
            NULL; -- Hata olursa (örneğin tablo yoksa) devam et
    END;
END $$;

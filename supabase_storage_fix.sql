-- =============================================
-- STORAGE POLICIES FIX
-- app-assets bucket için izinleri ayarlar
-- =============================================

-- 1. Bucket'ı Public Yap (Yoksa oluşturur, varsa günceller)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Mevcut Politikaları Temizle (Çakışmayı önlemek için)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 3. Yeni Politikaları Oluştur

-- Okuma izni (Herkes okuyabilir - Public URL için şart)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'app-assets' );

-- Yükleme izni (Sadece giriş yapmış kullanıcılar)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'app-assets' );

-- Güncelleme izni
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'app-assets' );

-- Silme izni
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'app-assets' );

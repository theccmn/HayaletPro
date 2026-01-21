-- =============================================
-- SETTINGS TABLE FIX
-- Bu script key-value formatında ayarları saklayan yeni bir tablo oluşturur
-- =============================================

-- 1. Yeni settings tablosu oluştur (key-value formatında)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS (Row Level Security) etkinleştir
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Mevcut policy'leri temizle (varsa)
DROP POLICY IF EXISTS "Admin only" ON public.settings;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.settings;

-- 4. Authenticated kullanıcılar için tam erişim policy'si
CREATE POLICY "Admin only" ON public.settings
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. İzinleri ayarla
GRANT ALL ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

-- 6. Mevcut ayarları (varsa) migrate et
-- Google Calendar Client ID
INSERT INTO public.settings (key, value, description)
SELECT 'google_calendar_client_id', '', 'Google Calendar OAuth Client ID'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'google_calendar_client_id');

-- Google Calendar Access Token
INSERT INTO public.settings (key, value, description)
SELECT 'google_calendar_access_token', '', 'Google Calendar OAuth Access Token'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'google_calendar_access_token');

-- Google Drive API Key
INSERT INTO public.settings (key, value, description)
SELECT 'google_drive_api_key', '', 'Google Drive API Anahtarı'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'google_drive_api_key');

-- Mail Resend API Key
INSERT INTO public.settings (key, value, description)
SELECT 'mail_resend_api_key', '', 'Resend.com Mail API Anahtarı'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'mail_resend_api_key');

-- Mail Notification Email
INSERT INTO public.settings (key, value, description)
SELECT 'mail_notification_email', '', 'Bildirim alacak email adresi'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'mail_notification_email');

-- Mail Sender Name
INSERT INTO public.settings (key, value, description)
SELECT 'mail_sender_name', 'Hayalet Pro', 'Mail gönderen adı'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'mail_sender_name');

-- Mail Sender Email
INSERT INTO public.settings (key, value, description)
SELECT 'mail_sender_email', 'onboarding@resend.dev', 'Mail gönderen adresi'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'mail_sender_email');

-- =============================================
-- BU SQL'İ SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- =============================================

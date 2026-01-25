-- =====================================================
-- İş Akışları (Workflows) Tabloları
-- =====================================================

-- Workflows ana tablosu
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Tetikleyici yapısı: 'event' (olay bazlı) veya 'schedule' (zaman bazlı)
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('event', 'schedule')),
    
    -- Olay bazlı tetikleyiciler
    -- Örnek: 'project_created', 'project_status_changed', 'project_cancelled', 'photo_selection_completed'
    trigger_event TEXT,
    -- Koşul: { "from_status_id": "xxx", "to_status_id": "yyy" }
    trigger_condition JSONB DEFAULT '{}'::jsonb,
    
    -- Zaman bazlı tetikleyiciler
    -- 'before_project_date' veya 'after_project_date'
    schedule_type TEXT,
    -- Dakika cinsinden offset (60 = 1 saat, 1440 = 1 gün)
    schedule_offset INTEGER,
    
    -- Şablon ilişkisi
    template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
    
    -- Gönderim kanalları
    -- { "email": true, "whatsapp": true }
    channels JSONB DEFAULT '{"email": false, "whatsapp": false}'::jsonb,
    
    -- Durum
    is_active BOOLEAN DEFAULT true,
    
    -- Zaman damgaları
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Workflow çalışma logları
CREATE TABLE IF NOT EXISTS public.workflow_executions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Hangi kanal üzerinden gönderildi
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    
    -- Durum: 'pending', 'sent', 'failed', 'clicked' (whatsapp için)
    status TEXT NOT NULL DEFAULT 'pending',
    
    -- Hata mesajı (eğer varsa)
    error_message TEXT,
    
    -- Gönderilen mesaj içeriği (isteğe bağlı loglama)
    message_preview TEXT,
    
    -- Zaman damgası
    executed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Updated_at otomatik güncelleme trigger'ı
CREATE TRIGGER handle_workflows_updated_at 
    BEFORE UPDATE ON public.workflows
    FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- RLS Policies
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.workflows
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.workflow_executions
    FOR ALL USING (auth.role() = 'authenticated');

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON public.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_type ON public.workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflows_trigger_event ON public.workflows(trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions(status);

-- Yorum
COMMENT ON TABLE public.workflows IS 'İş akışları - tetikleyici ve şablon ilişkisi';
COMMENT ON TABLE public.workflow_executions IS 'İş akışı çalışma logları';

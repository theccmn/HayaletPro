-- Projelere end_date alanı ekleme
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Mevcut start_date alanını timestamptz olarak güncelle (eğer henüz değilse)
-- ALTER TABLE projects ALTER COLUMN start_date TYPE TIMESTAMPTZ USING start_date::TIMESTAMPTZ;

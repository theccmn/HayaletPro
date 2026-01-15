-- Add highlight_color and highlighted_fields to contract_settings
ALTER TABLE contract_settings
ADD COLUMN IF NOT EXISTS highlight_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS highlighted_fields text[] DEFAULT '{}';

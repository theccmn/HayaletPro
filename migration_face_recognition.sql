-- Create table for storing indexed faces
CREATE TABLE IF NOT EXISTS public.indexed_faces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_path TEXT NOT NULL,
    descriptor JSONB NOT NULL,
    preview_base64 TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster file path lookups (to avoid duplicates)
CREATE INDEX IF NOT EXISTS idx_indexed_faces_file_path ON public.indexed_faces(file_path);

-- Enable RLS (permitting all for now for local usage, can be tightened later)
ALTER TABLE public.indexed_faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to indexed_faces"
ON public.indexed_faces
FOR ALL
USING (true)
WITH CHECK (true);

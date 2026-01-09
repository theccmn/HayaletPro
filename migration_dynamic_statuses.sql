-- Create project_statuses table
create table public.project_statuses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  label text not null,
  "order" integer default 0,
  color text default 'bg-gray-100'
);

-- Enable RLS
alter table public.project_statuses enable row level security;
create policy "Enable all access for all users" on public.project_statuses for all using (true) with check (true);

-- Insert default statuses
insert into public.project_statuses (label, "order", color) values
  ('Aday', 0, 'bg-blue-100 text-blue-700'),
  ('Çekim', 1, 'bg-yellow-100 text-yellow-700'),
  ('Kurgu', 2, 'bg-purple-100 text-purple-700'),
  ('Teslim', 3, 'bg-orange-100 text-orange-700'),
  ('Tamamlandı', 4, 'bg-green-100 text-green-700');

-- Add status_id to projects (initially nullable)
alter table public.projects add column status_id uuid references public.project_statuses(id);

-- Migrate existing data (This is a best-effort mapping using the labels we know)
-- Note: In a real migration we'd be careful. Here assuming 'lead' -> 'Aday' etc.
-- But since we just inserted them, we need to look them up.
-- Easier approach for this dev environment:
-- 1. Clear projects (optional, but safe) OR
-- 2. Update based on sub-select (complex)
-- Let's try to update based on the known mapping:
update public.projects set status_id = (select id from public.project_statuses where label = 'Aday') where status = 'lead';
update public.projects set status_id = (select id from public.project_statuses where label = 'Çekim') where status = 'shooting';
update public.projects set status_id = (select id from public.project_statuses where label = 'Kurgu') where status = 'editing';
update public.projects set status_id = (select id from public.project_statuses where label = 'Teslim') where status = 'delivery';
update public.projects set status_id = (select id from public.project_statuses where label = 'Tamamlandı') where status = 'completed';

-- Now drop the old status column and check constraint
alter table public.projects drop column status;

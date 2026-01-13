-- Create project_installments table
create table if not exists public.project_installments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  amount numeric not null,
  due_date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.project_installments enable row level security;

-- Create policy that allows all operations (development mode)
create policy "Enable all access for all users" on public.project_installments
for all using (true) with check (true);

-- Insert default settings for deposit if they don't exist
insert into public.app_settings (key, value, description)
values
  ('default_deposit_type', 'percentage', 'Varsayılan Kapora Türü (percentage/fixed)'),
  ('default_deposit_value', '33.33', 'Varsayılan Kapora Değeri')
on conflict (key) do nothing;

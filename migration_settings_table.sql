-- Create the app_settings table
create table public.app_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.app_settings enable row level security;

-- Create a policy that allows all operations for now
create policy "Enable all access for all users" on public.app_settings
for all using (true) with check (true);

-- Insert default record for Google Drive API Key
insert into public.app_settings (key, value, description)
values ('google_drive_api_key', '', 'Google Drive API Entegrasyon Anahtarı');

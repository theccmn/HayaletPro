-- Create clients table
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  company text,
  phone text,
  email text,
  address text,
  notes text,
  project_count integer default 0
);

-- Enable RLS
alter table clients enable row level security;

-- Create policies (permissive for this simplified auth setup)
create policy "Enable read access for all users" on clients for select using (true);
create policy "Enable insert for all users" on clients for insert with check (true);
create policy "Enable update for all users" on clients for update using (true);
create policy "Enable delete for all users" on clients for delete using (true);

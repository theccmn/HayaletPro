-- Create the projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  client_name text,
  status text check (status in ('lead', 'shooting', 'editing', 'delivery', 'completed')) default 'lead',
  start_date date,
  price numeric default 0,
  notes text
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;

-- Create a policy that allows all operations for now (for development simplicity)
-- In production, you'd want to restrict this to authenticated users
create policy "Enable all access for all users" on public.projects
for all using (true) with check (true);

-- Insert some dummy data
insert into public.projects (title, client_name, status, start_date, price)
values
  ('Düğün Çekimi - Ahmet & Ayşe', 'Ahmet Yılmaz', 'lead', '2024-06-15', 15000),
  ('Ürün Çekimi - Moda A.Ş.', 'Moda A.Ş.', 'shooting', '2024-02-20', 8500),
  ('Mezuniyet Klibi', 'Fen Lisesi', 'editing', '2024-05-10', 5000),
  ('Portre Çekimi', 'Selin Demir', 'delivery', '2024-01-15', 2500),
  ('Kurumsal Tanıtım', 'TeknoSoft', 'completed', '2023-12-01', 12000);

-- Update clients table
alter table clients 
add column if not exists tags text[] default array[]::text[],
add column if not exists status text default 'passive';

-- Create packages table
create table if not exists packages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  price numeric default 0,
  features text[] default array[]::text[]
);

-- Enable RLS for packages
alter table packages enable row level security;
create policy "Enable read access for all users" on packages for select using (true);
create policy "Enable insert for all users" on packages for insert with check (true);
create policy "Enable update for all users" on packages for update using (true);
create policy "Enable delete for all users" on packages for delete using (true);

-- Insert some default packages
insert into packages (name, description, price, features) values
('Standart Paket', 'Temel çekim hizmeti', 5000, ARRAY['2 Saat Çekim', '30 Düzenlenmiş Fotoğraf', 'Dijital Teslim']),
('Profesyonel Paket', 'Kapsamlı çekim ve düzenleme', 8500, ARRAY['4 Saat Çekim', '60 Düzenlenmiş Fotoğraf', 'Drone Çekimi', 'Video Klip']),
('Premium Paket', 'Tam gün her şey dahil', 15000, ARRAY['Tam Gün Çekim', 'Sınırsız Fotoğraf', 'Sinematik Video', 'Albümler', 'Drone']);

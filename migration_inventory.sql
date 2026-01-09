-- Create inventory table
create table if not exists inventory (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text not null, -- 'Camera', 'Lens', 'Light', 'Audio', 'Other'
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  price numeric default 0,
  status text default 'available', -- 'available', 'rented', 'maintenance', 'lost'
  notes text
);

-- Enable RLS
alter table inventory enable row level security;

create policy "Enable read access for all users" on inventory for select using (true);
create policy "Enable insert for all users" on inventory for insert with check (true);
create policy "Enable update for all users" on inventory for update using (true);
create policy "Enable delete for all users" on inventory for delete using (true);

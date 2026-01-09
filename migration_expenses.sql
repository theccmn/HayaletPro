-- Create expenses table
create table expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  amount numeric not null default 0,
  category text, -- Can be 'Ekipman', 'Ulaşım', 'Yemek', 'Maaş', 'Diğer' etc.
  date date not null default current_date,
  project_id uuid references projects(id) on delete set null, -- Optional link to a project
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table expenses enable row level security;

-- Create policy to allow all access (for now, similar to other tables)
create policy "Allow all access to expenses"
  on expenses for all
  using (true)
  with check (true);

-- Create index for faster querying by date and project
create index expenses_date_idx on expenses(date);
create index expenses_project_id_idx on expenses(project_id);

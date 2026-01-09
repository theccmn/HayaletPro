-- Drop previous expenses table if exists (re-designing for income support)
drop table if exists expenses;
drop table if exists transactions; -- just in case

-- Create transactions table
create table transactions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  amount numeric not null default 0,
  type text not null check (type in ('income', 'expense')), -- 'income' or 'expense'
  category text, 
  date date not null default current_date,
  project_id uuid references projects(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table transactions enable row level security;

-- Create policy
create policy "Allow all access to transactions"
  on transactions for all
  using (true)
  with check (true);

-- Create indexes
create index transactions_date_idx on transactions(date);
create index transactions_project_idx on transactions(project_id);
create index transactions_type_idx on transactions(type);

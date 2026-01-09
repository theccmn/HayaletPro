-- Add client_id to projects table
alter table projects 
add column if not exists client_id uuid references clients(id) on delete set null;

-- Enable RLS on the new column if needed (usually covered by table policy)

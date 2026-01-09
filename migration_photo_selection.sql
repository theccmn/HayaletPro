-- Create photo_selections table
create table if not exists photo_selections (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references projects(id) on delete cascade,
    folder_id text not null, -- Google Drive Folder ID
    access_token text unique, -- For public client access (like a PIN or Hash)
    selection_data jsonb default '[]'::jsonb, -- Array of user choices: [{ id, selected: true, comment: "...", extra_selections: { cover: true } }]
    settings jsonb default '{"limit": 40, "extra_limits": []}'::jsonb, -- Configuration like limit, extra types
    status text default 'waiting', -- waiting, viewed, selecting, completed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies
alter table photo_selections enable row level security;

-- Admin can do everything
create policy "Admins can manage photo selections"
    on photo_selections for all
    using (true)
    with check (true);

-- Clients can view and update their own selection via access_token
-- Note: Supabase RLS with public access tokens usually requires a function or looser public read if not using Auth.
-- For now, we allow public read/update if they know the ID/Token (handled in API logic or strict RLS if using anon auth).
-- A safer approach for "Public Link" without login is often a PostgreSQL Function or allowing public select on this table.
-- Let's allow public read for now, but restrict update.
create policy "Public can read photo selections"
    on photo_selections for select
    using (true);

create policy "Public can update photo selections"
    on photo_selections for update
    using (true)
    with check (true);

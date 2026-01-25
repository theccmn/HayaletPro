-- Create the storage bucket for workflow assets (images in emails)
insert into storage.buckets (id, name, public)
values ('workflow-assets', 'workflow-assets', true)
on conflict (id) do nothing;

-- Enable RLS policies for the bucket
-- Policy: Authenticated users can upload (insert)
create policy "Authenticated users can upload workflow assets"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'workflow-assets' );

-- Policy: Authenticated users can update
create policy "Authenticated users can update workflow assets"
on storage.objects for update
to authenticated
with check ( bucket_id = 'workflow-assets' );

-- Policy: Public read access (essential for emails)
create policy "Everyone can view workflow assets"
on storage.objects for select
to public
using ( bucket_id = 'workflow-assets' );

-- Policy: Authenticated users can delete
create policy "Authenticated users can delete workflow assets"
on storage.objects for delete
to authenticated
using ( bucket_id = 'workflow-assets' );

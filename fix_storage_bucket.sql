-- Create the storage bucket
insert into storage.buckets (id, name, public)
values ('contract-logos', 'contract-logos', true)
on conflict (id) do nothing;

-- Enable RLS (though buckets table controls access via policies on storage.objects)

-- Policy: Authenticated users can upload (insert)
create policy "Authenticated users can upload contract logos"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'contract-logos' );

-- Policy: Authenticated users can update
create policy "Authenticated users can update contract logos"
on storage.objects for update
to authenticated
with check ( bucket_id = 'contract-logos' );

-- Policy: Public read access
create policy "Everyone can view contract logos"
on storage.objects for select
to public
using ( bucket_id = 'contract-logos' );

-- Policy: Authenticated users can delete
create policy "Authenticated users can delete contract logos"
on storage.objects for delete
to authenticated
using ( bucket_id = 'contract-logos' );

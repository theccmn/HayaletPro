-- Add missing details column to projects table
alter table projects 
add column if not exists details text;

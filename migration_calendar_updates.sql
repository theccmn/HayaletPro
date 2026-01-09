-- Add job_date to transactions table
alter table transactions 
add column if not exists job_date timestamp with time zone;

-- Update existing transactions to use created_at as job_date
update transactions 
set job_date = created_at 
where job_date is null;

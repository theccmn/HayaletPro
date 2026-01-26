-- Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule the job to run every hour
-- NOTE: You must replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY
select cron.schedule(
  'process-schedule-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  select
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-schedule',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- To unschedule:
-- select cron.unschedule('process-schedule-hourly');

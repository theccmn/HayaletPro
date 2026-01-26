-- Önce eski hatalı zamanlayıcıyı kaldırıyoruz
select cron.unschedule('process-schedule-hourly');

-- Doğru ayarlar ile tekrar oluşturuyoruz
-- DİKKAT: 'SERVICE_ROLE_KEY_BURAYA' kısmını Supabase Dashboard > Project Settings > API > Service Role Key ile değiştirmelisiniz.
select cron.schedule(
  'process-schedule-hourly',
  '0 * * * *', -- Her saat başı çalışır (dk:00)
  $$
  select
    net.http_post(
      url:='https://xbajzmelolpklnyrxixi.supabase.co/functions/v1/process-schedule',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_ROLE_KEY_BURAYA"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

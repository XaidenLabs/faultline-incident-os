do $$
begin
  if not exists (select 1 from vault.secrets where name = 'faultline_project_url') then
    perform vault.create_secret(
      'https://rsjaklsvljpqahplgusz.supabase.co',
      'faultline_project_url',
      'Faultline live ingestion project URL'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'faultline_publishable_key') then
    perform vault.create_secret(
      'sb_publishable_kqL45C5-u6EZPkIE1II7fw_5QkMsBMa',
      'faultline_publishable_key',
      'Faultline live ingestion publishable key'
    );
  end if;
end
$$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'faultline-live-signal-ingestion';

select cron.schedule(
  'faultline-live-signal-ingestion',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'faultline_project_url') || '/functions/v1/ingest-live-signals',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'faultline_publishable_key'),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'faultline_publishable_key')
    ),
    body := '{"trigger":"schedule"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

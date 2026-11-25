-- Spec 0013 amendment, AC-23: a daily job that calls the `purge-cover-trash` Edge
-- Function. Deleting storage.objects rows in SQL does not delete the stored file,
-- so the function uses the Storage API; pg_cron only knocks on its door.
--
-- Two Vault secrets are needed before the job can work (never put them in a
-- migration). Run once per project in the SQL editor, see supabase/AGENTS.md:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the PURGE_SECRET function secret>', 'purge_secret');
-- Until they exist the job fails harmlessly (see cron.job_run_details).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- 03:17 UTC every day. Scheduling a name that exists replaces that job.
select cron.schedule(
  'purge-cover-trash',
  '17 3 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/purge-cover-trash',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'purge_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

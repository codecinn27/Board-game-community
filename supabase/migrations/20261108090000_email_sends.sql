-- Spec 0011: send log for account emails, with a daily cap enforced in the database.
-- Server bookkeeping, not member data: RLS on, no policies, service role only.

create table public.email_sends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('welcome')),
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  unique (user_id, kind)
);

create index email_sends_kind_sent_at_idx on public.email_sends (kind, sent_at);

alter table public.email_sends enable row level security;
revoke all on public.email_sends from anon, authenticated;
grant select, insert, update, delete on public.email_sends to service_role;

-- Returns 'claimed', 'capped', or 'duplicate'. One transaction under an advisory
-- lock, so two sign ups at the same moment cannot both pass the count.
create function public.claim_email_slot(p_user_id uuid, p_kind text, p_cap int)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  day_start timestamptz;
  used int;
  inserted int;
begin
  perform pg_advisory_xact_lock(hashtext('email_sends:' || p_kind));

  delete from public.email_sends where sent_at < now() - interval '30 days';

  if exists (
    select 1 from public.email_sends where user_id = p_user_id and kind = p_kind
  ) then
    return 'duplicate';
  end if;

  day_start := date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur')
    at time zone 'Asia/Kuala_Lumpur';
  select count(*) into used
  from public.email_sends
  where kind = p_kind and sent_at >= day_start;
  if used >= p_cap then
    return 'capped';
  end if;

  insert into public.email_sends (user_id, kind)
  values (p_user_id, p_kind)
  on conflict (user_id, kind) do nothing;
  get diagnostics inserted = row_count;
  return case when inserted > 0 then 'claimed' else 'duplicate' end;
end;
$$;

revoke execute on function public.claim_email_slot(uuid, text, int) from public, anon, authenticated;
grant execute on function public.claim_email_slot(uuid, text, int) to service_role;

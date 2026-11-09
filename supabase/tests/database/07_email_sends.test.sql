-- pgTAP tests for migration 7 (spec 0011: AC-6, AC-7, AC-8, AC-9).
-- Run with `supabase test db`.
begin;

delete from public.games;
delete from auth.users;

select plan(14);

create schema tests;
grant usage on schema tests to public;

create function tests.act_as(uid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create function tests.act_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
end;
$$;

grant execute on all functions in schema tests to public;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'a3@example.com'),
  ('00000000-0000-0000-0000-0000000000a4', 'a4@example.com'),
  ('00000000-0000-0000-0000-0000000000a5', 'a5@example.com');

-- AC-6, AC-7: cap and duplicate ----------------------------------------------------
set local role service_role;
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a1', 'welcome', 2), 'claimed',
  'AC-6: the first claim succeeds');
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a1', 'welcome', 2), 'duplicate',
  'AC-7: a second claim for the same member is a duplicate');
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a2', 'welcome', 2), 'claimed',
  'AC-6: the second member is claimed');
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a3', 'welcome', 2), 'capped',
  'AC-6: the third member is over the cap of 2');
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a1', 'welcome', 2), 'duplicate',
  'AC-7: a repeat over the cap is reported as duplicate, not capped');
select is((select count(*)::int from public.email_sends), 2, 'AC-6: a capped claim writes nothing');

-- AC-6: the Malaysia day boundary ----------------------------------------------------
reset role;
delete from public.email_sends;
insert into public.email_sends (user_id, kind, sent_at)
select '00000000-0000-0000-0000-0000000000a4', 'welcome',
  date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur') at time zone 'Asia/Kuala_Lumpur' - interval '1 second';
set local role service_role;
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a5', 'welcome', 1), 'claimed',
  'AC-6: a row one second before Malaysia midnight is not counted');

reset role;
delete from public.email_sends;
insert into public.email_sends (user_id, kind, sent_at)
select '00000000-0000-0000-0000-0000000000a4', 'welcome',
  date_trunc('day', now() at time zone 'Asia/Kuala_Lumpur') at time zone 'Asia/Kuala_Lumpur';
set local role service_role;
select is(public.claim_email_slot('00000000-0000-0000-0000-0000000000a5', 'welcome', 1), 'capped',
  'AC-6: a row exactly at Malaysia midnight is counted');

-- AC-8: retention and cascade ------------------------------------------------------------
reset role;
delete from public.email_sends;
insert into public.email_sends (user_id, kind, sent_at)
values ('00000000-0000-0000-0000-0000000000a4', 'welcome', now() - interval '31 days');
set local role service_role;
select public.claim_email_slot('00000000-0000-0000-0000-0000000000a5', 'welcome', 10);
select is((select count(*)::int from public.email_sends where user_id = '00000000-0000-0000-0000-0000000000a4'), 0,
  'AC-8: a 31 day old row is deleted by the next claim');

reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a5';
select is((select count(*)::int from public.email_sends), 0, 'AC-8: deleting the account deletes its row');

-- AC-9: only the service role --------------------------------------------------------------
select tests.act_anon();
select throws_ok($$ select * from public.email_sends $$, '42501', null, 'AC-9: anon cannot read email_sends');
select throws_ok($$ select public.claim_email_slot('00000000-0000-0000-0000-0000000000a1', 'welcome', 5) $$,
  '42501', null, 'AC-9: anon cannot run claim_email_slot');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select * from public.email_sends $$, '42501', null, 'AC-9: a member cannot read email_sends');
select throws_ok($$ select public.claim_email_slot('00000000-0000-0000-0000-0000000000a1', 'welcome', 5) $$,
  '42501', null, 'AC-9: a member cannot run claim_email_slot');

select * from finish();
rollback;

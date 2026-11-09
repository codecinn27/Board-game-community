-- pgTAP tests for migration 8 (usernames). Run with `supabase test db`.
begin;

delete from public.games;
delete from auth.users;

select plan(10);

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

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'b1@example.com', '{"username":"Kobe_9"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b2@example.com', '{}'),
  ('00000000-0000-0000-0000-0000000000b3', 'b3@example.com', '{"username":"bad name!"}');

-- The sign up trigger -------------------------------------------------------------
select is(
  (select username from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
  'Kobe_9', 'the username from sign up metadata is kept as typed');
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'),
  'Kobe_9', 'the display name starts as the username');
select matches(
  (select username from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  '^member_[0-9a-f]{12}$', 'a missing username gets a generated one');
select matches(
  (select username from public.profiles where id = '00000000-0000-0000-0000-0000000000b3'),
  '^member_[0-9a-f]{12}$', 'a malformed username gets a generated one');

-- Constraints -----------------------------------------------------------------------
select throws_ok(
  $$ update public.profiles set username = 'ab' where id = '00000000-0000-0000-0000-0000000000b1' $$,
  '23514', null, 'two characters is too short');
select throws_ok(
  $$ update public.profiles set username = 'me@home' where id = '00000000-0000-0000-0000-0000000000b1' $$,
  '23514', null, 'an @ is not allowed');
select throws_ok(
  $$ update public.profiles set username = 'Kobe_9' where id = '00000000-0000-0000-0000-0000000000b2' $$,
  '23505', null, 'a username is unique');
select lives_ok(
  $$ update public.profiles set username = 'kobe_9' where id = '00000000-0000-0000-0000-0000000000b2' $$,
  'uniqueness is case sensitive');

-- Privacy -----------------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$ select username from public.profiles $$,
  '42501', null, 'a member cannot read usernames');
select tests.act_anon();
select throws_ok(
  $$ select username from public.profiles $$,
  '42501', null, 'a guest cannot read usernames');

select * from finish();
rollback;

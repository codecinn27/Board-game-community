-- pgTAP tests for migration 10 (spec 0013: add a game, ownership, review).
-- Run with `supabase test db`.
begin;

delete from public.games;
delete from auth.users;

select plan(34);

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

create function tests.reset() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema tests to public;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ann@example.com', '{"username":"ann_a","full_name":"Ann"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'bo@example.com', '{"username":"bo_b","full_name":"Bo"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', '{"username":"admin_a","full_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000ae', 'admin2@example.com', '{"username":"admin_b","full_name":"Admin Two"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'off@example.com', '{"username":"off_d","full_name":"Off"}');
update public.profiles set role = 'admin'
  where id in ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-0000000000ae');
update public.profiles set status = 'disabled' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.games (name) values
  ('Catan'), ('Catan Junior'), ('Concatenate Cats'), ('Cat 100%'), ('卡坦岛');
insert into public.games (name) select 'Zed ' || n from generate_series(1, 12) n;
insert into public.game_owners (game_id, member_id)
  select id, '00000000-0000-0000-0000-0000000000a1' from public.games where name = 'Catan';
insert into public.game_owners (game_id, member_id)
  select id, '00000000-0000-0000-0000-0000000000a2' from public.games where name = 'Catan';

-- Unique name rule ------------------------------------------------------------------
select throws_ok($$ insert into public.games (name) values ('CATAN!') $$, '23505', null,
  'AC-6: a second spelling of an existing name is refused by the database');
select has_index('public', 'games', 'games_name_normalized_key', 'AC-6: the unique name index exists');
select is((select count(*)::int from public.games where reviewed_at is not null), 0,
  'AC-12: a game inserted by SQL starts unreviewed (the backfill only ran on old rows)');

-- search_games ----------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select array_agg(name order by ord) from (
     select name, row_number() over () as ord from public.search_games('CAT')) s),
  array['Cat 100%', 'Catan', 'Catan Junior', 'Concatenate Cats'],
  'AC-2: names that start with the text come first, then the rest, in normalized order');
select is((select name from public.search_games('catan') limit 1), 'Catan',
  'AC-2: an exact match comes first');
select is((select exact from public.search_games('  CATAN! ') limit 1), true,
  'AC-2: punctuation and case are ignored in the exact match');
select is((select count(*)::int from public.search_games('Catan') where exact), 1,
  'AC-2: only one result is exact');
select is((select count(*)::int from public.search_games('%')), 0,
  'AC-2: text of only punctuation returns nothing');
select is((select count(*)::int from public.search_games('   ')), 0,
  'AC-2: blank text returns nothing');
select is((select name from public.search_games('卡坦') limit 1), '卡坦岛',
  'AC-2: Chinese names match by their characters');
select is((select count(*)::int from public.search_games('zed')), 10,
  'AC-2: at most 10 results');
select is((select owner_names from public.search_games('catan') where exact), array['Ann', 'Bo'],
  'AC-2: owner names are sorted A to Z');
select is((select mine from public.search_games('catan') where exact), true,
  'AC-2: mine is true for a game the viewer owns');
select is((select mine from public.search_games('Catan Junior') where exact), false,
  'AC-2: mine is false otherwise');
select is((select owner_names from public.search_games('Catan Junior') where exact), '{}'::text[],
  'AC-2: a game nobody owns has no owner names');
select tests.act_anon();
select throws_ok($$ select * from public.search_games('catan') $$, '42501', null,
  'AC-1: a guest cannot call search_games');

-- add_game --------------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$ select public.add_game('  Brass: Birmingham ', 2::smallint, 4::smallint, 60::smallint, 120::smallint, 'Iron and coal.') $$,
  'AC-5: a member can add a game');
select results_eq(
  $$ select g.name, g.source_kind::text, g.added_by, g.reviewed_at is null, g.players_max::int
     from public.games g where g.name = 'Brass: Birmingham' $$,
  $$ values ('Brass: Birmingham'::text, 'manual'::text, '00000000-0000-0000-0000-0000000000a1'::uuid, true, 4) $$,
  'AC-5: the game is trimmed, manual, added by the member, and unreviewed');
select is(
  (select count(*)::int from public.game_owners o join public.games g on g.id = o.game_id
    where g.name = 'Brass: Birmingham' and o.member_id = '00000000-0000-0000-0000-0000000000a1'), 1,
  'AC-5: the adder is the first owner, from the same call');
select tests.act_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok($$ select public.add_game('brass birmingham', null, null, null, null, null) $$, '23505', null,
  'AC-6: the same normalized name raises 23505');
select throws_ok($$ select public.add_game('!!! ', null, null, null, null, null) $$, '22023', null,
  'AC-4: a name of only punctuation raises 22023');
select tests.act_anon();
select throws_ok($$ select public.add_game('Guest Game', null, null, null, null, null) $$, '42501', null,
  'AC-1: a guest cannot call add_game');
select tests.act_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok($$ select public.add_game('Disabled Game', null, null, null, null, null) $$, '42501', null,
  'AC-10: a disabled member cannot add a game');
select tests.reset();
select is((select count(*)::int from public.games where name = 'Disabled Game'), 0,
  'AC-10: the refused call left no game behind');

-- Review columns --------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ update public.games set reviewed_at = now() where name = 'Brass: Birmingham' $$, '42501', null,
  'AC-12: the adder cannot mark their own game reviewed');
select throws_ok($$ update public.games set cover_path = 'x.webp' where name = 'Brass: Birmingham' $$, '42501', null,
  'AC-12: the adder cannot set cover_path directly');
select throws_ok($$ select public.set_game_reviewed(1, true) $$, '42501', null,
  'AC-12: a member cannot call set_game_reviewed');
select tests.act_as('00000000-0000-0000-0000-0000000000ad');
select is(
  (select public.set_game_reviewed((select id from public.games where name = 'Brass: Birmingham'), true)),
  'ok', 'AC-14: an admin can mark a game reviewed');
select tests.act_as('00000000-0000-0000-0000-0000000000ae');
select is(
  (select public.set_game_reviewed((select id from public.games where name = 'Brass: Birmingham'), true)),
  'ok', 'AC-14: marking again is harmless');
select is(
  (select reviewed_by from public.games where name = 'Brass: Birmingham'),
  '00000000-0000-0000-0000-0000000000ad'::uuid,
  'AC-14: a double mark keeps the first reviewer');
select is(
  (select public.set_game_reviewed((select id from public.games where name = 'Brass: Birmingham'), false)),
  'ok', 'AC-14: an admin can clear the review');
select is(
  (select reviewed_at is null and reviewed_by is null from public.games where name = 'Brass: Birmingham'),
  true, 'AC-14: clearing empties both columns');
select is((select public.set_game_reviewed(999999, true)), 'notfound',
  'AC-14: an unknown game answers notfound');
select tests.reset();
select throws_ok($$ update public.games set reviewed_by = '00000000-0000-0000-0000-0000000000ad' where name = 'Catan' $$,
  '23514', null, 'AC-12: a reviewer without a review time is refused');

select * from finish();
rollback;

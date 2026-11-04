-- pgTAP tests for migration 5 (spec 0009: AC-1, AC-2).
-- Run with `supabase test db`.
begin;

-- Start from an empty database so the local seed data cannot collide with the fixtures below.
delete from public.games;
delete from auth.users;

select plan(22);

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
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{"full_name":"Alice"}');

-- AC-1: the column and its format check -------------------------------------------
select has_column('public', 'games', 'cover_tint', 'AC-1: games has cover_tint');
select col_is_null('public', 'games', 'cover_tint', 'AC-1: cover_tint is nullable');

select throws_ok($$ insert into public.games (name, cover_tint) values ('Bad', 'red') $$,
  '23514', null, 'AC-1: a color name is rejected');
select throws_ok($$ insert into public.games (name, cover_tint) values ('Bad', '#fff') $$,
  '23514', null, 'AC-1: the short form is rejected');
select throws_ok($$ insert into public.games (name, cover_tint) values ('Bad', '#ABCDEF') $$,
  '23514', null, 'AC-1: uppercase is rejected');
select throws_ok($$ insert into public.games (name, cover_tint) values ('Bad', '#12345g') $$,
  '23514', null, 'AC-1: a non hex character is rejected');
select throws_ok($$ insert into public.games (name, cover_tint) values ('Bad', ' #f3ead2') $$,
  '23514', null, 'AC-1: surrounding space is rejected');

select lives_ok($$ insert into public.games (name, cover_tint, added_by) values ('Tinted', '#f3ead2', '00000000-0000-0000-0000-00000000000a') $$,
  'AC-1: a lowercase #rrggbb is accepted');
select lives_ok($$ insert into public.games (name, cover_tint) values ('Plain', null) $$,
  'AC-1: null is accepted');

-- AC-1: who may read and write it ----------------------------------------------------
select tests.act_anon();
select is((select cover_tint from public.games where name = 'Tinted'), '#f3ead2',
  'AC-1: anon reads cover_tint');
select throws_ok($$ update public.games set cover_tint = '#000000' where name = 'Tinted' $$,
  '42501', null, 'AC-1: anon cannot change cover_tint');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select is((select cover_tint from public.games where name = 'Tinted'), '#f3ead2',
  'AC-1: a member reads cover_tint');
select throws_ok($$ update public.games set cover_tint = '#000000' where name = 'Tinted' $$,
  '42501', null, 'AC-1: a member cannot change cover_tint, even on their own game');
select throws_ok($$ insert into public.games (name, cover_tint, added_by) values ('Mine', '#000000', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'AC-1: a member cannot set cover_tint on insert');
reset role;

-- AC-2: the rebuilt view ---------------------------------------------------------------
select is((select cover_tint from public.game_stats where name = 'Tinted'), '#f3ead2',
  'AC-2: game_stats exposes cover_tint');
select is((select cover_tint from public.game_stats where name = 'Plain'), null,
  'AC-2: game_stats shows null for no tint');

select columns_are('public', 'game_stats',
  array[
    'id', 'name', 'name_normalized', 'cover_path', 'players_min', 'players_max',
    'play_time_min', 'play_time_max', 'description', 'source_kind', 'source_provider',
    'source_id', 'source_url', 'added_by', 'created_at', 'updated_at', 'cover_tint',
    'owner_count', 'rating_count', 'avg_time_to_learn', 'avg_luck', 'avg_strategy',
    'avg_entertainment', 'avg_recommendation', 'best_players_mode', 'wishlist_count'
  ],
  'AC-2: game_stats keeps every earlier column and adds cover_tint');

select is((select owner_count from public.game_stats where name = 'Plain'), 0,
  'AC-2: owner_count still works');
select is((select rating_count from public.game_stats where name = 'Plain'), 0,
  'AC-2: rating_count still works');
select is((select wishlist_count from public.game_stats where name = 'Plain'), 0,
  'AC-2: wishlist_count still works');

select tests.act_anon();
select lives_ok($$ select * from public.game_stats $$, 'AC-2: anon can read game_stats');
reset role;
select is((select (reloptions)[1] from pg_class where oid = 'public.game_stats'::regclass),
  'security_invoker=true', 'AC-2: game_stats is security_invoker');

select * from finish();
rollback;

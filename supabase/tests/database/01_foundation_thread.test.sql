-- pgTAP tests for migration 1 (spec 0002: AC-1, 2, 4, 5, 6, 7, 11, 12).
-- Run with `supabase test db`.
begin;

-- Start from an empty database so the local seed data cannot collide with the fixtures below.
delete from public.games;
delete from auth.users;

select plan(49);

-- Local helper: act as a given user (or anon) inside this transaction. -------
create schema tests;
grant usage on schema tests to public;

create function tests.reset() returns void language plpgsql as $$
begin
  reset role;
end;
$$;

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

-- Number of rows an update or delete touched under the current role.
create function tests.affected(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on all functions in schema tests to public;

-- Fixture users (the sign up trigger creates their profiles) -------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{"full_name": "Alice Wong"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com', '{"full_name": "   "}'),
  ('00000000-0000-0000-0000-00000000000d', 'dave@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'erin@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000f', '@example.com', '{}'),
  ('00000000-0000-0000-0000-000000000010', 'long@example.com', jsonb_build_object('full_name', repeat('x', 50))),
  ('00000000-0000-0000-0000-000000000011', 'gina@example.com', '{}');

-- Bootstrap by SQL: dave is the first admin, erin is disabled, gina is a disabled admin.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set status = 'disabled' where id = '00000000-0000-0000-0000-00000000000e';
update public.profiles set role = 'admin', status = 'disabled' where id = '00000000-0000-0000-0000-000000000011';

-- AC-11: sign up creates a profile -----------------------------------------------
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Alice Wong', 'AC-11: display name comes from the Google name');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'bob', 'AC-11: falls back to the email part before the at sign');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000c'),
  'carol', 'AC-11: a blank Google name falls back to the email part');
select is((select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000f'),
  'Member', 'AC-11: no name and no email part gives Member');
select is((select char_length(display_name) from public.profiles where id = '00000000-0000-0000-0000-000000000010'),
  40, 'AC-11: display name is capped at 40 characters');
select is((select role::text || '/' || status::text from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'member/active', 'AC-11: new profiles are active members');

-- AC-6: the first admin is set by SQL and the guard lets SQL through -------------
select is((select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000d'),
  'admin', 'AC-6: role can be set to admin by SQL');

-- AC-4: anonymous visitors -----------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.games (name) values ('Catan');
insert into public.games (name) values ('Nobody Owns This');
insert into public.games (name, source_kind, source_provider, source_id)
  values ('Gloomhaven', 'lookup', 'bgg', '174430');
select tests.reset();

select tests.act_anon();
select is((select count(*)::int from public.games), 3, 'AC-4: anon can read games');
select is((select count(*)::int from (select id, display_name, avatar_path, created_at from public.profiles) p), 8,
  'AC-4: anon can read the public profile columns');
select throws_ok($$ select * from public.profiles $$, '42501', null,
  'AC-4: anon select * on profiles is refused');
select throws_ok($$ select role from public.profiles $$, '42501', null,
  'AC-4: anon cannot read the role column');
select lives_ok($$ select * from public.game_stats $$, 'AC-4: anon can read game_stats');
select throws_ok($$ insert into public.games (name) values ('Sneaky') $$, '42501', null,
  'AC-5: anon cannot insert a game');
select throws_ok($$ insert into public.game_owners (game_id, member_id)
  values (1, '00000000-0000-0000-0000-00000000000a') $$, '42501', null,
  'AC-5: anon cannot insert an owner');
select throws_ok($$ update public.profiles set display_name = 'x' $$, '42501', null,
  'AC-5: anon cannot update a profile');
select tests.reset();

-- AC-1: one game, many owners -------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.game_owners (game_id, member_id)
  select id, '00000000-0000-0000-0000-00000000000a' from public.games where name = 'Catan';
select tests.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.game_owners (game_id)
  select id from public.games where name = 'Catan';
select tests.reset();

select is((select count(*)::int from public.games where name = 'Catan'), 1,
  'AC-1: a second owner creates no second game');
select is((select count(*)::int from public.game_owners o join public.games g on g.id = o.game_id where g.name = 'Catan'), 2,
  'AC-1: two owner rows for the one game');
select throws_ok($$ insert into public.game_owners (game_id, member_id)
  select id, '00000000-0000-0000-0000-00000000000b' from public.games where name = 'Catan' $$,
  '23505', null, 'AC-1: the same owner pair cannot be added twice');

-- AC-7: owner_count from game_stats, including a game nobody owns -------------------
select is((select owner_count from public.game_stats where name = 'Catan'), 2,
  'AC-7: owner_count is 2 for the shared game');
select is((select owner_count from public.game_stats where name = 'Nobody Owns This'), 0,
  'AC-7: a game with no owners still returns, with owner_count 0');

-- AC-5: member writes are limited to their own rows ----------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ insert into public.game_owners (game_id, member_id)
  select id, '00000000-0000-0000-0000-00000000000a' from public.games where name = 'Nobody Owns This' $$,
  '42501', null, 'AC-5: a member cannot mark a game owned for someone else');
select throws_ok($$ insert into public.games (name, added_by)
  values ('Spoof', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'AC-5: a member cannot add a game as someone else');
select throws_ok($$ insert into public.games (name, cover_path) values ('Covered', 'x.jpg') $$,
  '42501', null, 'AC-12: a member cannot set cover_path on insert');
select is(tests.affected($$ update public.profiles set display_name = 'Hacked'
  where id = '00000000-0000-0000-0000-00000000000a' $$), 0::bigint,
  'AC-5: a member cannot edit another profile');
select lives_ok($$ update public.profiles set display_name = 'Bobby'
  where id = '00000000-0000-0000-0000-00000000000b' $$,
  'AC-5: a member can edit their own display name');
select tests.reset();

-- AC-6: roles and status are out of reach for members --------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ update public.profiles set role = 'admin'
  where id = '00000000-0000-0000-0000-00000000000b' $$, '42501', null,
  'AC-6: a member cannot promote themselves');
select throws_ok($$ update public.profiles set status = 'active'
  where id = '00000000-0000-0000-0000-00000000000b' $$, '42501', null,
  'AC-6: a member cannot change their own status');
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select throws_ok($$ update public.profiles set role = 'member'
  where id = '00000000-0000-0000-0000-00000000000d' $$, '42501', null,
  'AC-6: an admin cannot change their own role');
select throws_ok($$ update public.profiles set status = 'disabled'
  where id = '00000000-0000-0000-0000-00000000000e' $$, '42501', null,
  'AC-6: an admin cannot set status through the table');
select tests.reset();

-- AC-5: a disabled member can read but not write ----------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select is((select count(*)::int from public.games), 3, 'AC-5: a disabled member can still read');
select throws_ok($$ insert into public.games (name) values ('Disabled Game') $$, '42501', null,
  'AC-5: a disabled member cannot add a game');
select throws_ok($$ insert into public.game_owners (game_id)
  select id from public.games where name = 'Catan' $$, '42501', null,
  'AC-5: a disabled member cannot mark a game owned');
select is(tests.affected($$ update public.profiles set display_name = 'Erin2'
  where id = '00000000-0000-0000-0000-00000000000e' $$), 0::bigint,
  'AC-5: a disabled member cannot edit their profile');
select tests.reset();

-- AC-12: who can edit a game and which columns ---------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select is(tests.affected($$ update public.games set name = 'Catan Deluxe' where name = 'Catan' $$), 0::bigint,
  'AC-12: a member who did not add the game cannot edit it');
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.games set source_id = '999' where name = 'Gloomhaven' $$, '42501', null,
  'AC-12: the adder cannot change source_id');
select throws_ok($$ update public.games set cover_path = 'x.jpg' where name = 'Gloomhaven' $$, '42501', null,
  'AC-12: the adder cannot change cover_path');
select throws_ok($$ update public.games set added_by = '00000000-0000-0000-0000-00000000000b'
  where name = 'Gloomhaven' $$, '42501', null,
  'AC-12: the adder cannot give the game away');
select lives_ok($$ update public.games set description = 'Dungeon crawler' where name = 'Gloomhaven' $$,
  'AC-12: the adder can edit ordinary fields');
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select lives_ok($$ update public.games set cover_path = 'covers/x.jpg' where name = 'Gloomhaven' $$,
  'AC-12: an admin can change protected columns');
select tests.act_as('00000000-0000-0000-0000-000000000011');
select is(tests.affected($$ update public.games set description = 'nope' where name = 'Gloomhaven' $$), 0::bigint,
  'AC-6: a disabled admin has no admin powers');
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select lives_ok($$ delete from public.games where name = 'Nobody Owns This' $$,
  'AC-12: an admin can delete a game (granted in migration 4)');
select tests.reset();

-- updated_at moves on edit ---------------------------------------------------------------------
insert into public.games (name, updated_at, added_by)
  values ('Old Game', '2000-01-01', '00000000-0000-0000-0000-00000000000a');
update public.games set description = 'touched' where name = 'Old Game';
select ok((select updated_at > '2000-01-01' from public.games where name = 'Old Game'),
  'updated_at is refreshed by the trigger on edit');

-- AC-2: duplicate sources and name matching ------------------------------------------------------
select throws_ok($$ insert into public.games (name, source_kind, source_provider, source_id)
  values ('Gloomhaven Again', 'lookup', 'bgg', '174430') $$, '23505', null,
  'AC-2: the same provider and source id cannot be stored twice');
select lives_ok($$ insert into public.games (name, source_kind, source_provider, source_id)
  values ('Other Provider', 'lookup', 'other', '174430') $$,
  'AC-2: the same source id under another provider is fine');
select throws_ok($$ insert into public.games (name, source_provider, source_id)
  values ('Manual With Source', 'bgg', '1') $$, '23514', null,
  'AC-2: a manual game cannot carry a provider');
select is((select name_normalized from public.games where name = 'Catan'), 'catan',
  'AC-2: name_normalized lowercases');
insert into public.games (name, added_by) values ('Catan!', '00000000-0000-0000-0000-00000000000a');
insert into public.games (name, added_by) values ('卡坦岛', '00000000-0000-0000-0000-00000000000a');
insert into public.games (name, added_by) values ('卡坦 岛！', '00000000-0000-0000-0000-00000000000a');
select is((select name_normalized from public.games where name = 'Catan!'), 'catan',
  'AC-2: punctuation is dropped so an exact match finds the existing game');
select is((select name_normalized from public.games where name = '卡坦岛'), '卡坦岛',
  'AC-2: Chinese names keep their characters');
select is((select count(*)::int from public.games where name_normalized = '卡坦岛'), 2,
  'AC-2: spaces and full width punctuation are ignored in the Chinese match');

select * from finish();
rollback;

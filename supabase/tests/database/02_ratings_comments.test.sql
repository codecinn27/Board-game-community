-- pgTAP tests for migration 2 (spec 0002: AC-3, AC-14 without wishlist_count).
-- Run with `supabase test db`.
begin;

-- Start from an empty database so the local seed data cannot collide with the fixtures below.
delete from public.games;
delete from auth.users;

select plan(23);

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

create function tests.affected(q text) returns bigint language plpgsql as $$
declare n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on all functions in schema tests to public;

-- Fixtures: alice, bob, carol active; erin disabled -------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'erin@example.com', '{}');
update public.profiles set status = 'disabled' where id = '00000000-0000-0000-0000-00000000000e';

insert into public.games (name, added_by) values
  ('Catan', '00000000-0000-0000-0000-00000000000a'),
  ('Unrated', '00000000-0000-0000-0000-00000000000a');
insert into public.game_owners (game_id, member_id)
  select id, m from public.games,
    (values ('00000000-0000-0000-0000-00000000000a'::uuid), ('00000000-0000-0000-0000-00000000000b'::uuid)) v(m)
  where name = 'Catan';

-- AC-14: unrated game has zero count and null averages ------------------------------
select is((select rating_count from public.game_stats where name = 'Unrated'), 0,
  'AC-14: an unrated game has rating_count 0');
select is((select avg_recommendation from public.game_stats where name = 'Unrated'), null,
  'AC-14: averages are null when unrated');
select is((select best_players_mode from public.game_stats where name = 'Unrated'), null,
  'AC-14: best_players_mode is null when unrated');

-- AC-3: ratings -----------------------------------------------------------------------
insert into public.ratings (game_id, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation, updated_at)
  select id, '00000000-0000-0000-0000-00000000000a', 4, 2, 3, 7, 8, 9, '2000-01-01' from public.games where name = 'Catan';
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 4, 2, 3, 7, 8, 9 from public.games where name = 'Catan' $$, '23505', null,
  'AC-3: a member has at most one rating per game');
select throws_ok($$ insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 4, 2, 3, 7, 8, 11 from public.games where name = 'Unrated' $$, '23514', null,
  'AC-3: a recommendation of 11 is rejected');
select throws_ok($$ insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 4, 6, 3, 7, 8, 9 from public.games where name = 'Unrated' $$, '23514', null,
  'AC-3: time_to_learn of 6 is rejected');
select throws_ok($$ insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 21, 2, 3, 7, 8, 9 from public.games where name = 'Unrated' $$, '23514', null,
  'AC-3: best_players of 21 is rejected');
select throws_ok($$ insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 4, 2, 0, 7, 8, 9 from public.games where name = 'Unrated' $$, '23514', null,
  'AC-3: luck of 0 is rejected');
select throws_ok($$ insert into public.ratings (game_id, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, '00000000-0000-0000-0000-00000000000b', 4, 2, 3, 7, 8, 9 from public.games where name = 'Unrated' $$, '42501', null,
  'AC-5: a member cannot rate as someone else');

-- Editing updates the same row and updated_at.
update public.ratings set recommendation = 8 where member_id = '00000000-0000-0000-0000-00000000000a';
select tests.reset();
select ok((select updated_at > '2000-01-01' from public.ratings), 'AC-3: editing refreshes updated_at');
select is((select count(*)::int from public.ratings), 1, 'AC-3: editing keeps one row');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ update public.ratings set game_id = (select id from public.games where name = 'Unrated') $$,
  '42501', null, 'AC-3: a rating cannot move to another game');
select throws_ok($$ update public.ratings set member_id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null, 'AC-3: a rating cannot move to another member');
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select is(tests.affected($$ update public.ratings set luck = 1 $$), 0::bigint,
  'AC-3: a member cannot edit another member''s rating');

-- Two more ratings to exercise the stats --------------------------------------------------
insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 3, 3, 4, 6, 7, 6 from public.games where name = 'Catan';
select tests.act_as('00000000-0000-0000-0000-00000000000c');
insert into public.ratings (game_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  select id, 5, 3, 5, 5, 7, 7 from public.games where name = 'Catan';
select tests.reset();

-- AC-14: stats --------------------------------------------------------------------------------
select is((select owner_count from public.game_stats where name = 'Catan'), 2,
  'AC-14: owner_count is not inflated by three ratings');
select is((select rating_count from public.game_stats where name = 'Catan'), 3,
  'AC-14: rating_count counts each rating once');
select is((select avg_recommendation from public.game_stats where name = 'Catan'), 7.0,
  'AC-14: average is rounded to one decimal (8, 6, 7)');
select is((select avg_time_to_learn from public.game_stats where name = 'Catan'), 2.7,
  'AC-14: avg_time_to_learn rounds to one decimal (2, 3, 3)');
select is((select best_players_mode from public.game_stats where name = 'Catan'), 3::smallint,
  'AC-14: on a three way tie (4, 3, 5) the lowest number wins');

-- Comments ------------------------------------------------------------------------------------
insert into public.comments (game_id, member_id, body, updated_at)
  select id, '00000000-0000-0000-0000-00000000000b', 'Great with four', '2000-01-01' from public.games where name = 'Catan';
select tests.act_as('00000000-0000-0000-0000-00000000000b');
update public.comments set body = 'Great with five';
select tests.reset();
select ok((select updated_at > '2000-01-01' from public.comments), 'comments: editing the body refreshes updated_at');

select tests.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ insert into public.comments (game_id, body) select id, '   ' from public.games where name = 'Catan' $$,
  '23514', null, 'comments: a blank body is rejected');
select tests.act_anon();
select throws_ok($$ insert into public.comments (game_id, body) select id, 'x' from public.games where name = 'Catan' $$,
  '42501', null, 'AC-5: anon cannot comment');
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ insert into public.comments (game_id, body) select id, 'x' from public.games where name = 'Catan' $$,
  '42501', null, 'AC-5: a disabled member cannot comment');
select tests.reset();

select * from finish();
rollback;

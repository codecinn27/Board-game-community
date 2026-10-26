-- pgTAP tests for migration 3 (spec 0002: AC-8, AC-9, AC-14 wishlist_count, AC-15 partly).
-- Run with `supabase test db`.
begin;

-- Start from an empty database so the local seed data cannot collide with the fixtures below.
delete from public.games;
delete from auth.users;

select plan(18);

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

grant execute on all functions in schema tests to public;

-- Fixtures: alice, bob active; erin disabled; six games ----------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'erin@example.com', '{}');
update public.profiles set status = 'disabled' where id = '00000000-0000-0000-0000-00000000000e';

insert into public.games (name, added_by)
  select 'Game ' || n, '00000000-0000-0000-0000-00000000000a' from generate_series(1, 6) n;

create function tests.gid(n int) returns bigint language sql as $$
  select id from public.games where name = 'Game ' || n;
$$;
grant execute on function tests.gid(int) to public;

-- AC-9: top picks ----------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.save_top_picks(array[tests.gid(1), tests.gid(2), tests.gid(3)]) $$,
  'AC-9: saving three picks works');
select lives_ok($$ select public.save_top_picks(array[tests.gid(3), tests.gid(1), tests.gid(5), tests.gid(2), tests.gid(4)]) $$,
  'AC-9: saving a new order of five works in one call');
select is((select game_id from public.top_picks where member_id = '00000000-0000-0000-0000-00000000000a' and position = 1),
  tests.gid(3), 'AC-9: the new order is stored by position');
select throws_ok($$ select public.save_top_picks(array[tests.gid(1), tests.gid(1)]) $$, '22023', null,
  'AC-9: a duplicate game is refused');
select throws_ok($$ select public.save_top_picks(array[tests.gid(1), null]) $$, '22023', null,
  'AC-9: a null id is refused');
select throws_ok($$ select public.save_top_picks(array[tests.gid(1), tests.gid(2), tests.gid(3), tests.gid(4), tests.gid(5), tests.gid(6)]) $$,
  '22023', null, 'AC-9: six ids are refused');
select throws_ok($$ select public.save_top_picks(null) $$, '22023', null, 'AC-9: a null array is refused');
select is((select count(*)::int from public.top_picks where member_id = '00000000-0000-0000-0000-00000000000a'), 5,
  'AC-9: refused calls leave the saved picks alone');
select lives_ok($$ select public.save_top_picks('{}') $$, 'AC-9: an empty array is accepted');
select is((select count(*)::int from public.top_picks), 0, 'AC-9: an empty array clears the picks');

select tests.act_as('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ select public.save_top_picks(array[tests.gid(1)]) $$, '42501', null,
  'AC-5: a disabled member cannot save picks');
select tests.act_anon();
select throws_ok($$ select public.save_top_picks(array[tests.gid(1)]) $$, '42501', null,
  'AC-5: anon cannot call save_top_picks');

-- AC-8: wishlist ------------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.wishlist_entries (game_id) values (tests.gid(1));
select tests.act_as('00000000-0000-0000-0000-00000000000b');
insert into public.wishlist_entries (game_id) values (tests.gid(1));
select tests.reset();
select is((select wishlist_count from public.game_stats where id = tests.gid(1)), 2,
  'AC-14: wishlist_count counts both wishes');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.game_owners (game_id) values (tests.gid(1));
select tests.reset();
select is((select array_agg(member_id) from public.wishlist_entries where game_id = tests.gid(1)),
  array['00000000-0000-0000-0000-00000000000b'::uuid],
  'AC-8: owning a game removes only that member''s wishlist row');
select is((select wishlist_count from public.game_stats where id = tests.gid(1)), 1,
  'AC-14: wishlist_count drops to one after the owner is added');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ insert into public.wishlist_entries (game_id) values (tests.gid(1)) $$, '23514', null,
  'AC-8: a member who owns a game cannot wish for it');
select throws_ok($$ insert into public.wishlist_entries (game_id, member_id)
  values (tests.gid(2), '00000000-0000-0000-0000-00000000000b') $$, '42501', null,
  'AC-5: a member cannot wish on behalf of someone else');
select tests.act_as('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ insert into public.wishlist_entries (game_id) values (tests.gid(2)) $$, '42501', null,
  'AC-5: a disabled member cannot wish');

select tests.reset();

select * from finish();
rollback;

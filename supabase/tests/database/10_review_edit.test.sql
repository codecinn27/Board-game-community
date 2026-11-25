-- pgTAP tests for migration 11 (spec 0013 amendment: review editing).
-- Run with `supabase test db`.
begin;

delete from public.games;
delete from auth.users;

select plan(51);

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

create function tests.act_service() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  set local role service_role;
end;
$$;

create function tests.reset() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create function tests.gid(n text) returns bigint language sql as $$
  select id from public.games where name = n;
$$;

create function tests.cat(s text) returns bigint language sql as $$
  select id from public.categories where slug = s;
$$;

-- Calls admin_update_game with fixed description, players, and time.
create function tests.upd(
  p_id bigint, p_name text, p_name_zh text default null,
  p_cats bigint[] default '{}', p_owners uuid[] default '{}',
  p_mark boolean default false, p_cover text default null
) returns text language sql as $$
  select public.admin_update_game(
    p_id, p_name, p_name_zh, 'd', null, 2::smallint, 4::smallint, 30::smallint, 60::smallint,
    p_cats, p_owners, p_cover, null, p_mark);
$$;

grant execute on all functions in schema tests to public;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ann@example.com', '{"username":"ann_a","full_name":"Ann"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', '{"username":"admin_a","full_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000d1', 'off@example.com', '{"username":"off_d","full_name":"Off"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';
update public.profiles set status = 'disabled' where id = '00000000-0000-0000-0000-0000000000d1';

insert into public.games (name, name_zh) values ('Alpha', null), ('Beta', '贝塔'), ('Gamma', null);
insert into public.games (name, added_by) values ('Delta', '00000000-0000-0000-0000-0000000000a1');
update public.games set reviewed_at = now() where name = 'Gamma';
insert into public.game_owners (game_id, member_id) values
  (tests.gid('Alpha'), '00000000-0000-0000-0000-0000000000a1'),
  (tests.gid('Delta'), '00000000-0000-0000-0000-0000000000a1'),
  (tests.gid('Delta'), '00000000-0000-0000-0000-0000000000d1');

-- Objects ---------------------------------------------------------------------------
select is((select count(*)::int from public.categories), 10, 'AC-25: the starter categories are seeded');
select is((select public from storage.buckets where id = 'covers-trash'), false,
  'AC-22: covers-trash is a private bucket');

-- Members and guests are refused -----------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ select tests.upd(tests.gid('Alpha'), 'Hacked') $$, '42501', null,
  'AC-20: a member cannot call admin_update_game');
select tests.act_anon();
select throws_ok($$ select tests.upd(tests.gid('Alpha'), 'Hacked') $$, '42501', null,
  'AC-20: a guest cannot call admin_update_game');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ insert into public.categories (slug, name_en, name_zh) values ('x', 'X', 'X') $$,
  '42501', null, 'AC-25: a member cannot add a category');
select throws_ok($$ insert into public.game_owners (game_id, member_id)
  values (tests.gid('Beta'), '00000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'a member cannot add someone else as an owner');
select throws_ok($$ update public.games set name_zh = 'x' where name = 'Delta' $$, '42501', null,
  'AC-17: a member cannot change name_zh, even on their own game');
select throws_ok($$ update public.games set cover_tint = '#000000' where name = 'Delta' $$, '42501', null,
  'AC-17: a member cannot change cover_tint');

-- Admin edit -------------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000ad');
select is(
  tests.upd(tests.gid('Alpha'), 'Alpha Prime', '阿尔法',
    array[tests.cat('strategy'), tests.cat('party')],
    array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000ad']::uuid[],
    false, 'x.webp'),
  'ok', 'AC-19: an admin edit returns ok');
select is(
  (select name || '|' || name_zh || '|' || cover_path from public.games where name = 'Alpha Prime'),
  'Alpha Prime|阿尔法|x.webp', 'AC-19: the game row has the new values');
select is((select count(*)::int from public.game_categories where game_id = tests.gid('Alpha Prime')), 2,
  'AC-25: both categories are linked');
select is(
  (select array_agg(member_id order by member_id) from public.game_owners where game_id = tests.gid('Alpha Prime')),
  array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000ad']::uuid[],
  'AC-17: the owner list is replaced');
select is((select count(*)::int from public.game_edits where game_id = tests.gid('Alpha Prime')), 1,
  'AC-21: one history row per save');
select is(
  (select changed from public.game_edits where game_id = tests.gid('Alpha Prime')),
  array['name', 'name_zh', 'description', 'players_min', 'players_max', 'play_time_min',
        'play_time_max', 'cover_path', 'category_ids', 'owner_ids'],
  'AC-21: the history row lists the changed fields');
select is(
  (select (before ->> 'name') || '>' || (after ->> 'name') from public.game_edits where game_id = tests.gid('Alpha Prime')),
  'Alpha>Alpha Prime', 'AC-21: the history row keeps before and after');
select is((select edited_by from public.game_edits where game_id = tests.gid('Alpha Prime')),
  '00000000-0000-0000-0000-0000000000ad'::uuid, 'AC-21: the history row names the editor');
select is((select game_name from public.game_edits where game_id = tests.gid('Alpha Prime')),
  'Alpha Prime', 'AC-21: the history row keeps the name at that moment');

-- Saving with no change writes no row; marking reviewed alone is not an edit.
select is(
  tests.upd(tests.gid('Alpha Prime'), 'Alpha Prime', '阿尔法',
    array[tests.cat('strategy'), tests.cat('party')],
    array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000ad']::uuid[],
    false, 'x.webp'),
  'ok', 'AC-19: saving with no change is ok');
select is((select count(*)::int from public.game_edits where game_id = tests.gid('Alpha Prime')), 1,
  'AC-19: no change writes no history row');
select is(
  tests.upd(tests.gid('Alpha Prime'), 'Alpha Prime', '阿尔法',
    array[tests.cat('strategy'), tests.cat('party')],
    array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000ad']::uuid[],
    true, 'x.webp'),
  'ok', 'AC-19: save and looks right is ok');
select is(
  (select reviewed_by from public.games where name = 'Alpha Prime'),
  '00000000-0000-0000-0000-0000000000ad'::uuid, 'AC-19: the game is reviewed by the admin');
select is((select count(*)::int from public.game_edits where game_id = tests.gid('Alpha Prime')), 1,
  'AC-21: marking reviewed alone writes no history row');

-- A reviewed game cannot be edited; unknown ids; bad input -----------------------------
select is(tests.upd(tests.gid('Alpha Prime'), 'Changed'), 'reviewed',
  'AC-20: a reviewed game is refused');
select is((select name from public.games where id = tests.gid('Alpha Prime')), 'Alpha Prime',
  'AC-20: a refused edit writes nothing');
select is(tests.upd(tests.gid('Gamma'), 'Changed'), 'reviewed', 'AC-20: a seeded reviewed game is refused');
select is(tests.upd(-1, 'Nope'), 'notfound', 'an unknown id returns notfound');
select throws_ok($$ select public.admin_update_game(tests.gid('Beta'), 'Beta', null, null, null,
  null, null, null, null, null, '{}', null, null, false) $$, '22023', null,
  'a null category list is refused');
select throws_ok($$ select public.admin_update_game(tests.gid('Beta'), 'Beta', null, null, null,
  null, null, null, null, '{}', null, null, null, false) $$, '22023', null,
  'a null owner list is refused');
select throws_ok($$ select tests.upd(tests.gid('Beta'), ' !! ') $$, '22023', null,
  'a name with no letter or number is refused');
select throws_ok($$ select tests.upd(tests.gid('Beta'), 'Beta', '??') $$, '22023', null,
  'a Chinese name with no letter or number is refused');

-- Name clashes -----------------------------------------------------------------------
select is(tests.upd(tests.gid('Beta'), 'alpha prime!', '贝塔'), 'clash',
  'AC-20: an English name that normalizes to another game clashes');
select is(tests.upd(tests.gid('Beta'), 'Beta', '阿尔法!'), 'clash',
  'AC-20: a Chinese name that normalizes to another game clashes');
select is((select name from public.games where id = tests.gid('Beta')), 'Beta',
  'AC-20: a clash writes nothing');
select is((select count(*)::int from public.game_edits where game_id = tests.gid('Beta')), 0,
  'AC-21: a clash writes no history row');
select is(tests.upd(tests.gid('Delta'), '贝塔',  null,
    '{}', array['00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1']::uuid[]),
  'ok', 'an English name equal to another game''s Chinese name is allowed; a disabled current owner may stay');
select is((select count(*)::int from public.game_owners where game_id = tests.gid('贝塔')), 2,
  'a disabled current owner is kept');
select throws_ok($$ select tests.upd(tests.gid('Beta'), 'Beta', '贝塔', '{}',
  array['00000000-0000-0000-0000-0000000000d1']::uuid[]) $$, '22023', null,
  'a new owner must be an active member');

-- History and trash are admin only ------------------------------------------------------
select throws_ok($$ insert into public.game_edits (game_id, game_name, changed, before, after)
  values (1, 'x', '{}', '{}', '{}') $$, '42501', null, 'AC-21: not even an admin inserts history directly');
select throws_ok($$ update public.game_edits set game_name = 'x' $$, '42501', null,
  'AC-21: history cannot be updated');
select throws_ok($$ delete from public.game_edits $$, '42501', null, 'AC-21: history cannot be deleted');
select cmp_ok((select count(*)::int from public.game_edits), '>', 0, 'AC-21: an admin reads history');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.game_edits), 0, 'AC-21: a member sees no history');
select tests.act_anon();
select throws_ok($$ select count(*) from public.game_edits $$, '42501', null,
  'AC-21: a guest cannot read history');

select tests.act_service();
select lives_ok($$ insert into public.cover_trash (path, game_id) values ('old.webp', 1) $$,
  'AC-22: the service role writes the cover trash');
select tests.act_as('00000000-0000-0000-0000-0000000000ad');
select is((select count(*)::int from public.cover_trash), 1, 'AC-22: an admin reads the cover trash');
select throws_ok($$ insert into public.cover_trash (path) values ('forged.webp') $$, '42501', null,
  'AC-22: an admin cannot write the cover trash directly');
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.cover_trash), 0, 'AC-22: a member sees no cover trash');
select tests.act_service();
select lives_ok($$ delete from public.cover_trash $$, 'AC-23: the purge deletes trash rows');

-- Search matches the Chinese name -----------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select is((select name from public.search_games('贝塔') where exact_zh), 'Beta',
  'AC-24: search finds a game by its Chinese name');
select is((select name from public.search_games('阿尔') limit 1), 'Alpha Prime',
  'AC-24: search matches part of a Chinese name');

-- History outlives the game ---------------------------------------------------------------
select tests.reset();
create temp table alpha_id as select id from public.games where name = 'Alpha Prime';
delete from public.games where name = 'Alpha Prime';
select is((select count(*)::int from public.game_edits where game_id = (select id from alpha_id)), 1,
  'AC-21: history survives deleting the game');

select * from finish();
rollback;

-- pgTAP tests for migration 12 (spec 0014: category groups).
-- Run with `supabase test db`.
begin;

delete from public.games;
delete from auth.users;

select plan(38);

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

create function tests.gid(n text) returns bigint language sql as $$
  select id from public.games where name = n;
$$;
create function tests.feel(s text) returns bigint language sql as $$
  select id from public.feels where slug = s;
$$;
create function tests.theme(s text) returns bigint language sql as $$
  select id from public.themes where slug = s;
$$;
create function tests.mech(s text) returns bigint language sql as $$
  select id from public.mechanics where slug = s;
$$;

create function tests.upd(
  p_id bigint, p_feels bigint[], p_themes bigint[], p_mechs bigint[]
) returns text language sql as $$
  select public.admin_update_game(
    p_id, 'Alpha', null, 'd', null, 2::smallint, 4::smallint, 30::smallint, 60::smallint,
    p_feels, p_themes, p_mechs, '{}', null, null, false);
$$;

grant execute on all functions in schema tests to public;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ann@example.com', '{"username":"ann_a","full_name":"Ann"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com', '{"username":"admin_a","full_name":"Admin"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

insert into public.games (name, description, players_min, players_max, play_time_min, play_time_max)
  values ('Alpha', 'd', 2, 4, 30, 60), ('Beta', 'd', 2, 4, 30, 60);
update public.games set reviewed_at = now() where name = 'Beta';

-- Seed (AC-1, AC-2) ---------------------------------------------------------------------
select is((select count(*)::int from public.feels), 5, 'AC-1: 5 feels');
select is((select count(*)::int from public.themes), 10, 'AC-1: 10 themes');
select is((select count(*)::int from public.mechanics), 20, 'AC-1: 20 mechanics');
select is((select count(distinct slug)::int from public.mechanics), 20, 'AC-1: mechanic slugs are unique');
select is((select array_agg(slug order by position) from public.feels),
  array['party-games', 'competitive', 'strategy', 'abstract-strategy', 'cooperative'],
  'AC-1: feels are seeded in position order');
select is((select min(position)::int from public.themes), 1, 'AC-1: positions start at 1');
select is(
  (select count(*)::int from public.mechanics
    where description_en is not null and description_zh is not null),
  20, 'AC-2: every mechanic has both hints');
select hasnt_column('public', 'feels', 'description_en', 'AC-2: feels have no description');
select hasnt_column('public', 'themes', 'description_zh', 'AC-2: themes have no description');
select throws_ok($$ insert into public.mechanics (slug, name_en, name_zh, description_en, position)
  values ('half', 'Half', '半', 'Only English', 99) $$, '23514', null,
  'AC-2: a mechanic with one hint is refused');
select throws_ok($$ insert into public.feels (slug, name_en, name_zh, position)
  values ('zero', 'Zero', '零', 0) $$, '23514', null, 'AC-1: position must be above 0');
select throws_ok($$ insert into public.feels (slug, name_en, name_zh, position)
  values ('dup', 'Dup', '重', 1) $$, '23505', null, 'AC-1: position is unique in its table');
select throws_ok($$ insert into public.themes (slug, name_en, name_zh, position)
  values ('blank', ' ', '空', 50) $$, '23514', null, 'AC-1: a blank name is refused');

-- Old objects are gone (AC-8) -------------------------------------------------------------
select hasnt_table('public', 'categories', 'AC-8: categories is dropped');
select hasnt_table('public', 'game_categories', 'AC-8: game_categories is dropped');
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'admin_update_game'
      and p.pronargs = 16),
  1, 'AC-8: only the new admin_update_game signature exists');

-- Nobody writes choices (AC-6) ---------------------------------------------------------------
select tests.act_anon();
select is((select count(*)::int from public.mechanics), 20, 'AC-6: a guest reads the choices');
select tests.act_as('00000000-0000-0000-0000-0000000000ad');
select throws_ok($$ insert into public.mechanics (slug, name_en, name_zh, position)
  values ('x', 'X', 'X', 99) $$, '42501', null, 'AC-6: an admin cannot add a mechanic');
select throws_ok($$ update public.themes set name_en = 'Changed' $$, '42501', null,
  'AC-6: an admin cannot change a theme');
select throws_ok($$ delete from public.feels $$, '42501', null, 'AC-6: an admin cannot delete a feel');
select tests.act_service();
select throws_ok($$ insert into public.feels (slug, name_en, name_zh, position)
  values ('x', 'X', 'X', 99) $$, '42501', null, 'AC-6: the service role cannot add a feel');
select throws_ok($$ update public.mechanics set name_en = 'Changed' $$, '42501', null,
  'AC-6: the service role cannot change a mechanic');
select throws_ok($$ delete from public.themes $$, '42501', null,
  'AC-6: the service role cannot delete a theme');

-- Link writes (AC-7) ----------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$ insert into public.game_feels (game_id, feel_id)
  values (tests.gid('Alpha'), tests.feel('strategy')) $$, '42501', null,
  'AC-7: a member cannot link a feel');
select throws_ok($$ insert into public.game_mechanics (game_id, mechanic_id)
  values (tests.gid('Alpha'), tests.mech('trading')) $$, '42501', null,
  'AC-7: a member cannot link a mechanic');
select tests.act_anon();
select throws_ok($$ insert into public.game_themes (game_id, theme_id)
  values (tests.gid('Alpha'), tests.theme('fantasy')) $$, '42501', null,
  'AC-7: a guest cannot link a theme');

-- Admin saves tags (AC-3, AC-5) -------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-0000000000ad');
select is(
  tests.upd(tests.gid('Alpha'),
    array[tests.feel('strategy'), tests.feel('cooperative')],
    array[tests.theme('horror')],
    array[tests.mech('trading'), tests.mech('bluffing'), tests.mech('voting')]),
  'ok', 'AC-5: an admin saves the three lists');
select is(
  (select changed from public.game_edits where game_id = tests.gid('Alpha')),
  array['feels', 'themes', 'mechanics'], 'AC-5: only the changed lists are recorded, in order');
select is(
  (select after -> 'mechanics' from public.game_edits where game_id = tests.gid('Alpha')),
  '["bluffing", "trading", "voting"]'::jsonb, 'AC-5: values are sorted slug arrays');
select is(
  (select before -> 'feels' from public.game_edits where game_id = tests.gid('Alpha')),
  '[]'::jsonb, 'AC-5: before is the saved list');

select is(
  tests.upd(tests.gid('Alpha'),
    array[tests.feel('strategy'), tests.feel('cooperative')],
    array[tests.theme('horror')],
    array[tests.mech('trading'), tests.mech('voting')]),
  'ok', 'AC-5: a second save changes one list');
select is(
  (select changed from public.game_edits where game_id = tests.gid('Alpha') order by id desc limit 1),
  array['mechanics'], 'AC-5: a list that did not change is not recorded');
select is((select count(*)::int from public.game_mechanics where game_id = tests.gid('Alpha')), 2,
  'AC-3: the mechanic links were replaced');

select throws_ok($$ select tests.upd(tests.gid('Alpha'), '{}', '{}', array[-5::bigint]) $$,
  '23503', null, 'an unknown choice id raises a foreign key error');
select throws_ok($$ select public.admin_update_game(tests.gid('Alpha'), 'Alpha', null, null, null,
  null, null, null, null, '{}', null, '{}', '{}', null, null, false) $$, '22023', null,
  'AC-9: a null theme list is refused');
select throws_ok($$ select public.admin_update_game(tests.gid('Alpha'), 'Alpha', null, null, null,
  null, null, null, null, '{}', '{}', null, '{}', null, null, false) $$, '22023', null,
  'AC-9: a null mechanic list is refused');

select is(tests.upd(tests.gid('Beta'), array[tests.feel('strategy')], '{}', '{}'), 'reviewed',
  'AC-10: a reviewed game is still locked');

-- Deleting a game removes its links (AC-3) -------------------------------------------------------
select tests.act_service();
reset role;
delete from public.games where name = 'Alpha';
select is((select count(*)::int from public.game_feels), 0, 'AC-3: deleting a game removes its links');

select * from finish();
rollback;

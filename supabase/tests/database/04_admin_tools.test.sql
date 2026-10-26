-- pgTAP tests for migration 4 and account deletion (spec 0002: AC-6, AC-10, AC-12, AC-13, AC-5 storage).
-- Run with `supabase test db`.
begin;

-- Start from an empty database so the local seed data cannot collide with the fixtures below.
delete from public.games;
delete from auth.users;

select plan(57);

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

-- Fixtures: alice and carol admins, bob member, dan disabled admin, erin disabled member -----
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'dan@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000e', 'erin@example.com', '{}');
-- Plain SQL passes the guards and writes no log row (the caller is not an admin member).
update public.profiles set role = 'admin'
  where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c',
               '00000000-0000-0000-0000-00000000000d');
update public.profiles set status = 'disabled'
  where id in ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000e');

insert into public.games (name, added_by) values
  ('Bob Game', '00000000-0000-0000-0000-00000000000b'),
  ('Alice Game', '00000000-0000-0000-0000-00000000000a'),
  ('Spare Game', '00000000-0000-0000-0000-00000000000b');

create function tests.gid(n text) returns bigint language sql as $$
  select id from public.games where name = n;
$$;
grant execute on function tests.gid(text) to public;

insert into public.comments (game_id, member_id, body) values
  (tests.gid('Spare Game'), '00000000-0000-0000-0000-00000000000b', 'bob comment'),
  (tests.gid('Spare Game'), '00000000-0000-0000-0000-00000000000b', 'keep me'),
  (tests.gid('Spare Game'), '00000000-0000-0000-0000-00000000000a', 'alice comment'),
  (tests.gid('Spare Game'), '00000000-0000-0000-0000-00000000000c', 'carol comment');
insert into public.comments (game_id, member_id, body)
  select tests.gid('Bob Game'), '00000000-0000-0000-0000-00000000000b', 'bulk ' || n
  from generate_series(1, 20) n;

select is((select count(*)::int from public.admin_actions), 0,
  'AC-13: fixture changes made by plain SQL write no log rows');

-- AC-13: comment removal and the log ----------------------------------------------------
select tests.act_anon();
select throws_ok($$ select * from public.admin_actions $$, '42501', null,
  'AC-4: anon cannot read the admin log');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ delete from public.comments where body = 'bob comment' $$,
  'AC-13: an admin deletes another member''s comment');
select is((select count(*)::int from public.admin_actions), 1,
  'AC-13: that delete wrote exactly one log row');
select is((select action || ':' || target_table from public.admin_actions), 'delete_comment:comments',
  'AC-13: the log row names the action and table');
select is((select details ->> 'admin_display_name' from public.admin_actions), 'alice',
  'AC-13: the log row keeps the admin''s display name');
select is((select jsonb_exists(details -> 'old', 'body') from public.admin_actions), false,
  'AC-13: the deleted comment text is not kept');

select lives_ok($$ delete from public.comments where body = 'alice comment' $$,
  'AC-13: an admin deletes their own comment');
select is((select count(*)::int from public.admin_actions), 1,
  'AC-13: an admin acting on their own row writes no log row');

select throws_ok($$ insert into public.admin_actions (action, target_table, target_id)
  values ('x', 'comments', '1') $$, '42501', null,
  'AC-13: nobody inserts into the log directly');
select throws_ok($$ update public.admin_actions set action = 'x' $$, '42501', null,
  'AC-13: nobody updates the log');
select throws_ok($$ delete from public.admin_actions $$, '42501', null,
  'AC-13: nobody deletes from the log');

select tests.reset();
set local role service_role;
select throws_ok($$ insert into public.admin_actions (action, target_table, target_id)
  values ('x', 'comments', '1') $$, '42501', null,
  'AC-13: even service_role cannot insert into the log');
select tests.reset();

-- AC-13: non admins and disabled admins ---------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.admin_actions), 0,
  'AC-13: a non admin reads no log rows');
select lives_ok($$ delete from public.comments where body = 'carol comment' $$,
  'AC-13: a member deleting someone else''s comment is not an error');
select lives_ok($$ delete from public.comments where body = 'keep me' $$,
  'AC-5: a member deletes their own comment');
select lives_ok($$ delete from public.games where name = 'Spare Game' $$,
  'AC-12: a member deleting a game is not an error');
select tests.reset();
select is((select count(*)::int from public.comments where body = 'carol comment'), 1,
  'AC-13: the other member''s comment is still there');
select is((select count(*)::int from public.games where name = 'Spare Game'), 1,
  'AC-12: only admins delete games');
select is((select count(*)::int from public.admin_actions), 1,
  'AC-13: non admin actions write no log rows');

select tests.act_as('00000000-0000-0000-0000-00000000000d');
select lives_ok($$ delete from public.comments where body = 'carol comment' $$,
  'AC-6: a disabled admin deleting a comment is not an error');
select tests.reset();
select is((select count(*)::int from public.comments where body = 'carol comment'), 1,
  'AC-6: a disabled admin has no admin powers');
select tests.act_as('00000000-0000-0000-0000-00000000000d');
select throws_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000b', 'disabled') $$,
  '42501', null, 'AC-6: a disabled admin cannot change a status');

-- AC-13: games ------------------------------------------------------------------------------
select tests.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ delete from public.games where name = 'Bob Game' $$,
  'AC-12: an admin deletes a game that has 20 comments');
select tests.reset();
select is((select count(*)::int from public.admin_actions where action = 'delete_game'), 1,
  'AC-13: deleting a game logs once');
select is((select count(*)::int from public.comments where body like 'bulk %'), 0,
  'AC-15: the game''s comments went with it');
select is((select count(*)::int from public.admin_actions), 2,
  'AC-13: cascaded comment deletes add no log rows');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ update public.games set description = 'mine' where name = 'Alice Game' $$,
  'AC-12: an admin edits their own game');
select is((select count(*)::int from public.admin_actions where action = 'update_game'), 0,
  'AC-13: an admin editing their own game writes no log row');
select lives_ok($$ update public.games set description = 'fixed' where name = 'Spare Game' $$,
  'AC-12: an admin edits another member''s game');
select is((select count(*)::int from public.admin_actions where action = 'update_game'), 1,
  'AC-13: editing another member''s game writes one log row');

-- AC-6 and AC-13: member status ----------------------------------------------------------------
select lives_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000b', 'disabled') $$,
  'AC-6: an admin disables another member');
select tests.reset();
select is((select status::text from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'disabled',
  'AC-6: the member is now disabled');
select is((select details ->> 'new' from public.admin_actions where action = 'set_status'), 'disabled',
  'AC-13: the status change is logged once with the new value');

select tests.act_as('00000000-0000-0000-0000-00000000000a');
select throws_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000a', 'disabled') $$,
  '42501', null, 'AC-6: an admin cannot change their own status');
select throws_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-0000000000ff', 'disabled') $$,
  'P0002', null, 'AC-6: an unknown member is reported');
select throws_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000b', null) $$,
  '22023', null, 'AC-6: a null status is refused');
select throws_ok($$ update public.profiles set role = 'member' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'AC-6: an admin cannot change their own role through the table');
select lives_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000b', 'active') $$,
  'AC-6: an admin re enables the member');
select tests.reset();
select is((select count(*)::int from public.admin_actions where action = 'set_status'), 2,
  'AC-13: each status change wrote one log row');

select tests.act_as('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000c', 'disabled') $$,
  '42501', null, 'AC-6: a non admin cannot change a status');
select tests.act_anon();
select throws_ok($$ select public.admin_set_member_status('00000000-0000-0000-0000-00000000000b', 'disabled') $$,
  '42501', null, 'AC-6: anon cannot call admin_set_member_status');

-- AC-5: storage buckets -------------------------------------------------------------------------------
select tests.reset();
select is((select public from storage.buckets where id = 'covers'), true, 'the covers bucket is public');
select is((select file_size_limit from storage.buckets where id = 'avatars'), 2097152::bigint,
  'the avatars bucket limits files to 2 MB');

select tests.act_as('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-00000000000b/me.png') $$,
  'AC-5: a member writes inside their own avatar folder');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-00000000000a/me.png') $$, '42501', null,
  'AC-5: a member cannot write another member''s avatar folder');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('covers', 'game.webp') $$, '42501', null,
  'a member cannot write to the covers bucket');
select lives_ok($$ update storage.objects set metadata = '{}'::jsonb
  where bucket_id = 'avatars' and name = '00000000-0000-0000-0000-00000000000b/me.png' $$,
  'AC-5: a member replaces their own avatar file');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1,
  'a member sees their own avatar file');

select tests.act_as('00000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0,
  'another member does not list that avatar file');

select tests.act_as('00000000-0000-0000-0000-00000000000e');
select throws_ok($$ insert into storage.objects (bucket_id, name)
  values ('avatars', '00000000-0000-0000-0000-00000000000e/me.png') $$, '42501', null,
  'AC-5: a disabled member cannot write their own avatar folder');

-- AC-10: account deletion ---------------------------------------------------------------------------------
-- The app removes avatars/<id>/ files first, then deletes the auth user (feature 6).
select tests.reset();
insert into auth.users (id, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-00000000000f', 'frank@example.com', '{}');
insert into public.games (name, added_by) values ('Frank Game', '00000000-0000-0000-0000-00000000000f');
insert into public.game_owners (game_id, member_id) values
  (tests.gid('Frank Game'), '00000000-0000-0000-0000-00000000000f'),
  (tests.gid('Frank Game'), '00000000-0000-0000-0000-00000000000c');
insert into public.ratings (game_id, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
  values (tests.gid('Frank Game'), '00000000-0000-0000-0000-00000000000f', 3, 2, 4, 5, 6, 7);
insert into public.comments (game_id, member_id, body)
  values (tests.gid('Frank Game'), '00000000-0000-0000-0000-00000000000f', 'frank says hi');
insert into public.top_picks (member_id, position, game_id)
  values ('00000000-0000-0000-0000-00000000000f', 1, tests.gid('Frank Game'));
insert into public.wishlist_entries (member_id, game_id)
  values ('00000000-0000-0000-0000-00000000000f', tests.gid('Alice Game'));

select lives_ok($$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000f' $$,
  'AC-10: deleting an auth user passes the guard triggers');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-00000000000f'), 0,
  'AC-10: the profile is gone');
select is(
  (select (select count(*) from public.game_owners where member_id = '00000000-0000-0000-0000-00000000000f')
        + (select count(*) from public.ratings where member_id = '00000000-0000-0000-0000-00000000000f')
        + (select count(*) from public.comments where member_id = '00000000-0000-0000-0000-00000000000f')
        + (select count(*) from public.top_picks where member_id = '00000000-0000-0000-0000-00000000000f')
        + (select count(*) from public.wishlist_entries where member_id = '00000000-0000-0000-0000-00000000000f')),
  0::bigint, 'AC-10: ownership, ratings, comments, top picks, and wishlist entries are gone');
select ok(exists (select 1 from public.games where name = 'Frank Game' and added_by is null),
  'AC-10: the game stays with added_by set to null');
select is((select owner_count from public.game_stats where name = 'Frank Game'), 1,
  'AC-10: other owners keep the game');
select is((select count(*)::int from public.admin_actions where target_id = '00000000-0000-0000-0000-00000000000f'), 0,
  'AC-10: deleting an account writes no log row');

select * from finish();
rollback;

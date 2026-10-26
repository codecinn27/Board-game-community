-- Local development seed (spec 0002, build task 9). Loaded by `supabase db reset`.
-- Never run this against a real project: it creates accounts with a known password.
--
-- Accounts (password for all: password123):
--   alice@example.com  admin   (the first admin bootstrap, see the note below)
--   bob@example.com    member
--   carol@example.com  member
--   dan@example.com    member, disabled
--
-- First admin bootstrap (real project): no member can promote themselves, so the first admin is set
-- once by SQL, from the dashboard SQL editor or with the secret key:
--   update public.profiles set role = 'admin' where id = '<auth user id>';

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'alice@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Tan"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'bob@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Lim"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carol@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"陈小美"}', now(), now(),
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'dan@example.com', crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(),
   '', '', '', '', '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text, 'email',
       json_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true)::jsonb,
       now(), now(), now()
from auth.users u
where u.email like '%@example.com';

-- The sign up trigger made the profiles. Plain SQL passes the guard triggers.
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set status = 'disabled' where id = '00000000-0000-0000-0000-00000000000d';

insert into public.games (name, players_min, players_max, play_time_min, play_time_max, description, source_kind, added_by) values
  ('Catan', 3, 4, 60, 120, 'Trade, build, and settle an island.', 'manual', '00000000-0000-0000-0000-00000000000a'),
  ('Azul', 2, 4, 30, 45, 'Draft tiles and decorate the palace wall.', 'manual', '00000000-0000-0000-0000-00000000000b'),
  ('Pandemic', 2, 4, 45, 60, 'Work together to stop four diseases.', 'manual', '00000000-0000-0000-0000-00000000000b'),
  ('三国杀', 2, 10, 30, 60, '三国题材的身份推理卡牌游戏。', 'manual', '00000000-0000-0000-0000-00000000000c'),
  ('Wingspan', 1, 5, 40, 70, 'Attract birds to your wildlife preserve.', 'manual', '00000000-0000-0000-0000-00000000000a');

create temporary table seed_game as
  select id, name from public.games;

-- Owners: Catan has two owners, Wingspan none (so it can sit on a wishlist, a game with no owners).
insert into public.game_owners (game_id, member_id)
select g.id, o.member_id
from (values
  ('Catan', '00000000-0000-0000-0000-00000000000a'::uuid),
  ('Catan', '00000000-0000-0000-0000-00000000000b'::uuid),
  ('Azul', '00000000-0000-0000-0000-00000000000b'::uuid),
  ('Pandemic', '00000000-0000-0000-0000-00000000000b'::uuid),
  ('三国杀', '00000000-0000-0000-0000-00000000000c'::uuid)
) as o(game_name, member_id)
join seed_game g on g.name = o.game_name;

insert into public.wishlist_entries (game_id, member_id)
select g.id, w.member_id
from (values
  ('Wingspan', '00000000-0000-0000-0000-00000000000b'::uuid),
  ('Wingspan', '00000000-0000-0000-0000-00000000000c'::uuid)
) as w(game_name, member_id)
join seed_game g on g.name = w.game_name;

insert into public.ratings (game_id, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation, comment)
select g.id, r.member_id, r.best_players, r.time_to_learn, r.luck, r.strategy, r.entertainment, r.recommendation, r.comment
from (values
  ('Catan', '00000000-0000-0000-0000-00000000000a'::uuid, 4, 2, 6, 6, 8, 8, 'Great with four.'),
  ('Catan', '00000000-0000-0000-0000-00000000000b'::uuid, 4, 2, 7, 5, 7, 7, null),
  ('Azul', '00000000-0000-0000-0000-00000000000b'::uuid, 2, 1, 2, 7, 8, 9, 'Quick and pretty.'),
  ('Azul', '00000000-0000-0000-0000-00000000000c'::uuid, 3, 1, 3, 7, 7, 8, null),
  ('三国杀', '00000000-0000-0000-0000-00000000000c'::uuid, 6, 3, 6, 6, 9, 9, '人多更好玩。')
) as r(game_name, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation, comment)
join seed_game g on g.name = r.game_name;

insert into public.comments (game_id, member_id, body)
select g.id, c.member_id, c.body
from (values
  ('Catan', '00000000-0000-0000-0000-00000000000b'::uuid, 'Happy to lend this out for game night.'),
  ('Azul', '00000000-0000-0000-0000-00000000000c'::uuid, 'Looking forward to trying this.'),
  ('三国杀', '00000000-0000-0000-0000-00000000000a'::uuid, '什么时候可以一起玩？')
) as c(game_name, member_id, body)
join seed_game g on g.name = c.game_name;

insert into public.top_picks (member_id, position, game_id)
select t.member_id, t.position, g.id
from (values
  ('00000000-0000-0000-0000-00000000000b'::uuid, 1::smallint, 'Azul'),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 2::smallint, 'Catan'),
  ('00000000-0000-0000-0000-00000000000c'::uuid, 1::smallint, '三国杀')
) as t(member_id, position, game_name)
join seed_game g on g.name = t.game_name;

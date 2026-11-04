-- Local development seed (spec 0009). Loaded by `supabase db reset`.
-- Never run this against a real project: it creates accounts with a known password.
--
-- It holds the sample community the app was designed on: 12 games with their cover
-- tints, five members, the owners, and a few ratings, comments, and picks, so every
-- state of home, the shelf, and the game sheet can be seen locally. Your real games
-- go in through data/games.json and `pnpm seed:games` instead, not through this file.
--
-- Accounts (password for all: password123):
--   mei@example.com   admin   (the first admin bootstrap, see the note below)
--   sara@example.com  member
--   jun@example.com   member
--   arif@example.com  member
--   lin@example.com   member  (rates games, owns none)
--
-- First admin bootstrap (real project): no member can promote themselves, so the first admin is set
-- once by SQL, from the dashboard SQL editor or with the secret key:
--   update public.profiles set role = 'admin' where id = '<auth user id>';

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  m.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  m.email, crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, json_build_object('full_name', m.full_name)::jsonb, now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'mei@example.com', 'Mei'),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'sara@example.com', 'Sara'),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'jun@example.com', 'Jun'),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'arif@example.com', 'Arif'),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'lin@example.com', 'Lin')
) as m(id, email, full_name);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text, 'email',
       json_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true)::jsonb,
       now(), now(), now()
from auth.users u
where u.email like '%@example.com';

-- The sign up trigger made the profiles. Plain SQL passes the guard triggers.
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000001';

-- Games: explicit ids so tests and links stay stable, then the id counter moves past them.
-- A null cover_tint (Just One, 三国杀) gives the neutral sheet tint. Ticket to Ride has no adder.
insert into public.games (id, name, cover_tint, players_min, players_max, play_time_min, play_time_max, description, created_at, added_by)
overriding system value
values
  (1, 'Wingspan', '#f3ead2', 1, 5, 40, 70, 'Attract birds to your wildlife preserve. Each bird you play makes a habitat engine stronger, letting you feed, nest, and lay eggs a little better every round. A calm game with a lot of quiet planning, and the cards are lovely to look at.', '2026-08-02T11:00:00Z', '00000000-0000-4000-8000-000000000002'),
  (2, 'Codenames', '#1f2a44', 2, 8, 15, 30, 'Two teams of spies race to find their agents on a grid of word cards. Each spymaster gives a one word clue for several cards at once, and the team has to guess without touching the assassin. Loud, quick, and great with a crowd.', '2026-08-09T11:00:00Z', '00000000-0000-4000-8000-000000000001'),
  (3, 'Cascadia', '#f4cfa3', 1, 4, 30, 45, 'Build a small corner of the Pacific Northwest by laying habitat tiles and placing wildlife on them. Match the animals to your scoring cards while your landscape grows. Easy to teach, relaxing to play, and rarely the same twice.', '2026-08-23T11:00:00Z', '00000000-0000-4000-8000-000000000001'),
  (4, 'Ticket to Ride', '#c9a46a', 2, 5, 30, 60, 'Collect train cards and claim railway routes across the map to join distant cities. Finish your secret tickets for big points, and block the other players when you can. A gentle gateway game that works for families.', '2026-09-06T11:00:00Z', null),
  (5, 'SETI', '#3fa6c2', 1, 4, 40, 160, 'Scan the sky for signs of alien life. You launch probes, track signals, and decode data before anyone else does, balancing a tight action budget against a board that keeps moving. A heavier game, best with people who like planning.', '2026-09-20T11:00:00Z', '00000000-0000-4000-8000-000000000003'),
  (6, 'Magical Athlete', '#e0452e', 2, 5, 30, 30, 'A silly race where every runner has a power that bends the rules. Pick your athletes, bet on the winner, and watch the track turn into chaos. Short, loud, and best with people who enjoy a bit of mischief.', '2026-10-04T11:00:00Z', '00000000-0000-4000-8000-000000000004'),
  (7, 'Azul', '#2f5d8a', 2, 4, 30, 45, 'Draft colorful tiles and place them on your wall to decorate the royal palace. Every tile you take can hand your neighbor a better one, so you plan ahead and watch what is left. Pretty, quick, and sharp.', '2026-10-11T11:00:00Z', '00000000-0000-4000-8000-000000000004'),
  (8, 'Splendor', '#4b3a6b', 2, 4, 30, 30, 'Be a merchant in the Renaissance. Take gem tokens, buy mines and shops, and win the favor of nobles. A tidy engine builder where each purchase makes the next one cheaper.', '2026-10-18T11:00:00Z', '00000000-0000-4000-8000-000000000003'),
  (9, 'Dixit', '#9fc3db', 3, 6, 30, 30, 'One player gives a clue to a dreamlike picture card, and everyone else tries to find it among decoys. Score only if some, but not all, of the table guesses right. A game about imagination more than rules.', '2026-10-26T11:00:00Z', '00000000-0000-4000-8000-000000000001'),
  (10, 'Ark Nova', '#e9b44c', 1, 4, 90, 150, 'Plan and build a modern zoo. You play animal and sponsor cards, build enclosures, and support conservation projects, with every action card getting stronger as you use it. A big game that takes a few plays to enjoy.', '2026-10-29T11:00:00Z', '00000000-0000-4000-8000-000000000003'),
  (11, 'Just One', null, null, null, null, null, null, '2026-10-31T09:00:00Z', '00000000-0000-4000-8000-000000000002'),
  (12, '三国杀', null, 2, 10, 30, 60, '三国题材的身份推理卡牌游戏。每位玩家扮演一位武将，隐藏自己的身份，在主公、忠臣、反贼与内奸之间互相试探，最后达成各自的胜利条件。', '2026-11-01T02:00:00Z', '00000000-0000-4000-8000-000000000001');

select setval(pg_get_serial_sequence('public.games', 'id'), (select max(id) from public.games));

-- Owners, each link dated like its game, as if the owners had it from the start.
insert into public.game_owners (game_id, member_id, created_at)
select o.game_id, o.member_id::uuid, g.created_at
from (values
  (1, '00000000-0000-4000-8000-000000000001'),
  (1, '00000000-0000-4000-8000-000000000004'),
  (1, '00000000-0000-4000-8000-000000000003'),
  (1, '00000000-0000-4000-8000-000000000002'),
  (2, '00000000-0000-4000-8000-000000000001'),
  (2, '00000000-0000-4000-8000-000000000004'),
  (2, '00000000-0000-4000-8000-000000000003'),
  (3, '00000000-0000-4000-8000-000000000001'),
  (3, '00000000-0000-4000-8000-000000000002'),
  (4, '00000000-0000-4000-8000-000000000004'),
  (4, '00000000-0000-4000-8000-000000000002'),
  (5, '00000000-0000-4000-8000-000000000003'),
  (6, '00000000-0000-4000-8000-000000000004'),
  (6, '00000000-0000-4000-8000-000000000002'),
  (7, '00000000-0000-4000-8000-000000000004'),
  (7, '00000000-0000-4000-8000-000000000002'),
  (8, '00000000-0000-4000-8000-000000000003'),
  (9, '00000000-0000-4000-8000-000000000001'),
  (10, '00000000-0000-4000-8000-000000000003'),
  (11, '00000000-0000-4000-8000-000000000002'),
  (12, '00000000-0000-4000-8000-000000000001')
) as o(game_id, member_id)
join public.games g on g.id = o.game_id;

-- Ratings. Only the recommendation differs per row; the rest are plain fixed values.
-- Counts match the design data. The averages are as close as whole number ratings allow
-- (Codenames 7.5, Cascadia 8.3, SETI 8.7, Dixit 8.0 and so on). Just One has none.
insert into public.ratings (game_id, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation)
select r.game_id, m.id, 3, 2, 5, 6, r.recommendation, r.recommendation
from (values
  (1, 1, 8), (1, 2, 8), (1, 3, 8), (1, 4, 8), (1, 5, 8),
  (2, 1, 7), (2, 2, 7), (2, 3, 8), (2, 4, 8),
  (3, 1, 8), (3, 2, 8), (3, 3, 8), (3, 4, 9),
  (4, 1, 7), (4, 2, 8),
  (5, 1, 9), (5, 2, 9), (5, 3, 8),
  (6, 1, 9), (6, 2, 8), (6, 3, 7),
  (7, 1, 8), (7, 2, 8), (7, 3, 7),
  (8, 1, 7), (8, 2, 8),
  (9, 1, 8),
  (10, 1, 8), (10, 2, 9),
  (12, 1, 7), (12, 2, 7)
) as r(game_id, rater, recommendation)
join (values
  (1, '00000000-0000-4000-8000-000000000001'::uuid), (2, '00000000-0000-4000-8000-000000000002'::uuid),
  (3, '00000000-0000-4000-8000-000000000003'::uuid), (4, '00000000-0000-4000-8000-000000000004'::uuid),
  (5, '00000000-0000-4000-8000-000000000005'::uuid)
) as m(n, id) on m.n = r.rater;

insert into public.wishlist_entries (game_id, member_id) values
  (10, '00000000-0000-4000-8000-000000000002'),
  (10, '00000000-0000-4000-8000-000000000004');

insert into public.comments (game_id, member_id, body) values
  (1, '00000000-0000-4000-8000-000000000003', 'Happy to lend this out for game night.'),
  (7, '00000000-0000-4000-8000-000000000005', 'Looking forward to trying this.'),
  (12, '00000000-0000-4000-8000-000000000002', '什么时候可以一起玩？');

insert into public.top_picks (member_id, position, game_id) values
  ('00000000-0000-4000-8000-000000000001', 1, 3),
  ('00000000-0000-4000-8000-000000000001', 2, 1),
  ('00000000-0000-4000-8000-000000000002', 1, 10);

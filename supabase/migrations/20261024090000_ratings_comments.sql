-- Migration 2, spec 0002: ratings, comments, and game_stats rating columns.
-- wishlist_count joins game_stats in migration 3, when wishlist_entries exists.

-- Tables ---------------------------------------------------------------------
create table public.ratings (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  best_players smallint not null check (best_players between 1 and 20),
  time_to_learn smallint not null check (time_to_learn between 1 and 5),
  luck smallint not null check (luck between 1 and 10),
  strategy smallint not null check (strategy between 1 and 10),
  entertainment smallint not null check (entertainment between 1 and 10),
  recommendation smallint not null check (recommendation between 1 and 10),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, member_id)
);
create index ratings_member_id_idx on public.ratings (member_id);

create table public.comments (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_game_id_created_at_idx on public.comments (game_id, created_at desc);
create index comments_member_id_idx on public.comments (member_id);

alter table public.ratings enable row level security;
alter table public.comments enable row level security;

-- updated_at moves on every edit ---------------------------------------------
create trigger set_updated_at
  before update on public.ratings
  for each row execute function private.set_updated_at();

create trigger set_updated_at
  before update on public.comments
  for each row execute function private.set_updated_at();

-- Privileges -------------------------------------------------------------------
-- Update lists value columns only, so a row cannot move to another game or member.
grant select on public.ratings to anon, authenticated;
grant insert (game_id, member_id, best_players, time_to_learn, luck, strategy, entertainment, recommendation, comment)
  on public.ratings to authenticated;
grant update (best_players, time_to_learn, luck, strategy, entertainment, recommendation, comment)
  on public.ratings to authenticated;
grant delete on public.ratings to authenticated;

grant select on public.comments to anon, authenticated;
grant insert (game_id, member_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- Policies ---------------------------------------------------------------------
create policy "ratings are public" on public.ratings
  for select to anon, authenticated using (true);

create policy "active members add their own rating" on public.ratings
  for insert to authenticated
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "active members edit their own rating" on public.ratings
  for update to authenticated
  using ((select private.is_active_member()) and member_id = (select auth.uid()))
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "members delete their own rating" on public.ratings
  for delete to authenticated
  using (member_id = (select auth.uid()));

create policy "comments are public" on public.comments
  for select to anon, authenticated using (true);

create policy "active members add their own comment" on public.comments
  for insert to authenticated
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "active members edit their own comment" on public.comments
  for update to authenticated
  using ((select private.is_active_member()) and member_id = (select auth.uid()))
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "members delete their own comment" on public.comments
  for delete to authenticated
  using (member_id = (select auth.uid()));

-- Shelf view ---------------------------------------------------------------------
-- New columns are appended after owner_count, as create or replace view requires.
-- The ratings aggregate is one row per game, so it cannot inflate owner_count.
create or replace view public.game_stats
with (security_invoker = true)
as
select
  g.*,
  (select count(*) from public.game_owners o where o.game_id = g.id)::integer as owner_count,
  r.rating_count,
  r.avg_time_to_learn,
  r.avg_luck,
  r.avg_strategy,
  r.avg_entertainment,
  r.avg_recommendation,
  r.best_players_mode
from public.games g
cross join lateral (
  select
    count(*)::integer as rating_count,
    round(avg(time_to_learn), 1) as avg_time_to_learn,
    round(avg(luck), 1) as avg_luck,
    round(avg(strategy), 1) as avg_strategy,
    round(avg(entertainment), 1) as avg_entertainment,
    round(avg(recommendation), 1) as avg_recommendation,
    -- Most voted number; ties go to the lowest. Explicit order, not mode().
    (
      select b.best_players
      from public.ratings b
      where b.game_id = g.id
      group by b.best_players
      order by count(*) desc, b.best_players asc
      limit 1
    ) as best_players_mode
  from public.ratings x
  where x.game_id = g.id
) r;

grant select on public.game_stats to anon, authenticated;

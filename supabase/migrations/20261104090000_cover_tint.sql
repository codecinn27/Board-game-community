-- Migration 5, spec 0009: games.cover_tint and a rebuilt game_stats view.

-- The sheet's colors come from this value. Null means the neutral tint.
-- No insert or update grant is added, so only SQL (postgres, the dashboard)
-- or an admin tool writes it for now.
alter table public.games
  add column cover_tint text
    constraint games_cover_tint_format check (cover_tint is null or cover_tint ~ '^#[0-9a-f]{6}$');

-- game_stats selects g.*, which Postgres expands when the view is created, so
-- the new column only appears after a rebuild. create or replace cannot insert
-- a column in the middle of the list, so drop and create again.
drop view public.game_stats;

create view public.game_stats
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
  r.best_players_mode,
  (select count(*) from public.wishlist_entries w where w.game_id = g.id)::integer as wishlist_count
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

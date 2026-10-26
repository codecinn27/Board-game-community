-- Migration 3, spec 0002: top_picks, wishlist_entries, their triggers, save_top_picks,
-- and wishlist_count on game_stats.

-- Tables ---------------------------------------------------------------------
create table public.top_picks (
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  position smallint not null check (position between 1 and 5),
  game_id bigint not null references public.games (id) on delete cascade,
  primary key (member_id, position),
  unique (member_id, game_id)
);
create index top_picks_game_id_idx on public.top_picks (game_id);

create table public.wishlist_entries (
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, game_id)
);
create index wishlist_entries_game_id_idx on public.wishlist_entries (game_id);

alter table public.top_picks enable row level security;
alter table public.wishlist_entries enable row level security;

-- Trigger functions ------------------------------------------------------------
-- Marking a game as owned removes only that member's wishlist row for it.
create function private.on_owner_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.wishlist_entries
  where member_id = new.member_id and game_id = new.game_id;
  return new;
end;
$$;

-- A member who already owns a game cannot wish for it.
create function private.block_owned_wishlist()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.game_owners
    where member_id = new.member_id and game_id = new.game_id
  ) then
    raise exception 'you already own this game' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.on_owner_added() from public;
revoke all on function private.block_owned_wishlist() from public;

create trigger on_owner_added
  after insert on public.game_owners
  for each row execute function private.on_owner_added();

create trigger block_owned_wishlist
  before insert on public.wishlist_entries
  for each row execute function private.block_owned_wishlist();

-- Reorder in one call ------------------------------------------------------------
-- Security invoker, so the table policies still decide who may write.
create function public.save_top_picks(game_ids bigint[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if game_ids is null
    or cardinality(game_ids) > 5
    or array_position(game_ids, null) is not null
    or cardinality(game_ids) <> (select count(distinct g) from unnest(game_ids) g)
  then
    raise exception 'top picks must be up to 5 distinct game ids' using errcode = '22023';
  end if;

  delete from public.top_picks where member_id = (select auth.uid());

  insert into public.top_picks (member_id, position, game_id)
  select (select auth.uid()), u.position::smallint, u.game_id
  from unnest(game_ids) with ordinality as u(game_id, position);
end;
$$;

revoke all on function public.save_top_picks(bigint[]) from public, anon;
grant execute on function public.save_top_picks(bigint[]) to authenticated;

-- Privileges -------------------------------------------------------------------
grant select on public.top_picks to anon, authenticated;
grant insert (member_id, position, game_id) on public.top_picks to authenticated;
grant delete on public.top_picks to authenticated;

grant select on public.wishlist_entries to anon, authenticated;
grant insert (member_id, game_id) on public.wishlist_entries to authenticated;
grant delete on public.wishlist_entries to authenticated;

-- Policies ---------------------------------------------------------------------
create policy "top picks are public" on public.top_picks
  for select to anon, authenticated using (true);

create policy "active members add their own top picks" on public.top_picks
  for insert to authenticated
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "active members remove their own top picks" on public.top_picks
  for delete to authenticated
  using ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "wishlist is public" on public.wishlist_entries
  for select to anon, authenticated using (true);

create policy "active members add to their own wishlist" on public.wishlist_entries
  for insert to authenticated
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "active members remove from their own wishlist" on public.wishlist_entries
  for delete to authenticated
  using ((select private.is_active_member()) and member_id = (select auth.uid()));

-- Shelf view: full AC-14 contract ----------------------------------------------------
-- wishlist_count is appended last, as create or replace view requires.
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

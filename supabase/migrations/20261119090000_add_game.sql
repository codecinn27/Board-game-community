-- Migration 10, spec 0013: add a game I own, ownership, and admin review.

-- A game name is stored once. Fail with a clear message when old data clashes.
do $$
begin
  if exists (
    select 1 from public.games group by name_normalized having count(*) > 1
  ) then
    raise exception 'two games share a normalized name; merge or rename them first';
  end if;
end;
$$;

drop index public.games_name_normalized_idx;
create unique index games_name_normalized_key on public.games (name_normalized);

-- Review columns. Null reviewed_at means "not reviewed yet".
alter table public.games
  add column reviewed_at timestamptz,
  add column reviewed_by uuid
    constraint games_reviewed_by_fkey references public.profiles (id) on delete set null,
  add constraint games_reviewed_by_needs_at check (reviewed_by is null or reviewed_at is not null);

-- Every game that exists now counts as reviewed (runs as postgres, so no guard).
update public.games set reviewed_at = now();

-- Only an admin changes the review columns.
create or replace function private.guard_game_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if (select private.is_admin()) then
    return new;
  end if;
  if new.added_by is distinct from old.added_by
    or new.cover_path is distinct from old.cover_path
    or new.source_kind is distinct from old.source_kind
    or new.source_provider is distinct from old.source_provider
    or new.source_id is distinct from old.source_id
    or new.source_url is distinct from old.source_url
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
  then
    raise exception 'protected game columns cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

grant update (reviewed_at, reviewed_by) on public.games to authenticated;

-- Search the shelf by name. Normalizes with the same expression as the
-- generated column, so JavaScript and SQL never disagree on punctuation.
create function public.search_games(q text)
returns table (
  id bigint,
  name text,
  cover_path text,
  cover_tint text,
  owner_names text[],
  mine boolean,
  exact boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with nq as (
    select regexp_replace(lower(coalesce(q, '')), '[[:punct:][:space:]]', '', 'g') as v
  )
  select
    g.id,
    g.name,
    g.cover_path,
    g.cover_tint,
    coalesce(
      (
        select array_agg(p.display_name order by p.display_name)
        from public.game_owners o
        join public.profiles p on p.id = o.member_id
        where o.game_id = g.id
      ),
      '{}'::text[]
    ),
    exists (
      select 1 from public.game_owners o
      where o.game_id = g.id and o.member_id = (select auth.uid())
    ),
    g.name_normalized = nq.v
  from public.games g
  cross join nq
  where nq.v <> '' and strpos(g.name_normalized, nq.v) > 0
  order by
    (g.name_normalized = nq.v) desc,
    (left(g.name_normalized, char_length(nq.v)) = nq.v) desc,
    g.name_normalized,
    g.id
  limit 10;
$$;

-- Add a game and its first owner in one statement.
create function public.add_game(
  p_name text,
  p_players_min smallint,
  p_players_max smallint,
  p_play_time_min smallint,
  p_play_time_max smallint,
  p_description text
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if regexp_replace(lower(coalesce(p_name, '')), '[[:punct:][:space:]]', '', 'g') = '' then
    raise exception 'a game name needs a letter or number' using errcode = '22023';
  end if;
  with g as (
    insert into public.games (
      name, players_min, players_max, play_time_min, play_time_max, description, source_kind
    )
    values (
      btrim(p_name), p_players_min, p_players_max, p_play_time_min, p_play_time_max,
      p_description, 'manual'
    )
    returning id
  ),
  o as (
    insert into public.game_owners (game_id)
    select id from g
    returning game_id
  )
  select game_id into v_id from o;
  return v_id;
end;
$$;

-- Admin only: mark a game reviewed or not. A double tap keeps the first reviewer.
create function public.set_game_reviewed(p_game_id bigint, p_reviewed boolean)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'only an admin can review games' using errcode = '42501';
  end if;
  if p_reviewed then
    update public.games
      set reviewed_at = now(), reviewed_by = (select auth.uid())
      where id = p_game_id and reviewed_at is null;
  else
    update public.games
      set reviewed_at = null, reviewed_by = null
      where id = p_game_id and reviewed_at is not null;
  end if;
  if found then
    return 'ok';
  end if;
  if exists (select 1 from public.games where id = p_game_id) then
    return 'ok';
  end if;
  return 'notfound';
end;
$$;

revoke all on function public.search_games(text) from public, anon;
revoke all on function public.add_game(text, smallint, smallint, smallint, smallint, text) from public, anon;
revoke all on function public.set_game_reviewed(bigint, boolean) from public, anon;
grant execute on function public.search_games(text) to authenticated;
grant execute on function public.add_game(text, smallint, smallint, smallint, smallint, text) to authenticated;
grant execute on function public.set_game_reviewed(bigint, boolean) to authenticated;

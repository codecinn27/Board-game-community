-- Migration 11, spec 0013 (review editing amendment): Chinese text, categories,
-- admin owner edits, edit history, the cover recycle bin, and admin_update_game.

-- Chinese text ----------------------------------------------------------------
alter table public.games
  add column name_zh text
    constraint games_name_zh_length check (name_zh is null or char_length(btrim(name_zh)) between 1 and 200),
  add column description_zh text
    constraint games_description_zh_length check (description_zh is null or char_length(description_zh) <= 4000),
  -- Same expression as name_normalized; null while there is no Chinese name.
  add column name_zh_normalized text generated always as
    (regexp_replace(lower(name_zh), '[[:punct:][:space:]]', '', 'g')) stored;

-- English and Chinese names are never compared with each other.
create unique index games_name_zh_normalized_key on public.games (name_zh_normalized)
  where name_zh is not null;

-- game_stats expands g.* when it is created, so rebuild it to show the new columns.
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

-- Guard: only an admin changes the cover tint or the Chinese text. -----------------
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
    or new.cover_tint is distinct from old.cover_tint
    or new.name_zh is distinct from old.name_zh
    or new.description_zh is distinct from old.description_zh
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

grant update (cover_tint, name_zh, description_zh) on public.games to authenticated;

-- Categories -----------------------------------------------------------------------
create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 60),
  name_zh text not null check (char_length(btrim(name_zh)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index categories_name_en_key on public.categories (lower(btrim(name_en)));

create table public.game_categories (
  game_id bigint not null references public.games (id) on delete cascade,
  category_id bigint not null references public.categories (id) on delete cascade,
  primary key (game_id, category_id)
);
create index game_categories_category_id_idx on public.game_categories (category_id);

alter table public.categories enable row level security;
alter table public.game_categories enable row level security;

grant select on public.categories, public.game_categories to anon, authenticated;
grant insert, update on public.categories to authenticated;
grant insert, delete on public.game_categories to authenticated;

create policy "categories are public" on public.categories
  for select to anon, authenticated using (true);
create policy "admins add categories" on public.categories
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins change categories" on public.categories
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "game categories are public" on public.game_categories
  for select to anon, authenticated using (true);
create policy "admins link categories" on public.game_categories
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins unlink categories" on public.game_categories
  for delete to authenticated using ((select private.is_admin()));

insert into public.categories (slug, name_en, name_zh) values
  ('strategy', 'Strategy', '策略'),
  ('party', 'Party', '派对'),
  ('family', 'Family', '家庭'),
  ('co-op', 'Co-op', '合作'),
  ('card', 'Card', '卡牌'),
  ('dice', 'Dice', '骰子'),
  ('deduction', 'Deduction', '推理'),
  ('abstract', 'Abstract', '抽象'),
  ('thematic', 'Thematic', '主题'),
  ('war', 'War', '战争');

-- Admins edit anyone's owner rows; members keep their own-row policies. -----------
create policy "admins add any owner" on public.game_owners
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins remove any owner" on public.game_owners
  for delete to authenticated using ((select private.is_admin()));

-- Edit history -----------------------------------------------------------------------
-- game_id has no foreign key on purpose: the history survives the game.
create table public.game_edits (
  id bigint generated always as identity primary key,
  game_id bigint not null,
  game_name text not null,
  edited_by uuid references public.profiles (id) on delete set null,
  edited_at timestamptz not null default now(),
  changed text[] not null,
  before jsonb not null,
  after jsonb not null
);
create index game_edits_game_id_idx on public.game_edits (game_id, edited_at desc);
create index game_edits_edited_by_idx on public.game_edits (edited_by);

alter table public.game_edits enable row level security;

-- Append only, and not even by an admin directly: rows come from
-- private.write_game_edit, called by admin_update_game.
revoke all on public.game_edits from anon, authenticated, service_role;
grant select on public.game_edits to authenticated;

create policy "admins read edit history" on public.game_edits
  for select to authenticated using ((select private.is_admin()));

create function private.write_game_edit(
  p_game_id bigint,
  p_game_name text,
  p_changed text[],
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'only an admin can write edit history' using errcode = '42501';
  end if;
  insert into public.game_edits (game_id, game_name, edited_by, changed, before, after)
  values (p_game_id, p_game_name, (select auth.uid()), p_changed, p_before, p_after);
end;
$$;

revoke all on function private.write_game_edit(bigint, text, text[], jsonb, jsonb) from public, anon;
grant execute on function private.write_game_edit(bigint, text, text[], jsonb, jsonb) to authenticated;

-- Cover recycle bin -------------------------------------------------------------------
create table public.cover_trash (
  id bigint generated always as identity primary key,
  path text not null,
  game_id bigint,
  trashed_by uuid references public.profiles (id) on delete set null,
  trashed_at timestamptz not null default now()
);
create index cover_trash_trashed_at_idx on public.cover_trash (trashed_at);
create index cover_trash_trashed_by_idx on public.cover_trash (trashed_by);

alter table public.cover_trash enable row level security;

-- Written by the admin client in the Review action; the purge function deletes rows.
revoke all on public.cover_trash from anon, authenticated, service_role;
grant select on public.cover_trash to authenticated;
grant select, insert, delete on public.cover_trash to service_role;

create policy "admins read the cover trash" on public.cover_trash
  for select to authenticated using ((select private.is_admin()));

-- Private bucket, no policies: only the service key reaches it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers-trash', 'covers-trash', false, 153600, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Search also matches the Chinese name ------------------------------------------------
-- The return type changes, so drop and create. New columns go last.
drop function public.search_games(text);

create function public.search_games(q text)
returns table (
  id bigint,
  name text,
  cover_path text,
  cover_tint text,
  owner_names text[],
  mine boolean,
  exact boolean,
  name_zh text,
  exact_zh boolean
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
    g.name_normalized = nq.v,
    g.name_zh,
    coalesce(g.name_zh_normalized = nq.v, false)
  from public.games g
  cross join nq
  where nq.v <> ''
    and (
      strpos(g.name_normalized, nq.v) > 0
      or strpos(coalesce(g.name_zh_normalized, ''), nq.v) > 0
    )
  order by
    (g.name_normalized = nq.v or coalesce(g.name_zh_normalized = nq.v, false)) desc,
    (
      left(g.name_normalized, char_length(nq.v)) = nq.v
      or coalesce(left(g.name_zh_normalized, char_length(nq.v)) = nq.v, false)
    ) desc,
    g.name_normalized,
    g.id
  limit 10;
$$;

revoke all on function public.search_games(text) from public, anon;
grant execute on function public.search_games(text) to authenticated;

-- Admin edit: one transaction ----------------------------------------------------------
-- p_cover_path and p_cover_tint are the final values (null removes the cover);
-- the category and owner lists replace the saved ones. Null lists are refused so a
-- client bug cannot wipe them. Returns 'ok', 'reviewed', 'notfound', or 'clash'.
create function public.admin_update_game(
  p_game_id bigint,
  p_name text,
  p_name_zh text,
  p_description text,
  p_description_zh text,
  p_players_min smallint,
  p_players_max smallint,
  p_play_time_min smallint,
  p_play_time_max smallint,
  p_category_ids bigint[],
  p_owner_ids uuid[],
  p_cover_path text,
  p_cover_tint text,
  p_mark_reviewed boolean
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  g public.games%rowtype;
  v_name text := btrim(coalesce(p_name, ''));
  v_name_zh text := nullif(btrim(coalesce(p_name_zh, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_description_zh text := nullif(btrim(coalesce(p_description_zh, '')), '');
  v_old_cats bigint[];
  v_new_cats bigint[];
  v_old_owners uuid[];
  v_new_owners uuid[];
  v_changed text[] := '{}';
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'only an admin can edit games' using errcode = '42501';
  end if;
  if p_category_ids is null or p_owner_ids is null then
    raise exception 'category and owner lists are required' using errcode = '22023';
  end if;
  if regexp_replace(lower(v_name), '[[:punct:][:space:]]', '', 'g') = ''
    or (v_name_zh is not null
      and regexp_replace(lower(v_name_zh), '[[:punct:][:space:]]', '', 'g') = '')
  then
    raise exception 'a game name needs a letter or number' using errcode = '22023';
  end if;

  select * into g from public.games where id = p_game_id for update;
  if not found then
    return 'notfound';
  end if;
  if g.reviewed_at is not null then
    return 'reviewed';
  end if;

  select coalesce(array_agg(distinct c order by c), '{}') into v_new_cats from unnest(p_category_ids) c;
  select coalesce(array_agg(distinct u order by u), '{}') into v_new_owners from unnest(p_owner_ids) u;
  select coalesce(array_agg(gc.category_id order by gc.category_id), '{}') into v_old_cats
    from public.game_categories gc where gc.game_id = p_game_id;
  select coalesce(array_agg(o.member_id order by o.member_id), '{}') into v_old_owners
    from public.game_owners o where o.game_id = p_game_id;

  -- A new owner must be an active member; a current owner may stay even if disabled.
  if exists (
    select 1 from unnest(v_new_owners) u
    where u <> all (v_old_owners)
      and not exists (select 1 from public.profiles p where p.id = u and p.status = 'active')
  ) then
    raise exception 'owners must be active members' using errcode = '22023';
  end if;

  if g.name is distinct from v_name then
    v_changed := v_changed || 'name';
    v_before := v_before || jsonb_build_object('name', g.name);
    v_after := v_after || jsonb_build_object('name', v_name);
  end if;
  if g.name_zh is distinct from v_name_zh then
    v_changed := v_changed || 'name_zh';
    v_before := v_before || jsonb_build_object('name_zh', g.name_zh);
    v_after := v_after || jsonb_build_object('name_zh', v_name_zh);
  end if;
  if g.description is distinct from v_description then
    v_changed := v_changed || 'description';
    v_before := v_before || jsonb_build_object('description', g.description);
    v_after := v_after || jsonb_build_object('description', v_description);
  end if;
  if g.description_zh is distinct from v_description_zh then
    v_changed := v_changed || 'description_zh';
    v_before := v_before || jsonb_build_object('description_zh', g.description_zh);
    v_after := v_after || jsonb_build_object('description_zh', v_description_zh);
  end if;
  if g.players_min is distinct from p_players_min then
    v_changed := v_changed || 'players_min';
    v_before := v_before || jsonb_build_object('players_min', g.players_min);
    v_after := v_after || jsonb_build_object('players_min', p_players_min);
  end if;
  if g.players_max is distinct from p_players_max then
    v_changed := v_changed || 'players_max';
    v_before := v_before || jsonb_build_object('players_max', g.players_max);
    v_after := v_after || jsonb_build_object('players_max', p_players_max);
  end if;
  if g.play_time_min is distinct from p_play_time_min then
    v_changed := v_changed || 'play_time_min';
    v_before := v_before || jsonb_build_object('play_time_min', g.play_time_min);
    v_after := v_after || jsonb_build_object('play_time_min', p_play_time_min);
  end if;
  if g.play_time_max is distinct from p_play_time_max then
    v_changed := v_changed || 'play_time_max';
    v_before := v_before || jsonb_build_object('play_time_max', g.play_time_max);
    v_after := v_after || jsonb_build_object('play_time_max', p_play_time_max);
  end if;
  if g.cover_path is distinct from p_cover_path then
    v_changed := v_changed || 'cover_path';
    v_before := v_before || jsonb_build_object('cover_path', g.cover_path);
    v_after := v_after || jsonb_build_object('cover_path', p_cover_path);
  end if;
  if g.cover_tint is distinct from p_cover_tint then
    v_changed := v_changed || 'cover_tint';
    v_before := v_before || jsonb_build_object('cover_tint', g.cover_tint);
    v_after := v_after || jsonb_build_object('cover_tint', p_cover_tint);
  end if;
  if v_old_cats is distinct from v_new_cats then
    v_changed := v_changed || 'category_ids';
    v_before := v_before || jsonb_build_object('category_ids', to_jsonb(v_old_cats));
    v_after := v_after || jsonb_build_object('category_ids', to_jsonb(v_new_cats));
  end if;
  if v_old_owners is distinct from v_new_owners then
    v_changed := v_changed || 'owner_ids';
    v_before := v_before || jsonb_build_object('owner_ids', to_jsonb(v_old_owners));
    v_after := v_after || jsonb_build_object('owner_ids', to_jsonb(v_new_owners));
  end if;

  if cardinality(v_changed) > 0 then
    begin
      update public.games set
        name = v_name,
        name_zh = v_name_zh,
        description = v_description,
        description_zh = v_description_zh,
        players_min = p_players_min,
        players_max = p_players_max,
        play_time_min = p_play_time_min,
        play_time_max = p_play_time_max,
        cover_path = p_cover_path,
        cover_tint = p_cover_tint
      where id = p_game_id;
    exception when unique_violation then
      -- The subtransaction rolls back; nothing was written.
      return 'clash';
    end;

    if v_old_cats is distinct from v_new_cats then
      delete from public.game_categories
        where game_id = p_game_id and category_id <> all (v_new_cats);
      insert into public.game_categories (game_id, category_id)
        select p_game_id, c from unnest(v_new_cats) c
        on conflict do nothing;
    end if;
    if v_old_owners is distinct from v_new_owners then
      delete from public.game_owners
        where game_id = p_game_id and member_id <> all (v_new_owners);
      insert into public.game_owners (game_id, member_id)
        select p_game_id, u from unnest(v_new_owners) u
        on conflict do nothing;
    end if;

    perform private.write_game_edit(p_game_id, v_name, v_changed, v_before, v_after);
  end if;

  if p_mark_reviewed then
    update public.games
      set reviewed_at = now(), reviewed_by = (select auth.uid())
      where id = p_game_id;
  end if;
  return 'ok';
end;
$$;

revoke all on function public.admin_update_game(
  bigint, text, text, text, text, smallint, smallint, smallint, smallint,
  bigint[], uuid[], text, text, boolean
) from public, anon;
grant execute on function public.admin_update_game(
  bigint, text, text, text, text, smallint, smallint, smallint, smallint,
  bigint[], uuid[], text, text, boolean
) to authenticated;

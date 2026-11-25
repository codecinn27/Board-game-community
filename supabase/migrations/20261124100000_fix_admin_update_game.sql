-- Fix for migration 20261124090000: `v_changed || 'name'` parsed the literal as an
-- array, so every edit failed. array_append takes the value as text. Same signature,
-- so the grants from that migration stay.

create or replace function public.admin_update_game(
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
    v_changed := array_append(v_changed, 'name');
    v_before := v_before || jsonb_build_object('name', g.name);
    v_after := v_after || jsonb_build_object('name', v_name);
  end if;
  if g.name_zh is distinct from v_name_zh then
    v_changed := array_append(v_changed, 'name_zh');
    v_before := v_before || jsonb_build_object('name_zh', g.name_zh);
    v_after := v_after || jsonb_build_object('name_zh', v_name_zh);
  end if;
  if g.description is distinct from v_description then
    v_changed := array_append(v_changed, 'description');
    v_before := v_before || jsonb_build_object('description', g.description);
    v_after := v_after || jsonb_build_object('description', v_description);
  end if;
  if g.description_zh is distinct from v_description_zh then
    v_changed := array_append(v_changed, 'description_zh');
    v_before := v_before || jsonb_build_object('description_zh', g.description_zh);
    v_after := v_after || jsonb_build_object('description_zh', v_description_zh);
  end if;
  if g.players_min is distinct from p_players_min then
    v_changed := array_append(v_changed, 'players_min');
    v_before := v_before || jsonb_build_object('players_min', g.players_min);
    v_after := v_after || jsonb_build_object('players_min', p_players_min);
  end if;
  if g.players_max is distinct from p_players_max then
    v_changed := array_append(v_changed, 'players_max');
    v_before := v_before || jsonb_build_object('players_max', g.players_max);
    v_after := v_after || jsonb_build_object('players_max', p_players_max);
  end if;
  if g.play_time_min is distinct from p_play_time_min then
    v_changed := array_append(v_changed, 'play_time_min');
    v_before := v_before || jsonb_build_object('play_time_min', g.play_time_min);
    v_after := v_after || jsonb_build_object('play_time_min', p_play_time_min);
  end if;
  if g.play_time_max is distinct from p_play_time_max then
    v_changed := array_append(v_changed, 'play_time_max');
    v_before := v_before || jsonb_build_object('play_time_max', g.play_time_max);
    v_after := v_after || jsonb_build_object('play_time_max', p_play_time_max);
  end if;
  if g.cover_path is distinct from p_cover_path then
    v_changed := array_append(v_changed, 'cover_path');
    v_before := v_before || jsonb_build_object('cover_path', g.cover_path);
    v_after := v_after || jsonb_build_object('cover_path', p_cover_path);
  end if;
  if g.cover_tint is distinct from p_cover_tint then
    v_changed := array_append(v_changed, 'cover_tint');
    v_before := v_before || jsonb_build_object('cover_tint', g.cover_tint);
    v_after := v_after || jsonb_build_object('cover_tint', p_cover_tint);
  end if;
  if v_old_cats is distinct from v_new_cats then
    v_changed := array_append(v_changed, 'category_ids');
    v_before := v_before || jsonb_build_object('category_ids', to_jsonb(v_old_cats));
    v_after := v_after || jsonb_build_object('category_ids', to_jsonb(v_new_cats));
  end if;
  if v_old_owners is distinct from v_new_owners then
    v_changed := array_append(v_changed, 'owner_ids');
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

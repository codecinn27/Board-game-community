-- Migration 12, spec 0014: game categories in three fixed groups (feel, theme,
-- mechanics) replace the flat categories from spec 0013. Old links are discarded on
-- purpose. The lists change only through a new migration, never through the API.

-- Drop the old function (by its full signature), then the old tables --------------------
drop function public.admin_update_game(
  bigint, text, text, text, text, smallint, smallint, smallint, smallint,
  bigint[], uuid[], text, text, boolean
);
drop table public.game_categories;
drop table public.categories;

-- Choice tables ---------------------------------------------------------------------------
create table public.feels (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 60),
  name_zh text not null check (char_length(btrim(name_zh)) between 1 and 60),
  position smallint not null unique check (position > 0)
);
create unique index feels_name_en_key on public.feels (lower(btrim(name_en)));

create table public.themes (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 60),
  name_zh text not null check (char_length(btrim(name_zh)) between 1 and 60),
  position smallint not null unique check (position > 0)
);
create unique index themes_name_en_key on public.themes (lower(btrim(name_en)));

create table public.mechanics (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_en text not null check (char_length(btrim(name_en)) between 1 and 60),
  name_zh text not null check (char_length(btrim(name_zh)) between 1 and 60),
  description_en text check (char_length(btrim(description_en)) between 1 and 200),
  description_zh text check (char_length(btrim(description_zh)) between 1 and 200),
  position smallint not null unique check (position > 0),
  check ((description_en is null) = (description_zh is null))
);
create unique index mechanics_name_en_key on public.mechanics (lower(btrim(name_en)));

-- Link tables -----------------------------------------------------------------------------
create table public.game_feels (
  game_id bigint not null references public.games (id) on delete cascade,
  feel_id bigint not null references public.feels (id) on delete cascade,
  primary key (game_id, feel_id)
);
create index game_feels_feel_id_idx on public.game_feels (feel_id);

create table public.game_themes (
  game_id bigint not null references public.games (id) on delete cascade,
  theme_id bigint not null references public.themes (id) on delete cascade,
  primary key (game_id, theme_id)
);
create index game_themes_theme_id_idx on public.game_themes (theme_id);

create table public.game_mechanics (
  game_id bigint not null references public.games (id) on delete cascade,
  mechanic_id bigint not null references public.mechanics (id) on delete cascade,
  primary key (game_id, mechanic_id)
);
create index game_mechanics_mechanic_id_idx on public.game_mechanics (mechanic_id);

-- Row level security and grants -------------------------------------------------------------
alter table public.feels enable row level security;
alter table public.themes enable row level security;
alter table public.mechanics enable row level security;
alter table public.game_feels enable row level security;
alter table public.game_themes enable row level security;
alter table public.game_mechanics enable row level security;

-- Choices are read only for everyone, service_role included.
revoke all on public.feels, public.themes, public.mechanics from anon, authenticated, service_role;
grant select on public.feels, public.themes, public.mechanics to anon, authenticated, service_role;

grant select on public.game_feels, public.game_themes, public.game_mechanics to anon, authenticated;
grant insert, delete on public.game_feels, public.game_themes, public.game_mechanics to authenticated;

create policy "feels are public" on public.feels
  for select to anon, authenticated using (true);
create policy "themes are public" on public.themes
  for select to anon, authenticated using (true);
create policy "mechanics are public" on public.mechanics
  for select to anon, authenticated using (true);

create policy "game feels are public" on public.game_feels
  for select to anon, authenticated using (true);
create policy "admins link feels" on public.game_feels
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins unlink feels" on public.game_feels
  for delete to authenticated using ((select private.is_admin()));

create policy "game themes are public" on public.game_themes
  for select to anon, authenticated using (true);
create policy "admins link themes" on public.game_themes
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins unlink themes" on public.game_themes
  for delete to authenticated using ((select private.is_admin()));

create policy "game mechanics are public" on public.game_mechanics
  for select to anon, authenticated using (true);
create policy "admins link mechanics" on public.game_mechanics
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins unlink mechanics" on public.game_mechanics
  for delete to authenticated using ((select private.is_admin()));

-- Seed (positions are explicit, ids are never supplied) -----------------------------------------
insert into public.feels (slug, name_en, name_zh, position) values
  ('party-games', 'Party Games', '派对游戏', 1),
  ('competitive', 'Competitive', '竞技对抗', 2),
  ('strategy', 'Strategy', '策略', 3),
  ('abstract-strategy', 'Abstract Strategy', '抽象策略', 4),
  ('cooperative', 'Cooperative', '合作', 5);

insert into public.themes (slug, name_en, name_zh, position) values
  ('fantasy', 'Fantasy', '奇幻', 1),
  ('science-fiction', 'Science Fiction', '科幻', 2),
  ('horror', 'Horror', '恐怖', 3),
  ('mythology', 'Mythology', '神话', 4),
  ('historical', 'Historical', '历史', 5),
  ('adventure', 'Adventure', '冒险', 6),
  ('animals', 'Animals', '动物', 7),
  ('nature', 'Nature', '自然', 8),
  ('medieval', 'Medieval', '中世纪', 9),
  ('exploration', 'Exploration', '探索', 10);

insert into public.mechanics (slug, name_en, name_zh, description_en, description_zh, position) values
  ('trading', 'Trading', '交易', 'Swap goods or make deals with other players.', '与其他玩家交换物品或达成交易。', 1),
  ('resource-management', 'Resource Management', '资源管理', 'Spend and save limited resources wisely.', '合理使用和储存有限的资源。', 2),
  ('engine-building', 'Engine Building', '引擎构建', 'Build a setup that helps you generate passive resources.', '搭建能帮你持续产出被动资源的体系。', 3),
  ('combo-building', 'Combo Building', '组合构建', 'Chain cards or actions so they boost each other.', '把卡牌或行动串联起来，让它们互相增强。', 4),
  ('area-control', 'Area Control', '区域控制', 'Compete to hold more of the board than the others.', '争夺并占据比对手更多的地图区域。', 5),
  ('social-deduction', 'Social Deduction', '社交推理', 'Work out who is hiding their role from talk and behavior.', '通过交谈和行为推断谁在隐藏身份。', 6),
  ('bluffing', 'Bluffing', '虚张声势', 'Mislead others about what you hold or plan.', '对他人隐瞒或误导你的手牌与计划。', 7),
  ('guessing', 'Guessing', '猜测', 'Guess a hidden answer, word, or number.', '猜出隐藏的答案、词语或数字。', 8),
  ('storytelling', 'Storytelling', '讲故事', 'Tell stories or give clues based on pictures and prompts.', '根据图片或提示讲故事、给线索。', 9),
  ('memory', 'Memory', '记忆', 'Remember what was shown or played earlier.', '记住之前出现或打出过的内容。', 10),
  ('speed-and-reflexes', 'Speed & Reflexes', '速度与反应', 'Act fast; the quickest hands or eyes win.', '比谁反应快、出手快。', 11),
  ('set-collection', 'Set Collection', '套组收集', 'Collect things that form a valuable combination.', '收集能组成高价值组合的物品。', 12),
  ('deck-building', 'Deck Building', '牌组构建', 'Gradually build and improve your personal deck of cards.', '逐步构建并改进你自己的牌组。', 13),
  ('worker-placement', 'Worker Placement', '工人放置', 'Place your workers on spaces to perform actions.', '把你的工人放到空位上来执行行动。', 14),
  ('drafting', 'Drafting', '轮选', 'Choose cards or items from a shared selection.', '从共享的选择中挑选卡牌或物品。', 15),
  ('push-your-luck', 'Push Your Luck', '搏运气', 'Keep going for a bigger reward, but risk losing it all.', '继续冒险可得更多，但也可能全部失去。', 16),
  ('voting', 'Voting', '投票', 'Players vote to decide the outcome.', '玩家通过投票决定结果。', 17),
  ('dice-rolling', 'Dice Rolling', '掷骰子', 'Roll dice to decide what happens.', '掷骰子来决定结果。', 18),
  ('bidding', 'Bidding', '竞标', 'Offer a price or value to win something.', '出价竞争以赢得物品。', 19),
  ('route-building', 'Route Building', '路线构建', 'Connect places by building routes.', '修建路线来连接各个地点。', 20);

-- Admin edit: one transaction ---------------------------------------------------------------
-- Same as spec 0013, with the category list split into feel, theme, and mechanic lists.
-- Null lists are refused so a client bug cannot wipe them. History records sorted slug
-- arrays. Returns 'ok', 'reviewed', 'notfound', or 'clash'.
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
  p_feel_ids bigint[],
  p_theme_ids bigint[],
  p_mechanic_ids bigint[],
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
  v_old_feels bigint[];
  v_new_feels bigint[];
  v_old_themes bigint[];
  v_new_themes bigint[];
  v_old_mechanics bigint[];
  v_new_mechanics bigint[];
  v_old_owners uuid[];
  v_new_owners uuid[];
  v_old_slugs text[];
  v_new_slugs text[];
  v_changed text[] := '{}';
  v_before jsonb := '{}'::jsonb;
  v_after jsonb := '{}'::jsonb;
begin
  if not (select private.is_admin()) then
    raise exception 'only an admin can edit games' using errcode = '42501';
  end if;
  if p_feel_ids is null or p_theme_ids is null or p_mechanic_ids is null
    or p_owner_ids is null
  then
    raise exception 'feel, theme, mechanic, and owner lists are required' using errcode = '22023';
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

  select coalesce(array_agg(distinct c order by c), '{}') into v_new_feels from unnest(p_feel_ids) c;
  select coalesce(array_agg(distinct c order by c), '{}') into v_new_themes from unnest(p_theme_ids) c;
  select coalesce(array_agg(distinct c order by c), '{}') into v_new_mechanics from unnest(p_mechanic_ids) c;
  select coalesce(array_agg(distinct u order by u), '{}') into v_new_owners from unnest(p_owner_ids) u;
  select coalesce(array_agg(x.feel_id order by x.feel_id), '{}') into v_old_feels
    from public.game_feels x where x.game_id = p_game_id;
  select coalesce(array_agg(x.theme_id order by x.theme_id), '{}') into v_old_themes
    from public.game_themes x where x.game_id = p_game_id;
  select coalesce(array_agg(x.mechanic_id order by x.mechanic_id), '{}') into v_old_mechanics
    from public.game_mechanics x where x.game_id = p_game_id;
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

  if v_old_feels is distinct from v_new_feels then
    select coalesce(array_agg(f.slug order by f.slug), '{}') into v_old_slugs
      from public.feels f where f.id = any (v_old_feels);
    select coalesce(array_agg(f.slug order by f.slug), '{}') into v_new_slugs
      from public.feels f where f.id = any (v_new_feels);
    v_changed := array_append(v_changed, 'feels');
    v_before := v_before || jsonb_build_object('feels', to_jsonb(v_old_slugs));
    v_after := v_after || jsonb_build_object('feels', to_jsonb(v_new_slugs));
  end if;
  if v_old_themes is distinct from v_new_themes then
    select coalesce(array_agg(t.slug order by t.slug), '{}') into v_old_slugs
      from public.themes t where t.id = any (v_old_themes);
    select coalesce(array_agg(t.slug order by t.slug), '{}') into v_new_slugs
      from public.themes t where t.id = any (v_new_themes);
    v_changed := array_append(v_changed, 'themes');
    v_before := v_before || jsonb_build_object('themes', to_jsonb(v_old_slugs));
    v_after := v_after || jsonb_build_object('themes', to_jsonb(v_new_slugs));
  end if;
  if v_old_mechanics is distinct from v_new_mechanics then
    select coalesce(array_agg(m.slug order by m.slug), '{}') into v_old_slugs
      from public.mechanics m where m.id = any (v_old_mechanics);
    select coalesce(array_agg(m.slug order by m.slug), '{}') into v_new_slugs
      from public.mechanics m where m.id = any (v_new_mechanics);
    v_changed := array_append(v_changed, 'mechanics');
    v_before := v_before || jsonb_build_object('mechanics', to_jsonb(v_old_slugs));
    v_after := v_after || jsonb_build_object('mechanics', to_jsonb(v_new_slugs));
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

    if v_old_feels is distinct from v_new_feels then
      delete from public.game_feels
        where game_id = p_game_id and feel_id <> all (v_new_feels);
      insert into public.game_feels (game_id, feel_id)
        select p_game_id, c from unnest(v_new_feels) c
        on conflict do nothing;
    end if;
    if v_old_themes is distinct from v_new_themes then
      delete from public.game_themes
        where game_id = p_game_id and theme_id <> all (v_new_themes);
      insert into public.game_themes (game_id, theme_id)
        select p_game_id, c from unnest(v_new_themes) c
        on conflict do nothing;
    end if;
    if v_old_mechanics is distinct from v_new_mechanics then
      delete from public.game_mechanics
        where game_id = p_game_id and mechanic_id <> all (v_new_mechanics);
      insert into public.game_mechanics (game_id, mechanic_id)
        select p_game_id, c from unnest(v_new_mechanics) c
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
  bigint[], bigint[], bigint[], uuid[], text, text, boolean
) from public, anon;
grant execute on function public.admin_update_game(
  bigint, text, text, text, text, smallint, smallint, smallint, smallint,
  bigint[], bigint[], bigint[], uuid[], text, text, boolean
) to authenticated;

-- Migration 1 (foundation thread), spec 0002.
-- profiles, games, game_owners, helpers, guards, policies, and game_stats (owner_count only).

-- Grants first -----------------------------------------------------------
-- Supabase grants all rights on public tables to anon and authenticated by
-- default, which would defeat column grants. Remove that now and for every
-- table or function created later by the postgres role in this schema.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Private schema for helpers and trigger functions -------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke all on functions from public;

-- Types ----------------------------------------------------------------------
create type public.member_role as enum ('member', 'admin');
create type public.member_status as enum ('active', 'disabled');
create type public.game_source_kind as enum ('manual', 'lookup', 'link');

-- Tables ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 40),
  avatar_path text
    check (avatar_path is null or left(avatar_path, 37) = id::text || '/'),
  role public.member_role not null default 'member',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.games (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  -- Keeps Chinese characters; only punctuation and spaces are removed.
  name_normalized text generated always as
    (regexp_replace(lower(name), '[[:punct:][:space:]]', '', 'g')) stored,
  cover_path text,
  players_min smallint check (players_min > 0),
  players_max smallint check (players_max > 0),
  play_time_min smallint check (play_time_min > 0),
  play_time_max smallint check (play_time_max > 0),
  description text check (char_length(description) <= 4000),
  source_kind public.game_source_kind not null default 'manual',
  source_provider text,
  source_id text,
  source_url text,
  added_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_players_order check (players_min is null or players_max is null or players_min <= players_max),
  constraint games_time_order check (play_time_min is null or play_time_max is null or play_time_min <= play_time_max),
  constraint games_source_pair check ((source_provider is null) = (source_id is null)),
  constraint games_source_kind_rules check (
    (source_kind = 'manual' and source_provider is null and source_id is null and source_url is null)
    or (source_kind = 'lookup' and source_provider is not null and source_id is not null)
    or (source_kind = 'link' and source_url is not null)
  )
);
create index games_name_normalized_idx on public.games (name_normalized);
create index games_added_by_idx on public.games (added_by);
create unique index games_source_unique_idx on public.games (source_provider, source_id)
  where source_provider is not null and source_id is not null;

create table public.game_owners (
  game_id bigint not null references public.games (id) on delete cascade,
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, member_id)
);
create index game_owners_member_id_idx on public.game_owners (member_id);

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_owners enable row level security;

-- Helper functions -------------------------------------------------------------
create function private.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  );
$$;

revoke all on function private.is_active_member() from public;
revoke all on function private.is_admin() from public;
grant execute on function private.is_active_member() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Trigger functions ------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
        'Member'
      ),
      40
    )
  );
  return new;
end;
$$;

-- Guards only restrict the authenticated role. SQL as postgres, the auth
-- service, service_role, and foreign key actions pass through.
create function private.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.role is distinct from old.role or new.status is distinct from old.status then
    raise exception 'role and status cannot be changed here' using errcode = '42501';
  end if;
  return new;
end;
$$;

create function private.guard_game_update()
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
  then
    raise exception 'protected game columns cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.guard_profile_update() from public;
revoke all on function private.guard_game_update() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

create trigger guard_game_update
  before update on public.games
  for each row execute function private.guard_game_update();

create trigger set_updated_at
  before update on public.games
  for each row execute function private.set_updated_at();

-- Privileges -------------------------------------------------------------------
grant select (id, display_name, avatar_path, created_at) on public.profiles to anon;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;

grant select on public.games to anon, authenticated;
grant insert (
  name, players_min, players_max, play_time_min, play_time_max, description,
  source_kind, source_provider, source_id, source_url, added_by
) on public.games to authenticated;
grant update (
  name, players_min, players_max, play_time_min, play_time_max, description,
  cover_path, source_kind, source_provider, source_id, source_url, added_by
) on public.games to authenticated;

grant select on public.game_owners to anon, authenticated;
grant insert (game_id, member_id) on public.game_owners to authenticated;
grant delete on public.game_owners to authenticated;

-- Policies ---------------------------------------------------------------------
create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);

create policy "members edit their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select private.is_active_member()))
  with check (id = (select auth.uid()) and (select private.is_active_member()));

create policy "games are public" on public.games
  for select to anon, authenticated using (true);

create policy "active members add games" on public.games
  for insert to authenticated
  with check ((select private.is_active_member()) and added_by = (select auth.uid()));

create policy "adder or admin edits a game" on public.games
  for update to authenticated
  using (
    (select private.is_active_member())
    and (added_by = (select auth.uid()) or (select private.is_admin()))
  )
  with check (
    (select private.is_active_member())
    and (added_by = (select auth.uid()) or (select private.is_admin()))
  );

create policy "owners are public" on public.game_owners
  for select to anon, authenticated using (true);

create policy "active members mark games they own" on public.game_owners
  for insert to authenticated
  with check ((select private.is_active_member()) and member_id = (select auth.uid()));

create policy "active members unmark games they own" on public.game_owners
  for delete to authenticated
  using ((select private.is_active_member()) and member_id = (select auth.uid()));

-- Shelf view ---------------------------------------------------------------------
-- Each aggregate is its own subquery so later joins cannot inflate counts.
create view public.game_stats
with (security_invoker = true)
as
select
  g.*,
  (select count(*) from public.game_owners o where o.game_id = g.id)::integer as owner_count
from public.games g;

grant select on public.game_stats to anon, authenticated;

-- Migration 4, spec 0002: admin_actions, admin policies, admin_set_member_status,
-- the log triggers, and the covers and avatars buckets with their policies.
-- private.is_admin() already requires an active profile (migration 1).

-- Admin log ------------------------------------------------------------------
-- admin_id is set null when the admin is deleted. target_id is text, not a
-- foreign key, so the log outlives the rows it describes.
create table public.admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_actions_admin_id_idx on public.admin_actions (admin_id);
create index admin_actions_created_at_idx on public.admin_actions (created_at desc);

alter table public.admin_actions enable row level security;

-- Append only: only select is granted. Rows come from the log triggers, which
-- run as the table owner. service_role gets select only, too.
revoke all on public.admin_actions from anon, authenticated, service_role;
grant select on public.admin_actions to authenticated;

create policy "admins read the admin log" on public.admin_actions
  for select to authenticated
  using ((select private.is_admin()));

-- Admin powers on shared data --------------------------------------------------
-- Game update by an admin is already allowed by "adder or admin edits a game".
grant delete on public.games to authenticated;

create policy "admins delete any comment" on public.comments
  for delete to authenticated
  using ((select private.is_admin()));

create policy "admins delete any game" on public.games
  for delete to authenticated
  using ((select private.is_admin()));

-- Disable or re enable a member --------------------------------------------------
-- Security definer, so it passes the profile guard trigger. Role never changes here.
create function public.admin_set_member_status(target uuid, new_status public.member_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) or target is null or target = (select auth.uid()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if new_status is null then
    raise exception 'status is required' using errcode = '22023';
  end if;

  update public.profiles set status = new_status where id = target;
  if not found then
    raise exception 'no such member' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_member_status(uuid, public.member_status) from public, anon;
grant execute on function public.admin_set_member_status(uuid, public.member_status) to authenticated;

-- Log triggers -------------------------------------------------------------------
-- One row per admin action on another member's row. Skipped when the caller is
-- not an active admin, when the admin edits their own row, and when a comment is
-- deleted by a cascade from its game (the game row is already gone). Foreign key
-- cascades run at trigger depth 1, so pg_trigger_depth() cannot detect them.
create function private.log_admin_action()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  action_name text;
  target_key text;
  owner_id uuid;
  detail jsonb;
begin
  if pg_trigger_depth() > 1 or actor is null or not (select private.is_admin()) then
    return null;
  end if;

  if tg_table_name = 'comments' then
    if not exists (select 1 from public.games g where g.id = old.game_id) then
      return null;
    end if;
    -- The comment text is not kept in the log.
    action_name := 'delete_comment';
    target_key := old.id::text;
    owner_id := old.member_id;
    detail := jsonb_build_object('old', to_jsonb(old) - 'body');
  elsif tg_table_name = 'games' and tg_op = 'DELETE' then
    action_name := 'delete_game';
    target_key := old.id::text;
    owner_id := old.added_by;
    detail := jsonb_build_object('old', to_jsonb(old));
  elsif tg_table_name = 'games' then
    action_name := 'update_game';
    target_key := new.id::text;
    owner_id := old.added_by;
    detail := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    action_name := 'set_status';
    target_key := new.id::text;
    owner_id := old.id;
    detail := jsonb_build_object('old', old.status, 'new', new.status);
  end if;

  -- An admin acting on their own row is not logged. A game with no adder counts as someone else's.
  if owner_id is not distinct from actor then
    return null;
  end if;

  insert into public.admin_actions (admin_id, action, target_table, target_id, details)
  values (
    actor,
    action_name,
    tg_table_name,
    target_key,
    detail || jsonb_build_object(
      'admin_display_name', (select p.display_name from public.profiles p where p.id = actor)
    )
  );
  return null;
end;
$$;

revoke all on function private.log_admin_action() from public;

create trigger log_admin_comment_delete
  after delete on public.comments
  for each row execute function private.log_admin_action();

create trigger log_admin_game_update
  after update on public.games
  for each row execute function private.log_admin_action();

create trigger log_admin_game_delete
  after delete on public.games
  for each row execute function private.log_admin_action();

create trigger log_admin_status_change
  after update on public.profiles
  for each row
  when (old.status is distinct from new.status)
  execute function private.log_admin_action();

-- Storage buckets ------------------------------------------------------------------
-- covers: public read, written only by the server with the secret key (no policies).
-- avatars: public read, each active member writes inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, null, null),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Replacing a file needs insert, select, and update.
create policy "active members add their own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_member())
  );

create policy "active members see their own avatar files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_member())
  );

create policy "active members replace their own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_member())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_member())
  );

create policy "active members delete their own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_active_member())
  );

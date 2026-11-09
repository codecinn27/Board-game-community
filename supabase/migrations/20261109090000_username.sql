-- Spec 0011 follow-up: every member has a username they can sign in with.
-- The username is private (not readable by other members or by guests); the
-- display name stays the public label.

alter table public.profiles add column username text;

-- Backfill existing members: the email name with disallowed characters
-- removed, padded to 3 characters, cut to 20, and made unique with a number.
do $$
declare
  r record;
  base text;
  candidate text;
  n int;
begin
  for r in
    select p.id, u.email from public.profiles p
    join auth.users u on u.id = p.id
    where p.username is null
    order by p.created_at, p.id
  loop
    base := regexp_replace(split_part(coalesce(r.email, ''), '@', 1), '[^A-Za-z0-9_-]', '', 'g');
    if char_length(base) < 3 then
      base := base || 'user';
    end if;
    base := left(base, 20);
    candidate := base;
    n := 1;
    while exists (select 1 from public.profiles where username = candidate) loop
      n := n + 1;
      candidate := left(base, 20 - char_length(n::text)) || n::text;
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column username set not null,
  add constraint profiles_username_format
    check (username ~ '^[A-Za-z0-9_-]{3,20}$'),
  add constraint profiles_username_key unique (username);

-- The username is private: nobody reads it through the API. The server looks it
-- up with the secret key (sign in) and for the member's own page.
revoke select on public.profiles from authenticated;
grant select (id, display_name, avatar_path, role, status, created_at)
  on public.profiles to authenticated;

-- A new account takes its username from the sign up metadata. A missing or
-- malformed value (a direct API call) gets a generated one, so the column is
-- never empty. A taken username fails the insert on the unique constraint.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen text := btrim(coalesce(new.raw_user_meta_data ->> 'username', ''));
begin
  if chosen !~ '^[A-Za-z0-9_-]{3,20}$' then
    chosen := 'member_' || left(replace(new.id::text, '-', ''), 12);
  end if;
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        chosen
      ),
      40
    ),
    chosen
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

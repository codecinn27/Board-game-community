-- pgTAP test for the merge readiness check (spec 0002: AC-15).
-- Run with `supabase test db`.
-- Fails when a new table points at games without a cascading game_id key and a known unique rule,
-- so feature 19 can always merge two games by re pointing rows.
begin;

select plan(4);

-- Every foreign key that points at public.games cascades on delete.
select is(
  (select count(*)::int from pg_constraint
    where contype = 'f' and confrelid = 'public.games'::regclass and confdeltype <> 'c'
      and conrelid <> 'public.games'::regclass),
  0,
  'every foreign key to games cascades on delete (added_by points at profiles, not games)'
);

-- Every foreign key to games is on a column named game_id.
select is(
  (select count(*)::int from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.games'::regclass and a.attname <> 'game_id'),
  0,
  'every foreign key to games is on a column named game_id'
);

-- Every public table with a game_id column has that foreign key, so none is forgotten.
select is(
  (select array_agg(t.table_name::text order by t.table_name)
    from information_schema.columns t
    where t.table_schema = 'public' and t.column_name = 'game_id'
      -- History tables keep game_id with no foreign key on purpose, so they outlive the game.
      and t.table_name not in ('game_edits', 'cover_trash')
      and not exists (
        select 1 from pg_constraint c
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
        where c.contype = 'f' and c.confrelid = 'public.games'::regclass
          and c.conrelid = format('public.%I', t.table_name)::regclass and a.attname = 'game_id')),
  null::text[],
  'every table with a game_id column has a foreign key to games'
);

-- The known set of tables that point at games. A new one fails here and must be added on purpose,
-- with its unique rule, so the merge function in feature 19 handles it.
-- The link tables (game_feels, game_themes, game_mechanics) merge by primary key with
-- `on conflict do nothing` (spec 0014).
select is(
  (select array_agg(conrelid::regclass::text order by conrelid::regclass::text)
    from pg_constraint where contype = 'f' and confrelid = 'public.games'::regclass),
  array['comments', 'game_feels', 'game_mechanics', 'game_owners', 'game_themes', 'ratings', 'top_picks', 'wishlist_entries'],
  'the tables pointing at games are the known eight (add new ones here with their unique rule)'
);

select * from finish();
rollback;

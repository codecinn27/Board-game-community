import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/lib/supabase/database.types";
import { fixtureGames, fixtureOwners, fixtureProfiles } from "./fixtures";

// A small stand in for the Supabase client, for the tests of the game reads
// (spec 0009). It answers the few query shapes `rows.ts` uses from plain arrays.

type Row = Record<string, unknown>;

export type FakeTables = {
  game_stats: Row[];
  games: Row[];
  game_owners: Row[];
  profiles: Row[];
};

type Result = { data: Row[] | null; error: { message: string } | null };

class FakeQuery implements PromiseLike<Result> {
  private columns = "";
  private readonly filters: [string, unknown][] = [];

  constructor(
    private readonly tables: FakeTables,
    private readonly table: keyof FakeTables,
    private readonly failWith: string | null,
  ) {}

  select(columns: string) {
    this.columns = columns;
    return this;
  }

  order() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  private run(): Result {
    if (this.failWith !== null) {
      return { data: null, error: { message: this.failWith } };
    }
    let rows = this.tables[this.table].filter((row) =>
      this.filters.every(([column, value]) => row[column] === value),
    );
    if (this.table === "game_owners" && this.columns.includes("profiles(")) {
      rows = rows.map((row) => ({
        ...row,
        profiles:
          this.tables.profiles.find((p) => p.id === row.member_id) ?? null,
      }));
    }
    return { data: rows, error: null };
  }

  async maybeSingle(): Promise<{ data: Row | null; error: Result["error"] }> {
    const { data, error } = this.run();
    return { data: data?.[0] ?? null, error };
  }

  then<A = Result, B = never>(
    onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }
}

/** A client over the given tables. With `failWith`, every query answers that error. */
export function fakeClient(
  tables: FakeTables,
  failWith: string | null = null,
): SupabaseClient<Database> {
  return {
    from: (table: keyof FakeTables) => new FakeQuery(tables, table, failWith),
  } as unknown as SupabaseClient<Database>;
}

/** The 12 fixture games, their owners, and their members, as database tables. */
export function fixtureTables(): FakeTables {
  return {
    game_stats: fixtureGames.map((g) => ({ ...g })),
    games: fixtureGames.map((g) => ({ id: g.id })),
    game_owners: fixtureOwners.map((o) => ({ ...o })),
    profiles: fixtureProfiles.map((p) => ({ ...p })),
  };
}

export function emptyTables(): FakeTables {
  return { game_stats: [], games: [], game_owners: [], profiles: [] };
}

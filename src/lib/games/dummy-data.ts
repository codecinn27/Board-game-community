import { type DummyOwner, type DummyProfile, type ShelfGame } from "./types";

// Slice 1 dummy data, shaped like game_stats, profiles, and game_owners
// (spec 0006). Feature 21 replaces the reads in home.ts and deletes this file.

const MEI = "00000000-0000-4000-8000-000000000001";
const SARA = "00000000-0000-4000-8000-000000000002";
const JUN = "00000000-0000-4000-8000-000000000003";
const ARIF = "00000000-0000-4000-8000-000000000004";

export const dummyProfiles: DummyProfile[] = [
  { id: MEI, display_name: "Mei" },
  { id: SARA, display_name: "Sara" },
  { id: JUN, display_name: "Jun" },
  { id: ARIF, display_name: "Arif" },
];

function game(
  id: number,
  name: string,
  coverTint: string | null,
  createdAt: string,
  addedBy: string | null,
  ratingCount: number,
  avg: number | null,
): ShelfGame {
  return {
    id,
    name,
    created_at: createdAt,
    added_by: addedBy,
    cover_path: null,
    cover_tint: coverTint,
    rating_count: ratingCount,
    avg_recommendation: avg,
  };
}

export const dummyGames: ShelfGame[] = [
  game(1, "Wingspan", "#f3ead2", "2026-08-02T11:00:00Z", SARA, 5, 8.0),
  game(2, "Codenames", "#1f2a44", "2026-08-09T11:00:00Z", MEI, 4, 7.6),
  game(3, "Cascadia", "#f4cfa3", "2026-08-23T11:00:00Z", MEI, 4, 8.2),
  game(4, "Ticket to Ride", "#c9a46a", "2026-09-06T11:00:00Z", null, 2, 7.4),
  game(5, "SETI", "#3fa6c2", "2026-09-20T11:00:00Z", JUN, 3, 8.6),
  game(6, "Magical Athlete", "#e0452e", "2026-10-04T11:00:00Z", ARIF, 3, 7.9),
  game(7, "Azul", "#2f5d8a", "2026-10-11T11:00:00Z", ARIF, 3, 7.8),
  game(8, "Splendor", "#4b3a6b", "2026-10-18T11:00:00Z", JUN, 2, 7.4),
  game(9, "Dixit", "#9fc3db", "2026-10-26T11:00:00Z", MEI, 1, 7.7),
  game(10, "Ark Nova", "#e9b44c", "2026-10-29T11:00:00Z", JUN, 2, 8.5),
  game(11, "Just One", null, "2026-10-31T09:00:00Z", SARA, 0, null),
  game(12, "三国杀", null, "2026-11-01T02:00:00Z", MEI, 2, 7.2),
];

const ownersByGame: Record<number, string[]> = {
  1: [MEI, ARIF, JUN, SARA],
  2: [MEI, ARIF, JUN],
  3: [MEI, SARA],
  4: [ARIF, SARA],
  5: [JUN],
  6: [ARIF, SARA],
  7: [ARIF, SARA],
  8: [JUN],
  9: [MEI],
  10: [JUN],
  11: [SARA],
  12: [MEI],
};

// Each link is dated like its game, as if the owners had it from the start.
export const dummyOwners: DummyOwner[] = dummyGames.flatMap((g) =>
  (ownersByGame[g.id] ?? []).map((memberId) => ({
    game_id: g.id,
    member_id: memberId,
    created_at: g.created_at,
  })),
);

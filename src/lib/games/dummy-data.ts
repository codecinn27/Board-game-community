import { type DummyGame, type DummyOwner, type DummyProfile } from "./types";

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

type GameDetails = Pick<
  DummyGame,
  | "description"
  | "players_min"
  | "players_max"
  | "play_time_min"
  | "play_time_max"
>;

function details(
  description: string | null,
  players: [number, number] | null,
  minutes: [number, number] | null,
): GameDetails {
  return {
    description,
    players_min: players?.[0] ?? null,
    players_max: players?.[1] ?? null,
    play_time_min: minutes?.[0] ?? null,
    play_time_max: minutes?.[1] ?? null,
  };
}

function game(
  id: number,
  name: string,
  coverTint: string | null,
  createdAt: string,
  addedBy: string | null,
  ratingCount: number,
  avg: number | null,
  details: GameDetails,
): DummyGame {
  return {
    id,
    name,
    created_at: createdAt,
    added_by: addedBy,
    cover_path: null,
    cover_tint: coverTint,
    rating_count: ratingCount,
    avg_recommendation: avg,
    ...details,
  };
}

export const dummyGames: DummyGame[] = [
  game(
    1,
    "Wingspan",
    "#f3ead2",
    "2026-08-02T11:00:00Z",
    SARA,
    5,
    8.0,
    details(
      "Attract birds to your wildlife preserve. Each bird you play makes a habitat engine stronger, letting you feed, nest, and lay eggs a little better every round. A calm game with a lot of quiet planning, and the cards are lovely to look at.",
      [1, 5],
      [40, 70],
    ),
  ),
  game(
    2,
    "Codenames",
    "#1f2a44",
    "2026-08-09T11:00:00Z",
    MEI,
    4,
    7.6,
    details(
      "Two teams of spies race to find their agents on a grid of word cards. Each spymaster gives a one word clue for several cards at once, and the team has to guess without touching the assassin. Loud, quick, and great with a crowd.",
      [2, 8],
      [15, 30],
    ),
  ),
  game(
    3,
    "Cascadia",
    "#f4cfa3",
    "2026-08-23T11:00:00Z",
    MEI,
    4,
    8.2,
    details(
      "Build a small corner of the Pacific Northwest by laying habitat tiles and placing wildlife on them. Match the animals to your scoring cards while your landscape grows. Easy to teach, relaxing to play, and rarely the same twice.",
      [1, 4],
      [30, 45],
    ),
  ),
  game(
    4,
    "Ticket to Ride",
    "#c9a46a",
    "2026-09-06T11:00:00Z",
    null,
    2,
    7.4,
    details(
      "Collect train cards and claim railway routes across the map to join distant cities. Finish your secret tickets for big points, and block the other players when you can. A gentle gateway game that works for families.",
      [2, 5],
      [30, 60],
    ),
  ),
  game(
    5,
    "SETI",
    "#3fa6c2",
    "2026-09-20T11:00:00Z",
    JUN,
    3,
    8.6,
    details(
      "Scan the sky for signs of alien life. You launch probes, track signals, and decode data before anyone else does, balancing a tight action budget against a board that keeps moving. A heavier game, best with people who like planning.",
      [1, 4],
      [40, 160],
    ),
  ),
  game(
    6,
    "Magical Athlete",
    "#e0452e",
    "2026-10-04T11:00:00Z",
    ARIF,
    3,
    7.9,
    details(
      "A silly race where every runner has a power that bends the rules. Pick your athletes, bet on the winner, and watch the track turn into chaos. Short, loud, and best with people who enjoy a bit of mischief.",
      [2, 5],
      [30, 30],
    ),
  ),
  game(
    7,
    "Azul",
    "#2f5d8a",
    "2026-10-11T11:00:00Z",
    ARIF,
    3,
    7.8,
    details(
      "Draft colorful tiles and place them on your wall to decorate the royal palace. Every tile you take can hand your neighbor a better one, so you plan ahead and watch what is left. Pretty, quick, and sharp.",
      [2, 4],
      [30, 45],
    ),
  ),
  game(
    8,
    "Splendor",
    "#4b3a6b",
    "2026-10-18T11:00:00Z",
    JUN,
    2,
    7.4,
    details(
      "Be a merchant in the Renaissance. Take gem tokens, buy mines and shops, and win the favor of nobles. A tidy engine builder where each purchase makes the next one cheaper.",
      [2, 4],
      [30, 30],
    ),
  ),
  game(
    9,
    "Dixit",
    "#9fc3db",
    "2026-10-26T11:00:00Z",
    MEI,
    1,
    7.7,
    details(
      "One player gives a clue to a dreamlike picture card, and everyone else tries to find it among decoys. Score only if some, but not all, of the table guesses right. A game about imagination more than rules.",
      [3, 6],
      [30, 30],
    ),
  ),
  game(
    10,
    "Ark Nova",
    "#e9b44c",
    "2026-10-29T11:00:00Z",
    JUN,
    2,
    8.5,
    details(
      "Plan and build a modern zoo. You play animal and sponsor cards, build enclosures, and support conservation projects, with every action card getting stronger as you use it. A big game that takes a few plays to enjoy.",
      [1, 4],
      [90, 150],
    ),
  ),
  game(
    11,
    "Just One",
    null,
    "2026-10-31T09:00:00Z",
    SARA,
    0,
    null,
    details(null, null, null),
  ),
  game(
    12,
    "三国杀",
    null,
    "2026-11-01T02:00:00Z",
    MEI,
    2,
    7.2,
    details(
      "三国题材的身份推理卡牌游戏。每位玩家扮演一位武将，隐藏自己的身份，在主公、忠臣、反贼与内奸之间互相试探，最后达成各自的胜利条件。",
      [2, 10],
      [30, 60],
    ),
  ),
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

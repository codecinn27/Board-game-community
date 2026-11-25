import { afterEach, describe, expect, it, vi } from "vitest";
import { describeFailure, formatDebug, logFailure } from "./debug";

describe("describeFailure", () => {
  it("keeps a Postgres error's code, message, and hint", () => {
    expect(
      describeFailure("database", "rpc add_game", {
        code: "42883",
        message: "function public.add_game does not exist",
        hint: "Run the migration",
      }),
    ).toEqual({
      layer: "database",
      stage: "rpc add_game",
      code: "42883",
      message: "function public.add_game does not exist",
      hint: "Run the migration",
    });
  });

  it("accepts a plain string or nothing", () => {
    expect(describeFailure("backend", "x", "boom").message).toBe("boom");
    expect(describeFailure("frontend", "x")).toEqual({
      layer: "frontend",
      stage: "x",
    });
  });
});

describe("formatDebug", () => {
  it("writes one tagged line", () => {
    expect(
      formatDebug({
        layer: "database",
        stage: "rpc search_games",
        code: "PGRST202",
      }),
    ).toBe("[add-game][database] rpc search_games code=PGRST202");
  });
});

describe("logFailure", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("logs always, and returns the details outside production only", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    expect(logFailure("database", "rpc add_game", { code: "1" })?.code).toBe(
      "1",
    );
    vi.stubEnv("NODE_ENV", "production");
    expect(
      logFailure("database", "rpc add_game", { code: "1" }),
    ).toBeUndefined();
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});

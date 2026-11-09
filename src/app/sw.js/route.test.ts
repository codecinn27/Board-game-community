import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

type Listener = (event: {
  waitUntil: (work: Promise<unknown>) => void;
}) => void;

// Runs the served worker inside a fake service worker scope and records what
// it does, in order.
function runWorker(script: string, cacheNames: string[], tabUrls: string[]) {
  const steps: string[] = [];
  const listeners = new Map<string, Listener>();
  const self = {
    addEventListener: (type: string, listener: Listener) =>
      listeners.set(type, listener),
    skipWaiting: async () => {
      steps.push("skip waiting");
    },
    registration: {
      unregister: async () => {
        steps.push("unregister");
        return true;
      },
    },
    clients: {
      matchAll: async (options: unknown) => {
        steps.push(`find tabs ${JSON.stringify(options)}`);
        return tabUrls.map((url) => ({
          url,
          navigate: async (target: string) => {
            steps.push(`reload ${target}`);
          },
        }));
      },
    },
  };
  const caches = {
    keys: async () => cacheNames,
    delete: async (name: string) => {
      steps.push(`delete ${name}`);
      return true;
    },
  };
  runInNewContext(script, { self, caches });

  const fire = async (type: string) => {
    const listener = listeners.get(type);
    if (listener === undefined) throw new Error(`no ${type} listener`);
    const work: Promise<unknown>[] = [];
    listener({ waitUntil: (promise) => work.push(promise) });
    await Promise.all(work);
  };
  return { steps, fire };
}

describe("GET /sw.js", () => {
  it("answers 404 outside dev, so production ships no worker", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(GET().status).toBe(404);
  });

  it("serves the cleanup worker in dev as JavaScript that is never cached", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/javascript; charset=utf-8",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("takes over at once, deletes every saved copy, leaves, then reloads the tabs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const script = await GET().text();
    const { steps, fire } = runWorker(
      script,
      ["hotlink-hausboom-v13", "next-static-js-assets"],
      ["http://localhost:3000/en"],
    );

    await fire("install");
    await fire("activate");

    expect(steps).toEqual([
      "skip waiting",
      "delete hotlink-hausboom-v13",
      "delete next-static-js-assets",
      "unregister",
      'find tabs {"type":"window"}',
      "reload http://localhost:3000/en",
    ]);
  });
});

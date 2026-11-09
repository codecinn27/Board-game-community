import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RocketHero } from "./auth-decor";

// Spec 0010, AC-19 and AC-21: the rocket in flight (trail design 5, exhaust
// puffs + flame). The big desktop rocket uses the same `RocketFlight`, so
// AuthScene's test covers its motion classes.
describe("RocketHero", () => {
  const html = renderToStaticMarkup(<RocketHero />);

  it("bobs the trail and the rocket as one group", () => {
    expect(html.match(/animate-auth-bob/g)).toHaveLength(1);
    // Everything after the bob group's tag moves with it (the clip outline
    // in <defs> before it repeats the trail shape, but draws nothing).
    const group = html.slice(html.indexOf("motion-safe:animate-auth-bob"));
    expect(group).toMatch(/<path d="M0 84 C40 82[^>]*opacity="0.26"/);
    expect(group).toMatch(/<path d="M0 87 C44 85[^>]*opacity="0.78"/);
    expect(group).toContain('transform="translate(138 36)');
  });

  it("flickers a flame from the nozzle, drawn behind the rocket body", () => {
    expect(html).toMatch(
      /<g class="[^"]*origin-top[^"]*motion-safe:animate-auth-flicker[^"]*">/,
    );
    expect(html).toContain("fill-auth-flame");
    expect(html.indexOf("animate-auth-flicker")).toBeLessThan(
      html.indexOf('d="M60 10 C76 24'),
    );
  });

  it("streams five puffs from the flame's tip, staggered 0.6s apart", () => {
    const puffs = html.match(/<circle[^>]*animate-auth-puff[^>]*>/g) ?? [];
    expect(puffs).toHaveLength(5);
    for (const puff of puffs) {
      expect(puff).toContain('cx="117" cy="48"');
      expect(puff).toContain("opacity-0");
    }
    // Inline, so the `animation` shorthand cannot reset them to 0.
    for (const delay of ["0s", "-0.6s", "-1.2s", "-1.8s", "-2.4s"])
      expect(html).toContain(`animation-delay:${delay}`);
  });

  it("slides a light along the trail, clipped to the trail's outline", () => {
    const clip = /<clipPath id="([^"]+)">/.exec(html)?.[1];
    const light = /<radialGradient id="([^"]+)"/.exec(html)?.[1];
    expect(clip).toBeTruthy();
    expect(light).toBeTruthy();
    expect(html).toContain(`clip-path="url(#${clip})"`);
    expect(html).toMatch(
      new RegExp(
        `fill="url\\(#${light}\\)" class="[^"]*opacity-0[^"]*motion-safe:animate-auth-shimmer`,
      ),
    );
  });

  it("takes the light's white from the clay token, not a literal color", () => {
    expect(html).toMatch(/<radialGradient[^>]*class="text-auth-clay"/);
    expect(html).toContain('stop-color="currentColor"');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("drops the static trail dots", () => {
    expect(html).not.toContain('cx="34" cy="80"');
  });

  it("gives each rocket its own clip and light ids", () => {
    const two = renderToStaticMarkup(
      <>
        <RocketHero />
        <RocketHero />
      </>,
    );
    const ids = [...two.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});

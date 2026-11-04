import { describe, expect, it, vi } from "vitest";
import { coverTheme } from "@/lib/design/cover-tint";
import { CoverTile } from "./cover-tile";
import { render } from "@/components/home/test-intl";

// Spec 0006, AC-6.
describe("CoverTile", () => {
  // covers: feature 21, cover images
  it("shows the bucket image when the game has a cover, and no letter", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");

    const html = render(
      <CoverTile name="Splendor" tint="#2b4c7e" path="splendor.jpg" />,
    );

    expect(html).toContain("<img");
    expect(html).toContain("covers%2Fsplendor.jpg");
    expect(html).not.toContain(">S<");
    vi.unstubAllEnvs();
  });

  // covers: feature 21, cover images
  it("keeps the tint tile when the path is null", () => {
    const html = render(
      <CoverTile name="Splendor" tint="#2b4c7e" path={null} />,
    );

    expect(html).not.toContain("<img");
    expect(html).toContain(">S<");
  });

  // covers: AC-6
  it("fills with the calmed tint and its readable ink, not the raw color", () => {
    const tint = "#e9b44c";
    const theme = coverTheme(tint);

    const html = render(<CoverTile name="Ark Nova" tint={tint} />);

    expect(html).toContain(`background-color:${theme.tint}`);
    expect(html).toContain(`color:${theme.ink}`);
    expect(html).not.toContain(tint);
  });

  // covers: AC-6
  it("uses the neutral tokens when there is no tint", () => {
    const html = render(<CoverTile name="Just One" tint={null} />);

    expect(html).toContain("bg-muted");
    expect(html).toContain("text-foreground");
    expect(html).not.toContain("style=");
  });

  // covers: AC-6
  it("shows the first whole character, uppercased", () => {
    expect(render(<CoverTile name="三国杀" tint={null} />)).toContain(">三<");
    expect(render(<CoverTile name="azul" tint={null} />)).toContain(">A<");
  });

  // covers: AC-6
  it("is decorative: hidden from screen readers and never prints the name", () => {
    const html = render(<CoverTile name="Splendor" tint="#4b3a6b" />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("Splendor");
  });

  it("passes the size classes through", () => {
    const html = render(
      <CoverTile name="Dixit" tint={null} className="size-11 rounded-lg" />,
    );

    expect(html).toContain("size-11");
  });
});

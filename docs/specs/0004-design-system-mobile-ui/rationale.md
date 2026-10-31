# 0004. Design system and mobile first app shell: rationale

The decision record behind [index.md](index.md). `/develop` builds from `index.md` and skips this file.

## Context

The shelf is a public site for a local community of board gamers, used mostly on phones, in English and Chinese, built and run by one maintainer. Twenty features are planned, and nearly every one adds a page. The project already has Tailwind CSS 4 and shadcn/ui set up (the base-nova style on Base UI, lucide icons), but only with starter values: a white and near-black palette, Geist loaded but overridden by an Arial rule, and no components installed.

There was no existing design, no design tool file, and no brand assets. The product's content is mostly other people's art (game box covers), which are busy and colorful, so the surrounding interface has to frame them without competing. Chinese text matters as much as English, and full Chinese web fonts run to several megabytes, which is costly on mobile data. Members will enter many small 1 to 10 scores on phones, often one handed.

Without a decision here, each feature would pick its own colors, spacing, navigation, and input styles, and the site would drift. Dark mode and two languages are cheap to set up before pages exist and painful to retrofit across many pages after. The app shell (how people move between pages) is shared by every page, so it has to exist before the first real page lands.

Constraints: one maintainer, so low maintenance beats richness. Free tier hosting, so no paid font or image services. Every user facing string goes through next-intl. Mobile first, with WCAG 2.2 AA as the agreed accessibility bar.

## Options considered

### Option 1: Keep the shadcn neutral defaults, build components as features need them

Leave the stock neutral palette (white, grey, one accent), add components ad hoc, and write no design document.

**Pros**:
- Zero upfront work; the defaults are already accessible and polished.
- Covers supply all the color, so a neutral frame never clashes.

**Cons**:
- The site looks like every other shadcn app, with no community warmth.
- Nothing stops each feature from inventing its own card, score input, or empty state, so the look drifts.
- Dark mode, the Chinese font stack, and the shell would each be decided mid feature.

### Option 2: Warm tabletop tokens on shadcn base-nova, shell built now, other components specified now and built by their features (chosen)

Restyle the existing shadcn setup with a warm token set (cream and wood with a terracotta accent, light and dark following the system), Geist plus a system Chinese fallback, a 12px radius, and a 44px tap target floor. Build the app shell now. Write the rules for the game card, cover tile, score input, form fields, and state blocks into `docs/design.md`, and let the features that need them build them. A hidden `/design` page previews everything.

**Pros**:
- Gives the site a distinct, friendly identity that suits a game night community, while warm neutrals still let covers stand out.
- Each component is built by the feature that first uses it, against real data and real needs, so nothing is built speculatively.
- Written rules keep later features consistent without deciding again.
- Reuses everything already installed; adds only Playwright for the end to end check.

**Cons**:
- Some rules are written before the component exists and may need adjusting on first build.
- A custom palette needs contrast checking that the stock palette got for free.

### Option 3: Build the full base component set now

Same tokens as Option 2, but build the shell, game card, cover tile, score input, form fields, and state blocks in this feature, all shown on `/design`.

**Pros**:
- Every later feature starts with ready components.
- The design system is visibly complete at the end of this feature.

**Cons**:
- Components get built against no real data (no ratings form, no shelf query yet), so their props are guesses that often change on first real use.
- Delays the first real slice; for one maintainer this is weeks of work with no visitor facing gain.
- Goes against the Tracer Bullet approach of thickening one real thread at a time.

### Option 4: Storybook based component library

Set up Storybook as the catalog and build components in isolation there.

**Pros**:
- The industry standard catalog, with good tooling for visual and interaction tests.
- Components are documented and testable outside the app.

**Cons**:
- Heavy setup and upkeep for Next.js 16, React 19, and Tailwind 4; config breaks on upgrades.
- A second build and a second dependency tree for one maintainer.
- Most of its value (team handoff, many consumers) doesn't apply to a single app.

## Rationale

The forces that decide this are one maintainer, phones first, two languages, and twenty pages still to come. Option 1 is the cheapest today but pushes every look and feel decision into the features, which is exactly where drift comes from, and it leaves dark mode and the Chinese font to be retrofitted. Option 3 front loads work against data that doesn't exist yet; a score input designed before the rating form exists usually gets its props rewritten. Option 4 solves a team catalog problem this project doesn't have.

Option 2 makes the decisions that are expensive to change later (tokens, dark mode, fonts, layout widths, navigation, tap target size, form approach) now, while it is cheap, and builds only the one piece every page needs immediately: the shell. The rest is pinned down as written rules, so features 6, 7, 8, and 12 build their components to a spec instead of to taste.

Specific calls inside the option:
- **Warm tabletop with terracotta**: matches the community game night feel, and terracotta reads well on both cream and charcoal. Runner up was a clean neutral frame, which is safer next to covers but generic.
- **System Chinese fallback over a Noto Sans SC web font**: zero download and native looking text on every phone. The cost is small visual differences between platforms. Loading Noto only on Chinese pages was the runner up; it can be added later without changing tokens.
- **Bottom tab bar**: one thumb reach on phones. The runner up, a top bar with a menu sheet, puts navigation in the hardest corner to reach. Showing the bar only at 2 or more tabs avoids a lonely single tab bar while most destinations are still unbuilt.
- **Segmented 1 to 10 buttons in two rows of five**: the engineer preferred buttons to a slider for precision. A single row of ten would be about 30px per button on a 360px phone, under the 44px target, so phones get two rows of about 60px each and wider screens get one row.
- **Server Actions with Zod and `useActionState`**: native to React 19 and Next 16, no client form library, matches spec 0001's "server actions for writes". React Hook Form was the runner up and stays an option for an unusually dynamic form.
- **Pure CSS dark mode over `next-themes`**: with no toggle planned, a `prefers-color-scheme` media query needs no dependency, no hydration workaround, and can't flash the wrong theme even with JS off. `next-themes` was the first draft pick and the runner up: it keeps shadcn's `.dark` class convention and makes a future toggle easy, but that is a cost paid now for a feature nobody asked for. The cross check flagged this and the engineer agreed.
- **A darker `--input` split from `--border`**: AA needs 3:1 for form field borders, which a soft cream divider can't reach, so field borders get their own token and dividers stay soft and decorative.
- **A test for contrast** instead of a manual check: the palette is custom and the bar is AA, and a test is the only way a later tweak can't silently break it. A small OKLCH to sRGB conversion avoids adding an accessibility library.
- **Overboard as the mobile reference** (added 2026-10-31, the engineer's pick): a board game app whose cream and orange palette already matches these tokens, so it sharpens the direction without a palette change. Patterns are borrowed (cover led detail, stats strip, floating action pill, glass over art); its name, assets, and BGG fields are not.
- **Game detail as a sheet** (added 2026-10-31): opening a game over the shelf keeps the visitor's place and feels like an app.
- **Cover Tint over the arch** (amended 2026-11-01): five sheet designs were mocked on a design canvas ([Game Detail Sheet](https://claude.ai/artifact/PBVkW9skcPLVmEjDbS8Bog)): 1 Warm Glass (cream panel with an arch), 2 Holo Night (glass and glow), 3 Tabletop Card (cardboard), 4 Immersive Peek (full screen cover with a pull up drawer), and 5 Cover Tint. The engineer picked Cover Tint: every game gets its own theme from its cover, which suits a shelf of colorful box art better than one fixed panel, and it is what the engineer liked in Overboard. It also settles the light and dark question for the sheet, since the cover decides. The arch was dropped because the fade does its job. Costs: one new column (`cover_tint`) and a color step when a cover is saved, and terracotta shows less inside the sheet. Risk: an unreadable theme from an odd cover; the color rules force 4.5:1 for every input, and a test sweeps the whole color range. Runner up was Design 1 (simplest build, fits the spec as first written).
- **Color picked on the server, once**: sampling in the browser would need canvas access to the image (cross origin rules) and would flash the default color first. Sampling with `sharp` when the server saves the cover costs one small step per upload and nothing per view.
- **`/` stays the shelf** until the Home feature ships, as the engineer chose, so no route moves now; the nav config records the later swap.

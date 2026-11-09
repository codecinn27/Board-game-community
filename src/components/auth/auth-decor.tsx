import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

// The Dice Galaxy art (spec 0010, AC-16, AC-19, AC-21): the night sky, stars,
// a ringed planet, two clay dice, sparkles, a rocket in flight, and the cloud
// bank the form card rests on. All of it is inline SVG with `--auth-*` fills,
// hidden from assistive tech, so it stays sharp at every size and needs no
// image files. Pieces are placed from the page center (`calc(50% ± …)`), so
// none covers the card at any width. Every animation (float, twinkle, and
// the rocket's bob, flame, puffs, and light) runs only under `motion-safe`.

const float = "motion-safe:animate-auth-float";

/**
 * The sky and every piece of art behind the card. The layer is as wide as the
 * window and centered on the column, so the sky reaches both window edges
 * even past the shell's max width (the body clips the overflow).
 */
export function AuthDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 w-screen -translate-x-1/2 bg-[radial-gradient(130%_75%_at_50%_0%,var(--auth-sky)_0%,var(--auth-sky-mid)_55%,var(--auth-sky-deep)_100%)]"
    >
      <Stars />

      <div
        className={cn(
          "absolute top-3 right-2 w-[84px] [animation-delay:-2s] sm:top-6 sm:right-auto sm:left-[calc(50%+170px)] sm:w-[110px] lg:top-10 lg:left-[calc(50%+300px)] lg:w-[180px]",
          float,
        )}
      >
        <Planet />
      </div>

      <div
        className={cn(
          "absolute top-[150px] left-2.5 w-[46px] -rotate-12 [animation-delay:-5s] sm:top-[190px] sm:right-[calc(50%+190px)] sm:left-auto sm:w-[60px] lg:top-[330px] lg:right-auto lg:left-[calc(50%+360px)] lg:w-[84px] lg:rotate-12",
          float,
        )}
      >
        <Die tone="rose" />
      </div>

      <div
        className={cn(
          "absolute top-[300px] left-[calc(50%+250px)] hidden w-[50px] -rotate-10 [animation-delay:-3.5s] md:block lg:top-[210px] lg:w-[58px]",
          float,
        )}
      >
        <Die tone="clay" />
      </div>

      {/* Anchored to the bottom, so the trail always lands in the clouds. */}
      <div className="absolute right-[calc(50%+250px)] bottom-[calc(var(--main-pb)+80px)] hidden w-[min(340px,27vw)] lg:block">
        <BigRocket />
      </div>

      <Sparkle className="absolute top-[118px] left-[calc(50%+262px)] hidden w-[18px] lg:block" />
      <Sparkle className="absolute top-[480px] right-[calc(50%+300px)] hidden w-[14px] lg:block" />

      <CloudBank />
    </div>
  );
}

/** The small rocket above the heading, below `lg` (the big one takes over). */
export function RocketHero({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 90"
      className={cn("h-auto w-45 shrink-0 overflow-visible sm:w-50", className)}
    >
      <RocketFlight flight={SMALL_FLIGHT} />
      <path
        transform="translate(176 14) scale(0.6)"
        d={SPARKLE}
        className="fill-auth-spark"
      />
      <path
        transform="translate(96 22) scale(0.4)"
        d={SPARKLE}
        className="fill-auth-spark"
      />
    </svg>
  );
}

/**
 * One rocket's flight, in its own SVG units: where the rocket sits, its two
 * trail shapes, where the puffs start (the flame's tip) and the light starts
 * (the nozzle), and how far they travel. The travel is set as `--auth-mid-*`
 * and `--auth-end-*` classes, read by the `auth-puff` and `auth-shimmer`
 * keyframes in globals.css; they are written out whole so Tailwind finds them.
 */
type Flight = {
  rocket: string;
  outer: string;
  inner: string;
  puff: { cx: number; cy: number; r: number; travel: string };
  light: { cx: number; cy: number; r: number; travel: string };
};

const SMALL_FLIGHT: Flight = {
  rocket: "translate(138 36) rotate(60) scale(0.45) translate(-60 -60)",
  outer: "M0 84 C40 82 84 66 122 42 L128 50 C90 76 46 90 0 90 Z",
  inner: "M0 87 C44 85 88 70 123 45 L126 48 C90 76 46 90 0 90 Z",
  puff: {
    cx: 117,
    cy: 48,
    r: 3.2,
    travel:
      "[--auth-mid-x:-57px] [--auth-mid-y:29px] [--auth-end-x:-114px] [--auth-end-y:40px]",
  },
  light: {
    cx: 123,
    cy: 47,
    r: 14,
    travel: "[--auth-end-x:-120px] [--auth-end-y:41px]",
  },
};

const BIG_FLIGHT: Flight = {
  rocket: "translate(250 90) rotate(45) scale(1.05) translate(-60 -60)",
  outer: "M232 108 C200 180 150 320 60 450 L160 450 C215 340 244 200 252 122 Z",
  inner:
    "M236 112 C210 190 172 330 100 450 L138 450 C196 340 234 200 247 120 Z",
  puff: {
    cx: 211,
    cy: 129,
    r: 6,
    travel:
      "[--auth-mid-x:-43px] [--auth-mid-y:128px] [--auth-end-x:-113px] [--auth-end-y:317px]",
  },
  light: {
    cx: 226,
    cy: 116,
    r: 30,
    travel: "[--auth-end-x:-128px] [--auth-end-y:330px]",
  },
};

// Five puffs on a 3s loop, one leaving the flame every 0.6s.
// The delay is an inline style: a class loses to the `animation` shorthand
// that `motion-safe:animate-auth-puff` emits later, which would reset every
// delay to 0 and stack all five puffs into one.
const PUFF_DELAYS = ["0s", "-0.6s", "-1.2s", "-1.8s", "-2.4s"];

/**
 * The rocket in flight: the rocket, its trail, and everything on the trail
 * bob as one group, so the trail never comes loose. A flame flickers at the
 * nozzle, five puffs stream from the flame's tip down the trail, and a soft
 * light slides along the trail inside its outline. All of it moves only
 * under `motion-safe`; with reduced motion the puffs and the light stay
 * hidden (`opacity-0`) and the rest holds still. `children` are drawn on the
 * trail under the puffs (the big rocket's landing puffs).
 */
function RocketFlight({
  flight,
  children,
}: {
  flight: Flight;
  children?: ReactNode;
}) {
  const id = useId();
  const trailId = `${id}trail`;
  const lightId = `${id}light`;
  const { puff, light } = flight;

  return (
    <>
      <defs>
        <clipPath id={trailId}>
          <path d={flight.outer} />
        </clipPath>
        {/* The stops read `currentColor`, so the light is the clay token. */}
        <radialGradient id={lightId} className="text-auth-clay">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="motion-safe:animate-auth-bob">
        <path d={flight.outer} opacity="0.26" className="fill-auth-clay" />
        <path d={flight.inner} opacity="0.78" className="fill-auth-clay" />
        <g clipPath={`url(#${trailId})`}>
          <circle
            cx={light.cx}
            cy={light.cy}
            r={light.r}
            fill={`url(#${lightId})`}
            className={`opacity-0 motion-safe:animate-auth-shimmer ${light.travel}`}
          />
        </g>
        {children}
        <g className="fill-auth-clay">
          {PUFF_DELAYS.map((delay) => (
            <circle
              key={delay}
              cx={puff.cx}
              cy={puff.cy}
              r={puff.r}
              style={{ animationDelay: delay }}
              className={`origin-center opacity-0 transform-fill motion-safe:animate-auth-puff ${puff.travel}`}
            />
          ))}
        </g>
        <g transform={flight.rocket}>
          <Flame />
          <RocketShape />
        </g>
      </g>
    </>
  );
}

/** The nozzle flame in the rocket's box: gold, orange, and a white core. */
function Flame() {
  return (
    <g className="origin-top transform-fill motion-safe:animate-auth-flicker">
      <path d="M46 93 Q60 134 74 93 Z" className="fill-auth-gold" />
      <path d="M51 93 Q60 122 69 93 Z" className="fill-auth-flame" />
      <path d="M55.5 93 Q60 110 64.5 93 Z" className="fill-auth-clay" />
    </g>
  );
}

/** The clay rocket, nose up, in a 120 by 120 box. */
function RocketShape() {
  return (
    <>
      <path
        d="M60 10 C76 24 82 46 82 68 L82 88 L38 88 L38 68 C38 46 44 24 60 10 Z"
        className="fill-auth-clay"
      />
      <path
        d="M60 10 C76 24 82 46 82 68 L82 88 L69 88 L69 68 C69 46 66 26 60 10 Z"
        className="fill-auth-clay-shade"
      />
      <path
        d="M60 10 C68 17 74 27 77 38 L43 38 C46 27 52 17 60 10 Z"
        className="fill-auth-magenta"
      />
      <path d="M38 66 L22 94 L38 90 Z" className="fill-auth-magenta" />
      <path d="M82 66 L98 94 L82 90 Z" className="fill-auth-magenta" />
      <circle
        cx="60"
        cy="58"
        r="11"
        strokeWidth="5"
        className="fill-auth-window stroke-auth-magenta"
      />
      <circle
        cx="56"
        cy="54"
        r="3.5"
        opacity="0.7"
        className="fill-auth-clay"
      />
      <rect
        x="46"
        y="88"
        width="28"
        height="7"
        rx="3"
        className="fill-auth-clay-deep"
      />
    </>
  );
}

/** From `lg`: a big rocket left of the card, its trail ending in puffs. */
function BigRocket() {
  return (
    <svg viewBox="0 0 360 500" className="h-auto w-full overflow-visible">
      <RocketFlight flight={BIG_FLIGHT}>
        <g className="fill-auth-clay">
          <circle cx="110" cy="430" r="18" opacity="0.6" />
          <circle cx="80" cy="452" r="30" opacity="0.85" />
          <circle cx="128" cy="462" r="24" opacity="0.8" />
          <circle cx="44" cy="470" r="20" opacity="0.7" />
        </g>
      </RocketFlight>
      <path
        transform="translate(326 40) scale(0.8)"
        d={SPARKLE}
        className="fill-auth-spark"
      />
      <path
        transform="translate(110 70) scale(0.5)"
        d={SPARKLE}
        className="fill-auth-spark"
      />
    </svg>
  );
}

function Planet() {
  return (
    <svg viewBox="0 0 92 70" className="h-auto w-full">
      <ellipse
        cx="46"
        cy="38"
        rx="42"
        ry="10"
        transform="rotate(-14 46 38)"
        fill="none"
        strokeWidth="4"
        opacity="0.55"
        className="stroke-auth-gold"
      />
      <circle cx="46" cy="35" r="22" className="fill-auth-rose-deep" />
      <circle cx="43" cy="32" r="18.5" className="fill-auth-rose" />
      <ellipse
        cx="38"
        cy="25"
        rx="7"
        ry="4"
        transform="rotate(-30 38 25)"
        className="fill-auth-rose-light"
      />
      <path
        d="M6 46 Q46 30 86 28"
        transform="rotate(-2 46 38)"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-auth-gold"
      />
    </svg>
  );
}

// Each die face: a fill plus a stroke of the same color, so the corners round.
const DIE_TONES = {
  clay: {
    top: "fill-auth-clay stroke-auth-clay",
    left: "fill-auth-clay-shade stroke-auth-clay-shade",
    right: "fill-auth-clay-deep stroke-auth-clay-deep",
    pips: "fill-auth-pip",
  },
  rose: {
    top: "fill-auth-rose-light stroke-auth-rose-light",
    left: "fill-auth-rose stroke-auth-rose",
    right: "fill-auth-rose-deep stroke-auth-rose-deep",
    pips: "fill-auth-clay",
  },
} as const;

// One pip on top, two on the left face, three on the right face.
const PIPS = [
  [30, 18, 4, 2.3],
  [14, 28, 2.4, 3.2],
  [24, 44, 2.4, 3.2],
  [46, 27, 2.4, 3.2],
  [41, 35, 2.4, 3.2],
  [36, 44, 2.4, 3.2],
] as const;

/** A clay die seen from above a corner. */
function Die({ tone }: { tone: keyof typeof DIE_TONES }) {
  const colors = DIE_TONES[tone];
  return (
    <svg viewBox="0 0 60 60" className="h-auto w-full">
      <g strokeWidth="5" strokeLinejoin="round">
        <path d="M30 6 L52 18 L30 30 L8 18 Z" className={colors.top} />
        <path d="M8 18 L30 30 L30 54 L8 42 Z" className={colors.left} />
        <path d="M52 18 L52 42 L30 54 L30 30 Z" className={colors.right} />
      </g>
      <g className={colors.pips}>
        {PIPS.map(([cx, cy, rx, ry]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} />
        ))}
      </g>
    </svg>
  );
}

const SPARKLE = "M0 -11 Q2 -2 11 0 Q2 2 0 11 Q-2 2 -11 0 Q-2 -2 0 -11 Z";

function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={cn("h-auto", className)}>
      <path d={SPARKLE} className="fill-auth-spark" />
    </svg>
  );
}

// [x, y, radius, opacity] in a 1280 by 800 sky, cropped to fit the screen.
const STARS = [
  [60, 60, 1.6, 0.8],
  [220, 30, 1.2, 0.6],
  [380, 90, 1.8, 0.9],
  [520, 40, 1.2, 0.6],
  [780, 70, 1.6, 0.8],
  [900, 24, 1.2, 0.6],
  [1180, 60, 1.8, 0.8],
  [1240, 200, 1.2, 0.6],
  [40, 300, 1.4, 0.7],
  [440, 260, 1.1, 0.5],
  [860, 300, 1.3, 0.6],
  [1220, 420, 1.6, 0.8],
  [70, 480, 1.2, 0.6],
  [1000, 180, 1, 0.5],
  [300, 420, 1.4, 0.6],
  [960, 460, 1.2, 0.6],
  [470, 150, 1.2, 0.7],
  [560, 330, 1, 0.5],
  [700, 210, 1.3, 0.6],
  [820, 420, 1.1, 0.5],
] as const;

const TWINKLES = [
  [
    [600, 40, 1.8],
    [740, 140, 1.5],
    [430, 380, 1.6],
    [1120, 300, 1.8],
  ],
  [
    [500, 210, 1.6],
    [830, 110, 1.8],
    [660, 480, 1.4],
    [180, 160, 1.8],
  ],
] as const;

function Stars() {
  return (
    <svg
      viewBox="0 0 1280 800"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <circle
        cx="140"
        cy="120"
        r="90"
        opacity="0.14"
        className="fill-auth-glow"
      />
      <circle
        cx="1100"
        cy="560"
        r="120"
        opacity="0.25"
        className="fill-auth-sky"
      />
      <g className="fill-auth-clay">
        {STARS.map(([cx, cy, r, opacity]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} opacity={opacity} />
        ))}
      </g>
      {TWINKLES.map((group, index) => (
        <g
          key={index}
          className={cn(
            "fill-auth-clay motion-safe:animate-auth-twinkle",
            index === 1 && "[animation-delay:-1.75s]",
          )}
        >
          {group.map(([cx, cy, r]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
          ))}
        </g>
      ))}
    </svg>
  );
}

// The cloud bank is 2560 wide, so `slice` scales it by its height alone on
// any window up to 2560px: the puffs keep one size and no top gets cut.
// Puffs overlap well past their centers and the base starts above the
// valleys between them, so no sky shows through.
const PUFFS = Array.from({ length: 28 }, (_, i) => ({
  cx: i * 96,
  cy: 118 + ((i * 7) % 3) * 10,
  r: 56 + ((i * 5) % 4) * 6,
}));
const HAZE = Array.from({ length: 8 }, (_, i) => ({
  cx: 100 + i * 330,
  cy: 78 + (i % 2) * 8,
  r: 44 + (i % 3) * 6,
}));
const BUBBLES = [
  [1110, 30, 6, 0.7],
  [1130, 14, 3.5, 0.6],
  [1500, 26, 7, 0.7],
  [1524, 10, 3.5, 0.6],
] as const;

/**
 * Overlapping white clouds along the bottom. A white strip under them fills
 * the main's bottom padding, so the clouds continue under the phone tab bar.
 */
function CloudBank() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col">
      <svg
        viewBox="0 0 2560 180"
        preserveAspectRatio="xMidYMax slice"
        className="h-30 w-full lg:h-45"
      >
        <g opacity="0.35" className="fill-auth-haze">
          {HAZE.map(({ cx, cy, r }) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
        </g>
        <g className="fill-auth-clay">
          {PUFFS.map(({ cx, cy, r }) => (
            <circle key={cx} cx={cx} cy={cy} r={r} />
          ))}
          <rect x="0" y="116" width="2560" height="64" />
          {BUBBLES.map(([cx, cy, r, opacity]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} opacity={opacity} />
          ))}
        </g>
      </svg>
      <div className="h-(--main-pb) bg-auth-clay" />
    </div>
  );
}

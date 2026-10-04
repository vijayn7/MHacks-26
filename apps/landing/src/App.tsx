import { useEffect, useRef, useState, type CSSProperties } from "react";

type Layer = "void" | "far" | "mid" | "near";

type FlamePalette = {
  tip: string;
  mid: string;
  base: string;
  core: string;
  button: string;
  glow: string;
};

type Tile = {
  id: string;
  src: string;
  alt: string;
  layer: Layer;
  /** Fully on-screen front windows that reveal the urge overlay on hover */
  interactive?: boolean;
  /** Product line shown in the desktop hover overlay */
  product?: string;
  /** Sleeping-flame colors for this screen’s overlay */
  flame?: FlamePalette;
  /** Parallax intensity within the layer (default 1) */
  drift?: number;
  /** 0 = farthest, 1 = closest — unique per tile for Z stagger */
  depth?: number;
  style: CSSProperties;
};

const FLAMES = {
  peach: {
    tip: "#E48A78",
    mid: "#F0B0A0",
    base: "#F8D4C8",
    core: "#FFE8E0",
    button: "#F7D0C6",
    glow: "232 155 138",
  },
  ember: {
    tip: "#ED7014",
    mid: "#F5A524",
    base: "#FFD66B",
    core: "#FFF3D6",
    button: "#FFD66B",
    glow: "245 165 36",
  },
  violet: {
    tip: "#8B5CF6",
    mid: "#A78BFA",
    base: "#DDD6FE",
    core: "#F5F3FF",
    button: "#DDD6FE",
    glow: "167 139 250",
  },
  teal: {
    tip: "#0D9488",
    mid: "#2DD4BF",
    base: "#99F6E4",
    core: "#ECFDF5",
    button: "#99F6E4",
    glow: "45 212 191",
  },
  sky: {
    tip: "#2563EB",
    mid: "#60A5FA",
    base: "#BFDBFE",
    core: "#EFF6FF",
    button: "#BFDBFE",
    glow: "96 165 250",
  },
  rose: {
    tip: "#E11D48",
    mid: "#FB7185",
    base: "#FECDD3",
    core: "#FFF1F2",
    button: "#FECDD3",
    glow: "251 113 133",
  },
} as const satisfies Record<string, FlamePalette>;

/**
 * Dense organic scatter — roughly balanced, intentionally irregular.
 * Void sits behind everything (near-black). Extra mid-field windows live in void.
 */
const tiles: Tile[] = [
  {
    id: "t1",
    src: "sites/amazon.jpg",
    alt: "Amazon",
    layer: "far",
    drift: 0.7,
    style: { top: "-14%", left: "-16%", width: "36%", aspectRatio: "16 / 10" },
  },
  {
    id: "t2",
    src: "sites/asos.jpg",
    alt: "ASOS",
    layer: "far",
    drift: 1.2,
    style: { top: "-12%", right: "-17%", width: "37%", aspectRatio: "16 / 10" },
  },
  {
    id: "t3",
    src: "sites/polymarket.jpg",
    alt: "Polymarket",
    layer: "far",
    drift: 0.85,
    style: { bottom: "-15%", left: "-15%", width: "38%", aspectRatio: "16 / 10" },
  },
  {
    id: "t4",
    src: "sites/shein.jpg",
    alt: "SHEIN",
    layer: "far",
    drift: 1.15,
    style: { bottom: "-14%", right: "-16%", width: "37%", aspectRatio: "16 / 10" },
  },
  {
    id: "t6",
    src: "sites/edikted.jpg",
    alt: "Edikted",
    layer: "far",
    drift: 1.05,
    style: {
      top: "48%",
      right: "-19%",
      width: "33%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right top",
    },
  },
  {
    id: "t8",
    src: "sites/bestbuy.jpg",
    alt: "Best Buy far",
    layer: "far",
    drift: 1.25,
    style: {
      top: "10%",
      right: "-18%",
      width: "31%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left center",
    },
  },
  {
    id: "c1",
    src: "sites/walmart.jpg",
    alt: "Walmart",
    layer: "void",
    drift: 0.9,
    style: { top: "1%", left: "34%", width: "15%", aspectRatio: "16 / 10" },
  },
  {
    id: "c2",
    src: "sites/costco.jpg",
    alt: "Costco",
    layer: "void",
    drift: 1.2,
    style: { top: "4%", right: "30%", width: "13%", aspectRatio: "16 / 10" },
  },
  {
    id: "c3",
    src: "sites/depop.jpg",
    alt: "Depop",
    layer: "mid",
    drift: 0.75,
    style: { top: "22%", left: "22%", width: "14%", aspectRatio: "16 / 10" },
  },
  {
    id: "c4",
    src: "sites/asos.jpg",
    alt: "ASOS",
    layer: "near",
    interactive: true,
    product: "linen blazer • $89",
    flame: FLAMES.violet,
    drift: 1.1,
    style: {
      top: "-3%",
      left: "70%",
      width: "22%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "c6",
    src: "sites/shein.jpg",
    alt: "SHEIN mid",
    layer: "mid",
    drift: 1.3,
    style: {
      top: "44%",
      left: "24%",
      width: "13%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "c7",
    src: "sites/edikted.jpg",
    alt: "Edikted mid",
    layer: "mid",
    drift: 0.85,
    style: {
      top: "48%",
      right: "22%",
      width: "15%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right top",
    },
  },
  {
    id: "c8",
    src: "sites/polymarket.jpg",
    alt: "Polymarket mid",
    layer: "far",
    drift: 1.0,
    style: {
      bottom: "2%",
      left: "36%",
      width: "14%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c10",
    src: "sites/amazon.jpg",
    alt: "Amazon mid",
    layer: "far",
    drift: 0.7,
    style: {
      top: "36%",
      left: "36%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
  {
    id: "c12",
    src: "sites/ebay.jpg",
    alt: "eBay mid",
    layer: "far",
    drift: 0.9,
    style: {
      top: "56%",
      left: "18%",
      width: "13%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "c15",
    src: "sites/costco.jpg",
    alt: "Costco high",
    layer: "far",
    drift: 1.35,
    style: {
      top: "-2%",
      left: "22%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "c16",
    src: "sites/bestbuy.jpg",
    alt: "Best Buy mid",
    layer: "mid",
    drift: 0.95,
    style: {
      top: "20%",
      left: "8%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "c20",
    src: "sites/edikted.jpg",
    alt: "Edikted side",
    layer: "mid",
    drift: 0.85,
    style: {
      top: "18%",
      right: "8%",
      width: "11%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
  {
    id: "c22",
    src: "sites/amazon.jpg",
    alt: "Amazon low",
    layer: "mid",
    drift: 1.3,
    style: {
      bottom: "10%",
      left: "42%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
  {
    id: "c24",
    src: "sites/walmart.jpg",
    alt: "Walmart side",
    layer: "mid",
    drift: 1.15,
    style: {
      top: "42%",
      right: "8%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c27",
    src: "sites/polymarket.jpg",
    alt: "Polymarket high",
    layer: "far",
    drift: 0.8,
    style: {
      top: "8%",
      right: "14%",
      width: "11%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c30",
    src: "sites/bestbuy.jpg",
    alt: "Best Buy high",
    layer: "void",
    drift: 1.1,
    style: {
      top: "-1%",
      left: "54%",
      width: "10%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "c32",
    src: "sites/depop.jpg",
    alt: "Depop low",
    layer: "void",
    drift: 1.25,
    style: {
      bottom: "-3%",
      left: "24%",
      width: "13%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c33",
    src: "sites/shein.jpg",
    alt: "SHEIN low",
    layer: "far",
    drift: 0.85,
    style: {
      bottom: "-4%",
      right: "22%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "i2",
    src: "sites/ebay.jpg",
    alt: "eBay",
    layer: "near",
    interactive: true,
    product: "vintage camera • $220",
    flame: FLAMES.ember,
    drift: 1.2,
    style: { top: "-4%", left: "-3%", width: "26%", aspectRatio: "16 / 10" },
  },
  {
    id: "i3",
    src: "sites/princesspolly.jpg",
    alt: "Princess Polly",
    layer: "near",
    interactive: true,
    product: "satin mini dress • $68",
    flame: FLAMES.rose,
    drift: 1.0,
    style: {
      top: "38%",
      left: "1%",
      width: "21%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left center",
    },
  },
  {
    id: "i4",
    src: "sites/amazon.jpg",
    alt: "Amazon deals",
    layer: "near",
    interactive: true,
    product: "studio headphones • $149",
    flame: FLAMES.peach,
    drift: 1.15,
    style: {
      top: "32%",
      right: "1%",
      width: "23%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
  {
    id: "i5",
    src: "sites/polymarket.jpg",
    alt: "Polymarket",
    layer: "near",
    interactive: true,
    product: "yes shares • $42",
    flame: FLAMES.sky,
    drift: 0.9,
    style: {
      bottom: "4%",
      left: "12%",
      width: "22%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "i6",
    src: "sites/kalshi.jpg",
    alt: "Kalshi",
    layer: "near",
    interactive: true,
    product: "event contract • $18",
    flame: FLAMES.teal,
    drift: 1.1,
    depth: 0.97,
    style: {
      bottom: "-4%",
      right: "-4%",
      width: "40%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
];

/** Spread each layer across a unique Z band so tiles don't share one plane. */
function withStaggeredDepth(list: Tile[]): Tile[] {
  const bands: Record<Layer, [number, number]> = {
    void: [0.0, 0.1],
    far: [0.16, 0.4],
    mid: [0.45, 0.7],
    near: [0.78, 0.97],
  };

  const byLayer: Record<Layer, Tile[]> = { void: [], far: [], mid: [], near: [] };
  for (const tile of list) byLayer[tile.layer].push(tile);

  const depthOf = new Map<string, number>();
  (Object.keys(byLayer) as Layer[]).forEach((layer) => {
    const group = byLayer[layer];
    const [lo, hi] = bands[layer];
    const n = group.length;
    group.forEach((tile, i) => {
      // Uneven steps so depths don't look like a perfect ladder
      const t = n <= 1 ? 0.5 : i / (n - 1);
      const wobble = ((i * 17) % 7) * 0.006 - 0.018;
      depthOf.set(tile.id, Math.min(hi, Math.max(lo, lo + (hi - lo) * t + wobble)));
    });
  });

  return list.map((tile) => ({
    ...tile,
    depth: tile.depth ?? depthOf.get(tile.id) ?? 0.5,
  }));
}

const fieldTiles = withStaggeredDepth(tiles);

function ChromeIcon() {
  return (
    <svg className="cta__icon cta__icon--chrome" viewBox="0 0 24 24" aria-hidden="true">
      {/* White Chrome mark: three gapped wedges + solid center disc */}
      <path
        fill="#fff"
        d="M2.523 5.486A11.5 11.5 0 0 1 21.477 5.486L16.615 8.828A5.6 5.6 0 0 0 7.385 8.828Z M22.38 7.049A11.5 11.5 0 0 1 12.902 23.465L12.439 17.583A5.6 5.6 0 0 0 17.054 9.589Z M11.098 23.465A11.5 11.5 0 0 1 1.62 7.049L6.946 9.589A5.6 5.6 0 0 0 11.561 17.583Z"
      />
      <circle cx="12" cy="12" r="4.2" fill="#fff" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="cta__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a1 1 0 0 1 1 1v9.17l2.59-2.58a1 1 0 1 1 1.41 1.42l-4.3 4.29a1 1 0 0 1-1.4 0l-4.3-4.3a1 1 0 1 1 1.41-1.4L11 13.17V4a1 1 0 0 1 1-1zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z"
      />
    </svg>
  );
}

function FriendIcon() {
  return (
    <svg className="urge__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.5 13.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.5 15c-2.9 0-5.25 1.57-5.25 3.5V20h10.5v-1.5c0-1.93-2.35-3.5-5.25-3.5Zm7-.5c-.34 0-.68.03-1 .08 1.2.82 2 2 2 3.42V20H21v-1.25c0-1.7-1.9-3.25-4.5-3.25Z"
      />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg className="urge__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.5 3.75A1.75 1.75 0 0 1 8.25 2h7.5c.97 0 1.75.78 1.75 1.75v17.1a.75.75 0 0 1-1.2.6L12 17.65l-4.3 3.8a.75.75 0 0 1-1.2-.6V3.75Z"
      />
    </svg>
  );
}

/** Peaceful sleeping flame for the desktop urge overlay */
function SleepingFlame({ uid, flame }: { uid: string; flame: FlamePalette }) {
  const body = `${uid}-body`;
  const core = `${uid}-core`;
  const smoke = `${uid}-smoke`;
  return (
    <svg className="urge__flame" viewBox="0 0 240 270" aria-hidden="true">
      <defs>
        <filter id={smoke} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={flame.tip} />
          <stop offset="42%" stopColor={flame.mid} />
          <stop offset="100%" stopColor={flame.base} />
        </linearGradient>
        <radialGradient id={core} cx="48%" cy="72%" r="55%">
          <stop offset="0%" stopColor={flame.core} stopOpacity="0.95" />
          <stop offset="55%" stopColor={flame.base} stopOpacity="0.35" />
          <stop offset="100%" stopColor={flame.base} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft trailing smoke — drifts up and aside, not tip secretion */}
      <g filter={`url(#${smoke})`} opacity="0.55">
        <ellipse cx="92" cy="78" rx="22" ry="48" fill="#2a1814" transform="rotate(-28 92 78)" />
        <ellipse cx="128" cy="58" rx="18" ry="42" fill="#241612" transform="rotate(-12 128 58)" />
        <ellipse cx="152" cy="72" rx="14" ry="34" fill="#1c100e" transform="rotate(18 152 72)" />
      </g>
      <g transform="translate(10 28) scale(0.92)">
        <path d={FLAME_SILHOUETTE} fill={`url(#${body})`} />
        <path d={FLAME_SILHOUETTE} fill={`url(#${core})`} />
      </g>
      {/* Closed peaceful eyes — soft downward arcs */}
      <path
        d="M100 160c3.5 8 14.5 8 18 0"
        fill="none"
        stroke="#3A0F02"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <path
        d="M134 158c3.5 8 14.5 8 18 0"
        fill="none"
        stroke="#3A0F02"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UrgeOverlay({
  site,
  product,
  uid,
  flame,
}: {
  site: string;
  product: string;
  uid: string;
  flame: FlamePalette;
}) {
  return (
    <div className="tile__block" role="dialog" aria-label={`Snuff urge on ${site}`}>
      <div
        className="urge"
        style={
          {
            ["--urge-accent" as string]: flame.button,
            ["--urge-glow" as string]: flame.glow,
          } as CSSProperties
        }
      >
        <span className="urge__close" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6.2 6.2a1 1 0 0 1 1.4 0L12 10.6l4.4-4.4a1 1 0 1 1 1.4 1.4L13.4 12l4.4 4.4a1 1 0 0 1-1.4 1.4L12 13.4l-4.4 4.4a1 1 0 0 1-1.4-1.4L10.6 12 6.2 7.6a1 1 0 0 1 0-1.4Z"
              fill="currentColor"
            />
          </svg>
        </span>

        <div className="urge__panel">
          <SleepingFlame uid={uid} flame={flame} />
          <h2 className="urge__title">snuff this urge?</h2>
          <p className="urge__product">{product}</p>
          <p className="urge__copy">let this purchase go. keep the money for what matters.</p>

          <div className="urge__actions">
            <div className="urge__row">
              <button type="button" className="urge__btn urge__btn--yes" aria-label="Yes, snuff this urge for plus 30 score">
                <span>yes</span>
                <span className="urge__score" aria-hidden="true">
                  +30
                </span>
              </button>
              <button type="button" className="urge__btn urge__btn--ghost">
                <FriendIcon />
                ask a friend
              </button>
            </div>
            <button type="button" className="urge__btn urge__btn--ghost urge__btn--wide">
              <BookmarkIcon />
              save for later
            </button>
            <button type="button" className="urge__continue">
              no, continue purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const FLAME_SILHOUETTE =
  "M 59 179 C 42 158 42 131 48 111 C 61 139 76 133 84 108 C 94 79 103 46 114 22 C 119 59 116 87 137 102 C 151 113 163 103 161 83 C 188 95 202 116 202 149 C 202 188 176 215 131 216 C 96 218 73 201 59 179 Z";

/** Little Snuff flame mascot — same silhouette + awake eyes as the app. */
function FlameCursor() {
  return (
    <svg className="snuff__mascot-svg" viewBox="0 0 240 270" aria-hidden="true">
      <defs>
        <filter id="cursor-edge" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <linearGradient id="cursor-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD66B" stopOpacity="0" />
          <stop offset="19%" stopColor="#FFD66B" stopOpacity="0.28" />
          <stop offset="43%" stopColor="#FFD66B" stopOpacity="0.9" />
          <stop offset="64%" stopColor="#F5A524" />
          <stop offset="100%" stopColor="#ED7014" />
        </linearGradient>
        <radialGradient id="cursor-core" cx="47%" cy="74%" r="58%">
          <stop offset="0%" stopColor="#FFF3D6" stopOpacity="0.96" />
          <stop offset="37%" stopColor="#FFF3D6" stopOpacity="0.76" />
          <stop offset="73%" stopColor="#FFD66B" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFD66B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cursor-bloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#F5A524" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#ED7014" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cursor-plume" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD66B" stopOpacity="0.4" />
          <stop offset="35%" stopColor="#F5A524" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#ED7014" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ED7014" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="125" cy="181" rx="91" ry="75" fill="url(#cursor-bloom)" />
      {/* Soft body glow — sits mid-flame, not a tip secretion */}
      <ellipse
        cx="128"
        cy="148"
        rx="48"
        ry="56"
        fill="url(#cursor-plume)"
        transform="rotate(-8 128 148)"
        opacity="0.55"
      />
      <g transform="translate(10 30) scale(0.92)">
        <path d={FLAME_SILHOUETTE} fill="url(#cursor-body)" filter="url(#cursor-edge)" opacity="0.55" />
        <path d={FLAME_SILHOUETTE} fill="url(#cursor-body)" />
        <path d={FLAME_SILHOUETTE} fill="url(#cursor-core)" />
      </g>
      {/* awake eyes — slightly larger than app so they read at cursor scale */}
      <ellipse
        cx="111.2"
        cy="165.24"
        rx="5.6"
        ry="9.2"
        fill="#3A0F02"
        transform="rotate(22 111.2 165.24)"
      />
      <ellipse
        cx="145.24"
        cy="163.4"
        rx="5.6"
        ry="9.2"
        fill="#3A0F02"
        transform="rotate(22 145.24 163.4)"
      />
    </svg>
  );
}

export function App() {
  const rootRef = useRef<HTMLElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = trailRef.current;
    const cursor = cursorRef.current;
    if (!root || !canvas || !cursor) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    type Ember = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      wobble: number;
      stretch: number;
    };

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let active = true;
    let pointerX = -9999;
    let pointerY = -9999;
    let lastX = -9999;
    let lastY = -9999;
    let moving = false;
    let lastMove = 0;
    const embers: Ember[] = [];

    // Hotspot is the flame tip (~18.5% from top of the 240×270 mascot viewBox).
    const placeCursor = (x: number, y: number, visible: boolean) => {
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -18%)`;
      cursor.style.opacity = visible ? "1" : "0";
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = root.clientWidth;
      const h = root.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Trail behind motion — soft loft, not a tip-upward secretion.
    const spawn = (x: number, y: number, dx: number, dy: number, speed: number) => {
      const mag = Math.hypot(dx, dy) || 1;
      const fx = dx / mag;
      const fy = dy / mag;
      // Unit vector opposite travel (where the trail goes)
      const tx = -fx;
      const ty = -fy;
      const px = -ty;
      const py = tx;
      const count = Math.min(4, 1 + Math.floor(speed / 12));

      for (let i = 0; i < count; i++) {
        if (embers.length > 100) embers.shift();
        const along = 0.55 + Math.random() * (1.4 + speed * 0.045);
        const side = (Math.random() - 0.5) * 1.35;
        // Emit from the flame body / mid, slightly behind the tip
        const back = 6 + Math.random() * 10;
        const lateral = (Math.random() - 0.5) * 5;
        embers.push({
          x: x + tx * back + px * lateral,
          y: y + ty * back + py * lateral + 8,
          vx: tx * along + px * side * 0.55 + (Math.random() - 0.5) * 0.25,
          // Gentle rise only — trail direction dominates
          vy: ty * along + py * side * 0.55 - 0.08 - Math.random() * 0.12,
          life: 0,
          maxLife: 36 + Math.random() * 42,
          size: 1.8 + Math.random() * 2.6,
          wobble: (Math.random() - 0.5) * 0.08,
          stretch: 1.6 + Math.min(speed / 18, 1.8),
        });
      }
    };

    const tick = () => {
      if (!active) return;
      curX += (targetX - curX) * 0.07;
      curY += (targetY - curY) * 0.07;
      root.style.setProperty("--mx", curX.toFixed(4));
      root.style.setProperty("--my", curY.toFixed(4));
      root.style.setProperty("--pox", `${50 + curX * 42}%`);
      root.style.setProperty("--poy", `${50 + curY * 42}%`);

      const w = root.clientWidth;
      const h = root.clientHeight;
      ctx.clearRect(0, 0, w, h);

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += 1;
        e.x += e.vx;
        e.y += e.vy;
        // Soft curl + fade of velocity into a lingering trail
        e.vx += e.wobble;
        e.vy -= 0.012;
        e.vx *= 0.96;
        e.vy *= 0.965;
        e.size *= 1.008;
        e.stretch *= 0.992;

        const t = e.life / e.maxLife;
        if (t >= 1) {
          embers.splice(i, 1);
          continue;
        }

        // Fire (hot) → smoke (cool gray) over lifetime
        let r: number;
        let g: number;
        let b: number;
        let a: number;
        if (t < 0.22) {
          const u = t / 0.22;
          r = 255;
          g = 230 - u * 90;
          b = 140 - u * 100;
          a = 0.9 - u * 0.2;
        } else if (t < 0.5) {
          const u = (t - 0.22) / 0.28;
          r = 255 - u * 100;
          g = 140 - u * 70;
          b = 40 + u * 50;
          a = 0.7 - u * 0.28;
        } else {
          const u = (t - 0.5) / 0.5;
          r = 155 - u * 45;
          g = 145 - u * 35;
          b = 140 - u * 20;
          a = 0.38 * (1 - u) * (1 - u);
        }

        const radius = e.size * (0.75 + t * 1.35);
        const spd = Math.hypot(e.vx, e.vy);
        const ang = spd > 0.05 ? Math.atan2(e.vy, e.vx) : 0;
        const stretch = Math.max(1, e.stretch * (0.85 + Math.min(spd, 2) * 0.35));

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(ang);
        ctx.scale(stretch, 1);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        glow.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`);
        glow.addColorStop(0.5, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a * 0.4})`);
        glow.addColorStop(1, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0)`);
        ctx.globalCompositeOperation = t < 0.45 ? "lighter" : "source-over";
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";

      if (Date.now() - lastMove > 120) moving = false;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      const dx = pointerX - lastX;
      const dy = pointerY - lastY;
      const speed = Math.hypot(dx, dy);
      lastX = pointerX;
      lastY = pointerY;
      lastMove = Date.now();
      moving = true;
      placeCursor(pointerX, pointerY, true);

      // Stream a trail behind the flame as it moves
      if (!reduceMotion && speed > 0.5) spawn(pointerX, pointerY, dx, dy, speed);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      moving = false;
      pointerX = -9999;
      pointerY = -9999;
      placeCursor(0, 0, false);
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <main className="snuff" ref={rootRef}>
      <canvas className="snuff__trail" ref={trailRef} aria-hidden="true" />
      <div className="snuff__cursor" ref={cursorRef} aria-hidden="true">
        <FlameCursor />
      </div>
      <div className="snuff__field">
        {fieldTiles.map((tile) => {
          const interactive = Boolean(tile.interactive);
          const showBlock = interactive && activeId === tile.id;

          return (
            <figure
              key={tile.id}
              className={[
                "tile",
                `tile--${tile.layer}`,
                interactive ? "tile--interactive" : null,
                showBlock ? "tile--blocking" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              style={
                {
                  ...tile.style,
                  ["--drift" as string]: String(tile.drift ?? 1),
                  ["--depth" as string]: String(tile.depth ?? 0.5),
                } as CSSProperties
              }
              aria-hidden={interactive ? undefined : true}
              onPointerEnter={interactive ? () => setActiveId(tile.id) : undefined}
              onPointerLeave={
                interactive ? () => setActiveId((id) => (id === tile.id ? null : id)) : undefined
              }
            >
              <img
                src={tile.src}
                alt={interactive ? tile.alt : ""}
                draggable={false}
                loading={tile.layer === "near" ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={interactive ? "high" : "low"}
              />
              {interactive ? (
                <UrgeOverlay
                  site={tile.alt}
                  product={tile.product ?? "this item"}
                  uid={tile.id}
                  flame={tile.flame ?? FLAMES.peach}
                />
              ) : null}
            </figure>
          );
        })}
      </div>

      <div className="snuff__center">
        <h1 className="snuff__brand">snuffed</h1>
        <p className="snuff__tag">snuff the spend. save the flame.</p>
        <div className="snuff__ctas">
          <a className="cta cta--primary" href="#chrome">
            <ChromeIcon />
            add chrome extension
          </a>
          <a className="cta cta--secondary" href="#mobile">
            <DownloadIcon />
            download mobile
          </a>
        </div>
      </div>
    </main>
  );
}

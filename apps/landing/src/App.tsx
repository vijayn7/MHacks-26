import { useEffect, useRef, type CSSProperties } from "react";

type Layer = "deep" | "far" | "mid" | "near";

type Tile = {
  id: string;
  src: string;
  alt: string;
  layer: Layer;
  /** Fully on-screen front windows that reveal the pause popup on hover */
  interactive?: boolean;
  /** Parallax intensity within the layer (default 1) */
  drift?: number;
  /** 0 = farthest, 1 = closest — unique per tile for Z stagger */
  depth?: number;
  style: CSSProperties;
};

/**
 * Dense organic scatter — roughly balanced, intentionally irregular.
 * Deep is behind far and nearly black; mid stays readable; near is interactive.
 */
const tiles: Tile[] = [
  // Far atmosphere — same count as before, hung just past the edges
  {
    id: "t1",
    src: "/sites/amazon.jpg",
    alt: "Amazon",
    layer: "far",
    drift: 0.7,
    style: { top: "-14%", left: "-16%", width: "36%", aspectRatio: "16 / 10" },
  },
  {
    id: "t2",
    src: "/sites/asos.jpg",
    alt: "ASOS",
    layer: "far",
    drift: 1.2,
    style: { top: "-12%", right: "-17%", width: "37%", aspectRatio: "16 / 10" },
  },
  {
    id: "t3",
    src: "/sites/polymarket.jpg",
    alt: "Polymarket",
    layer: "far",
    drift: 0.85,
    style: { bottom: "-15%", left: "-15%", width: "38%", aspectRatio: "16 / 10" },
  },
  {
    id: "t4",
    src: "/sites/shein.jpg",
    alt: "SHEIN",
    layer: "far",
    drift: 1.15,
    style: { bottom: "-14%", right: "-16%", width: "37%", aspectRatio: "16 / 10" },
  },
  {
    id: "t5",
    src: "/sites/homedepot.jpg",
    alt: "Home Depot",
    layer: "far",
    drift: 0.95,
    style: {
      top: "22%",
      left: "-18%",
      width: "32%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "t6",
    src: "/sites/edikted.jpg",
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
    id: "t7",
    src: "/sites/nike.jpg",
    alt: "Nike far",
    layer: "far",
    drift: 0.8,
    style: {
      top: "60%",
      left: "-17%",
      width: "30%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "t8",
    src: "/sites/bestbuy.jpg",
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

  // Deep backfield — former mid windows pushed behind far, almost black
  {
    id: "c1",
    src: "/sites/walmart.jpg",
    alt: "Walmart",
    layer: "deep",
    drift: 0.9,
    style: { top: "1%", left: "34%", width: "15%", aspectRatio: "16 / 10" },
  },
  {
    id: "c2",
    src: "/sites/costco.jpg",
    alt: "Costco",
    layer: "deep",
    drift: 1.2,
    style: { top: "4%", right: "30%", width: "13%", aspectRatio: "16 / 10" },
  },
  {
    id: "c3",
    src: "/sites/zalando.jpg",
    alt: "Zalando",
    layer: "mid",
    drift: 0.75,
    style: { top: "22%", left: "22%", width: "14%", aspectRatio: "16 / 10" },
  },
  {
    id: "c4",
    src: "/sites/asos.jpg",
    alt: "ASOS sale",
    layer: "mid",
    drift: 1.1,
    style: {
      top: "26%",
      right: "18%",
      width: "16%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "c5",
    src: "/sites/etsy.jpg",
    alt: "Etsy mid",
    layer: "far",
    drift: 0.65,
    style: { top: "10%", left: "48%", width: "11%", aspectRatio: "16 / 10" },
  },
  {
    id: "c6",
    src: "/sites/shein.jpg",
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
    src: "/sites/edikted.jpg",
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
    src: "/sites/polymarket.jpg",
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
    id: "c9",
    src: "/sites/homedepot.jpg",
    alt: "Home Depot mid",
    layer: "deep",
    drift: 1.15,
    style: {
      bottom: "1%",
      right: "34%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c10",
    src: "/sites/amazon.jpg",
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
    id: "c11",
    src: "/sites/nike.jpg",
    alt: "Nike mid",
    layer: "deep",
    drift: 1.25,
    style: {
      top: "34%",
      right: "32%",
      width: "11%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left center",
    },
  },
  {
    id: "c12",
    src: "/sites/ebay.jpg",
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
    id: "c13",
    src: "/sites/princesspolly.jpg",
    alt: "Polly mid",
    layer: "far",
    drift: 1.05,
    style: {
      top: "16%",
      right: "36%",
      width: "10%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "c14",
    src: "/sites/walmart.jpg",
    alt: "Walmart low",
    layer: "deep",
    drift: 0.8,
    style: {
      top: "58%",
      right: "16%",
      width: "14%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c15",
    src: "/sites/costco.jpg",
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
    src: "/sites/bestbuy.jpg",
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
    id: "c18",
    src: "/sites/zalando.jpg",
    alt: "Zalando high",
    layer: "deep",
    drift: 0.7,
    style: {
      top: "-4%",
      right: "18%",
      width: "13%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "c20",
    src: "/sites/edikted.jpg",
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
    src: "/sites/amazon.jpg",
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
    src: "/sites/walmart.jpg",
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
    id: "c26",
    src: "/sites/homedepot.jpg",
    alt: "Home Depot high",
    layer: "deep",
    drift: 1.05,
    style: {
      top: "12%",
      left: "28%",
      width: "10%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "c27",
    src: "/sites/polymarket.jpg",
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
    id: "c28",
    src: "/sites/princesspolly.jpg",
    alt: "Polly low",
    layer: "deep",
    drift: 1.2,
    style: {
      bottom: "14%",
      right: "28%",
      width: "11%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "c30",
    src: "/sites/bestbuy.jpg",
    alt: "Best Buy high",
    layer: "deep",
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
    src: "/sites/zalando.jpg",
    alt: "Zalando low",
    layer: "deep",
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
    src: "/sites/shein.jpg",
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

  // Interactive front windows — organic ring, slightly larger
  {
    id: "i1",
    src: "/sites/princesspolly.jpg",
    alt: "Princess Polly",
    layer: "near",
    interactive: true,
    drift: 0.85,
    style: { top: "5%", left: "3%", width: "24%", aspectRatio: "16 / 10" },
  },
  {
    id: "i2",
    src: "/sites/ebay.jpg",
    alt: "eBay",
    layer: "near",
    interactive: true,
    drift: 1.2,
    style: { top: "8%", right: "2%", width: "23%", aspectRatio: "16 / 10" },
  },
  {
    id: "i3",
    src: "/sites/nike.jpg",
    alt: "Nike store",
    layer: "near",
    interactive: true,
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
    src: "/sites/amazon.jpg",
    alt: "Amazon deals",
    layer: "near",
    interactive: true,
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
    src: "/sites/bestbuy.jpg",
    alt: "Best Buy deals",
    layer: "near",
    interactive: true,
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
    src: "/sites/etsy.jpg",
    alt: "Etsy gifts",
    layer: "near",
    interactive: true,
    drift: 1.1,
    style: {
      bottom: "7%",
      right: "10%",
      width: "21%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
];

/** Spread each layer across a unique Z band so tiles don't share one plane. */
function withStaggeredDepth(list: Tile[]): Tile[] {
  const bands: Record<Layer, [number, number]> = {
    deep: [0.02, 0.14],
    far: [0.18, 0.4],
    mid: [0.45, 0.7],
    near: [0.78, 0.97],
  };

  const byLayer: Record<Layer, Tile[]> = { deep: [], far: [], mid: [], near: [] };
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

function AppleIcon() {
  return (
    <svg className="cta__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.37 12.29c-.02-2.16 1.76-3.2 1.84-3.25-1-1.47-2.57-1.67-3.12-1.69-1.33-.14-2.6.79-3.27.79-.68 0-1.72-.77-2.83-.75-1.46.02-2.8.85-3.55 2.16-1.52 2.63-.39 6.53 1.09 8.67.72 1.05 1.59 2.22 2.72 2.18 1.1-.05 1.51-.7 2.83-.7 1.32 0 1.69.7 2.84.68 1.17-.02 1.92-1.07 2.64-2.13.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.87-2.3-3.47zm-2.15-6.35c.6-.73 1.01-1.75.9-2.77-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.56-1.22z"
      />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg className="cta__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5.2 10.6 4.1v7.1H3V5.2zm0 13.6 7.6 1.1v-7.2H3v6.1zM11.5 4 21 2.6v8.6h-9.5V4zm0 17.4L21 20.1v-8.7h-9.5v10z"
      />
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

function ImpulsePopup() {
  return (
    <div className="tile__impulse" role="dialog" aria-label="Impulse purchase pause">
      <div className="tile__impulse-card">
        <p className="tile__impulse-copy">
          I see you’re about to make an impulse purchase...
        </p>
        <div className="tile__impulse-actions">
          <button type="button">Drop</button>
          <button type="button">Save for later</button>
          <button type="button">Continue</button>
          <button type="button" className="tile__impulse-ask">
            Ask a friend
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let active = true;

    const tick = () => {
      if (!active) return;
      curX += (targetX - curX) * 0.07;
      curY += (targetY - curY) * 0.07;
      root.style.setProperty("--mx", curX.toFixed(4));
      root.style.setProperty("--my", curY.toFixed(4));
      root.style.setProperty("--pox", `${50 + curX * 42}%`);
      root.style.setProperty("--poy", `${50 + curY * 42}%`);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      targetX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <main className="snuff" ref={rootRef}>
      <div className="snuff__field">
        {fieldTiles.map((tile) => {
          const interactive = Boolean(tile.interactive);

          return (
            <figure
              key={tile.id}
              className={[
                "tile",
                `tile--${tile.layer}`,
                interactive ? "tile--interactive" : null,
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
            >
              <img src={tile.src} alt={interactive ? tile.alt : ""} draggable={false} />
              {interactive ? <ImpulsePopup /> : null}
            </figure>
          );
        })}
      </div>

      <div className="snuff__center">
        <h1 className="snuff__brand">snuffed</h1>
        <p className="snuff__tag">put out the flame. defeat your impulse spending.</p>
        <div className="snuff__ctas">
          <a className="cta cta--primary" href="#mac">
            <AppleIcon />
            add to mac
          </a>
          <a className="cta cta--secondary" href="#windows">
            <WindowsIcon />
            add to windows
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

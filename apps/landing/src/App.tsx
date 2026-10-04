import { useEffect, useRef, type CSSProperties } from "react";

type Layer = "far" | "mid" | "near";

type Tile = {
  id: string;
  src: string;
  alt: string;
  layer: Layer;
  style: CSSProperties;
};

/**
 * Axis-aligned windows: oversized edge-bleeders + denser mid-field frames.
 * Depth and parallax come from layer classes + cursor-driven perspective.
 */
const tiles: Tile[] = [
  // Corner / edge titans
  {
    id: "t1",
    src: "/sites/amazon.jpg",
    alt: "Amazon",
    layer: "far",
    style: { top: "-12%", left: "-14%", width: "42%", aspectRatio: "16 / 10" },
  },
  {
    id: "t2",
    src: "/sites/asos.jpg",
    alt: "ASOS",
    layer: "near",
    style: { top: "-14%", right: "-16%", width: "44%", aspectRatio: "16 / 10" },
  },
  {
    id: "t3",
    src: "/sites/polymarket.jpg",
    alt: "Polymarket",
    layer: "far",
    style: { bottom: "-16%", left: "-15%", width: "46%", aspectRatio: "16 / 10" },
  },
  {
    id: "t4",
    src: "/sites/shein.jpg",
    alt: "SHEIN",
    layer: "near",
    style: { bottom: "-14%", right: "-17%", width: "45%", aspectRatio: "16 / 10" },
  },

  // Side slabs
  {
    id: "t5",
    src: "/sites/nike.jpg",
    alt: "Nike",
    layer: "mid",
    style: { top: "24%", left: "-12%", width: "34%", aspectRatio: "16 / 10" },
  },
  {
    id: "t6",
    src: "/sites/edikted.jpg",
    alt: "Edikted",
    layer: "mid",
    style: { top: "28%", right: "-13%", width: "35%", aspectRatio: "16 / 10" },
  },
  {
    id: "t7",
    src: "/sites/bestbuy.jpg",
    alt: "Best Buy",
    layer: "mid",
    style: {
      top: "52%",
      left: "-10%",
      width: "28%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "t8",
    src: "/sites/homedepot.jpg",
    alt: "Home Depot",
    layer: "mid",
    style: {
      top: "56%",
      right: "-11%",
      width: "29%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },

  // Top row accents
  {
    id: "t9",
    src: "/sites/etsy.jpg",
    alt: "Etsy",
    layer: "near",
    style: { top: "-6%", left: "32%", width: "16%", aspectRatio: "16 / 10" },
  },
  {
    id: "t10",
    src: "/sites/walmart.jpg",
    alt: "Walmart",
    layer: "far",
    style: { top: "-4%", left: "50%", width: "14%", aspectRatio: "16 / 10" },
  },
  {
    id: "t11",
    src: "/sites/costco.jpg",
    alt: "Costco",
    layer: "mid",
    style: { top: "8%", right: "22%", width: "15%", aspectRatio: "16 / 10" },
  },

  // Inner stagger (clear of brand)
  {
    id: "t12",
    src: "/sites/princesspolly.jpg",
    alt: "Princess Polly",
    layer: "near",
    style: { top: "18%", left: "18%", width: "13%", aspectRatio: "16 / 10" },
  },
  {
    id: "t13",
    src: "/sites/ebay.jpg",
    alt: "eBay",
    layer: "far",
    style: { top: "16%", right: "17%", width: "12%", aspectRatio: "16 / 10" },
  },
  {
    id: "t14",
    src: "/sites/zalando.jpg",
    alt: "Zalando",
    layer: "mid",
    style: { top: "38%", left: "10%", width: "14%", aspectRatio: "16 / 10" },
  },
  {
    id: "t15",
    src: "/sites/amazon.jpg",
    alt: "Amazon deals",
    layer: "near",
    style: {
      top: "36%",
      right: "9%",
      width: "15%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
  {
    id: "t16",
    src: "/sites/asos.jpg",
    alt: "ASOS sale",
    layer: "far",
    style: {
      top: "48%",
      left: "22%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "t17",
    src: "/sites/nike.jpg",
    alt: "Nike store",
    layer: "mid",
    style: {
      top: "46%",
      right: "20%",
      width: "13%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left center",
    },
  },

  // Bottom row
  {
    id: "t18",
    src: "/sites/shein.jpg",
    alt: "SHEIN browse",
    layer: "mid",
    style: {
      bottom: "-6%",
      left: "30%",
      width: "17%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center top",
    },
  },
  {
    id: "t19",
    src: "/sites/edikted.jpg",
    alt: "Edikted look",
    layer: "near",
    style: {
      bottom: "-5%",
      left: "50%",
      width: "16%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right top",
    },
  },
  {
    id: "t20",
    src: "/sites/polymarket.jpg",
    alt: "Polymarket markets",
    layer: "far",
    style: {
      bottom: "10%",
      right: "28%",
      width: "14%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "left top",
    },
  },
  {
    id: "t21",
    src: "/sites/bestbuy.jpg",
    alt: "Best Buy deals",
    layer: "near",
    style: {
      bottom: "18%",
      left: "34%",
      width: "11%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
  },
  {
    id: "t22",
    src: "/sites/etsy.jpg",
    alt: "Etsy gifts",
    layer: "mid",
    style: {
      bottom: "20%",
      right: "32%",
      width: "12%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "right center",
    },
  },
];

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
      curX += (targetX - curX) * 0.09;
      curY += (targetY - curY) * 0.09;
      root.style.setProperty("--mx", curX.toFixed(4));
      root.style.setProperty("--my", curY.toFixed(4));
      root.style.setProperty("--pox", `${50 + curX * 32}%`);
      root.style.setProperty("--poy", `${50 + curY * 32}%`);
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
      <div className="snuff__field" aria-hidden="true">
        {tiles.map((tile) => (
          <figure
            key={tile.id}
            className={`tile tile--${tile.layer}`}
            style={tile.style}
          >
            <img src={tile.src} alt="" draggable={false} />
          </figure>
        ))}
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

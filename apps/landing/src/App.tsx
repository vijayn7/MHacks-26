import { useEffect, useRef, useState, type CSSProperties } from "react";

type Layer = "void" | "far" | "mid" | "near";

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
 * Void sits behind everything (near-black). Extra mid-field windows live in void.
 */
const tiles: Tile[] = [
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
  {
    id: "c1",
    src: "/sites/walmart.jpg",
    alt: "Walmart",
    layer: "void",
    drift: 0.9,
    style: { top: "1%", left: "34%", width: "15%", aspectRatio: "16 / 10" },
  },
  {
    id: "c2",
    src: "/sites/costco.jpg",
    alt: "Costco",
    layer: "void",
    drift: 1.2,
    style: { top: "4%", right: "30%", width: "13%", aspectRatio: "16 / 10" },
  },
  {
    id: "c3",
    src: "/sites/depop.jpg",
    alt: "Depop",
    layer: "mid",
    drift: 0.75,
    style: { top: "22%", left: "22%", width: "14%", aspectRatio: "16 / 10" },
  },
  {
    id: "c4",
    src: "/sites/asos.jpg",
    alt: "ASOS",
    layer: "near",
    interactive: true,
    drift: 1.1,
    style: {
      top: "24%",
      left: "6%",
      width: "22%",
      aspectRatio: "16 / 10",
      ["--focus" as string]: "center center",
    },
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
    id: "c30",
    src: "/sites/bestbuy.jpg",
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
    src: "/sites/depop.jpg",
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
  {
    id: "i2",
    src: "/sites/ebay.jpg",
    alt: "eBay",
    layer: "near",
    interactive: true,
    drift: 1.2,
    style: { top: "-4%", left: "-3%", width: "26%", aspectRatio: "16 / 10" },
  },
  {
    id: "i3",
    src: "/sites/princesspolly.jpg",
    alt: "Princess Polly",
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
    src: "/sites/polymarket.jpg",
    alt: "Polymarket",
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
    src: "/sites/kalshi.jpg",
    alt: "Kalshi",
    layer: "near",
    interactive: true,
    drift: 1.1,
    style: {
      bottom: "7%",
      right: "10%",
      width: "21%",
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
      {/* Flat Windows 11 mark — axis-aligned 2×2 panes */}
      <path
        fill="currentColor"
        d="M3 3h8.2v8.2H3V3zm9.8 0H21v8.2h-8.2V3zM3 12.8h8.2V21H3v-8.2zm9.8 0H21V21h-8.2v-8.2z"
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

function PausePopup({ site }: { site: string }) {
  return (
    <div className="tile__block" role="dialog" aria-label="Checkout pause">
      <p className="tile__block-brand">snuffed</p>
      <p className="tile__block-copy">
        Hold up — this {site} checkout matches your spending rule.
      </p>
      <div className="tile__block-actions">
        <button type="button">Drop</button>
        <button type="button">Save for later</button>
        <button type="button">Continue</button>
        <button type="button" className="tile__block-ask">
          Ask my friend
        </button>
      </div>
    </div>
  );
}

export function App() {
  const rootRef = useRef<HTMLElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = trailRef.current;
    if (!root || !canvas) return;

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
      spin: number;
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

    const spawn = (x: number, y: number, speed: number) => {
      const count = Math.min(5, 1 + Math.floor(speed / 8));
      for (let i = 0; i < count; i++) {
        if (embers.length > 90) embers.shift();
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        const burst = 0.4 + Math.random() * 1.6 + speed * 0.02;
        embers.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * burst * 0.55 + (Math.random() - 0.5) * 0.6,
          vy: Math.sin(angle) * burst - 0.4 - Math.random() * 0.8,
          life: 0,
          maxLife: 28 + Math.random() * 36,
          size: 2.2 + Math.random() * 3.4,
          spin: (Math.random() - 0.5) * 0.18,
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

      if (!reduceMotion && moving && Date.now() - lastMove < 80) {
        // Soft fire core under the cursor tip
        const core = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 14);
        core.addColorStop(0, "rgba(255, 236, 170, 0.95)");
        core.addColorStop(0.35, "rgba(255, 140, 48, 0.7)");
        core.addColorStop(0.7, "rgba(196, 54, 24, 0.28)");
        core.addColorStop(1, "rgba(40, 20, 10, 0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += 1;
        e.x += e.vx;
        e.y += e.vy;
        e.vx += e.spin * 0.15;
        e.vy -= 0.035;
        e.vx *= 0.985;
        e.size *= 1.012;

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
        if (t < 0.28) {
          const u = t / 0.28;
          r = 255;
          g = 230 - u * 90;
          b = 140 - u * 100;
          a = 0.95 - u * 0.15;
        } else if (t < 0.55) {
          const u = (t - 0.28) / 0.27;
          r = 255 - u * 90;
          g = 140 - u * 90;
          b = 40 + u * 40;
          a = 0.8 - u * 0.25;
        } else {
          const u = (t - 0.55) / 0.45;
          r = 165 - u * 55;
          g = 150 - u * 40;
          b = 140 - u * 25;
          a = 0.45 * (1 - u);
        }

        const radius = e.size * (0.7 + t * 1.6);
        const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, radius);
        glow.addColorStop(0, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`);
        glow.addColorStop(0.45, `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a * 0.45})`);
        glow.addColorStop(1, `rgba(${r | 0}, ${g | 0}, ${b | 0}, 0)`);
        ctx.globalCompositeOperation = t < 0.5 ? "lighter" : "source-over";
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.fill();
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

      if (!reduceMotion && speed > 0.4) spawn(pointerX, pointerY, speed);
    };

    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      moving = false;
      pointerX = -9999;
      pointerY = -9999;
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
              <img src={tile.src} alt={interactive ? tile.alt : ""} draggable={false} />
              {interactive ? <PausePopup site={tile.alt} /> : null}
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

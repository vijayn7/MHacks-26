import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type SiteId =
  | "amazon"
  | "ebay"
  | "walmart"
  | "nike"
  | "target"
  | "bestbuy"
  | "sephora"
  | "draftkings"
  | "fanduel"
  | "bet365"
  | "caesars"
  | "stockx";

type Plane = {
  id: string;
  site: SiteId;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotY?: number;
};

const planes: Plane[] = [
  { id: "p1", site: "amazon", x: -34, y: -18, z: -320, w: 32, h: 36, rotY: 8 },
  { id: "p2", site: "draftkings", x: 30, y: 14, z: -480, w: 30, h: 34, rotY: -9 },
  { id: "p3", site: "nike", x: 8, y: -26, z: -720, w: 26, h: 32, rotY: 4 },
  { id: "p4", site: "ebay", x: -30, y: 20, z: -960, w: 34, h: 30, rotY: -6 },
  { id: "p5", site: "fanduel", x: 36, y: -10, z: -1180, w: 28, h: 34, rotY: 11 },
  { id: "p6", site: "walmart", x: -40, y: -6, z: -1420, w: 30, h: 32, rotY: -12 },
  { id: "p7", site: "bet365", x: 18, y: 22, z: -1680, w: 32, h: 28, rotY: 7 },
  { id: "p8", site: "target", x: -18, y: -24, z: -1940, w: 28, h: 34, rotY: -5 },
  { id: "p9", site: "caesars", x: 34, y: 8, z: -2280, w: 26, h: 36, rotY: 9 },
  { id: "p10", site: "bestbuy", x: -28, y: 16, z: -2620, w: 34, h: 28, rotY: -8 },
  { id: "p11", site: "sephora", x: 12, y: -20, z: -2980, w: 28, h: 34, rotY: 5 },
  { id: "p12", site: "stockx", x: -8, y: 24, z: -3360, w: 32, h: 30, rotY: -4 },
  { id: "p13", site: "amazon", x: 28, y: -14, z: -3720, w: 30, h: 32, rotY: 6 },
  { id: "p14", site: "draftkings", x: -32, y: 6, z: -4020, w: 28, h: 34, rotY: -7 },
];

const siteMeta: Record<SiteId, { host: string; title: string }> = {
  amazon: { host: "amazon.com", title: "Amazon" },
  ebay: { host: "ebay.com", title: "eBay" },
  walmart: { host: "walmart.com", title: "Walmart" },
  nike: { host: "nike.com", title: "Nike" },
  target: { host: "target.com", title: "Target" },
  bestbuy: { host: "bestbuy.com", title: "Best Buy" },
  sephora: { host: "sephora.com", title: "Sephora" },
  draftkings: { host: "draftkings.com", title: "DraftKings" },
  fanduel: { host: "fanduel.com", title: "FanDuel" },
  bet365: { host: "bet365.com", title: "bet365" },
  caesars: { host: "caesars.com", title: "Caesars" },
  stockx: { host: "stockx.com", title: "StockX" },
};

const Z_MIN = 0;
const Z_MAX = 3800;

function BrowserFrame({ host, children }: { host: string; children: ReactNode }) {
  return (
    <div className="site">
      <div className="site__bar">
        <span className="site__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="site__url">{host}</span>
      </div>
      <div className="site__body">{children}</div>
    </div>
  );
}

function SiteHome({ site }: { site: SiteId }) {
  const meta = siteMeta[site];

  switch (site) {
    case "amazon":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--amazon">
            <div className="home__nav home__nav--dark">
              <strong>{meta.title}</strong>
              <span className="home__search" />
              <span className="home__cart">Cart</span>
            </div>
            <div className="home__hero home__hero--amber" />
            <div className="home__grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </BrowserFrame>
      );
    case "ebay":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--ebay">
            <div className="home__nav">
              <strong>{meta.title}</strong>
              <span className="home__search" />
            </div>
            <div className="home__chips">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="home__grid home__grid--tight">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </BrowserFrame>
      );
    case "walmart":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--walmart">
            <div className="home__nav home__nav--blue">
              <strong>{meta.title}</strong>
              <span className="home__search" />
            </div>
            <div className="home__banner home__banner--yellow" />
            <div className="home__row">
              <span />
              <span />
              <span />
            </div>
          </div>
        </BrowserFrame>
      );
    case "nike":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--nike">
            <div className="home__nav home__nav--bare">
              <strong>{meta.title}</strong>
              <em>Men · Women · Kids</em>
            </div>
            <div className="home__poster">
              <p>Just Dropped</p>
            </div>
          </div>
        </BrowserFrame>
      );
    case "target":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--target">
            <div className="home__nav home__nav--red">
              <strong>{meta.title}</strong>
              <span className="home__search" />
            </div>
            <div className="home__circle" aria-hidden="true" />
            <div className="home__grid">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </BrowserFrame>
      );
    case "bestbuy":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--bestbuy">
            <div className="home__nav home__nav--ink">
              <strong>{meta.title}</strong>
              <span className="home__search" />
            </div>
            <div className="home__hero home__hero--tech" />
            <div className="home__row">
              <span />
              <span />
              <span />
            </div>
          </div>
        </BrowserFrame>
      );
    case "sephora":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--sephora">
            <div className="home__nav home__nav--bare">
              <strong>{meta.title}</strong>
              <em>Makeup · Skincare · Hair</em>
            </div>
            <div className="home__poster home__poster--beauty">
              <p>New Beauty</p>
            </div>
          </div>
        </BrowserFrame>
      );
    case "stockx":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--stockx">
            <div className="home__nav">
              <strong>{meta.title}</strong>
              <span className="home__search" />
            </div>
            <div className="home__ticker">
              <i />
              <i />
              <i />
            </div>
            <div className="home__grid home__grid--sneakers">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </BrowserFrame>
      );
    case "draftkings":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--draftkings">
            <div className="home__nav home__nav--dk">
              <strong>{meta.title}</strong>
              <em>Sportsbook</em>
            </div>
            <div className="home__odds">
              <div>
                <b>NBA</b>
                <span>+110</span>
                <span>-130</span>
              </div>
              <div>
                <b>NFL</b>
                <span>-105</span>
                <span>-115</span>
              </div>
              <div>
                <b>MLB</b>
                <span>+145</span>
                <span>-165</span>
              </div>
            </div>
            <div className="home__betslip">Bet Slip</div>
          </div>
        </BrowserFrame>
      );
    case "fanduel":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--fanduel">
            <div className="home__nav home__nav--fd">
              <strong>{meta.title}</strong>
              <em>Live</em>
            </div>
            <div className="home__live">
              <span />
              <span />
            </div>
            <div className="home__odds home__odds--compact">
              <div>
                <b>Tonight</b>
                <span>-120</span>
                <span>+100</span>
              </div>
              <div>
                <b>Parlay</b>
                <span>+320</span>
                <span>+540</span>
              </div>
            </div>
          </div>
        </BrowserFrame>
      );
    case "bet365":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--bet365">
            <div className="home__nav home__nav--b365">
              <strong>{meta.title}</strong>
              <em>In-Play</em>
            </div>
            <div className="home__matches">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="home__betslip">Cash Out</div>
          </div>
        </BrowserFrame>
      );
    case "caesars":
      return (
        <BrowserFrame host={meta.host}>
          <div className="home home--caesars">
            <div className="home__nav home__nav--cz">
              <strong>{meta.title}</strong>
              <em>Casino · Sports</em>
            </div>
            <div className="home__casino">
              <span />
              <span />
              <span />
            </div>
            <div className="home__banner home__banner--gold" />
          </div>
        </BrowserFrame>
      );
  }
}

export function App() {
  const [camZ, setCamZ] = useState(0);
  const [camX, setCamX] = useState(0);
  const zRef = useRef(0);
  const xRef = useRef(0);
  const rafRef = useRef(0);
  const targetZ = useRef(0);
  const targetX = useRef(0);

  useEffect(() => {
    const X_MIN = -420;
    const X_MAX = 420;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetZ.current = Math.min(Z_MAX, Math.max(Z_MIN, targetZ.current + event.deltaY * 1.35));
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: globalThis.PointerEvent) => {
      if ((event.target as HTMLElement).closest("a,button")) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerDrag = (event: globalThis.PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = lastY - event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
      // Vertical drag walks forward/back; horizontal drag pans left/right.
      targetZ.current = Math.min(Z_MAX, Math.max(Z_MIN, targetZ.current + dy * 2.4));
      targetX.current = Math.min(X_MAX, Math.max(X_MIN, targetX.current + dx * 1.5));
    };
    const onPointerUp = () => {
      dragging = false;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerDrag);
    window.addEventListener("pointerup", onPointerUp);

    const tick = () => {
      const nextZ = zRef.current + (targetZ.current - zRef.current) * 0.08;
      const nextX = xRef.current + (targetX.current - xRef.current) * 0.08;

      if (Math.abs(nextZ - zRef.current) > 0.15) {
        zRef.current = nextZ;
        setCamZ(nextZ);
      } else if (zRef.current !== targetZ.current) {
        zRef.current = targetZ.current;
        setCamZ(targetZ.current);
      }

      if (Math.abs(nextX - xRef.current) > 0.15) {
        xRef.current = nextX;
        setCamX(nextX);
      } else if (xRef.current !== targetX.current) {
        xRef.current = targetX.current;
        setCamX(targetX.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerDrag);
      window.removeEventListener("pointerup", onPointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const progress = camZ / Z_MAX;

  return (
    <main className="world" aria-label="SecondThought">
      <div className="world__sky" aria-hidden="true" />

      <header className="chrome">
        <p className="chrome__brand">SecondThought</p>
        <a className="chrome__cta" href="#download" id="download">
          Download extension
        </a>
      </header>

      <div className="stage">
        <div
          className="rig"
          style={
            {
              ["--cam-z" as string]: `${camZ}px`,
              ["--cam-x" as string]: `${camX}px`,
            } as CSSProperties
          }
        >
          {planes.map((plane) => (
            <div
              key={plane.id}
              className="plane plane--site"
              style={
                {
                  ["--x" as string]: `${plane.x}vw`,
                  ["--y" as string]: `${plane.y}vh`,
                  ["--z" as string]: `${plane.z}px`,
                  ["--w" as string]: `${plane.w}vw`,
                  ["--h" as string]: `${plane.h}vh`,
                  ["--ry" as string]: `${plane.rotY ?? 0}deg`,
                  ["--rz" as string]: `0deg`,
                } as CSSProperties
              }
            >
              <SiteHome site={plane.site} />
            </div>
          ))}

          <div
            className="plane plane--hero"
            style={
              {
                ["--x" as string]: "0vw",
                ["--y" as string]: "0vh",
                ["--z" as string]: "-2000px",
                ["--w" as string]: "min(70vw, 52rem)",
                ["--h" as string]: "auto",
                ["--ry" as string]: "0deg",
                ["--rz" as string]: "0deg",
              } as CSSProperties
            }
          >
            <h1 className="hero-brand">SecondThought</h1>
            <p className="hero-line">A pause between impulse and purchase.</p>
          </div>
        </div>
      </div>

      <footer className="chrome chrome--foot">
        <p className="chrome__hint">Scroll or drag to walk</p>
        <div className="chrome__meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </footer>
    </main>
  );
}


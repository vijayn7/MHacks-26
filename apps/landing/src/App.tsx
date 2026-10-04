import { useEffect, useRef, useState, type CSSProperties } from "react";

type Plane = {
  id: string;
  src: string;
  alt: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotY?: number;
};

/** Homepage screenshots captured from live ecommerce + sportsbook sites. */
const planes: Plane[] = [
  { id: "p1", src: "/sites/amazon.jpg", alt: "Amazon", x: -34, y: -16, z: -300, w: 34, h: 36, rotY: 8 },
  { id: "p2", src: "/sites/draftkings.jpg", alt: "DraftKings", x: 30, y: 12, z: -460, w: 32, h: 34, rotY: -9 },
  { id: "p3", src: "/sites/nike.jpg", alt: "Nike", x: 6, y: -26, z: -700, w: 28, h: 34, rotY: 4 },
  { id: "p4", src: "/sites/fanduel.jpg", alt: "FanDuel", x: -30, y: 18, z: -940, w: 34, h: 32, rotY: -6 },
  { id: "p5", src: "/sites/ebay.jpg", alt: "eBay", x: 34, y: -10, z: -1160, w: 30, h: 34, rotY: 10 },
  { id: "p6", src: "/sites/walmart.jpg", alt: "Walmart", x: -38, y: -4, z: -1400, w: 32, h: 34, rotY: -11 },
  { id: "p7", src: "/sites/bestbuy.jpg", alt: "Best Buy", x: 18, y: 20, z: -1660, w: 34, h: 30, rotY: 7 },
  { id: "p8", src: "/sites/pointsbet.jpg", alt: "Fanatics Sportsbook", x: -16, y: -22, z: -1920, w: 30, h: 34, rotY: -5 },
  { id: "p9", src: "/sites/homedepot.jpg", alt: "Home Depot", x: 32, y: 8, z: -2240, w: 28, h: 36, rotY: 8 },
  { id: "p10", src: "/sites/newegg.jpg", alt: "Newegg", x: -28, y: 16, z: -2580, w: 34, h: 30, rotY: -7 },
  { id: "p11", src: "/sites/asos.jpg", alt: "ASOS", x: 12, y: -18, z: -2940, w: 30, h: 34, rotY: 5 },
  { id: "p12", src: "/sites/costco.jpg", alt: "Costco", x: -8, y: 22, z: -3300, w: 34, h: 30, rotY: -4 },
  { id: "p13", src: "/sites/zalando.jpg", alt: "Zalando", x: 28, y: -12, z: -3660, w: 30, h: 34, rotY: 6 },
  { id: "p14", src: "/sites/etsy.jpg", alt: "Etsy", x: -32, y: 6, z: -3980, w: 28, h: 34, rotY: -8 },
];

const Z_MIN = 0;
const Z_MAX = 3800;
const X_MIN = -420;
const X_MAX = 420;

export function App() {
  const [camZ, setCamZ] = useState(0);
  const [camX, setCamX] = useState(0);
  const zRef = useRef(0);
  const xRef = useRef(0);
  const rafRef = useRef(0);
  const targetZ = useRef(0);
  const targetX = useRef(0);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetZ.current = Math.min(Z_MAX, Math.max(Z_MIN, targetZ.current + event.deltaY * 1.35));
    };

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("a,button")) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onPointerDrag = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = lastY - event.clientY;
      lastX = event.clientX;
      lastY = event.clientY;
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
              className="plane plane--photo"
              style={
                {
                  ["--x" as string]: `${plane.x}vw`,
                  ["--y" as string]: `${plane.y}vh`,
                  ["--z" as string]: `${plane.z}px`,
                  ["--w" as string]: `${plane.w}vw`,
                  ["--h" as string]: `${plane.h}vh`,
                  ["--ry" as string]: `${plane.rotY ?? 0}deg`,
                  ["--rz" as string]: "0deg",
                } as CSSProperties
              }
            >
              <img src={plane.src} alt={plane.alt} draggable={false} />
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

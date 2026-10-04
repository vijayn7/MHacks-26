import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type Plane = {
  id: string;
  kind: "image" | "word" | "panel";
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  rotY?: number;
  rotZ?: number;
  label?: string;
  tone?: "mist" | "deep" | "lime" | "slate" | "glow" | "warm" | "ink";
  word?: string;
};

const planes: Plane[] = [
  // Near field
  { id: "n1", kind: "image", x: -38, y: -22, z: -280, w: 28, h: 34, rotY: 8, tone: "mist" },
  { id: "n2", kind: "word", x: 18, y: -8, z: -360, w: 20, h: 8, word: "pause" },
  { id: "n3", kind: "panel", x: 32, y: 18, z: -420, w: 26, h: 30, rotY: -10, label: "BLOCKED", tone: "ink" },

  // Mid
  { id: "m1", kind: "image", x: -28, y: 16, z: -720, w: 34, h: 28, rotY: -6, tone: "deep" },
  { id: "m2", kind: "image", x: 8, y: -28, z: -860, w: 24, h: 32, rotY: 4, tone: "glow" },
  { id: "m3", kind: "word", x: -12, y: 4, z: -940, w: 22, h: 8, word: "impulse" },
  { id: "m4", kind: "panel", x: 36, y: -12, z: -1080, w: 22, h: 26, rotY: 12, label: "Save for later", tone: "lime" },
  { id: "m5", kind: "image", x: -42, y: -8, z: -1180, w: 20, h: 36, rotY: -14, tone: "warm" },

  // Far mid
  { id: "f1", kind: "image", x: 22, y: 22, z: -1480, w: 30, h: 24, rotY: 6, tone: "slate" },
  { id: "f2", kind: "word", x: -20, y: -18, z: -1560, w: 18, h: 7, word: "friend" },
  { id: "f3", kind: "panel", x: -8, y: 20, z: -1720, w: 28, h: 22, label: "Score 86", tone: "mist" },
  { id: "f4", kind: "image", x: 40, y: -24, z: -1880, w: 18, h: 28, rotY: -8, tone: "deep" },
  { id: "f5", kind: "image", x: -36, y: 28, z: -1980, w: 26, h: 20, rotY: 10, tone: "glow" },

  // Deep field
  { id: "d1", kind: "word", x: 6, y: -6, z: -2280, w: 24, h: 8, word: "restraint" },
  { id: "d2", kind: "image", x: -24, y: -26, z: -2460, w: 32, h: 26, rotY: -4, tone: "warm" },
  { id: "d3", kind: "image", x: 28, y: 14, z: -2680, w: 22, h: 34, rotY: 9, tone: "slate" },
  { id: "d4", kind: "panel", x: -6, y: 8, z: -2920, w: 30, h: 20, label: "Drop it", tone: "ink" },
  { id: "d5", kind: "image", x: 16, y: -20, z: -3180, w: 28, h: 22, tone: "mist" },
  { id: "d6", kind: "word", x: -30, y: 12, z: -3400, w: 16, h: 7, word: "choose" },
  { id: "d7", kind: "image", x: 4, y: 26, z: -3650, w: 36, h: 24, rotY: -7, tone: "deep" },
  { id: "d8", kind: "image", x: -16, y: -10, z: -3900, w: 20, h: 30, rotY: 5, tone: "glow" },
];

const Z_MIN = 0;
const Z_MAX = 3600;

export function App() {
  const [camZ, setCamZ] = useState(0);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const zRef = useRef(0);
  const rafRef = useRef(0);
  const targetZ = useRef(0);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      targetZ.current = Math.min(Z_MAX, Math.max(Z_MIN, targetZ.current + event.deltaY * 1.35));
    };

    let dragging = false;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest("a,button")) return;
      dragging = true;
      lastY = event.clientY;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dy = lastY - event.clientY;
      lastY = event.clientY;
      targetZ.current = Math.min(Z_MAX, Math.max(Z_MIN, targetZ.current + dy * 2.4));
    };
    const onPointerUp = () => {
      dragging = false;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const tick = () => {
      const next = zRef.current + (targetZ.current - zRef.current) * 0.08;
      if (Math.abs(next - zRef.current) > 0.15) {
        zRef.current = next;
        setCamZ(next);
      } else if (zRef.current !== targetZ.current) {
        zRef.current = targetZ.current;
        setCamZ(targetZ.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    setLook({ x: ny * -6, y: nx * 8 });
  }

  const progress = camZ / Z_MAX;

  return (
    <main
      className="world"
      aria-label="SecondThought"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setLook({ x: 0, y: 0 })}
    >
      <div className="world__sky" aria-hidden="true" />

      <header className="chrome">
        <p className="chrome__brand">SecondThought</p>
        <a className="chrome__cta" href="#download" id="download">
          Download extension
        </a>
      </header>

      <div className="stage" aria-hidden="false">
        <div
          className="rig"
          style={
            {
              ["--cam-z" as string]: `${camZ}px`,
              ["--look-x" as string]: `${look.x}deg`,
              ["--look-y" as string]: `${look.y}deg`,
            } as CSSProperties
          }
        >
          {planes.map((plane) => {
            const style = {
              ["--x" as string]: `${plane.x}vw`,
              ["--y" as string]: `${plane.y}vh`,
              ["--z" as string]: `${plane.z}px`,
              ["--w" as string]: `${plane.w}vw`,
              ["--h" as string]: `${plane.h}vh`,
              ["--ry" as string]: `${plane.rotY ?? 0}deg`,
              ["--rz" as string]: `${plane.rotZ ?? 0}deg`,
            } as CSSProperties;

            if (plane.kind === "word") {
              return (
                <div key={plane.id} className="plane plane--word" style={style}>
                  <span>{plane.word}</span>
                </div>
              );
            }

            if (plane.kind === "panel") {
              return (
                <div
                  key={plane.id}
                  className={`plane plane--panel plane--${plane.tone ?? "mist"}`}
                  style={style}
                >
                  <p className="plane__kicker">SecondThought</p>
                  <p className="plane__title">{plane.label}</p>
                </div>
              );
            }

            return (
              <div
                key={plane.id}
                className={`plane plane--image plane--${plane.tone ?? "mist"}`}
                style={style}
              />
            );
          })}

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
        <p className="chrome__hint">Scroll to walk through</p>
        <div className="chrome__meter" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </footer>
    </main>
  );
}

import { useState, type CSSProperties, type PointerEvent } from "react";

type Shard = {
  id: string;
  tone: "a" | "b" | "c" | "d" | "e";
  depth: number;
  style: CSSProperties;
};

/** Wide, edge-hugging fragments — landscape hero plane, not a tall stack. */
const shards: Shard[] = [
  {
    id: "s1",
    tone: "b",
    depth: 0.55,
    style: {
      top: "6%",
      left: "-2%",
      width: "28%",
      height: "34%",
      ["--clip" as string]: "4% 8%, 100% 0, 92% 100%, 0 78%",
      ["--rot" as string]: "-6deg",
      ["--dx" as string]: "22px",
      ["--dy" as string]: "-14px",
      ["--dur" as string]: "18s",
    },
  },
  {
    id: "s2",
    tone: "e",
    depth: 0.2,
    style: {
      top: "4%",
      left: "32%",
      width: "22%",
      height: "18%",
      ["--clip" as string]: "0 22%, 100% 0, 96% 100%, 6% 82%",
      ["--rot" as string]: "3deg",
      ["--dx" as string]: "-12px",
      ["--dy" as string]: "16px",
      ["--dur" as string]: "21s",
      ["--delay" as string]: "-3s",
    },
  },
  {
    id: "s3",
    tone: "c",
    depth: 0.7,
    style: {
      top: "2%",
      right: "-3%",
      width: "30%",
      height: "38%",
      ["--clip" as string]: "10% 0, 100% 12%, 88% 100%, 0 72%",
      ["--rot" as string]: "7deg",
      ["--dx" as string]: "-24px",
      ["--dy" as string]: "12px",
      ["--dur" as string]: "19s",
      ["--delay" as string]: "-6s",
    },
  },
  {
    id: "s4",
    tone: "a",
    depth: 0.4,
    style: {
      top: "42%",
      left: "-4%",
      width: "24%",
      height: "36%",
      ["--clip" as string]: "0 0, 100% 14%, 84% 100%, 2% 88%",
      ["--rot" as string]: "-10deg",
      ["--dx" as string]: "14px",
      ["--dy" as string]: "20px",
      ["--dur" as string]: "23s",
      ["--delay" as string]: "-2s",
    },
  },
  {
    id: "s5",
    tone: "d",
    depth: 0.35,
    style: {
      top: "36%",
      right: "-2%",
      width: "26%",
      height: "32%",
      ["--clip" as string]: "0 16%, 100% 0, 100% 86%, 8% 100%",
      ["--rot" as string]: "5deg",
      ["--dx" as string]: "-18px",
      ["--dy" as string]: "-10px",
      ["--dur" as string]: "16s",
      ["--delay" as string]: "-8s",
    },
  },
  {
    id: "s6",
    tone: "b",
    depth: 0.6,
    style: {
      bottom: "-4%",
      left: "8%",
      width: "32%",
      height: "28%",
      ["--clip" as string]: "6% 0, 100% 18%, 94% 100%, 0 76%",
      ["--rot" as string]: "4deg",
      ["--dx" as string]: "20px",
      ["--dy" as string]: "-16px",
      ["--dur" as string]: "20s",
      ["--delay" as string]: "-4s",
    },
  },
  {
    id: "s7",
    tone: "e",
    depth: 0.25,
    style: {
      bottom: "8%",
      left: "42%",
      width: "18%",
      height: "16%",
      ["--clip" as string]: "0 10%, 100% 0, 90% 100%, 8% 88%",
      ["--rot" as string]: "-4deg",
      ["--dx" as string]: "-10px",
      ["--dy" as string]: "14px",
      ["--dur" as string]: "17s",
      ["--delay" as string]: "-9s",
    },
  },
  {
    id: "s8",
    tone: "c",
    depth: 0.65,
    style: {
      bottom: "-6%",
      right: "4%",
      width: "34%",
      height: "30%",
      ["--clip" as string]: "8% 0, 100% 16%, 90% 100%, 0 74%",
      ["--rot" as string]: "-8deg",
      ["--dx" as string]: "12px",
      ["--dy" as string]: "-18px",
      ["--dur" as string]: "22s",
      ["--delay" as string]: "-1s",
    },
  },
];

export function App() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  function onFieldPointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 36;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 18;
    setParallax({ x, y });
  }

  return (
    <main
      className="hero-page"
      aria-label="SecondThought"
      onPointerMove={onFieldPointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <div className="hero-page__atmosphere" aria-hidden="true" />
      <div
        className="hero-page__field"
        aria-hidden="true"
        style={
          {
            ["--px" as string]: `${parallax.x}px`,
            ["--py" as string]: `${parallax.y}px`,
          } as CSSProperties
        }
      >
        {shards.map((shard) => (
          <span
            key={shard.id}
            className="shard"
            data-tone={shard.tone}
            style={
              {
                ...shard.style,
                ["--depth" as string]: String(shard.depth),
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="hero-page__copy">
        <h1 className="brand">SecondThought</h1>
        <p className="headline">A pause between impulse and purchase.</p>
        <a className="btn" href="#download" id="download">
          Download extension
        </a>
      </div>
    </main>
  );
}

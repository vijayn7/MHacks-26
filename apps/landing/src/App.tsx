import { useState, type CSSProperties, type PointerEvent } from "react";

type Shard = {
  id: string;
  tone: "a" | "b" | "c" | "d" | "e";
  depth: number;
  style: CSSProperties;
};

const shards: Shard[] = [
  {
    id: "s1",
    tone: "b",
    depth: 0.55,
    style: {
      top: "7%",
      left: "3%",
      width: "19%",
      height: "24%",
      ["--clip" as string]: "8% 0, 100% 12%, 88% 100%, 0 78%",
      ["--rot" as string]: "-8deg",
      ["--dx" as string]: "18px",
      ["--dy" as string]: "-22px",
      ["--dur" as string]: "17s",
    },
  },
  {
    id: "s2",
    tone: "e",
    depth: 0.25,
    style: {
      top: "5%",
      left: "30%",
      width: "13%",
      height: "15%",
      ["--clip" as string]: "0 18%, 100% 0, 92% 100%, 10% 88%",
      ["--rot" as string]: "6deg",
      ["--dx" as string]: "-14px",
      ["--dy" as string]: "18px",
      ["--dur" as string]: "21s",
      ["--delay" as string]: "-3s",
    },
  },
  {
    id: "s3",
    tone: "c",
    depth: 0.7,
    style: {
      top: "4%",
      right: "5%",
      width: "21%",
      height: "26%",
      ["--clip" as string]: "12% 0, 100% 8%, 90% 100%, 0 86%",
      ["--rot" as string]: "10deg",
      ["--dx" as string]: "-20px",
      ["--dy" as string]: "14px",
      ["--dur" as string]: "19s",
      ["--delay" as string]: "-6s",
    },
  },
  {
    id: "s4",
    tone: "a",
    depth: 0.45,
    style: {
      top: "30%",
      left: "1%",
      width: "15%",
      height: "30%",
      ["--clip" as string]: "0 0, 100% 10%, 86% 100%, 4% 92%",
      ["--rot" as string]: "-14deg",
      ["--dx" as string]: "10px",
      ["--dy" as string]: "24px",
      ["--dur" as string]: "23s",
      ["--delay" as string]: "-2s",
    },
  },
  {
    id: "s5",
    tone: "d",
    depth: 0.35,
    style: {
      top: "24%",
      right: "2%",
      width: "16%",
      height: "22%",
      ["--clip" as string]: "0 14%, 100% 0, 100% 82%, 8% 100%",
      ["--rot" as string]: "4deg",
      ["--dx" as string]: "-16px",
      ["--dy" as string]: "-12px",
      ["--dur" as string]: "16s",
      ["--delay" as string]: "-8s",
    },
  },
  {
    id: "s6",
    tone: "b",
    depth: 0.6,
    style: {
      bottom: "10%",
      left: "5%",
      width: "20%",
      height: "22%",
      ["--clip" as string]: "6% 0, 100% 16%, 94% 100%, 0 84%",
      ["--rot" as string]: "8deg",
      ["--dx" as string]: "22px",
      ["--dy" as string]: "-10px",
      ["--dur" as string]: "20s",
      ["--delay" as string]: "-4s",
    },
  },
  {
    id: "s7",
    tone: "e",
    depth: 0.3,
    style: {
      bottom: "7%",
      left: "32%",
      width: "12%",
      height: "16%",
      ["--clip" as string]: "0 8%, 100% 0, 90% 100%, 12% 92%",
      ["--rot" as string]: "-5deg",
      ["--dx" as string]: "-8px",
      ["--dy" as string]: "16px",
      ["--dur" as string]: "18s",
      ["--delay" as string]: "-9s",
    },
  },
  {
    id: "s8",
    tone: "c",
    depth: 0.65,
    style: {
      bottom: "6%",
      right: "6%",
      width: "23%",
      height: "26%",
      ["--clip" as string]: "10% 0, 100% 14%, 88% 100%, 0 80%",
      ["--rot" as string]: "-11deg",
      ["--dx" as string]: "12px",
      ["--dy" as string]: "-20px",
      ["--dur" as string]: "22s",
      ["--delay" as string]: "-1s",
    },
  },
  {
    id: "s9",
    tone: "a",
    depth: 0.4,
    style: {
      top: "52%",
      right: "20%",
      width: "11%",
      height: "14%",
      ["--clip" as string]: "0 0, 100% 20%, 80% 100%, 10% 90%",
      ["--rot" as string]: "16deg",
      ["--dx" as string]: "-18px",
      ["--dy" as string]: "8px",
      ["--dur" as string]: "15s",
      ["--delay" as string]: "-5s",
    },
  },
  {
    id: "s10",
    tone: "d",
    depth: 0.2,
    style: {
      top: "58%",
      left: "20%",
      width: "11%",
      height: "12%",
      ["--clip" as string]: "14% 0, 100% 8%, 86% 100%, 0 78%",
      ["--rot" as string]: "-18deg",
      ["--dx" as string]: "14px",
      ["--dy" as string]: "12px",
      ["--dur" as string]: "14s",
      ["--delay" as string]: "-7s",
    },
  },
];

export function App() {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  function onFieldPointerMove(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 28;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 20;
    setParallax({ x, y });
  }

  return (
    <main
      className="field"
      aria-label="SecondThought"
      onPointerMove={onFieldPointerMove}
      onPointerLeave={() => setParallax({ x: 0, y: 0 })}
    >
      <div className="field__atmosphere" aria-hidden="true" />
      <div
        className="field__shards"
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

      <div className="field__center">
        <div className="hero">
          <h1 className="brand">
            <span>SecondThought</span>
          </h1>
          <p className="headline">A pause between impulse and purchase.</p>
          <div className="cta-row">
            <a className="btn btn--primary" href="#download" id="download">
              Download extension
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

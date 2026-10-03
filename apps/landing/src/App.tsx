import { useEffect, useId, useState, type CSSProperties } from "react";

type PanelId =
  | "home"
  | "social"
  | "profile"
  | "score"
  | "leader"
  | "extension"
  | "onboard"
  | "pause"
  | "friend"
  | null;

type Shard = {
  id: string;
  panel: PanelId;
  label: string;
  tone: "a" | "b" | "c" | "d" | "e";
  style: CSSProperties;
};

const shards: Shard[] = [
  {
    id: "s1",
    panel: "pause",
    label: "Pause",
    tone: "b",
    style: {
      top: "8%",
      left: "4%",
      width: "18%",
      height: "22%",
      ["--clip" as string]: "8% 0, 100% 12%, 88% 100%, 0 78%",
      ["--rot" as string]: "-8deg",
      ["--dx" as string]: "18px",
      ["--dy" as string]: "-22px",
      ["--dur" as string]: "17s",
      ["--delay" as string]: "0s",
    },
  },
  {
    id: "s2",
    panel: "score",
    label: "Score",
    tone: "e",
    style: {
      top: "6%",
      left: "28%",
      width: "14%",
      height: "16%",
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
    panel: "friend",
    label: "Friend",
    tone: "c",
    style: {
      top: "4%",
      right: "6%",
      width: "20%",
      height: "24%",
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
    panel: "extension",
    label: "Extension",
    tone: "a",
    style: {
      top: "28%",
      left: "2%",
      width: "15%",
      height: "28%",
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
    panel: "social",
    label: "Social",
    tone: "d",
    style: {
      top: "22%",
      right: "3%",
      width: "16%",
      height: "20%",
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
    panel: "onboard",
    label: "Rules",
    tone: "b",
    style: {
      bottom: "16%",
      left: "6%",
      width: "19%",
      height: "20%",
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
    panel: "home",
    label: "Home",
    tone: "e",
    style: {
      bottom: "10%",
      left: "30%",
      width: "13%",
      height: "18%",
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
    panel: "leader",
    label: "Leaders",
    tone: "c",
    style: {
      bottom: "8%",
      right: "8%",
      width: "22%",
      height: "24%",
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
    panel: "profile",
    label: "Profile",
    tone: "a",
    style: {
      top: "48%",
      right: "18%",
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
    panel: "pause",
    label: "Hold",
    tone: "d",
    style: {
      top: "58%",
      left: "18%",
      width: "12%",
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

const panels: Record<
  Exclude<PanelId, null>,
  { kicker: string; title: string; body: string; points?: string[] }
> = {
  home: {
    kicker: "App · Home",
    title: "Insights at a glance",
    body: "See a summary of your spending pauses, your personal restraint score, and a peek at the leaderboard — so progress stays visible without becoming noise.",
    points: ["Insight summary", "Personal score", "Leaderboard preview"],
  },
  social: {
    kicker: "App · Social",
    title: "Compete with people you trust",
    body: "The full leaderboard, friend invites, and challenges live here. iMessage friend-check settings sit next to the people who actually help you pause.",
    points: ["Full leaderboard", "Invite friends & start challenges", "iMessage support settings"],
  },
  profile: {
    kicker: "App · Profile",
    title: "Your rules, your level",
    body: "Edit restriction intensity — low, medium, or high — and keep your Google-linked account in sync with the Chrome extension.",
  },
  score: {
    kicker: "Gamification",
    title: "A score that rewards restraint",
    body: "Dropping an impulse purchase strengthens your score. Saving for later keeps the decision open. Continuing after a pause still counts as intentional.",
  },
  leader: {
    kicker: "Social proof",
    title: "Leaderboard pressure, used kindly",
    body: "Friendly ranking turns restraint into a shared game — not a lecture. Climb by pausing, not by shaming.",
  },
  extension: {
    kicker: "Chrome extension",
    title: "The moment that matters",
    body: "On checkout-prone sites, SecondThought holds the purchase and surfaces three clear choices before impulse wins.",
    points: ["Continue with a friend check-in", "Save for later", "Drop it"],
  },
  onboard: {
    kicker: "Onboarding",
    title: "Rules in your words",
    body: "An AI chat helps you set restriction preferences, link Google for the extension, and add trusted contacts for later iMessage support.",
  },
  pause: {
    kicker: "Core premise",
    title: "A cooling-off moment you chose",
    body: "SecondThought does not lecture. It enforces the pause you wrote for yourself — then lets you decide with a clearer head.",
  },
  friend: {
    kicker: "Trusted friend",
    title: "Ask for support, not permission",
    body: "Opt in to ping a trusted friend over iMessage when a purchase is held. They can reply with support; they do not approve or veto the buy.",
  },
};

export function App() {
  const [open, setOpen] = useState<PanelId>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="field" aria-label="SecondThought hero">
        <div className="field__atmosphere" aria-hidden="true" />
        <div className="field__shards" aria-hidden={false}>
          {shards.map((shard) => (
            <button
              key={shard.id}
              type="button"
              className="shard"
              data-tone={shard.tone}
              data-label={shard.label}
              style={shard.style}
              aria-label={`Open ${shard.label} details`}
              onClick={() => setOpen(shard.panel)}
            />
          ))}
        </div>

        <div className="field__center">
          <div className="hero">
            <h1 className="brand">SecondThought</h1>
            <p className="headline">A pause between impulse and purchase.</p>
            <p className="lede">
              The Chrome extension that holds checkout when your own rules say so — then lets you drop it,
              save it, or ask a friend.
            </p>
            <div className="cta-row">
              <a className="btn btn--primary" href="#download">
                Download extension
              </a>
              <a className="btn btn--ghost" href="#how">
                See how it works
              </a>
            </div>
          </div>
        </div>

        <a className="scroll-cue" href="#mosaic">
          Explore
        </a>
      </header>

      <section className="section" id="mosaic" aria-labelledby="mosaic-heading">
        <div className="section__inner">
          <h2 className="section__heading" id="mosaic-heading">
            The whole habit loop, in one place
          </h2>
          <p className="section__sub">
            Mobile onboarding sets your rules. The extension guards checkout. Home, Social, and Profile keep
            the streak visible — and a little competitive.
          </p>

          <div className="mosaic">
            <button type="button" className="tile tile--home" onClick={() => setOpen("home")}>
              <p className="tile__label">Home</p>
              <h3 className="tile__title">Insight summary</h3>
              <p className="tile__copy">
                A calm readout of pauses taken, purchases dropped, and the week ahead.
              </p>
            </button>

            <button type="button" className="tile tile--social" onClick={() => setOpen("social")}>
              <p className="tile__label">Social</p>
              <h3 className="tile__title">Friends & challenges</h3>
              <p className="tile__copy">Invite, compete, and wire iMessage support.</p>
            </button>

            <button type="button" className="tile tile--profile" onClick={() => setOpen("profile")}>
              <p className="tile__label">Profile</p>
              <h3 className="tile__title">Restriction level</h3>
              <p className="tile__copy">Low · Medium · High</p>
            </button>

            <button type="button" className="tile tile--score" onClick={() => setOpen("score")}>
              <p className="tile__label">Personal score</p>
              <p className="score-mark">86</p>
            </button>

            <button type="button" className="tile tile--leader" onClick={() => setOpen("leader")}>
              <p className="tile__label">Leaderboard</p>
              <ul className="leader-rows">
                <li>
                  <span>Maya</span>
                  <span>94</span>
                </li>
                <li>
                  <span>You</span>
                  <span>86</span>
                </li>
                <li>
                  <span>Jordan</span>
                  <span>81</span>
                </li>
              </ul>
            </button>

            <button type="button" className="tile tile--extension" onClick={() => setOpen("extension")}>
              <p className="tile__label">Chrome extension</p>
              <h3 className="tile__title">Blocks the buy until you choose</h3>
              <p className="tile__copy">Continue · Save for later · Drop it</p>
            </button>

            <button type="button" className="tile tile--onboard" onClick={() => setOpen("onboard")}>
              <p className="tile__label">Onboarding</p>
              <h3 className="tile__title">AI chat sets your rules</h3>
              <p className="tile__copy">Google auth + trusted contacts, ready for the extension.</p>
            </button>
          </div>
        </div>
      </section>

      <section className="section" id="how" aria-labelledby="how-heading">
        <div className="section__inner intervention">
          <div className="intervention__copy">
            <h2 className="section__heading" id="how-heading">
              When checkout hits, the overlay appears
            </h2>
            <p className="section__sub">
              The extension detects a susceptible checkout flow, matches your saved rules, and interrupts with
              three outcomes — not a lecture.
            </p>
            <ol className="flow-list">
              <li>
                <span className="flow-num" aria-hidden="true">
                  1
                </span>
                <div>
                  <strong>Continue</strong>
                  <p>Send a check-in to a trusted friend over iMessage before you proceed.</p>
                </div>
              </li>
              <li>
                <span className="flow-num" aria-hidden="true">
                  2
                </span>
                <div>
                  <strong>Save for later</strong>
                  <p>Park the item so the urge can cool without the cart winning.</p>
                </div>
              </li>
              <li>
                <span className="flow-num" aria-hidden="true">
                  3
                </span>
                <div>
                  <strong>Drop it</strong>
                  <p>Walk away — and strengthen the restraint score that keeps the game going.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="commerce-frame" aria-label="Extension intervention preview">
            <p className="commerce-frame__label">E-commerce checkout</p>
            <div className="commerce-fake" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="blocked" role="group" aria-label="Blocked purchase overlay">
              <div className="blocked__top">
                <h3 className="blocked__title">BLOCKED</h3>
                <span className="blocked__x" aria-hidden="true">
                  ×
                </span>
              </div>
              <p className="blocked__text">
                This purchase matches your rule: pause non-essential buys over $40. Take a breath, then choose.
              </p>
              <div className="blocked__actions">
                <div className="action action--continue">
                  <span className="action__icon" aria-hidden="true">
                    ✓
                  </span>
                  <span className="action__name">Continue</span>
                </div>
                <div className="action action--later">
                  <span className="action__icon" aria-hidden="true">
                    →
                  </span>
                  <span className="action__name">Save for later</span>
                </div>
                <div className="action action--drop">
                  <span className="action__icon" aria-hidden="true">
                    ×
                  </span>
                  <span className="action__name">Drop it</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="download" id="download" aria-labelledby="download-heading">
        <div className="download__shards" aria-hidden="true">
          <span
            style={
              {
                top: "12%",
                left: "8%",
                width: "14%",
                height: "28%",
                ["--s" as string]: "var(--shard-b)",
                ["--c" as string]: "10% 0, 100% 14%, 84% 100%, 0 80%",
                ["--d" as string]: "18s",
                ["--dx" as string]: "16px",
                ["--dy" as string]: "-18px",
              } as CSSProperties
            }
          />
          <span
            style={
              {
                top: "18%",
                right: "10%",
                width: "18%",
                height: "32%",
                ["--s" as string]: "var(--shard-a)",
                ["--c" as string]: "0 12%, 100% 0, 92% 100%, 8% 88%",
                ["--d" as string]: "21s",
                ["--dx" as string]: "-20px",
                ["--dy" as string]: "14px",
              } as CSSProperties
            }
          />
          <span
            style={
              {
                bottom: "10%",
                left: "22%",
                width: "12%",
                height: "22%",
                ["--s" as string]: "var(--shard-c)",
                ["--c" as string]: "8% 0, 100% 18%, 90% 100%, 0 78%",
                ["--d" as string]: "16s",
                ["--dx" as string]: "10px",
                ["--dy" as string]: "-12px",
              } as CSSProperties
            }
          />
          <span
            style={
              {
                bottom: "16%",
                right: "18%",
                width: "15%",
                height: "20%",
                ["--s" as string]: "var(--shard-d)",
                ["--c" as string]: "0 0, 100% 10%, 86% 100%, 6% 90%",
                ["--d" as string]: "19s",
                ["--dx" as string]: "-12px",
                ["--dy" as string]: "16px",
              } as CSSProperties
            }
          />
        </div>

        <div className="download__inner">
          <p className="download__label">Chrome extension</p>
          <h2 className="download__title" id="download-heading">
            Download
          </h2>
          <p className="download__copy">
            Install SecondThought, sync the rules you set in onboarding, and put a cooling-off moment on every
            checkout that matches.
          </p>
          <div className="cta-row">
            <a className="btn btn--primary" href="#download">
              Add to Chrome
            </a>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen("extension")}>
              Extension details
            </button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>
          <strong>SecondThought</strong> — pause impulse spending on your terms.
        </p>
        <p>FinTech · Chrome · iMessage friend support</p>
      </footer>

      {open ? (
        <div
          className="panel-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(null);
          }}
        >
          <div
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="panel__top">
              <div>
                <p className="panel__kicker">{panels[open].kicker}</p>
                <h2 className="panel__title" id={titleId}>
                  {panels[open].title}
                </h2>
              </div>
              <button
                type="button"
                className="panel__close"
                aria-label="Close"
                onClick={() => setOpen(null)}
              >
                ×
              </button>
            </div>
            <p className="panel__body">{panels[open].body}</p>
            {panels[open].points ? (
              <ul className="panel__list">
                {panels[open].points!.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

import type { CSSProperties } from "react";

export type FlamePalette = {
  tip: string;
  mid: string;
  base: string;
  core: string;
  button: string;
  glow: string;
};

export const FLAMES = {
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

export const FLAME_SILHOUETTE =
  "M 59 179 C 42 158 42 131 48 111 C 61 139 76 133 84 108 C 94 79 103 46 114 22 C 119 59 116 87 137 102 C 151 113 163 103 161 83 C 188 95 202 116 202 149 C 202 188 176 215 131 216 C 96 218 73 201 59 179 Z";
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
      <g filter={`url(#${smoke})`} opacity="0.55">
        <ellipse cx="92" cy="78" rx="22" ry="48" fill="#2a1814" transform="rotate(-28 92 78)" />
        <ellipse cx="128" cy="58" rx="18" ry="42" fill="#241612" transform="rotate(-12 128 58)" />
        <ellipse cx="152" cy="72" rx="14" ry="34" fill="#1c100e" transform="rotate(18 152 72)" />
      </g>
      <g transform="translate(10 28) scale(0.92)">
        <path d={FLAME_SILHOUETTE} fill={`url(#${body})`} />
        <path d={FLAME_SILHOUETTE} fill={`url(#${core})`} />
      </g>
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

export type UrgeOverlayProps = {
  site: string;
  product: string;
  uid: string;
  flame: FlamePalette;
  /** Optional friend status line after ask-a-friend */
  friendReply?: string | null;
};

export function UrgeOverlay({ site, product, uid, flame, friendReply }: UrgeOverlayProps) {
  return (
    <div className="tile__block tile__block--visible" role="dialog" aria-label={`Snuff urge on ${site}`}>
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
          {friendReply ? <p className="urge__friend">{friendReply}</p> : null}

          <div className="urge__actions">
            <div className="urge__row">
              <button type="button" className="urge__btn urge__btn--yes">
                yes
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

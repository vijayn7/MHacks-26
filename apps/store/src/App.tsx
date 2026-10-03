import { useState, type FormEvent } from "react";

const product = { name: "Wool coat", price: 64 };
const api = "http://localhost:8787";

type Draft = { minAmount: string; pauseMinutes: string; summary: string };

export function App() {
  const [placed, setPlaced] = useState(false);

  return (
    <>
      <header className="top">
        <p className="mark">SecondThought</p>
        <p className="tag">Demo store</p>
      </header>
      <main>
        <RuleConfirm />
        {placed ? (
          <section className="done">
            <p className="eyebrow">Checkout</p>
            <h1>Order placed.</h1>
            <p className="blurb">The wool coat is on its way. This demo does not charge a card.</p>
          </section>
        ) : (
          <section className="shop">
            <article className="product">
              <div className="swatch" aria-hidden="true">
                <Coat />
              </div>
              <div>
                <p className="eyebrow">Outerwear</p>
                <h1>{product.name}</h1>
                <p className="blurb">Heavy wool, one size. Already waiting in the cart.</p>
                <p className="price">${product.price}</p>
              </div>
            </article>
            <aside className="cart" data-name={product.name} data-total={product.price}>
              <h2>Cart</h2>
              <div className="line">
                <span>{product.name}</span>
                <span>${product.price}</span>
              </div>
              <div className="line total">
                <span>Total</span>
                <span>${product.price}</span>
              </div>
              <button id="checkout" type="button" onClick={() => setPlaced(true)}>
                Checkout
              </button>
            </aside>
          </section>
        )}
      </main>
    </>
  );
}

function RuleConfirm() {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function onParse(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(`${api}/rules/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json()) as {
        proposal?: { minAmount?: unknown; pauseMinutes?: unknown; summary?: unknown };
      };
      const proposal = data.proposal;
      if (!res.ok || !proposal || typeof proposal.summary !== "string") throw new Error("parse");
      setDraft({
        minAmount: String(proposal.minAmount ?? ""),
        pauseMinutes: String(proposal.pauseMinutes ?? ""),
        summary: proposal.summary,
      });
    } catch {
      setDraft(null);
      setNote("Could not read that rule.");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(`${api}/rules/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minAmount: Number(draft.minAmount),
          pauseMinutes: Number(draft.pauseMinutes),
          summary: draft.summary.trim(),
        }),
      });
      const data = (await res.json()) as { id?: string; minAmount?: number; pauseMinutes?: number };
      if (!res.ok || typeof data.id !== "string") throw new Error("confirm");
      setNote(`Saved. Purchases over $${data.minAmount} pause for ${data.pauseMinutes} minutes.`);
    } catch {
      setNote("Could not save that rule.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="setup">
      <p className="eyebrow">Your rule</p>
      <h2>Pause before you pay.</h2>
      <form onSubmit={onParse}>
        <label>
          Rule
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Pause purchases over $40 for 15 minutes."
          />
        </label>
        <button type="submit" disabled={busy || text.trim().length === 0}>
          Parse rule
        </button>
      </form>
      {draft ? (
        <form className="proposal" onSubmit={onConfirm}>
          <div className="fields">
            <label>
              Minimum amount
              <input
                inputMode="decimal"
                value={draft.minAmount}
                onChange={(event) => setDraft({ ...draft, minAmount: event.target.value })}
              />
            </label>
            <label>
              Pause minutes
              <input
                inputMode="numeric"
                value={draft.pauseMinutes}
                onChange={(event) => setDraft({ ...draft, pauseMinutes: event.target.value })}
              />
            </label>
          </div>
          <label>
            Summary
            <input
              value={draft.summary}
              onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
            />
          </label>
          <button type="submit" disabled={busy}>
            Confirm rule
          </button>
        </form>
      ) : null}
      {note ? <p className="hint">{note}</p> : null}
    </section>
  );
}

function Coat() {
  return (
    <svg viewBox="0 0 180 220" width="148" height="180">
      <path
        fill="#f6f1e7"
        d="M90 18c-10 10-22 16-34 18L22 52 8 118l28 8 16-42 4 112h68l4-112 16 42 28-8-14-66-34-16c-12-2-24-8-34-18z"
      />
      <path
        d="M90 36 70 78M90 36l20 42"
        fill="none"
        stroke="#2c3a32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

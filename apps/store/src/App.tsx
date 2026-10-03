import { useRef, useState } from "react";

const product = {
  name: "Optimum Nutrition Gold Standard 100% Whey, Delicious Strawberry",
  price: 64.99,
};

const bullets = ["24g protein", "5.5g BCAAs", "Gluten free", "Artificial-flavor strawberry"];

type PlacedOrder = { purchaseId: string; balance: number; name: string };

function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function App() {
  const [checkout, setCheckout] = useState(false);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function placeOrder() {
    if (sending.current) return;
    const box = document.querySelector<HTMLElement>("[data-name][data-total]");
    const name = box?.getAttribute("data-name") ?? "";
    const amount = Number(box?.getAttribute("data-total"));
    if (!name || !Number.isFinite(amount)) {
      setError("invalid");
      return;
    }
    sending.current = true;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("http://localhost:8787/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        purchaseId?: string;
        balance?: number;
        name?: string;
      } | null;
      if (!res.ok || !body || typeof body.purchaseId !== "string" || typeof body.balance !== "number") {
        setError(body && typeof body.error === "string" ? body.error : "purchase_failed");
        setBusy(false);
        sending.current = false;
        return;
      }
      setOrder({
        purchaseId: body.purchaseId,
        balance: body.balance,
        name: typeof body.name === "string" ? body.name : name,
      });
    } catch {
      setError("purchase_failed");
      setBusy(false);
      sending.current = false;
    }
  }

  return (
    <>
      <header className="top">
        <p className="mark">SecondThought</p>
        <p className="tag">Demo store</p>
      </header>
      <main>
        {order ? (
          <section className="done">
            <p className="eyebrow">Checkout</p>
            <h1>Order placed.</h1>
            <p className="blurb">{order.name}</p>
            <p className="result">
              Nessie purchase <span className="mono">{order.purchaseId}</span>
            </p>
            <p className="result">Account balance ${money(order.balance)}</p>
            <p className="blurb">This demo does not charge a real card.</p>
          </section>
        ) : (
          <section className="shop">
            <div className="swatch" aria-hidden="true">
              <Tub />
            </div>
            <article className="product">
              <p className="brand">Optimum Nutrition</p>
              <h1>Gold Standard 100% Whey Protein Powder</h1>
              <p className="rating">
                <span aria-hidden="true">★★★★☆</span>
                <span>4.6</span>
              </p>
              <p className="price">${money(product.price)}</p>
              <dl className="specs">
                <div>
                  <dt>Flavor</dt>
                  <dd>Delicious Strawberry</dd>
                </div>
                <div>
                  <dt>Size</dt>
                  <dd>5 lb</dd>
                </div>
              </dl>
              <p className="note">Packaging may vary.</p>
              <h2>About this item</h2>
              <ul className="about">
                {bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <aside className="buy" data-name={product.name} data-total={product.price}>
              <p className="eyebrow">Buy box</p>
              <p className="price">${money(product.price)}</p>
              {checkout ? (
                <div className="panel">
                  <h2>Shipping</h2>
                  <label>
                    Name
                    <input value="Demo Shopper" disabled />
                  </label>
                  <label>
                    Street
                    <input value="1600 Pennsylvania Ave NW" disabled />
                  </label>
                  <label>
                    City
                    <input value="Washington" disabled />
                  </label>
                  <label>
                    State
                    <input value="DC" disabled />
                  </label>
                  <label>
                    ZIP
                    <input value="20500" disabled />
                  </label>
                  <h2>Payment</h2>
                  <label>
                    Nessie checking account
                    <input value="Nessie checking account" disabled />
                  </label>
                  <button id="checkout" type="button" onClick={() => void placeOrder()} disabled={busy}>
                    {busy ? "Placing order…" : "Place order"}
                  </button>
                  {error ? <p className="error">{error}</p> : null}
                </div>
              ) : (
                <button type="button" className="buy-now" onClick={() => setCheckout(true)}>
                  Buy Now
                </button>
              )}
            </aside>
          </section>
        )}
      </main>
    </>
  );
}

function Tub() {
  return (
    <svg viewBox="0 0 180 220" width="150" height="184">
      <rect x="46" y="28" width="88" height="22" rx="6" fill="#f6f1e7" />
      <path fill="#f6f1e7" d="M40 48h100l-8 150a12 12 0 0 1-12 10H60a12 12 0 0 1-12-10L40 48z" />
      <path fill="#9a3e2f" d="M48 78h84v62H48z" />
      <path fill="#f6f1e7" d="M58 96h64v8H58zm0 16h48v6H58z" />
    </svg>
  );
}

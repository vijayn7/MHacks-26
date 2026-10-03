import { useState } from "react";

const product = { name: "Wool coat", price: 64 };

export function App() {
  const [placed, setPlaced] = useState(false);

  return (
    <>
      <header className="top">
        <p className="mark">SecondThought</p>
        <p className="tag">Demo store</p>
      </header>
      <main>
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

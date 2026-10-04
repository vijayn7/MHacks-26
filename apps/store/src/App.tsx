import { useRef, useState } from "react";

const product = {
  name: "Optimum Nutrition Gold Standard 100% Whey, Delicious Strawberry",
  price: 64.99,
};

const title =
  "Optimum Nutrition Gold Standard 100% Whey Protein Powder, Delicious Strawberry, 5 Pound (Packaging May Vary)";

const bullets = [
  "24 g High-Quality Whey Protein per Scoop – 100% of the protein from whey for a fast-absorbing, complete protein source that supports muscle maintenance and growth.",
  "5.5 g Naturally-Occurring BCAAs + 11g of naturally occurring EAAs – Delivers essential amino acids including leucine, isoleucine, and valine to support post-workout muscle recovery, muscle strength and muscle building when taken over time with regular resistance training.",
  "Low Sugar, Low Carb, Low Fat — Ideal for Lean Muscle or Cutting Phases – With just ~1 g sugar, ~3 g carbs per serving, and whey protein isolate as the primary ingredient with further carbs and fat isolated out. It’s a high quality choice for athletes focused on lean muscle, weight management, or body-composition goals.",
  "Instantized & Easy-Mix Formula (Great Mixability) – Designed to dissolve smoothly in water, milk, or smoothies with a spoon, shaker, or blender — perfect for fast post-workout shakes or convenient protein boosts.",
  "Trusted Brand, Tested Quality & Versatile Use – For 35 years, athletes have trusted Optimum Nutrition to fuel their training. Gold Standard Whey is the trusted choice for gym-goers, athletes, and everyday fitness enthusiasts worldwide — use post-workout or as a protein supplement anytime.",
];

const flavors = [
  "Double Rich Chocolate",
  "Delicious Strawberry",
  "Extreme Milk Chocolate",
  "Vanilla Ice Cream",
  "Cookies & Cream",
];

const sizes = ["2 Pound (Pack of 1)", "5 Pound (Pack of 1)"];

const facts = [
  ["Brand", "Optimum Nutrition"],
  ["Flavor", "Delicious Strawberry"],
  ["Size", "5 Pound (Pack of 1)"],
  ["Protein per serving", "24 g"],
  ["Material type free", "Gluten Free"],
  ["Package", "Tub"],
  ["ASIN", "B002DYIZH6"],
  ["Item form", "Powder"],
];

const crumbs = [
  "Health & Household",
  "Sports Nutrition",
  "Protein",
  "Whey Protein Powders",
];

type PlacedOrder = { purchaseId: string; balance: number; name: string };

function money(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function App() {
  const [checkout, setCheckout] = useState(false);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState(0);
  const [added, setAdded] = useState(false);
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
      <header className="nav-wrap">
        <div className="nav">
          <button type="button" className="logo" aria-label="Amazon">
            <span className="logo-word">amazon</span>
            <LogoSmile />
          </button>
          <button type="button" className="nav-pop">
            <Pin />
            <span>
              <span className="minor">Deliver to</span>
              <span className="major">United States</span>
            </span>
          </button>
          <form
            className="nav-search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <select aria-label="Search department" defaultValue="All">
              <option>All</option>
              <option>Health & Household</option>
              <option>Sports Nutrition</option>
            </select>
            <input aria-label="Search Amazon" placeholder="Search Amazon" />
            <button type="submit" aria-label="Go">
              <SearchIcon />
            </button>
          </form>
          <button type="button" className="nav-locale">
            <Flag />
            EN
          </button>
          <button type="button" className="nav-account">
            <span className="minor">Hello, sign in</span>
            <span className="major">Account & Lists</span>
          </button>
          <button type="button" className="nav-orders">
            <span className="minor">Returns</span>
            <span className="major">& Orders</span>
          </button>
          <button type="button" className="nav-cart" aria-label="Cart, 0 items">
            <span className="cart-icon" aria-hidden="true">
              <CartIcon />
              <span className="cart-count">0</span>
            </span>
            Cart
          </button>
        </div>
        <nav className="sub" aria-label="Departments">
          <button type="button" className="all">
            <MenuIcon />
            All
          </button>
          <button type="button">Today's Deals</button>
          <button type="button">Customer Service</button>
          <button type="button">Registry</button>
          <button type="button">Gift Cards</button>
          <button type="button">Sell</button>
        </nav>
      </header>

      <nav className="crumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={crumb}>
            {index > 0 ? <span className="sep">›</span> : null}
            <button type="button">{crumb}</button>
          </span>
        ))}
      </nav>

      {order ? (
        <section className="done">
          <h1>Order placed.</h1>
          <p className="blurb">{order.name}</p>
          <p className="result">
            Nessie purchase <span className="mono">{order.purchaseId}</span>
          </p>
          <p className="result">Account balance ${money(order.balance)}</p>
          <p className="blurb">This demo does not charge a real card.</p>
        </section>
      ) : (
        <main className="dp">
          <div className="gallery">
            <div className="thumbs" role="listbox" aria-label="Product images">
              {["Front", "Nutrition", "Scoop"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={shot === index ? "thumb selected" : "thumb"}
                  aria-label={label}
                  aria-selected={shot === index}
                  onClick={() => setShot(index)}
                >
                  <Shot index={index} />
                </button>
              ))}
            </div>
            <div className="stage">
              <div className="stage-art" role="img" aria-label={title}>
                <Shot index={shot} />
              </div>
              <p className="zoom-note">Roll over image to zoom in</p>
              <p className="pack-note">Packaging may vary</p>
            </div>
          </div>

          <article className="center">
            <h1>{title}</h1>
            <p className="byline">
              <button type="button" className="a-link">
                Visit the Optimum Nutrition Store
              </button>
            </p>
            <div className="rating-row">
              <Stars />
              <button type="button" className="score">
                4.6
              </button>
              <span className="pipe" aria-hidden="true">
                |
              </span>
              <button type="button" className="count">
                (100,414)
              </button>
              <span className="pipe" aria-hidden="true">
                |
              </span>
              <span className="bought">
                <strong>20K+</strong> bought in past month
              </span>
            </div>
            <p className="ac">
              <span className="ac-badge">Amazon's Choice</span>
            </p>
            <hr className="divider" />
            <div className="price-block">
              <Price size="xl" />
              <span className="unit">($0.81 / ounce)</span>
            </div>

            <div className="twister">
              <p className="twister-label">
                Flavor: <span className="value">Delicious Strawberry</span>
              </p>
              <div className="twister-row">
                {flavors.map((flavor) => (
                  <button
                    key={flavor}
                    type="button"
                    className={flavor === "Delicious Strawberry" ? "opt selected" : "opt"}
                    aria-pressed={flavor === "Delicious Strawberry"}
                  >
                    {flavor}
                  </button>
                ))}
              </div>
              <p className="twister-label">
                Size: <span className="value">5 Pound (Pack of 1)</span>
              </p>
              <div className="twister-row">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={size.startsWith("5 Pound") ? "opt selected" : "opt"}
                    aria-pressed={size.startsWith("5 Pound")}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="about">About this item</h2>
            <ul className="about-list">
              {bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <dl className="overview">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>

          <aside className={checkout ? "buybox open" : "buybox"} data-name={product.name} data-total="64.99">
            <div className="price-block">
              <Price size="xl" />
              <span className="unit">($0.81 / ounce)</span>
            </div>
            <div className="delivery">
              <PrimeMark />
              <span>
                <strong>FREE delivery</strong> <strong>Thursday, October 8</strong>
              </span>
            </div>
            <p className="fast">
              Or fastest delivery <strong>Monday, October 5</strong>. Order within{" "}
              <span className="green">8 hrs 12 mins</span>.
            </p>
            <p className="deliver-to">
              <Pin />
              Deliver to United States
            </p>
            <p className="stock">In Stock</p>
            <label className="qty">
              Quantity:
              <select aria-label="Quantity" defaultValue="1">
                <option value="1">1</option>
              </select>
            </label>
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
                <p className="pay-note">This demo does not charge a real card.</p>
                <button id="checkout" className="a-button" type="button" onClick={() => void placeOrder()} disabled={busy}>
                  {busy ? "Placing order…" : "Place order"}
                </button>
                {error ? <p className="error">{error}</p> : null}
              </div>
            ) : (
              <>
                <button type="button" className="a-button add-cart" onClick={() => setAdded(true)}>
                  Add to Cart
                </button>
                <button type="button" className="a-button buy-now" onClick={() => setCheckout(true)}>
                  Buy Now
                </button>
                {added ? <p className="added">Added to cart</p> : null}
              </>
            )}
            <div className="merchant">
              <div>
                <span className="k">Ships from</span>
                <span>Amazon.com</span>
              </div>
              <div>
                <span className="k">Sold by</span>
                <button type="button">Amazon.com</button>
              </div>
              <div>
                <span className="k">Returns</span>
                <span>Non-returnable due to Food safety reasons</span>
              </div>
            </div>
            <div className="secure">
              <span className="k">Payment</span>
              <span>Secure transaction</span>
            </div>
          </aside>
        </main>
      )}

      <footer>
        <button
          type="button"
          className="back-top"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Back to top
        </button>
        <div className="foot">
          <div>
            <h2>Get to Know Us</h2>
            <button type="button">About Amazon</button>
            <button type="button">Careers</button>
            <button type="button">Press Center</button>
          </div>
          <div>
            <h2>Make Money with Us</h2>
            <button type="button">Sell on Amazon</button>
            <button type="button">Protect & Build Your Brand</button>
            <button type="button">Become an Affiliate</button>
          </div>
          <div>
            <h2>Amazon Payment Products</h2>
            <button type="button">Amazon Visa</button>
            <button type="button">Shop with Points</button>
            <button type="button">Reload Your Balance</button>
          </div>
          <div>
            <h2>Let Us Help You</h2>
            <button type="button">Your Account</button>
            <button type="button">Your Orders</button>
            <button type="button">Shipping Rates & Policies</button>
            <button type="button">Help</button>
          </div>
        </div>
        <div className="foot-base">
          <span className="logo" aria-hidden="true">
            <span className="logo-word">amazon</span>
            <LogoSmile />
          </span>
          <span>Demo store. This page does not charge a real card.</span>
        </div>
      </footer>
    </>
  );
}

function Price({ size }: { size: "xl" | "base" }) {
  return (
    <span className={`a-price a-price-${size}`}>
      <span className="a-offscreen">${product.price.toFixed(2)}</span>
      <span aria-hidden="true">
        <span className="a-price-symbol">$</span>
        <span className="a-price-whole">
          64<span className="a-price-decimal">.</span>
        </span>
        <span className="a-price-fraction">99</span>
      </span>
    </span>
  );
}

function Stars() {
  const value = 4.6;
  return (
    <span className="stars" role="img" aria-label="4.6 out of 5 stars">
      {[0, 1, 2, 3, 4].map((index) => {
        const amount = Math.max(0, Math.min(1, value - index));
        const id = `star-fill-${index}`;
        return (
          <svg key={index} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <defs>
              <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${amount * 100}%`} stopColor="#FFA41C" />
                <stop offset={`${amount * 100}%`} stopColor="#D5D9D9" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${id})`}
              d="M12 2.2l2.6 6.3 6.8.6-5.2 4.5 1.6 6.6L12 16.8 6.2 20.2 7.8 13.6 2.6 9.1l6.8-.6L12 2.2z"
            />
          </svg>
        );
      })}
    </span>
  );
}

function LogoSmile() {
  return (
    <svg className="logo-smile" viewBox="0 0 80 12" preserveAspectRatio="none" aria-hidden="true">
      <path d="M4 2c16 8 46 9 70 1" fill="none" stroke="#FF9900" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M62 1.2l12 2.2-6.4 6.2" fill="none" stroke="#FF9900" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrimeMark() {
  return (
    <svg className="prime" viewBox="0 0 62 18" width="54" height="16" aria-label="Prime">
      <text x="0" y="12" fill="#00A8E1" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14" fontWeight="700">
        prime
      </text>
      <path d="M4 15c14 4 34 4 50-1" fill="none" stroke="#00A8E1" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M48 12l7 1.5-4 4" fill="none" stroke="#00A8E1" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function Pin() {
  return (
    <svg className="pin" viewBox="0 0 16 20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        d="M8 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"
      />
      <circle cx="8" cy="8" r="2.1" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="9" cy="9" r="6" fill="none" stroke="#111" strokeWidth="2.2" />
      <path d="M13.6 13.6L19 19" stroke="#111" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="38" height="28" viewBox="0 0 38 28" aria-hidden="true">
      <path d="M2 4h4l3.2 14h18.2l3.2-9H10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="14" cy="23" r="2" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="25" cy="23" r="2" fill="none" stroke="#fff" strokeWidth="1.6" />
    </svg>
  );
}

function Flag() {
  return (
    <svg className="flag" viewBox="0 0 18 12" width="18" height="12" aria-hidden="true">
      <rect width="18" height="12" fill="#b22234" />
      <path d="M0 1.5h18M0 4h18M0 6.5h18M0 9h18M0 11.5h18" stroke="#fff" strokeWidth="1" />
      <rect width="8" height="6.5" fill="#3c3b6e" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true">
      <path d="M0 1h16M0 7h16M0 13h16" stroke="#fff" strokeWidth="1.8" />
    </svg>
  );
}

function Shot({ index }: { index: number }) {
  if (index === 1) return <NutritionCard />;
  if (index === 2) return <ScoopArt />;
  return <Tub />;
}

function Tub() {
  return (
    <svg viewBox="0 0 360 480" role="img" aria-label="Optimum Nutrition Gold Standard whey tub, Delicious Strawberry, 5 lb">
      <ellipse cx="180" cy="452" rx="92" ry="12" fill="#ececec" />
      <ellipse cx="180" cy="70" rx="104" ry="24" fill="#3c3c3c" />
      <path d="M76 70v16c0 14 46 26 104 26s104-12 104-26V70" fill="#141414" />
      <ellipse cx="180" cy="70" rx="78" ry="16" fill="#0c0c0c" />
      <path
        d="M86 96c-2 90 4 210 14 300 4 28 28 48 80 48s76-20 80-48c10-90 16-210 14-300"
        fill="#161616"
      />
      <ellipse cx="180" cy="98" rx="94" ry="18" fill="#2a2a2a" />
      <path d="M102 120h10c2 80 4 190 2 250h-8c0-70-2-170-4-250z" fill="#2e2e2e" opacity="0.85" />
      <rect x="116" y="150" width="128" height="250" rx="6" fill="#101010" stroke="#d4b36a" strokeWidth="3" />
      <text x="180" y="176" textAnchor="middle" fill="#f2e2bc" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="13" fontWeight="700" letterSpacing="2.4">
        OPTIMUM
      </text>
      <text x="180" y="190" textAnchor="middle" fill="#ffffff" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="8" letterSpacing="3">
        NUTRITION
      </text>
      <rect x="128" y="202" width="104" height="26" fill="#d4b36a" />
      <text x="180" y="220" textAnchor="middle" fill="#1a1a1a" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="11" fontWeight="700" letterSpacing="0.4">
        GOLD STANDARD
      </text>
      <text x="180" y="250" textAnchor="middle" fill="#ffffff" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="18" fontWeight="700">
        100% WHEY
      </text>
      <text x="180" y="266" textAnchor="middle" fill="#f2e2bc" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="9" letterSpacing="1.5">
        PROTEIN POWDER
      </text>
      <g transform="translate(148 278)">
        <ellipse cx="18" cy="28" rx="16" ry="18" fill="#e23a4a" />
        <ellipse cx="40" cy="24" rx="15" ry="16" fill="#c81d36" />
        <ellipse cx="30" cy="40" rx="14" ry="14" fill="#f05a62" />
        <path d="M28 12c-2-12 10-16 12-6 8-8 16 0 8 8 8 2 6 12-2 10-2 8-14 6-14-2-6-2-8-10-4-10z" fill="#3e8c3a" />
        <circle cx="14" cy="26" r="1.4" fill="#fff6" />
        <circle cx="36" cy="22" r="1.2" fill="#fff6" />
      </g>
      <rect x="128" y="336" width="104" height="24" fill="#e23a4a" />
      <text x="180" y="352" textAnchor="middle" fill="#ffffff" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="8" fontWeight="700" letterSpacing="0.3">
        DELICIOUS STRAWBERRY
      </text>
      <text x="180" y="378" textAnchor="middle" fill="#f2e2bc" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14" fontWeight="700">
        5 LB
      </text>
      <text x="180" y="392" textAnchor="middle" fill="#ffffff" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="8">
        24g PROTEIN
      </text>
    </svg>
  );
}

function NutritionCard() {
  return (
    <svg viewBox="0 0 360 480" role="img" aria-label="Nutrition highlights for Gold Standard whey">
      <rect x="70" y="70" width="220" height="340" rx="8" fill="#fff" stroke="#111" strokeWidth="3" />
      <text x="180" y="110" textAnchor="middle" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="20" fontWeight="700">
        Nutrition Facts
      </text>
      <path d="M88 122h184" stroke="#111" strokeWidth="6" />
      <text x="92" y="156" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14">
        Serving size
      </text>
      <text x="268" y="156" textAnchor="end" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14" fontWeight="700">
        1 scoop
      </text>
      <path d="M88 168h184" stroke="#111" strokeWidth="2" />
      <text x="92" y="210" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="28" fontWeight="700">
        24g
      </text>
      <text x="92" y="232" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14">
        Protein
      </text>
      <path d="M88 250h184" stroke="#111" strokeWidth="2" />
      <text x="92" y="286" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="22" fontWeight="700">
        5.5g
      </text>
      <text x="92" y="308" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14">
        BCAAs
      </text>
      <path d="M88 324h184" stroke="#111" strokeWidth="2" />
      <text x="92" y="360" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14">
        Gluten free
      </text>
      <text x="92" y="384" fill="#111" fontFamily="Liberation Sans, Arial, sans-serif" fontSize="14">
        Delicious Strawberry
      </text>
    </svg>
  );
}

function ScoopArt() {
  return (
    <svg viewBox="0 0 360 480" role="img" aria-label="Strawberry whey powder in a glass">
      <path d="M118 150h124l-14 230a16 16 0 0 1-16 12h-64a16 16 0 0 1-16-12z" fill="#f7f7f7" stroke="#d5d9d9" strokeWidth="3" />
      <path d="M130 250h104l-8 118a10 10 0 0 1-10 8h-68a10 10 0 0 1-10-8z" fill="#f3a3b0" />
      <ellipse cx="180" cy="250" rx="52" ry="14" fill="#e23a4a" />
      <ellipse cx="168" cy="236" rx="22" ry="10" fill="#f6c3cb" />
      <path d="M150 120c8 20 8 36 0 48M180 108c6 22 6 40 0 58M208 122c-6 18-6 34 0 46" fill="none" stroke="#c81d36" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

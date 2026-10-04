import type { CSSProperties } from "react";

type Tile = {
  id: string;
  src: string;
  alt: string;
  style: CSSProperties;
};

/** Fixed staggered frames — leave a clear center for the title. */
const tiles: Tile[] = [
  { id: "t1", src: "/sites/amazon.jpg", alt: "Amazon", style: { top: "4%", left: "3%", width: "22%", aspectRatio: "16 / 10" } },
  { id: "t2", src: "/sites/edikted.jpg", alt: "Edikted", style: { top: "3%", left: "38%", width: "16%", aspectRatio: "16 / 10" } },
  { id: "t3", src: "/sites/nike.jpg", alt: "Nike", style: { top: "5%", right: "14%", width: "18%", aspectRatio: "16 / 10" } },
  { id: "t4", src: "/sites/shein.jpg", alt: "SHEIN", style: { top: "18%", right: "2%", width: "20%", aspectRatio: "16 / 10" } },
  { id: "t5", src: "/sites/princesspolly.jpg", alt: "Princess Polly", style: { top: "28%", left: "2%", width: "19%", aspectRatio: "16 / 10" } },
  { id: "t6", src: "/sites/walmart.jpg", alt: "Walmart", style: { top: "36%", left: "18%", width: "11%", aspectRatio: "16 / 10" } },
  { id: "t7", src: "/sites/bestbuy.jpg", alt: "Best Buy", style: { top: "34%", right: "6%", width: "17%", aspectRatio: "16 / 10" } },
  { id: "t8", src: "/sites/polymarket.jpg", alt: "Polymarket", style: { bottom: "6%", left: "2%", width: "24%", aspectRatio: "16 / 10" } },
  { id: "t9", src: "/sites/ebay.jpg", alt: "eBay", style: { bottom: "10%", left: "30%", width: "14%", aspectRatio: "16 / 10" } },
  { id: "t10", src: "/sites/homedepot.jpg", alt: "Home Depot", style: { bottom: "4%", right: "28%", width: "12%", aspectRatio: "16 / 10" } },
  { id: "t11", src: "/sites/asos.jpg", alt: "ASOS", style: { bottom: "5%", right: "3%", width: "23%", aspectRatio: "16 / 10" } },
];

export function App() {
  return (
    <main className="snuff">
      <div className="snuff__field" aria-hidden="true">
        {tiles.map((tile) => (
          <figure key={tile.id} className="tile" style={tile.style}>
            <img src={tile.src} alt="" draggable={false} />
          </figure>
        ))}
      </div>

      <div className="snuff__center">
        <h1 className="snuff__brand">snuffed</h1>
        <p className="snuff__tag">put out the flame. defeat your impulse spending.</p>
        <div className="snuff__ctas">
          <a className="cta cta--primary" href="#mac">
            add to mac
          </a>
          <a className="cta cta--secondary" href="#windows">
            add to windows
          </a>
          <a className="cta cta--secondary" href="#mobile">
            download mobile
          </a>
        </div>
      </div>
    </main>
  );
}

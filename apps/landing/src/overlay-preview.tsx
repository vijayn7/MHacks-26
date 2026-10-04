import { createRoot } from "react-dom/client";
import { FLAMES, UrgeOverlay } from "./UrgeOverlay";
import "./index.css";

function OverlayPreview() {
  return (
    <main className="overlay-preview">
      <header className="overlay-preview__header">
        <p className="overlay-preview__kicker">snuffed · urge overlay preview</p>
        <h1 className="overlay-preview__title">Checkout pause UI</h1>
        <p className="overlay-preview__note">
          Static visual mock for backend handoff. Buttons are not wired — see{" "}
          <code>URGE_OVERLAY_INTERFACE.md</code>.
        </p>
      </header>

      <div className="overlay-preview__stage">
        <figure className="overlay-preview__window tile tile--near tile--interactive tile--blocking">
          <img
            className="tile__shot"
            src="/sites/nike.jpg"
            alt="Nike checkout mock"
            draggable={false}
          />
          <UrgeOverlay
            site="Nike"
            product="Nike Dunk Low · $120"
            uid="preview"
            flame={FLAMES.ember}
            friendReply={null}
          />
        </figure>
      </div>

      <p className="overlay-preview__back">
        <a href="/">← back to landing</a>
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<OverlayPreview />);

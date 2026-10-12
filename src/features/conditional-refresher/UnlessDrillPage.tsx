import UnlessDrill from "./UnlessDrill";
import "./conditional-refresher.css";

/** The Unless drill on its own, so it can be assigned without the rest of the refresher. */
export default function UnlessDrillPage() {
  return (
    <div className="cir-root">
      <div className="cir-shell">
        <h1 className="cir-title">Unless drill</h1>
        <p className="cir-sub">Group 3 indicators. Your best time is saved in this browser.</p>
        <UnlessDrill />
      </div>
    </div>
  );
}

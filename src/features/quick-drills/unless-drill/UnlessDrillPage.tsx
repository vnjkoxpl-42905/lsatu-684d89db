import UnlessDrill from "./UnlessDrill";
import "@/features/conditional-refresher/conditional-refresher.css";

/** The Unless drill on its own, so it can be assigned without the rest of the refresher. */
export default function UnlessDrillPage() {
  return (
    <div className="cir-root">
      <div className="cir-shell">
        <h1 className="cir-title" style={{ marginBottom: 24 }}>Unless drill</h1>
        <UnlessDrill />
      </div>
    </div>
  );
}

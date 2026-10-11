import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { UnlessDrill, type UnlessResult } from "@/features/conditional-refresher/UnlessDrill";
import { useBootcampProgress } from "@/hooks/useBootcampProgress";
import "@/features/conditional-refresher/conditional-refresher.css";

export default function UnlessDrillPage() {
  const [searchParams] = useSearchParams();
  const [completedRounds, setCompletedRounds] = useState(0);

  // Syncs progress to student's assigned classroom item when assigned via teacher desk
  useBootcampProgress({
    bootcampId: "unless-drill",
    completedDays: completedRounds > 0 ? [1] : [],
    totalDays: 1,
  });

  const returnTo = searchParams.get("returnTo") || "/classroom";
  const returnLabel = returnTo.includes("conditional-indicators-refresher")
    ? "Back to conditional indicators"
    : returnTo.includes("bootcamp")
    ? "Back to bootcamps"
    : "Back to classroom";

  const handleRoundComplete = (_results: UnlessResult[]) => {
    setCompletedRounds((n) => n + 1);
  };

  return (
    <div className="cir-root">
      <div className="cir-shell">
        <header style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to={returnTo}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--cir-ink-mute, #65706A)",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
            >
              <ArrowLeft style={{ width: "15px", height: "15px" }} />
              {returnLabel}
            </Link>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--cir-accent, #244E49)",
                background: "rgba(36, 78, 73, 0.08)",
                padding: "4px 12px",
                borderRadius: "999px",
                border: "1px solid rgba(36, 78, 73, 0.18)",
              }}
            >
              Group 3 · Negate Sufficient
            </span>
          </div>

          <h1 className="cir-title">Unless drill</h1>
          <p className="cir-sub">
            Speed drill for Group 3 indicators (<strong>unless</strong>, <strong>until</strong>,{" "}
            <strong>without</strong>). 5-second rounds to diagram statements into sufficient and
            necessary conditions.
          </p>
        </header>

        <UnlessDrill onRoundComplete={handleRoundComplete} />
      </div>
    </div>
  );
}

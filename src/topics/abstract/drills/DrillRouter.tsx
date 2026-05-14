import { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

const D1StripDown = lazy(() =>
  import("./D1-StripDown").then((m) => ({ default: m.D1StripDown })),
);
const D2IndicatorClassification = lazy(() =>
  import("./D2-IndicatorClassification").then((m) => ({
    default: m.D2IndicatorClassification,
  })),
);
const D3BasicXY = lazy(() =>
  import("./D3-BasicXY").then((m) => ({ default: m.D3BasicXY })),
);
const D4AdvancedXY = lazy(() =>
  import("./D4-AdvancedXY").then((m) => ({ default: m.D4AdvancedXY })),
);
const D5JargonDecoding = lazy(() =>
  import("./D5-JargonDecoding").then((m) => ({ default: m.D5JargonDecoding })),
);
const D7KeywordWorksheet = lazy(() =>
  import("./D7-KeywordWorksheet").then((m) => ({ default: m.D7KeywordWorksheet })),
);
const D8StemTranslation = lazy(() =>
  import("./D8-StemTranslation").then((m) => ({ default: m.D8StemTranslation })),
);

function DrillFallback() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <div className="h-7 w-48 animate-pulse rounded-md bg-secondary" />
      <div className="h-32 w-full animate-pulse rounded-xl border border-border bg-card/40" />
    </div>
  );
}

export function DrillRouter() {
  const { drillId } = useParams<{ drillId: string }>();
  return (
    <Suspense fallback={<DrillFallback />}>
      {(() => {
        switch (drillId) {
          case "d1":
            return <D1StripDown />;
          case "d2":
            return <D2IndicatorClassification />;
          case "d3":
            return <D3BasicXY />;
          case "d4":
            return <D4AdvancedXY />;
          case "d5":
            return <D5JargonDecoding />;
          case "d7":
            return <D7KeywordWorksheet />;
          case "d8":
            return <D8StemTranslation />;
          default:
            return <Navigate to="/topics/abstract/drills/d1" replace />;
        }
      })()}
    </Suspense>
  );
}

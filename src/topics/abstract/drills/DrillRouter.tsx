import { lazy, Suspense } from "react";
import { useParams, Navigate } from "react-router-dom";

const D1AbstractLanguage = lazy(() =>
  import("./D1-AbstractLanguage").then((m) => ({ default: m.D1AbstractLanguage })),
);
const D2TranslationBuckets = lazy(() =>
  import("./D2-TranslationBuckets").then((m) => ({
    default: m.D2TranslationBuckets,
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
const D7KeywordDecoding = lazy(() =>
  import("./D7-KeywordWorksheet").then((m) => ({ default: m.D7KeywordDecoding })),
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
            return <D1AbstractLanguage />;
          case "d2":
            return <D2TranslationBuckets />;
          case "d3":
            return <D3BasicXY />;
          case "d4":
            return <D4AdvancedXY />;
          case "d5":
            return <D5JargonDecoding />;
          case "d7":
            return <D7KeywordDecoding />;
          case "d8":
            return <D8StemTranslation />;
          default:
            return <Navigate to="/topics/abstract/drills/d1" replace />;
        }
      })()}
    </Suspense>
  );
}

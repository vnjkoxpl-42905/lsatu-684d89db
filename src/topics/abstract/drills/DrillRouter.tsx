import { useParams, Navigate } from "react-router-dom";
import { D1StripDown } from "./D1-StripDown";
import { D2IndicatorClassification } from "./D2-IndicatorClassification";
import { D3BasicXY } from "./D3-BasicXY";
import { D4AdvancedXY } from "./D4-AdvancedXY";
import { D5JargonDecoding } from "./D5-JargonDecoding";
import { D7KeywordWorksheet } from "./D7-KeywordWorksheet";
import { D8StemTranslation } from "./D8-StemTranslation";

export function DrillRouter() {
  const { drillId } = useParams<{ drillId: string }>();
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
}

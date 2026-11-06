import { useLocation } from "react-router-dom";
import AcademyMainhub from "@/pages/AcademyMainhub";
import DrillingLanding from "@/pages/DrillingLanding";

/**
 * `/practice/drills` with nothing after it is the Drilling page. Any link that
 * names a section, view, stage or finder (`?section=rc`, `?finder=open`, a
 * drill's return link) still reaches the full hub exactly as before.
 */
export default function DrillsEntry() {
  const { search } = useLocation();
  return search === "" ? <DrillingLanding /> : <AcademyMainhub />;
}

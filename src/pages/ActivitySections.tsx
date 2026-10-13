import { useNavigate } from "react-router-dom";
import { SectionLibraryPanel } from "@/features/activity-centre/components/SectionLibraryPanel";
import "@/features/activity-centre/activity-centre.css";

/**
 * Read, Recall, Colour, reachable without waiting to be assigned it.
 *
 * The door used to exist only as an assignment: a student who had never been
 * given the section-library Activity had no address for it at all, even though
 * every section behind it is open to her and starting one is a server call that
 * builds its own Attempt. This is that same door at a permanent address, linked
 * from the Activities page.
 */
export default function ActivitySections() {
  const navigate = useNavigate();
  return <SectionLibraryPanel onExit={() => navigate("/activities")} />;
}

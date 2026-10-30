// Local-only visual fixture. Renders the actual component without auth, provider
// calls or persisted assignment state. Not registered in the production router.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../features/activity-centre/activity-centre.css";
import "../features/activity-centre/activities-home.css";
import { RelationshipIntro } from "../features/activity-centre/components/RelationshipIntro";
import content from "../features/activity-centre/content/spot-the-relationship.json";
import type { ActivityInstructions } from "../features/activity-centre/api/types";

const params = new URLSearchParams(location.search);
if (params.get("theme") === "root") document.documentElement.classList.remove("light");
function Preview() {
  const [action, setAction] = useState<string>();
  return <div className="activity-centre act-home" data-world="spot-the-relationship">
    {action ? <main style={{ padding: 32 }}><p role="status">{action}</p><button onClick={() => setAction(undefined)}>Back to instructions</button></main> :
      <RelationshipIntro title={content.title} subtitle={content.subtitle} instructions={content.instructions as ActivityInstructions}
        preview canSaveProgress={false} resumeAt={Number(params.get("resume")) || 1}
        onStart={() => setAction("Local preview started. No student progress was saved.")}
        onExit={() => setAction("Local preview exited. No student progress was saved.")} />}
  </div>;
}
createRoot(document.getElementById("root")!).render(<Preview />);

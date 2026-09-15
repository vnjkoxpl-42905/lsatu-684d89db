import React from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../features/activity-centre/activity-centre.css";
import "../features/activity-centre/worlds/world-shells.css";
import "../features/activity-centre/worlds/switchyard/switchyard.css";
import type { ActivityItem } from "../features/activity-centre/api/types";
import { ActivityItemView } from "../features/activity-centre/components/ActivityItemView";
import { buildPaperDiagramChoices } from "../features/activity-centre/worlds/switchyard/diagramChoices";

const item: ActivityItem = {
  order: 1,
  prompt: "Whenever the greenhouse fans run overnight, the orchids bloom by morning.",
  credited_answers: [
    "If the greenhouse fans run overnight, then the orchids bloom by morning.",
    "If the orchids did not bloom by morning, then the greenhouse fans did not run overnight.",
  ],
  explanation: '"Whenever" marks the sufficient condition.',
};

function Preview() {
  return (
    <main className="activity-centre min-h-screen bg-[hsl(var(--background))] p-4 md:p-10">
      <div className="mx-auto max-w-3xl">
        <ActivityItemView
          item={item}
          format="mcq"
          isLast={false}
          paperChoices={buildPaperDiagramChoices(item.credited_answers, item.order)}
          onResolved={() => undefined}
          onRecord={async () => undefined}
          onNext={() => undefined}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
);

import React from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../features/activity-centre/activity-centre.css";
import "../features/activity-centre/worlds/world-shells.css";
import "../features/activity-centre/worlds/switchyard/switchyard.css";
import type { ActivityItem } from "../features/activity-centre/api/types";
import { ActivityItemView } from "../features/activity-centre/components/ActivityItemView";
import { buildPaperDiagramChoices } from "../features/activity-centre/worlds/switchyard/diagramChoices";
import conditional from "../features/activity-centre/content/conditional-rephrase.json";

function Preview() {
  const [index, setIndex] = React.useState(0);
  const [finished, setFinished] = React.useState(false);
  const item: ActivityItem = conditional.items[index];
  return (
    <main className="activity-centre min-h-screen bg-[hsl(var(--background))] p-4 md:p-10">
      <div className="mx-auto max-w-3xl">
        <a href="/conditional-lab" className="mb-6 inline-block text-sm underline">Conditional drills</a>
        <h1 className="mb-4 text-2xl font-semibold">General Conditionals</h1>
        {finished ? <><p>Preview complete.</p><button className="mt-4 underline" onClick={() => { setIndex(0); setFinished(false); }}>Practice again</button></> : <>
        <p className="mb-4 text-sm">Question {index + 1} of {conditional.items.length}</p>
        <ActivityItemView key={item.order}
          item={item}
          format="mcq"
          isLast={index === conditional.items.length - 1}
          paperChoices={buildPaperDiagramChoices(item.credited_answers, item.order)}
          onResolved={() => undefined}
          onRecord={async () => undefined}
          onNext={() => index < conditional.items.length - 1 ? setIndex(index + 1) : setFinished(true)}
        />
        </>}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
);

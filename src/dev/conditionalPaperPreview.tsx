import React from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import "../features/activity-centre/activity-centre.css";
import "../features/activity-centre/worlds/world-shells.css";
import "../features/activity-centre/worlds/switchyard/switchyard.css";
import type { ActivityItem } from "../features/activity-centre/api/types";
import { ActivityProgress } from "../features/activity-centre/components/ActivityProgress";
import { ActivityItemView } from "../features/activity-centre/components/ActivityItemView";
import { buildPaperDiagramChoices } from "../features/activity-centre/worlds/switchyard/diagramChoices";
import conditional from "../features/activity-centre/content/conditional-rephrase.json";
import { getGeneralPhase } from "../features/activity-centre/conditionals/generalPhases";
import { DrillEntrance } from "../features/activity-centre/conditionals/DrillEntrance";

function Preview() {
  const [index, setIndex] = React.useState(() => Math.max(0, Math.min(61, Math.floor(Number(new URLSearchParams(window.location.search).get("question")) || 1) - 1)));
  const [paperReady, setPaperReady] = React.useState(false);
  const [paperDeadline, setPaperDeadline] = React.useState<string>();
  const beginQuestion = (position: number) => {
    setIndex(position); setPaperReady(false); setResolved(false);
    const seconds = getGeneralPhase(position).seconds;
    setPaperDeadline(seconds ? new Date(Date.now() + seconds * 1000).toISOString() : undefined);
  };
  const [resolved, setResolved] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const [started, setStarted] = React.useState(false);
  const item: ActivityItem = conditional.items[index];
  if (!started) return <main className="activity-centre conditional-general-entrance"><DrillEntrance mode="general" title="General Conditionals" onBack={() => window.location.assign("/conditional-lab")} onStart={() => { beginQuestion(index); setStarted(true); }} questionCount={conditional.items.length} /></main>;
  return (
    <main data-world="conditional-rephrase" style={{ backgroundColor: "hsl(var(--aw-page))", color: "hsl(var(--aw-ink))" }} className="activity-centre min-h-screen p-4 md:p-10">
      <div className="mx-auto max-w-3xl">
        <a href="/conditional-lab" className="mb-6 inline-block text-sm underline">Conditional drills</a>
        <h1 className="mb-4 text-2xl font-semibold">General Conditionals</h1>
        {finished ? <><p>Preview complete.</p><button className="mt-4 underline" onClick={() => { setIndex(0); setFinished(false); setStarted(false); }}>Practice again</button></> : <>
        <div className="mb-4"><ActivityProgress completed={index + (resolved ? 1 : 0)} total={conditional.items.length} /></div>
        <ActivityItemView key={item.order}
          item={item}
          format="mcq"
          diagramSeconds={getGeneralPhase(index).seconds ?? undefined}
          phaseLabel={getGeneralPhase(index).label}
          paperDeadline={paperDeadline}
          paperReady={paperReady}
          onPaperReady={() => setPaperReady(true)}
          isLast={index === conditional.items.length - 1}
          paperChoices={buildPaperDiagramChoices(item.credited_answers, item.order)}
          onResolved={() => setResolved(true)}
          onRecord={async () => undefined}
          onNext={() => index < conditional.items.length - 1 ? beginQuestion(index + 1) : setFinished(true)}
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

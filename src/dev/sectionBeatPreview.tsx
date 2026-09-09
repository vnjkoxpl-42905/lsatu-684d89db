/**
 * A preview harness for the runner's ready beat. Development only.
 *
 * `SectionStage` is presentational, so the beat can be looked at in every one
 * of its states without a microphone, a signed-in student or a section in the
 * database. Nothing is stubbed: `getStream` returns null, so the bar mounts
 * and stays flat, which is what a refused or silent input looks like too.
 *
 * Not routed and not imported by the app. Reached at
 * `/src/dev/section-beat-preview.html` on the dev server. Not an entry point
 * in the Vite build, which only builds `index.html`, so it never ships.
 *
 * States: ?state=holding|heard|unheard|refused|running
 */
import { createRoot } from "react-dom/client";
import { SectionStage } from "../features/activity-centre/recall/SectionStage";
import type { SectionStimulus } from "../features/activity-centre/recall/section";
import "../features/activity-centre/recall/section.css";

const state = new URLSearchParams(location.search).get("state") ?? "holding";

const stimulus = {
  slug: "pt-105-s2-q01",
  chunks: [
    { n: 1, text: "The council's own survey contradicts the figure it published." },
    { n: 2, text: "So the figure cannot be the one the report relied on." },
  ],
} as SectionStimulus;

const beat = state !== "running";

createRoot(document.getElementById("root")!).render(
  <SectionStage
    stimulus={stimulus}
    phase="working"
    stimulusNumber={1}
    totalStimuli={26}
    error={null}
    elapsedSeconds={0}
    goalSeconds={1500}
    sectionName="PT105.S2"
    recording={state !== "refused"}
    getStream={() => null}
    countdown={beat ? 3 : null}
    micRefused={state === "refused"}
    micHeard={state === "heard"}
    micChecked={state === "heard" || state === "unheard"}
    onExit={() => {}}
    onRetryMic={() => {}}
  />,
);

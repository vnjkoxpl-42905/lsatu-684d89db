// Local Vite entry only. Not imported by the production app or router.
import React from "react";
import { createRoot } from "react-dom/client";
import OfficialQuestionPane from "../../src/components/drill/official/OfficialQuestionPane";
import type { InlineChoiceNotes } from "../../src/components/drill/official/InlineChoiceExplanation";
import "../../src/index.css";

const params = new URLSearchParams(location.search);
const bank = await fetch("/data/PT133-S1-LR.json").then((r) => r.json());
const source = bank.find((q: { questionNumber: number }) => q.questionNumber === 19);
const question = { ...source, qid: "PT133-S1-Q19", qnum: 19 };
// D's text and metadata are transcribed from Joshua's supplied screenshot.
// Additional modes are synthetic stress fixtures, never authored course content.
const screenshotNote = `The author is only arguing that early humans didn't interbreed with Neanderthals. She doesn't need to believe that they were geographically isolated. They might have seen each other and just thought, "Nahhhh, that ain't my species. I ain't breeding with that."`;
const notes: InlineChoiceNotes = {
  A: {},
  B: { tag: "Opposite", studentPercent: 1 },
  C: { tag: "Correct", studentPercent: 77, ...(params.has("all") ? { note: screenshotNote } : {}) },
  D: { tag: "Too Strong: completely isolated", studentPercent: 2, note: screenshotNote },
  E: {},
};
if (params.has("all")) {
  for (const letter of Object.keys(question.answerChoices)) {
    notes[letter] = { ...notes[letter], note: screenshotNote };
  }
}
if (params.has("long")) notes.D = { tag: "LongUnbrokenMetadata".repeat(8), studentPercent: 0, note: `${screenshotNote}\n\n${"LongUnbrokenReadingToken".repeat(12)}` };

function Preview() {
  const [selected, setSelected] = React.useState(params.get("selected") || "C");
  const [eliminated, setEliminated] = React.useState(new Set<string>(params.has("restore") ? ["C"] : []));
  const [picks, setPicks] = React.useState(0);
  return <main style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#fff" }}>
    <header style={{ padding: "10px 20px", font: "13px 'Helvetica Neue', Helvetica, Arial, sans-serif", borderBottom: "1px solid #e2e0da", color: "#55594f" }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>LR explanation visual check</h1>
      <span data-picks={picks}>Local component preview · Answer selections: {picks}</span>
    </header>
    <OfficialQuestionPane question={question} displayNumber={19} selectedAnswer={selected}
      eliminatedAnswers={eliminated} isFlagged={false} answerRevealed correctAnswer="C"
      inlineNotes={notes} choiceNoteExpanders={!params.has("always")} choicesStayLive
      interactionLocked={params.has("locked")} fontScale={Number(params.get("scale") || 1)}
      highlights={[]} highlightMode="none"
      onAnswerSelect={(key) => { setSelected(key); setPicks((n) => n + 1); }}
      onEliminate={(key) => setEliminated((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; })}
      onToggleFlag={() => {}} onTextSelection={() => {}} onHighlightClick={() => {}} />
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);

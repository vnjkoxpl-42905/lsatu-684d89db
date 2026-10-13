import { useEffect, useRef, useState } from "react";
import { ANSWER_CHOICE_ITEMS, ANSWER_CHOICE_WORD_BANK, ABSTRACT_STEPS_HTML } from "../../data/answerChoiceDrill";
import { useApp } from "../../store/AppContext";
import { judgeAnswerChoice, type ChoiceJudgment } from "../../lib/answer-choice-coach";

function WordBank({ open = false }: { open?: boolean }) {
  return <details open={open || undefined} className="bg-brutal-paper border-2 border-brutal-ink p-5 my-5">
    <summary className="font-bold cursor-pointer">Word bank</summary>
    <dl className="mt-4 grid gap-4 sm:grid-cols-2">{ANSWER_CHOICE_WORD_BANK.map((entry) => <div key={entry.term}>
      <dt className="font-bold">{entry.term}</dt><dd className="mt-1 leading-relaxed">{entry.meaning}</dd>
    </div>)}</dl>
  </details>;
}

export function AnswerChoiceSteps({ onStart }: { onStart: () => void }) {
  return <section className="space-y-6">
    <div className="bg-brutal-paper border-2 border-brutal-ink p-6 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:mb-6 [&_li]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: ABSTRACT_STEPS_HTML.replace(/<h3>/g, "<h1>").replace(/<\/h3>/g, "</h1>") }} />
    <button className="brutal-btn bg-brutal-ink text-brutal-paper" onClick={onStart}>Continue to the word bank</button>
  </section>;
}

export default function AnswerChoiceDrill({ onDone }: { onDone: () => void }) {
  const { bootcampState, loading, markTranslatorComplete, markDrillComplete, markModuleDrillComplete } = useApp();
  const [intro, setIntro] = useState(true);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [text, setText] = useState("");
  const [judgment, setJudgment] = useState<ChoiceJudgment | null>(null);
  const [selfCheck, setSelfCheck] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [retryUsed, setRetryUsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const mounted = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const initialized = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;
    const next = ANSWER_CHOICE_ITEMS.findIndex((choice) => !bootcampState.completedDrills.includes(choice.id));
    if (next >= 0) setIndex(next);
  }, [loading, bootcampState.completedDrills]);
  useEffect(() => { sectionRef.current?.scrollIntoView({ block: "start" }); }, [intro, index]);
  const item = ANSWER_CHOICE_ITEMS[index];
  const words = item.stemText.split(/\s+/);
  const keywords = selected.map((i) => words[i]);

  async function submit() {
    setBusy(true);
    const result = await judgeAnswerChoice(item.id, keywords, text.trim());
    if (!mounted.current) return;
    setJudgment(result);
    setSelfCheck(!result);
    setBusy(false);
  }

  async function next() {
    setBusy(true);
    setSaveError("");
    const translated = await markTranslatorComplete(item.stemNumber, keywords, text.trim());
    const recorded = translated.ok && await markDrillComplete(item.id, "translation", judgment?.verdict === "got_it", undefined, undefined, selfCheck ? "self_check_unverified" : `coach_${judgment?.verdict}`);
    if (!translated.ok || !recorded || !recorded.ok) {
      setSaveError("Your progress could not be saved. Keep this page open and try again.");
      setBusy(false); return;
    }
    if (index === ANSWER_CHOICE_ITEMS.length - 1) {
      const saved = await markModuleDrillComplete("m3");
      if (!saved.ok) { setSaveError("Your completion could not be saved. Try again."); setBusy(false); return; }
      onDone(); return;
    }
    setIndex(index + 1); setSelected([]); setText(""); setJudgment(null); setSelfCheck(false); setRevealed(false); setRetryUsed(false); setBusy(false);
  }

  if (loading) return <p role="status">Loading your saved practice...</p>;
  if (intro) return <section ref={sectionRef} className="scroll-mt-24">
    <h1 className="text-3xl font-black mb-4">Put the answer choice into plain English</h1>
    <p className="text-lg leading-relaxed">First select the words that tell you what the answer means. Then explain the whole answer in your own words. Use the word bank whenever you need it.</p>
    <WordBank open />
    <button className="brutal-btn bg-brutal-ink text-brutal-paper" onClick={() => setIntro(false)}>{index === 0 ? "Start the first answer choice" : `Continue with answer choice ${index + 1}`}</button>
  </section>;

  return <section ref={sectionRef} className="space-y-6 scroll-mt-24">
    <p className="font-bold">Answer choice {index + 1} of {ANSWER_CHOICE_ITEMS.length}</p>
    <div role="progressbar" aria-label="Answer choices completed" aria-valuemin={0} aria-valuemax={15} aria-valuenow={index} className="h-2 bg-brutal-ink/10"><div className="h-full bg-brutal-ink" style={{ width: `${index / ANSWER_CHOICE_ITEMS.length * 100}%` }} /></div>
    <h1 className="text-2xl font-black">Select the keywords, then explain the answer</h1>
    <div className="bg-brutal-paper border-2 border-brutal-ink p-5 leading-loose text-lg" aria-label="Answer choice keywords">
      {words.map((word, i) => <button key={i} type="button" disabled={busy || Boolean(judgment) || selfCheck || revealed} aria-pressed={selected.includes(i)} onClick={() => setSelected(selected.includes(i) ? selected.filter((n) => n !== i) : [...selected, i].sort((a, b) => a - b))} className={`rounded px-1 mx-0.5 focus-visible:outline focus-visible:outline-2 ${selected.includes(i) ? "bg-brutal-ink text-brutal-paper" : "hover:bg-brutal-yellow"}`}>{word}</button>)}
    </div>
    <WordBank />
    <label className="block font-bold" htmlFor="choice-translation">What does the whole answer choice mean?</label>
    <textarea id="choice-translation" rows={4} maxLength={3000} value={text} disabled={busy || Boolean(judgment) || selfCheck || revealed} onChange={(event) => setText(event.target.value)} className="w-full border-2 border-brutal-ink bg-white p-4 rounded" />
    {!judgment && !selfCheck && !revealed && <button onClick={submit} disabled={busy || !selected.length || !text.trim()} className="brutal-btn bg-brutal-ink text-brutal-paper">{busy ? "Checking your meaning..." : "Check my meaning"}</button>}
    {judgment && <div role="status" className="border-2 border-brutal-ink bg-brutal-paper p-5"><h2 className="font-black text-xl">{{ got_it: "Got it", partly: "Partly", missed: "Missed" }[judgment.verdict]}</h2><p className="mt-2 leading-relaxed">{judgment.feedback}</p></div>}
    {selfCheck && <div role="status" className="bg-brutal-paper border-2 border-brutal-ink p-5"><h2 className="font-bold text-xl">Compare your meaning with ours</h2><p className="mt-2">The AI coach is unavailable. This answer has not been graded. Read our version and check each requirement. Your practice will be saved without a correctness score.</p><p className="mt-4 font-bold">{item.idealTranslation}</p><ul className="list-disc pl-5 mt-3">{item.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div>}
    {judgment && judgment.verdict !== "got_it" && !retryUsed && !revealed && <button className="brutal-btn" onClick={() => { setJudgment(null); setRetryUsed(true); }}>Try once more</button>}
    {(judgment || selfCheck) && !revealed && <button className="brutal-btn bg-brutal-ink text-brutal-paper" onClick={() => setRevealed(true)}>See the seven-step walkthrough</button>}
    {revealed && <>
      <div className="bg-brutal-paper border-2 border-brutal-ink p-6"><h2 className="text-2xl font-black mb-4">Apply the seven steps</h2><ol className="list-decimal pl-6 space-y-4 leading-relaxed">{item.steps.map((step, n) => <li key={n}>{step}</li>)}</ol></div>
      <div className="bg-brutal-paper border-2 border-brutal-ink p-6"><h2 className="text-2xl font-black mb-4">The breakdown</h2><div className="space-y-4 leading-relaxed [&_p]:my-4 [&_li]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_.underlined]:underline [&_.example]:border-l-4 [&_.example]:border-brutal-ink [&_.example]:pl-4 [&_.definition]:my-4" dangerouslySetInnerHTML={{ __html: item.breakdownHtml }} /></div>
      {saveError && <p role="alert">{saveError}</p>}
      <button className="brutal-btn bg-brutal-ink text-brutal-paper" disabled={busy} onClick={next}>{busy ? "Saving..." : index === 14 ? "Finish the drill" : "Next answer choice"}</button>
    </>}
  </section>;
}

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadAllIndexPassages, loadPassages } from "@/features/rc/lib/rcBank";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import ExamplePlayer from "./ExamplePlayer";
import { ArrowDown, ArrowUpRight, BookOpen, Check, Clock3, Headphones, History, Layers3 } from "lucide-react";
import RcTrainingDemo from "./RcTrainingDemo";
import "./RcTraining.css";
import RcRecallRunner, { formatClock } from "./RcRecallRunner";
import { recoverRcRecallBackups } from "./lib/backup";
import { createAttempt, listAttempts, summarizeRecordings, uploadRecording, type AttemptRow } from "./lib/attempts";
import {
  COMPARATIVE_NOTE, CUMULATIVE_STEPS, READ_STANDARD, RECAP_STANDARD, RC_RECALL_STEPS,
  SECTION_PICKER_NOTE, TIMING, VOICE_NOTE,
} from "./lib/instructions";
import {
  CUMULATIVE_EXAMPLES, INSTRUCTION_VIDEO, RC_RECALL_DEMO_CORRECTION, RC_RECALL_EXAMPLES, RC_RECALL_NOTE,
  SOURCE_NAME_MAP, instructionsVerified, mediaBase, mediaUrls,
} from "./lib/media";
import { buildRecallSections, sectionLabel, verifyLoadedSection, type RecallSection } from "./lib/sections";
import { MODE_LABEL, type ConfirmScope, type RecallMode } from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";


interface Running { mode: RecallMode; scope: ConfirmScope; passages: RcPassage[]; segmented: SegmentedPassage[]; attempt: AttemptRow }

const dateLabel = (v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function RcRecallPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<RecallMode>("rc_recall");
  const [scope, setScope] = useState<ConfirmScope>("all_read");
  const [preptest, setPreptest] = useState<number | null>(null);
  const [sectionNumber, setSectionNumber] = useState<number | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const base = mediaBase();

  const index = useQuery({ queryKey: ["rc-recall-index"], queryFn: loadAllIndexPassages, staleTime: Infinity });
  const sections = useMemo(() => buildRecallSections(index.data ?? []), [index.data]);
  const preptests = useMemo(() => [...new Set(sections.map((s) => s.preptest))], [sections]);
  const inTest = useMemo(() => sections.filter((s) => s.preptest === preptest), [sections, preptest]);
  const selected: RecallSection | undefined = inTest.find((s) => s.section === sectionNumber);

  useEffect(() => { if (preptest === null && preptests.length) setPreptest(preptests[0]); }, [preptests, preptest]);
  useEffect(() => { if (inTest.length && !inTest.some((s) => s.section === sectionNumber)) setSectionNumber(inTest[0].section); }, [inTest, sectionNumber]);

  const history = useQuery({
    queryKey: ["rc-recall-history", user?.id],
    enabled: !!user,
    queryFn: () => listAttempts(user!.id),
  });

  // Upload any recording this device still holds from an earlier session.
  useEffect(() => {
    if (!user) return;
    void recoverRcRecallBackups(user.id, ({ run, blob }) => uploadRecording({
      studentId: run.studentId, attemptId: run.attemptId, recapId: run.recapId, path: run.path,
      blob, mimeType: run.mimeType, durationMs: run.durationMs ?? null,
    })).then((r) => { if (r.recovered) void queryClient.invalidateQueries({ queryKey: ["rc-recall-history", user.id] }); });
  }, [user, queryClient]);

  const start = async () => {
    if (!user || !selected) return;
    setStarting(true);
    setStartError(null);
    try {
      const loaded = await loadPassages(selected.passageIds);
      const { passages, segmented } = verifyLoadedSection(selected, loaded);
      const attempt = await createAttempt({
        studentId: user.id, mode, preptest: selected.preptest, section: selected.section,
        passageIds: selected.passageIds, confirmationScope: mode === "rc_recall" ? scope : null,
      });
      setRunning({ mode, scope, passages, segmented, attempt });
    } catch (err) {
      setStartError(err instanceof Error && err.message
        ? `This section could not be started: ${err.message} Nothing was saved.`
        : "This section could not be started. Nothing was saved.");
    } finally { setStarting(false); }
  };

  if (running && user) {
    return <RcRecallRunner {...running} studentId={user.id} onExit={() => {
      setRunning(null);
      void queryClient.invalidateQueries({ queryKey: ["rc-recall-history", user.id] });
    }} />;
  }

  const instructionUrls = instructionsVerified() ? mediaUrls(INSTRUCTION_VIDEO.stem) : null;
  const examples = mode === "rc_recall" ? RC_RECALL_EXAMPLES : CUMULATIVE_EXAMPLES;
  const timing = TIMING[mode];

  return <main className="rct-page" data-reading-activity="rc-recall">
    <header className="rct-hero">
      <div className="rct-hero-copy">
        <span className="rct-hero-tag"><BookOpen size={15} aria-hidden="true" /> Reading comprehension</span>
        <h1>RC Training</h1>
        <p className="rct-hero-lead">Read closely.<br /> Retell completely.</p>
        <p className="rct-hero-description">Build the passage in your own words, one paragraph at a time. Keep the details. Keep the connections.</p>
        <div className="rct-hero-actions">
          <a href="#rc-recall-start" className="rct-button rct-button-light">Choose a section <ArrowDown size={16} aria-hidden="true" /></a>
          <a href="#rc-recall-how" className="rct-hero-link">Learn the method</a>
        </div>
        <div className="rct-hero-foot"><span>4 passages, in order</span><span>Your recall is not graded</span></div>
      </div>
      <RcTrainingDemo key={mode} mode={mode} />
    </header>

    <div className="rct-content">
      <section className="rct-method-section" aria-labelledby="rct-method-title">
        <div className="rct-section-heading"><div><h2 id="rct-method-title">Two ways to train.</h2><p>The same standard of recall. A different way to practise it.</p></div><span className="rct-side-note">Choose your method</span></div>
        <fieldset className="rct-methods">
          <legend className="sr-only">Choose a method</legend>
          {(["rc_recall", "cumulative_recall"] as RecallMode[]).map((m) => <label key={m} className="rct-method" data-selected={mode === m}>
            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
            <span className="rct-method-top"><span className="rct-method-icon">{m === "rc_recall" ? <BookOpen size={21} aria-hidden="true" /> : <Layers3 size={21} aria-hidden="true" />}</span><span className="rct-selected-indicator" aria-hidden="true">{mode === m && <Check size={15} />}</span></span>
            <span className="rct-method-title">{MODE_LABEL[m]}</span>
            <span className="rct-method-description">{m === "rc_recall" ? "Recall each paragraph, then bring the text back to confirm your translation." : "Recall each paragraph, then retell everything read so far with the text hidden."}</span>
            <span className="rct-method-diagram" aria-hidden="true"><span>Read</span><i>→</i><span>Recall</span><i>→</i><span>{m === "rc_recall" ? "Check the text" : "Retell together"}</span></span>
            <span className="rct-method-bottom"><Clock3 size={14} aria-hidden="true" />{m === "rc_recall" ? "About 6 min per passage" : "8 min silent · 12 min out loud"}<span>{mode === m ? "Selected" : "Select method"}</span></span>
          </label>)}
        </fieldset>
      </section>

      <section className="rct-learn" aria-labelledby="rc-recall-how" id="rct-learn">
        <div className="rct-section-heading"><div><h2 id="rc-recall-how">How {MODE_LABEL[mode]} works</h2><p>A complete translation in your own words, with every detail connected.</p></div></div>
        <ol className="rct-process">
          <li><span className="rct-process-number">1</span><h3>Read &amp; translate</h3><p>Read one paragraph. Translate all of it into your own words, then quip.</p></li>
          <li><span className="rct-process-number">2</span><h3>Look away &amp; recall</h3><p>{mode === "rc_recall" ? "With the text hidden, silently retell the paragraph. Include the full translation." : "With the text hidden, retell the paragraph you just read. Include the full translation."}</p></li>
          <li><span className="rct-process-number">3</span><h3>{mode === "rc_recall" ? "Check & continue" : "Connect & repeat"}</h3><p>{mode === "rc_recall" ? "Briefly confirm your translation against the text read so far. Then read the next paragraph." : "From paragraph 2 onward, retell everything read so far in order. Then read the next paragraph."}</p></li>
        </ol>
        <div className="rct-learn-footer"><p>Keep names, dates, lists, and the reasoning between them. Tell the whole story in your own words.</p><button type="button" className="rct-text-button" aria-expanded={showInstructions} aria-controls="rct-full-instructions" onClick={() => setShowInstructions(!showInstructions)}>{showInstructions ? "Close full instructions" : "Read the full instructions"}<ArrowDown size={15} aria-hidden="true" /></button></div>
        <div id="rct-full-instructions" hidden={!showInstructions} className="rct-full-instructions">
          <p className="rct-source-map">The videos call these methods Decaf and Cappuccino: {SOURCE_NAME_MAP.map((m) => `${m.source} = ${m.app}`).join("; ")}.</p>
          <div className="rct-instruction-columns"><div><h3>The standards</h3><ul>{READ_STANDARD.map((t) => <li key={t}>{t}</li>)}{RECAP_STANDARD.map((t) => <li key={t}>{t}</li>)}</ul></div><div><h3>The steps</h3><ol>{(mode === "rc_recall" ? RC_RECALL_STEPS : CUMULATIVE_STEPS).map((t) => <li key={t}>{t}</li>)}</ol></div></div>
          <p>{VOICE_NOTE}</p><p>{COMPARATIVE_NOTE}</p>
        </div>
        {instructionUrls && <div className="rct-instruction-video"><button type="button" className="rct-button rct-button-secondary" aria-expanded={showVideo} onClick={() => setShowVideo((v) => !v)}>{showVideo ? "Hide instructions video" : "Watch Instructions"}</button>
          {showVideo && <ExamplePlayer base={base} heading={INSTRUCTION_VIDEO.title} clip={{ id: "instructions", mode, kind: "example", stem: INSTRUCTION_VIDEO.stem, title: INSTRUCTION_VIDEO.title, sourceTitle: "How and Why to Do Decaf RC Translation and How and Why to Do Cappuccino RC Translation" }} />}
        </div>}
      </section>

      <section className="rct-start" aria-labelledby="rc-recall-start">
        <div className="rct-start-intro"><span className="rct-section-icon"><BookOpen size={23} aria-hidden="true" /></span><h2 id="rc-recall-start">Start a section</h2><p>{SECTION_PICKER_NOTE}</p><div className="rct-timing"><Clock3 size={17} aria-hidden="true" /><div><strong>{timing.section}</strong><span>Section timing guide, not a limit</span></div></div></div>
        <div className="rct-start-form">
          <div className="rct-form-method"><span>Your method</span><strong>{MODE_LABEL[mode]}</strong></div>
          {index.isPending && <div className="rct-loading" role="status">Loading sections…</div>}
          {index.isError && <p role="alert">The section list could not load. Try reloading the page.</p>}
          {!index.isPending && !index.isError && !sections.length && <p role="status">No complete RC sections are available yet.</p>}
          {sections.length > 0 && <div className="rct-section-fields">
            <div className="rct-section-field">
              <label htmlFor="rct-preptest">PrepTest</label>
              <Select value={preptest === null ? "" : String(preptest)} onValueChange={(value) => setPreptest(Number(value))}>
                <SelectTrigger id="rct-preptest" className="rct-select-trigger"><SelectValue placeholder="Choose a PrepTest" /></SelectTrigger>
                <SelectContent className="rct-section-menu" position="popper" align="start" sideOffset={4} collisionPadding={12}>
                  {preptests.map((p) => <SelectItem key={p} value={String(p)} className="rct-section-option">PT{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rct-section-field">
              <label htmlFor="rct-section">Section</label>
              <Select value={sectionNumber === null ? "" : String(sectionNumber)} onValueChange={(value) => setSectionNumber(Number(value))}>
                <SelectTrigger id="rct-section" className="rct-select-trigger"><SelectValue placeholder="Choose a section" /></SelectTrigger>
                <SelectContent className="rct-section-menu" position="popper" align="start" sideOffset={4} collisionPadding={12}>
                  {inTest.map((s) => <SelectItem key={s.section} value={String(s.section)} className="rct-section-option">Section {s.section}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>}
          {mode === "rc_recall" && <fieldset className="rct-scope"><legend>What you check</legend><label><input type="radio" name="scope" checked={scope === "all_read"} onChange={() => setScope("all_read")} /> Everything read so far</label><label><input type="radio" name="scope" checked={scope === "current_sub_passage"} onChange={() => setScope("current_sub_passage")} /> Only the current passage (A or B in a passage pair)</label></fieldset>}
          <button type="button" className="rct-button rct-button-primary rct-start-button" disabled={!selected || starting} onClick={() => void start()}>{starting ? "Starting…" : "Start section"}<ArrowUpRight size={18} aria-hidden="true" /></button>
          {startError && <p role="alert" className="rct-error">{startError}</p>}
          <p className="rct-save-note"><Headphones size={14} aria-hidden="true" />Your time and spoken recordings are saved. Your recall is not graded.</p>
        </div>
      </section>

      {base && <section className="rct-examples" aria-labelledby="rc-recall-examples"><div className="rct-section-heading"><div><h2 id="rc-recall-examples">{MODE_LABEL[mode]} worked examples</h2><p>Watch the method unfold, then try a full section yourself.</p></div></div>
        {mode === "rc_recall" && <div className="rct-example-note"><h3>Read this before the examples</h3><ul>{RC_RECALL_DEMO_CORRECTION.map((t) => <li key={t}>{t}</li>)}</ul><ExamplePlayer clip={RC_RECALL_NOTE} /></div>}
        <div className="rct-example-grid">{examples.map((clip) => <ExamplePlayer key={clip.id} clip={clip} />)}</div>
      </section>}

      <section className="rct-history" aria-labelledby="rc-recall-history"><div className="rct-section-heading"><div><h2 id="rc-recall-history">Your attempts</h2><p>Each attempt stays here. Starting again never replaces your earlier work.</p></div><History size={23} aria-hidden="true" /></div>
        {history.isPending ? <div role="status" className="rct-loading">Loading your attempts…</div>
          : history.isError ? <p role="alert" className="rct-history-empty">Your attempts could not load. Your saved work has not changed.</p>
            : !history.data?.attempts.length ? <div className="rct-history-empty"><span className="rct-empty-icon"><BookOpen size={23} aria-hidden="true" /></span><div><h3>Your first section starts here.</h3><p>Choose a method and a section above. Your time and recording status will appear here after you practise.</p></div></div>
              : <ul className="rct-attempts">{history.data.attempts.map((a) => {
                const own = history.data.recaps.filter((r) => r.attempt_id === a.id);
                const sum = summarizeRecordings(own);
                return <li key={a.id}><div><h3>{sectionLabel(a)}</h3><p>{MODE_LABEL[a.mode]}{a.mode === "rc_recall" && a.confirmation_scope ? ` · Confirmation: ${a.confirmation_scope === "all_read" ? "all text so far" : "current sub-passage"}` : ""}</p></div><div className="rct-attempt-meta"><span className="rct-attempt-state" data-completed={a.completed}>{a.finished_at ? a.completed ? "Completed" : "Ended early" : "Not finished"}</span><span>{dateLabel(a.started_at)}{a.finished_at ? ` · ${formatClock(a.elapsed_seconds ?? 0)}` : ""}</span><span>{sum.spoken ? `${sum.saved} of ${sum.spoken} spoken recaps saved${sum.failed ? `, ${sum.failed} failed` : ""}` : "No spoken recaps"}</span></div></li>;
              })}</ul>}
      </section>
    </div>
  </main>;
}

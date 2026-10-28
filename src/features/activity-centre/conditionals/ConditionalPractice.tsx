import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Link2, GitBranch, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useStudentActivities } from "../hooks/useStudentActivities";
import { useConditionalAssignments } from '@/bootcamps/conditionals/useConditionalAssignments';
import { conditionalActivitySearch, normalizeConditionalActivityConfig } from '@/bootcamps/conditionals/activityRegistry';
import { CONDITIONAL_QUESTIONS, type ConditionalMode, type ConditionalQuestion } from "./content";
import { ConditionalNotation } from "./ConditionalNotation";
import { DrillEntrance } from "./DrillEntrance";
import { ConditionalScene } from "./ConditionalScene";
import "./drill-entrance.css";
import { cachePracticeRun, createPracticeRun, isConditionalRephraseRun, loadPracticeRuns, practiceSaveMessage, readCachedRuns, syncPendingPractice, syncPracticeRun, type PracticeMode, type PracticeRun } from "./practiceStore";
import "../activity-centre.css";
import "./conditionals.css";

const GENERAL_ID = "7946f46b-e7f8-4c60-b405-4ece9c409deb";
const WORLDS = [
  { id: "general", title: "General Conditionals", icon: BookOpen, description: "Translate conditional statements." },
  { id: "linking", title: "Linking", icon: GitBranch, description: "" },
  { id: "missing-link", title: "Missing Link", icon: Link2, description: "Find the missing conditional." },
  { id: "must-be-true", title: "Must Be True", icon: Check, description: "Identify what must follow." },
] as const;
const titleFor = (mode: PracticeMode) => WORLDS.find(w => w.id === mode)?.title ?? mode;

export default function ConditionalPractice() {
  const { user } = useAuth();
  const { is_admin } = useUserPermissions();
  const { assignments, loading, error } = useStudentActivities();
  const courseAssignments = useConditionalAssignments(user?.id, !!is_admin);
  const [params] = useSearchParams();
  const general = assignments.find(a => a.activity_id === GENERAL_ID && a.id === params.get("assignment"))
    ?? assignments.find(a => a.activity_id === GENERAL_ID);
  const preview = is_admin && params.get("preview") === "general";
  const courseGrant = courseAssignments.data?.find(grant => grant.target.scope === 'course')
    ?? courseAssignments.data?.find(grant => grant.target.scope === 'activity' && grant.target.activityId === 'rephrase');
  const courseConfig = courseGrant ? normalizeConditionalActivityConfig({ activity: 'rephrase', ...(courseGrant.target.scope === 'activity' ? courseGrant.target.activitySettings : {}) }) : null;
  const courseParams = courseConfig ? conditionalActivitySearch(courseConfig) : null;
  if (courseParams && courseGrant) { courseParams.set('assignment', courseGrant.id); if (courseGrant.target.courseEdition) courseParams.set('edition', courseGrant.target.courseEdition); }
  const courseUrl = courseParams ? `/bootcamp/conditionals/centre/rephrase?${courseParams}` : undefined;
  return user ? <ConditionalPracticeRoom key={user.id} userId={user.id}
    generalUrl={preview ? `/activities/preview/${GENERAL_ID}` : general ? `/activities/${general.id}` : is_admin ? `/activities/preview/${GENERAL_ID}` : courseUrl}
    generalStatus={loading || courseAssignments.isLoading ? "Loading…" : error || courseAssignments.error ? "Could not load this drill. Please reload." : "Not assigned yet."} /> : null;
}

/** Resume through the current authorized entry. Saved sourceUrl is provenance, never a navigation target. */
export function generalPracticeResumeUrl(run: PracticeRun, currentUrl?: string): string | undefined {
  if (!currentUrl || !isConditionalRephraseRun(run)) return undefined;
  const url = new URL(currentUrl, 'https://conditional.local');
  if (url.origin !== 'https://conditional.local') return undefined;
  url.searchParams.set('practiceRun', run.id);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Dev-only lab also uses the real UI and local persistence, never student rows. */
export function ConditionalPracticeLab() {
  return <ConditionalPracticeRoom userId="conditional-development-preview" localOnly generalUrl="/src/dev/conditional-paper-preview.html" />;
}

export function ConditionalPracticeRoom({ userId, generalUrl, generalStatus, localOnly = false, embeddedMode, selectedQuestionIds, allowedQuestionIds, backUrl, selectionLabel }: {
  userId: string; generalUrl?: string; generalStatus?: string; localOnly?: boolean;
  embeddedMode?: ConditionalMode; selectedQuestionIds?: readonly string[]; allowedQuestionIds?: readonly string[]; backUrl?: string; selectionLabel?: string;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [runs, setRuns] = useState<PracticeRun[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState(localOnly ? "Preview: saved on this device" : "Loading saved practice…");
  const [mode, setMode] = useState<ConditionalMode | null>(embeddedMode ?? null);
  const [level, setLevel] = useState<"all" | "variables" | "words">("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const alive = useRef(true);
  const syncCount = useRef(0);
  const syncFailure = useRef<string | null>(null);
  const authorizedRuns = runs.filter(r => (!embeddedMode || r.mode === embeddedMode) && (!allowedQuestionIds || r.questions.every(question => allowedQuestionIds.includes(question.id))));
  const run = authorizedRuns.find(r => r.id === params.get("run"));
  const availableQuestions = CONDITIONAL_QUESTIONS.filter(q => (!selectedQuestionIds || selectedQuestionIds.includes(q.id)) && (!allowedQuestionIds || allowedQuestionIds.includes(q.id)));
  const visibleRuns = authorizedRuns;
  const RoomSurface = embeddedMode ? 'section' : 'main';
  const QuestionHeading = embeddedMode ? 'h2' : 'h1';
  const writeParams = (change: Record<string, string>) => {
    if (!embeddedMode) { setParams(change); return; }
    const next = new URLSearchParams(params);
    next.delete("run");
    for (const [key, value] of Object.entries(change)) next.set(key, value);
    setParams(next);
  };
  const selectedWorld = WORLDS.find(w => w.id === mode);
  useEffect(() => { window.scrollTo(0, 0); }, [mode]);

  const refresh = useCallback(async () => {
    try {
      setRuns(readCachedRuns(userId));
      setLoaded(true);
    } catch (error) {
      if (alive.current) { setLoaded(true); setStorageError(error instanceof Error ? error.message : "Could not read saved practice on this device."); }
      return;
    }
    if (localOnly) return;
    let syncError: unknown;
    try {
      await syncPendingPractice(userId);
    } catch (error) { syncError = error; }
    try {
      const saved = await loadPracticeRuns(userId);
      if (alive.current) { setRuns(saved); setSaveStatus(syncError ? practiceSaveMessage(syncError) : "Saved to your account"); }
    } catch (error) {
      if (alive.current) setSaveStatus(practiceSaveMessage(error));
    }
  }, [userId, localOnly]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    const online = () => void refresh();
    window.addEventListener("online", online);
    return () => { alive.current = false; window.removeEventListener("online", online); };
  }, [refresh]);

  const persist = (next: PracticeRun): boolean => {
    try {
      cachePracticeRun(next);
      setRuns(previous => [next, ...previous.filter(r => r.id !== next.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setStorageError(null);
    } catch (error) {
      setStorageError(practiceSaveMessage(error));
      return false;
    }
    if (!localOnly) {
      if (syncCount.current === 0) syncFailure.current = null;
      syncCount.current++;
      setSaveStatus("Saved on this device; syncing…");
      void syncPracticeRun(userId, next.id).catch(error => { syncFailure.current = practiceSaveMessage(error); })
        .finally(() => {
          syncCount.current--;
          if (alive.current && syncCount.current === 0) setSaveStatus(syncFailure.current ?? "Saved to your account");
        });
    }
    return true;
  };
  const update = (change: Partial<PracticeRun>) => run && persist({ ...run, ...change, updatedAt: new Date().toISOString() });
  const start = (world: ConditionalMode, questions?: ConditionalQuestion[]) => {
    const selected = questions ?? availableQuestions.filter(q => q.mode === world && (level === "all" || q.level === level));
    if (!selected.length) return;
    try {
      const next = createPracticeRun(userId, world, selected);
      if (persist(next)) { writeParams({ run: next.id }); setMode(null); setReviewId(null); }
    } catch { setStorageError("This browser cannot save a new session. Check device storage before starting."); }
  };
  const returnToHub = () => { writeParams({}); setMode(embeddedMode ?? null); setReviewId(null); };
  const review = authorizedRuns.find(r => r.id === reviewId);
  const current = run?.questions[run.position];
  const questionAnswers = run && current ? run.answers.filter(a => a.questionId === current.id) : [];
  const last = questionAnswers.at(-1);
  const resolved = !!last && (last.verdict === "correct" || last.revealed || questionAnswers.length >= 2);

  const submit = (reveal = false) => {
    if (!run || !current || (!run.selection && !reveal) || run.stage === "feedback" && !reveal) return;
    const selected = current.choices.find(c => c.id === run.selection);
    const answer = { id: crypto.randomUUID(), questionId: current.id, choiceId: selected?.id,
      text: reveal ? "Answer revealed" : selected!.text,
      verdict: reveal ? null : selected!.id === current.correctChoiceId ? "correct" as const : "incorrect" as const,
      attempt: questionAnswers.length + 1, revealed: reveal, at: new Date().toISOString() };
    update({ answers: [...run.answers, answer], stage: "feedback" });
  };

  return <RoomSurface className={`conditional-room activity-centre ${embeddedMode ? "conditional-room-embedded" : ""} ${!run && !review ? "conditional-lobby" : ""}`}>
    <div className="conditional-shell">
      <header className="conditional-topbar">
        {embeddedMode && backUrl ? <Link to={backUrl} className="conditional-back"><ArrowLeft size={16} /> Back to conditional practice</Link> : run || mode || review ? <button onClick={returnToHub} className="conditional-back"><ArrowLeft size={16} /> Conditional drills</button>
          : <Link to="/activities" className="conditional-back"><ArrowLeft size={16} /> Activities</Link>}
        <div className="conditional-save" role="status">{saveStatus}
          {!localOnly && saveStatus !== "Saved to your account" && !saveStatus.includes("syncing") && <button onClick={() => void refresh()}>Retry sync</button>}</div>
      </header>
      {storageError && <p role="alert" className="conditional-error">{storageError}</p>}
      {embeddedMode && selectionLabel && <p className="conditional-save">{selectionLabel}</p>}
      {embeddedMode && !availableQuestions.some(question => question.mode === embeddedMode) && !run && <p role="alert" className="conditional-error">No questions match this selection. Choose another topic to begin.</p>}
      {!loaded ? <p>Loading saved practice…</p> : params.get("run") && !run ? <section className="conditional-panel"><h1>Session not available</h1><p>Check your connection and account, then retry loading your saved practice.</p><button onClick={() => void refresh()}>Retry</button></section>
      : review ? <PracticeReview run={review} onBack={() => setReviewId(null)} />
      : run && run.stage === "done" ? <section className="conditional-panel conditional-summary">
          <span className="conditional-eyebrow">{titleFor(run.mode)}</span><h1>Practice complete</h1>
          <p>{firstTryCorrect(run)} of {run.questions.length} correct on the first attempt.</p>
          <div className="conditional-actions"><button className="conditional-primary" onClick={() => setReviewId(run.id)}>Review answers</button>
          <button onClick={() => start(run.mode as ConditionalMode, run.questions)}>Practice again</button><button onClick={returnToHub}>Choose a drill</button></div>
        </section>
      : run && current ? <>
        <div className="conditional-heading"><span className="conditional-eyebrow">{titleFor(run.mode)}</span><span>Question {run.position + 1} of {run.questions.length}</span></div>
        <div className="conditional-progress"><span style={{ width: `${run.position / run.questions.length * 100}%` }} /></div>
        <div className="conditional-question-grid">
          <section className="conditional-premises"><span className="conditional-eyebrow">Given</span>
            {current.premises.map((p, i) => <div className="conditional-premise" key={i}><span className="conditional-premise-number">{i + 1}</span><p><ConditionalNotation text={p} /></p></div>)}
            {current.conclusion && <div className="conditional-target"><span className="conditional-eyebrow">Conclusion</span><p><ConditionalNotation text={current.conclusion} /></p></div>}
            <p className="conditional-paper-note">Diagram the relationships on paper before opening the choices.</p>
          </section>
          <section className="conditional-panel conditional-answer"><QuestionHeading>{run.mode === "must-be-true" ? "What must be true?" : "What's the missing link?"}</QuestionHeading>
            <p>{run.mode === "must-be-true" ? "Choose the statement that follows from the given rules and facts." : "Choose the additional conditional that makes the conclusion follow."}</p>
            {run.stage === "paper" ? <div className="conditional-paper-step"><BookOpen size={28} /><h2>Work it out on paper</h2><p>{run.mode === "must-be-true" ? "Follow the arrows. Keep track of what the facts establish." : "Start at the conclusion's sufficient condition. Find the gap before its necessary condition."}</p><button className="conditional-primary" onClick={() => update({ stage: "choices" })}>I've diagrammed it <ArrowRight size={16} /></button></div>
            : <>
              <div role="radiogroup" aria-label="Answer choices" className="conditional-choices">{current.choices.map((choice, i) => <label key={choice.id} className={`conditional-choice ${run.selection === choice.id ? "selected" : ""}`}>
                <input type="radio" name={`answer-${current.id}`} checked={run.selection === choice.id} disabled={run.stage === "feedback"} onChange={() => update({ selection: choice.id })} />
                <span className="conditional-choice-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span><ConditionalNotation text={choice.text} /></span>
              </label>)}</div>
              {run.stage === "choices" && <button className="conditional-primary" disabled={!run.selection} onClick={() => submit()}>Check answer</button>}
              {run.stage === "feedback" && last && <div role="status" className="conditional-feedback">
                <h2>{last.revealed ? "Answer revealed" : last.verdict === "correct" ? "Correct" : "Not yet"}</h2>
                {resolved ? <><div className="conditional-credited"><span className="conditional-eyebrow">{run.mode === "must-be-true" ? "What follows" : "The missing link"}</span><p><ConditionalNotation text={current.choices.find(c => c.id === current.correctChoiceId)!.text} /></p></div>
                  <ConditionalExplanation text={current.explanation} />
                  <button className="conditional-primary" onClick={() => update(run.position + 1 === run.questions.length ? { stage: "done" } : { position: run.position + 1, stage: "paper", selection: "" })}>{run.position + 1 === run.questions.length ? "Finish practice" : "Next question"}<ArrowRight size={16} /></button></>
                  : <><p>{run.mode === "must-be-true" ? "Check which conditions the facts establish. A conditional alone does not establish that its starting condition occurred." : "Check the direction and every negative condition. The proposed link must work whenever the conclusion's starting condition holds."}</p><div className="conditional-actions"><button className="conditional-primary" onClick={() => update({ stage: "choices", selection: "" })}>Try again</button><button onClick={() => submit(true)}>Show answer</button></div></>}
              </div>}
            </>}
          </section>
        </div>
      </> : mode ? <><DrillEntrance mode={mode} headingLevel={embeddedMode ? 2 : 1} title={embeddedMode === 'missing-link' ? 'Missing Links' : selectedWorld?.title ?? ""} onStart={() => start(mode)} questionCount={availableQuestions.filter(q => q.mode === mode && (level === "all" || q.level === level)).length}>
        {!embeddedMode && <label className="conditional-select">Practice with <select value={level} onChange={e => setLevel(e.target.value as typeof level)}><option value="all">All questions</option><option value="variables">Variables</option><option value="words">Words and phrases</option></select></label>}
      </DrillEntrance>{embeddedMode && <section className="conditional-history"><h2><History size={20} /> Practice history</h2>{visibleRuns.length ? visibleRuns.map(saved => <div key={saved.id} className="conditional-history-row"><div><strong>{titleFor(saved.mode)}</strong><span>{saved.createdAt.slice(0, 10)} · {saved.stage === "done" ? "Completed" : "In progress"}</span></div><button onClick={() => saved.stage === "done" ? setReviewId(saved.id) : writeParams({ run: saved.id })}>{saved.stage === "done" ? "Review" : "Continue"}</button></div>) : <p>No practice sessions yet.</p>}</section>}</>
      : <>
        <header className="conditional-title"><h1>Conditional<br /><span>Reasoning</span></h1><div className="conditional-hero-diagram" aria-hidden="true"><span>A</span><i>&rarr;</i><span>B</span><i>&rarr;</i><span>C</span><div className="conditional-hero-proof">A <i>&rarr;</i> C</div></div></header>
        <div className="conditional-world-grid">{WORLDS.map((world) => {
          const unfinished = runs.find(r => r.mode === world.id && r.stage !== "done");
          return <section className="conditional-world" data-mode={world.id} key={world.id}><div className="conditional-card-art"><ConditionalScene mode={world.id} step={2} compact /></div><div className="conditional-world-top"><world.icon size={18} /><h2>{world.title}</h2></div>{world.description && <p>{world.description}</p>}
            {world.id === "general" ? <>{generalUrl ? <button className="conditional-primary" onClick={() => localOnly ? window.location.assign(generalUrl) : navigate(generalUrl)}>Open drill <ArrowRight size={16} /></button> : generalStatus && <p className="conditional-unavailable">{generalStatus}</p>}
              {unfinished?.general && <button disabled={!generalPracticeResumeUrl(unfinished, generalUrl)} onClick={() => { const target = generalPracticeResumeUrl(unfinished, generalUrl); if (target) navigate(target); }}>Continue saved practice</button>}</>
              : <><button className="conditional-primary" onClick={() => { setMode(world.id); setLevel("all"); }}>Open drill <ArrowRight size={16} /></button>
                {unfinished && <button onClick={() => setParams({ run: unfinished.id })}>Continue question {unfinished.position + 1}</button>}</>}
          </section>;
        })}</div>
        <section className="conditional-history"><h2><History size={20} /> Practice history</h2>
          {runs.length === 0 ? <p>No practice sessions yet.</p> : runs.map(saved => <div className="conditional-history-row" key={saved.id}><div><strong>{titleFor(saved.mode)}</strong><span>{saved.createdAt.slice(0, 10)} · {saved.stage === "done" ? "Completed" : "In progress"} · {saved.answers.length} recorded responses</span></div>
            <button disabled={!!saved.general && !generalPracticeResumeUrl(saved, generalUrl)} onClick={() => { if (saved.general) { const target = generalPracticeResumeUrl(saved, generalUrl); if (target) navigate(target); } else if (saved.stage === 'done') setReviewId(saved.id); else setParams({ run: saved.id }); }}>{saved.stage === "done" ? "Review" : "Continue"}<ArrowRight size={16} /></button></div>)}
        </section>
      </>}
    </div>
  </RoomSurface>;
}

function firstTryCorrect(run: PracticeRun) {
  return run.questions.filter(q => run.answers.find(a => a.questionId === q.id)?.verdict === "correct").length;
}
function PracticeReview({ run, onBack }: { run: PracticeRun; onBack: () => void }) {
  return <section className="conditional-review"><button className="conditional-back" onClick={onBack}><ArrowLeft size={16} /> Back</button><h1>{titleFor(run.mode)}: session review</h1><p>{run.createdAt.slice(0, 10)} · {firstTryCorrect(run)} correct on the first answer</p>
    {run.questions.map((q, i) => <details key={q.id} className="conditional-panel"><summary>Question {i + 1} · {run.answers.find(a => a.questionId === q.id)?.verdict === "correct" ? "Correct first time" : "Review"}</summary>
      {q.premises.map((p, j) => <p key={j}><ConditionalNotation text={p} /></p>)}{q.conclusion && <p>Conclusion: <ConditionalNotation text={q.conclusion} /></p>}
      {run.answers.filter(a => a.questionId === q.id).map(a => <p key={a.id}>Attempt {a.attempt}: <ConditionalNotation text={a.text} /> · {a.revealed ? "Revealed" : a.verdict}</p>)}
      <p>Answer: <ConditionalNotation text={q.choices.find(c => c.id === q.correctChoiceId)!.text} /></p><ConditionalExplanation text={q.explanation} />
    </details>)}
  </section>;
}

/** Authored line breaks and choice explanations remain readable without interpreting HTML. */
function ConditionalExplanation({ text }: { text: string }) {
  const sections: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^-\s+/.test(line);
    const last = sections.at(-1);
    if (bullet && last?.list) last.lines.push(line.replace(/^-\s+/, ''));
    else sections.push({ list: bullet, lines: [bullet ? line.replace(/^-\s+/, '') : line] });
  }
  return <div className="conditional-explanation">{sections.map((section, index) => section.list
    ? <ul key={index}>{section.lines.map((line, position) => <li key={position}><ConditionalNotation text={line} /></li>)}</ul>
    : <p key={index}><ConditionalNotation text={section.lines[0]} /></p>)}</div>;
}

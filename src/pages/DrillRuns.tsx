import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { loadStandaloneDrillRun, markDrillRunReviewed, type StandaloneDrillRun } from "@/lib/drillRunLedger";
import { drillQuestionIds, drillReviewProgress, questionOutcome } from "@/lib/drillReview";
import { launchDrill } from "@/lib/drillLaunch";
import { questionBank } from "@/lib/questionLoader";
import { LrChoiceNote } from "@/components/drill/shared/LrChoiceNote";
import { lrRunProvenanceLabel } from "@/lib/lrRunProvenance";

const OUTCOME_LABEL = { correct: "Correct", incorrect: "Incorrect", unanswered: "Unanswered" } as const;

function ScoreRing({ percent, label }: { percent: number; label: string }) {
  return (
    <span role="img" aria-label={label} className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(hsl(var(--foreground)) ${percent}%, hsl(var(--border)) 0)` }}>
      <span className="grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full bg-card text-2xl font-bold tabular-nums">{percent}<small className="ml-0.5 text-xs font-semibold text-muted-foreground">%</small></span>
    </span>
  );
}

function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-2 w-full overflow-hidden rounded-full bg-border">
      <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: total === 0 ? "100%" : `${(done / total) * 100}%` }} />
    </div>
  );
}

export default function DrillRuns() {
  const { runId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: bankLoading, error: bankError } = useQuestionBank();
  const [run, setRun] = React.useState<StandaloneDrillRun | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewed, setReviewed] = React.useState<ReadonlySet<string>>(new Set());
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [filterChoice, setFilterChoice] = React.useState<"missed" | "all" | null>(null);
  const detailRefs = React.useRef(new Map<string, HTMLDetailsElement>());
  const view = searchParams.get("view") === "review" ? "review" : "results";
  const jumpTo = searchParams.get("q");

  React.useEffect(() => {
    if (!user?.id || !runId) {
      setLoading(false);
      setError("Sign in to view this drill.");
      return;
    }
    let active = true;
    setRun(null);
    setLoading(true);
    setError(null);
    void loadStandaloneDrillRun(user.id, runId).then(
      (loaded) => { if (active) setRun(loaded); },
      (failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : "This drill could not be loaded."); },
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, runId]);

  // What the student has opened so far comes from the saved sitting.
  React.useEffect(() => {
    setReviewed(new Set(run?.reviewed_qids ?? []));
    setFilterChoice(null);
    setSaveError(null);
  }, [run]);

  const completed = run?.session.status === "completed";
  const adaptive = run?.source_key === "drill::adaptive";
  const guided = !!run?.source_key.startsWith("guided::");
  const attempts = run?.session.attempts ?? [];
  // Adaptive and early-ended guided queues include questions never attempted.
  const reviewQids = run ? drillQuestionIds(run) : [];
  const progress = run ? drillReviewProgress(run, reviewed) : null;
  const missed = progress?.missed ?? [];
  const correct = reviewQids.filter((qid) => run && questionOutcome(run, qid) === "correct").length;
  const percent = reviewQids.length === 0 ? 0 : Math.round((correct / reviewQids.length) * 100);
  const filter = filterChoice ?? (missed.length > 0 && !progress?.done ? "missed" : "all");
  const shown = filter === "missed" ? missed : reviewQids;

  const changeView = (next: "results" | "review") => setSearchParams({ view: next });
  const goToQuestion = (qid: string) => setSearchParams({ view: "review", q: qid });
  const goToNext = () => { if (progress?.next) goToQuestion(progress.next); };

  // A question counts as reviewed once the student opens it. Saved per question,
  // so a student who stops half way finds the same progress in the drill list.
  const markOpened = React.useCallback((qid: string) => {
    if (!user?.id || !run || reviewed.has(qid) || !missed.includes(qid)) return;
    setReviewed((previous) => new Set(previous).add(qid));
    markDrillRunReviewed(user.id, run.id, [qid]).then(
      () => setSaveError(null),
      () => setSaveError("Your review progress could not be saved. You can keep reviewing, but the drill list may not show it."),
    );
  }, [user?.id, run, reviewed, missed]);

  // Jump from the question map or "Next" straight to a question: open it and bring it into view.
  React.useEffect(() => {
    if (view !== "review" || !jumpTo || !run || bankLoading || !reviewQids.includes(jumpTo)) return;
    if (filter === "missed" && !missed.includes(jumpTo)) { setFilterChoice("all"); return; }
    const element = detailRefs.current.get(jumpTo);
    if (!element) return;
    element.open = true;
    markOpened(jumpTo);
    element.scrollIntoView?.({ block: "start", behavior: "smooth" });
    setSearchParams({ view: "review" }, { replace: true });
  }, [view, jumpTo, run, bankLoading, reviewQids, filter, missed, markOpened, setSearchParams]);

  const guidedIdentity = guided ? run!.source_key.slice("guided::".length) : "";
  const guidedContinueTo = !run ? "" : guidedIdentity.startsWith("drill:")
    ? `/drill?${launchDrill({ kind: "guided-drill", drillId: guidedIdentity.slice("drill:".length), options: { returnTo: "/classroom/drill", label: run?.label } })}&run=${encodeURIComponent(run!.id)}`
    : `/guided/${encodeURIComponent(guidedIdentity)}?run=${encodeURIComponent(run.id)}`;
  const backTo = guided
    ? guidedIdentity.startsWith("drill:") ? "/classroom/drill" : `/guided/${encodeURIComponent(guidedIdentity)}`
    : "/practice/drills?view=completed";
  const continueTo = run && (guided
    ? guidedContinueTo
    : adaptive
    ? `/drill?${launchDrill({ kind: "smart-drill", options: { returnTo: "/practice/drills" } })}&run=${encodeURIComponent(run.id)}`
    : `/drill?${launchDrill({ kind: "questions", qids: run.session.question_queue, options: { returnTo: "/practice/drills" } })}&run=${encodeURIComponent(run.id)}`);

  const title = run ? (adaptive ? "Smart Drill" : run.label || (guided ? "Guided drill" : "LR drill")) : "";
  const noneMissed = missed.length === 0;
  const allReviewed = !noneMissed && !!progress?.done;
  const nextNumber = progress?.next ? reviewQids.indexOf(progress.next) + 1 : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Button type="button" variant="ghost" className="mb-5" onClick={() => navigate(backTo)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden />Back to drills</Button>
      {loading ? <p role="status">Loading your drill…</p> : error ? <p role="alert" className="text-destructive">{error}</p> : !run ? <p role="status">This drill was not found in your account.</p> : !completed ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          {!guided && <p className="mt-2 text-sm text-muted-foreground">{lrRunProvenanceLabel(run.provenance)}</p>}
          <p className="mt-2 text-muted-foreground">This drill is still in progress. Finish it to see results and answer review.</p>
          <Button className="mt-5" onClick={() => navigate(continueTo!)}>Continue drill</Button>
        </section>
      ) : <>
        <header className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed drill</p>
          <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Completed {new Date(run.updated_at).toLocaleDateString()} · {reviewQids.length} question{reviewQids.length === 1 ? "" : "s"}</p>
          {!guided && <p className="mt-2 text-sm text-muted-foreground">{lrRunProvenanceLabel(run.provenance)}</p>}
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Drill details">
            <Button type="button" variant={view === "results" ? "default" : "outline"} aria-current={view === "results" ? "page" : undefined} onClick={() => changeView("results")}>Results</Button>
            <Button type="button" variant={view === "review" ? "default" : "outline"} aria-current={view === "review" ? "page" : undefined} onClick={() => changeView("review")}>
              Review{!noneMissed && <span className="ml-2 text-xs tabular-nums opacity-80">{progress!.reviewed}/{missed.length}</span>}
            </Button>
          </div>
        </header>

        {view === "results" ? (
          <section className="mt-5 rounded-xl border border-border bg-card p-6 sm:p-8" aria-label="Drill results">
            <div className="flex flex-wrap items-center gap-6">
              <ScoreRing percent={percent} label={`${percent} percent correct, ${correct} of ${reviewQids.length}`} />
              <div>
                <p className="text-3xl font-semibold">{correct} of {reviewQids.length} correct</p>
                <p className="mt-1 text-sm text-muted-foreground">{attempts.length} answered{reviewQids.length > attempts.length ? ` · ${reviewQids.length - attempts.length} not answered` : ""}</p>
              </div>
            </div>

            <div className="mt-7 rounded-lg border border-border bg-background p-5">
              {noneMissed ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5" aria-hidden />Nothing to review. Every answer was correct.</p>
                  <Button variant="outline" onClick={() => navigate(backTo)}>Back to drills</Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{allReviewed ? "You reviewed everything you missed." : `${missed.length - progress!.reviewed} of ${missed.length} missed ${missed.length === 1 ? "question" : "questions"} still to review`}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">{progress!.reviewed} of {missed.length} reviewed</p>
                  </div>
                  <div className="mt-3"><ProgressBar done={progress!.reviewed} total={missed.length} label="Missed questions reviewed" /></div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {allReviewed
                      ? <Button variant="outline" onClick={() => changeView("review")}>Review again<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
                      : <Button onClick={() => (progress!.reviewed === 0 ? goToQuestion(progress!.next!) : goToNext())}>{progress!.reviewed === 0 ? `Review ${missed.length} missed` : "Continue review"}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>}
                    <Button variant="ghost" onClick={() => changeView("review")}>See all answers</Button>
                  </div>
                </>
              )}
            </div>

            <h2 className="mt-7 text-sm font-semibold text-muted-foreground">Question by question</h2>
            <ol aria-label="Questions" className="mt-3 flex flex-wrap gap-2">
              {reviewQids.map((qid, index) => {
                const outcome = questionOutcome(run, qid);
                const isMissed = outcome !== "correct";
                const seen = reviewed.has(qid);
                return (
                  <li key={`${qid}-${index}`}>
                    <button type="button" onClick={() => goToQuestion(qid)}
                      aria-label={`Question ${index + 1}, ${OUTCOME_LABEL[outcome].toLowerCase()}${isMissed ? seen ? ", reviewed" : ", not reviewed yet" : ""}`}
                      className={`relative grid h-11 w-11 place-items-center rounded-lg border text-sm font-semibold tabular-nums transition-colors hover:border-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${isMissed ? seen ? "border-foreground/40 bg-card" : "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"}`}>
                      {index + 1}
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full border border-border bg-background text-foreground" aria-hidden>
                        {outcome === "correct" ? <Check className="h-2.5 w-2.5" /> : outcome === "unanswered" ? <Minus className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <>
            {!noneMissed && (
              <div className="sticky top-0 z-10 -mx-1 mt-5 rounded-xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur">
                {allReviewed ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" aria-hidden />All {missed.length} missed {missed.length === 1 ? "question" : "questions"} reviewed</p>
                    <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => changeView("results")}>See results</Button><Button size="sm" onClick={() => navigate(backTo)}>Back to drills</Button></div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="min-w-[12rem] flex-1">
                      <p className="mb-2 text-sm font-semibold">{progress!.reviewed} of {missed.length} reviewed</p>
                      <ProgressBar done={progress!.reviewed} total={missed.length} label="Missed questions reviewed" />
                    </div>
                    <Button size="sm" onClick={goToNext}>{progress!.reviewed === 0 ? `Start with question ${nextNumber}` : `Next: question ${nextNumber}`}<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
                  </div>
                )}
                <div className="mt-3 flex gap-1" role="group" aria-label="Which questions to show">
                  <Button size="sm" variant={filter === "missed" ? "default" : "ghost"} aria-pressed={filter === "missed"} onClick={() => setFilterChoice("missed")}>Missed ({missed.length})</Button>
                  <Button size="sm" variant={filter === "all" ? "default" : "ghost"} aria-pressed={filter === "all"} onClick={() => setFilterChoice("all")}>All ({reviewQids.length})</Button>
                </div>
              </div>
            )}
            {saveError && <p role="alert" className="mt-3 text-sm text-destructive">{saveError}</p>}
            <section className="mt-5" aria-label="Answer review">
              {bankLoading ? <p role="status">Loading questions…</p> : bankError ? <p role="alert" className="text-destructive">Questions could not be loaded. Try again later.</p> : (
                <ol className="space-y-3">{shown.map((qid) => {
                  const index = reviewQids.indexOf(qid);
                  const question = questionBank.getQuestion(qid);
                  const attempt = attempts.find((item) => item.qid === qid);
                  const outcome = questionOutcome(run, qid);
                  const seen = outcome !== "correct" && reviewed.has(qid);
                  return <li key={`${qid}-${index}`} className="rounded-xl border border-border bg-card p-5">
                    <details ref={(element) => { if (element) detailRefs.current.set(qid, element); else detailRefs.current.delete(qid); }}>
                      <summary className="cursor-pointer font-medium" onClick={() => { const element = detailRefs.current.get(qid); if (element && !element.open) markOpened(qid); }}>
                        {index + 1}. {question ? `PT${question.pt} · S${question.section} · Q${question.qnum} · ${question.qtype}` : qid} · {OUTCOME_LABEL[outcome]}{seen && <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><Check className="h-3 w-3" aria-hidden />Reviewed</span>}
                      </summary>
                      {question ? <div className="mt-5 space-y-4 text-sm leading-relaxed">
                        {question.stimulus && <p className="whitespace-pre-wrap">{question.stimulus}</p>}
                        <p className="font-medium whitespace-pre-wrap">{question.questionStem}</p>
                        <ol className="space-y-2" aria-label={`Answer choices for question ${index + 1}`}>{(["A", "B", "C", "D", "E"] as const).map((letter) => (
                          <li key={letter} className="rounded-lg border border-border p-3" data-selected={attempt?.selected_answer === letter || undefined} data-correct={question.correctAnswer === letter || undefined}>
                            <span className="font-semibold">{letter}. </span>{question.answerChoices[letter]}
                            {attempt?.selected_answer === letter && <span className="ml-2 text-muted-foreground">Your answer</span>}
                            {question.correctAnswer === letter && <span className="ml-2 font-semibold">Correct answer</span>}
                            <LrChoiceNote pt={question.pt} section={question.section} qnum={question.qnum} letter={letter} className="mt-2 text-muted-foreground" />
                          </li>
                        ))}</ol>
                      </div> : <p className="mt-3 text-sm text-muted-foreground">This question is no longer available in the question bank.</p>}
                      {progress?.next && progress.next !== qid && <div className="mt-5 border-t border-border pt-4"><Button size="sm" variant="outline" onClick={goToNext}>Next missed question<ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button></div>}
                    </details>
                  </li>;
                })}</ol>
              )}
            </section>
          </>
        )}
      </>}
    </div>
  );
}

import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { loadStandaloneDrillRun, type StandaloneDrillRun } from "@/lib/drillRunLedger";
import { launchDrill } from "@/lib/drillLaunch";
import { CompletedDrillReview } from "@/components/drill/CompletedDrillReview";
import { lrRunProvenanceLabel } from "@/lib/lrRunProvenance";

export default function DrillRuns() {
  const { runId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: bankLoading, error: bankError } = useQuestionBank();
  const [run, setRun] = React.useState<StandaloneDrillRun | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const view = searchParams.get("view") === "review" ? "review" : "results";
  const qParam = Number(searchParams.get("q"));
  const openQuestion = Number.isInteger(qParam) && qParam > 0 ? qParam - 1 : null;

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

  const changeView = (next: "results" | "review") => setSearchParams({ view: next });
  const completed = run?.session.status === "completed";
  const adaptive = run?.source_key === "drill::adaptive";
  const guided = !!run?.source_key.startsWith("guided::");
  const attempts = run?.session.attempts ?? [];
  // Adaptive and early-ended guided queues include questions never attempted.
  const reviewQids = adaptive || guided
    ? [...new Set(attempts.map((attempt) => attempt.qid))]
    : run?.session.question_queue ?? [];
  const correct = attempts.filter((attempt) => attempt.correct).length;
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

  return (
    <div className={`mx-auto w-full ${view === "review" && openQuestion !== null ? "max-w-6xl" : "max-w-4xl"} px-4 py-8 sm:px-6`}>
      <Button type="button" variant="ghost" className="mb-5" onClick={() => navigate(backTo)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden />Back to drills</Button>
      {loading ? <p role="status">Loading your drill…</p> : error ? <p role="alert" className="text-destructive">{error}</p> : !run ? <p role="status">This drill was not found in your account.</p> : !completed ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-semibold">{adaptive ? "Smart Drill" : run.label || (guided ? "Guided drill" : "LR drill")}</h1>
          {!guided && <p className="mt-2 text-sm text-muted-foreground">{lrRunProvenanceLabel(run.provenance)}</p>}
          <p className="mt-2 text-muted-foreground">This drill is still in progress. Finish it to see results and answer review.</p>
          <Button className="mt-5" onClick={() => navigate(continueTo!)}>Continue drill</Button>
        </section>
      ) : <>
        <header className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed drill</p>
          <h1 className="mt-2 text-2xl font-semibold">{adaptive ? "Smart Drill" : run.label || (guided ? "Guided drill" : "LR drill")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Completed {new Date(run.updated_at).toLocaleDateString()} · {reviewQids.length} question{reviewQids.length === 1 ? "" : "s"}</p>
          {!guided && <p className="mt-2 text-sm text-muted-foreground">{lrRunProvenanceLabel(run.provenance)}</p>}
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Drill details">
            <Button type="button" variant={view === "results" ? "default" : "outline"} aria-current={view === "results" ? "page" : undefined} onClick={() => changeView("results")}>Results</Button>
            <Button type="button" variant={view === "review" ? "default" : "outline"} aria-current={view === "review" ? "page" : undefined} onClick={() => changeView("review")}>Review</Button>
          </div>
        </header>
        {view === "results" ? (
          <section className="mt-5 rounded-xl border border-border bg-card p-6" aria-label="Drill results">
            <p className="text-4xl font-semibold">{correct} / {reviewQids.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Correct answers · {attempts.length} answered</p>
            <Button className="mt-6" onClick={() => changeView("review")}>Review answers</Button>
          </section>
        ) : (
          <section className="mt-5" aria-label="Answer review">
            {bankLoading ? <p role="status">Loading questions…</p> : bankError ? <p role="alert" className="text-destructive">Questions could not be loaded. Try again later.</p> : (
              <CompletedDrillReview
                title={adaptive ? "Smart Drill" : run.label || (guided ? "Guided drill" : "LR drill")}
                qids={reviewQids}
                attempts={attempts}
                openIndex={openQuestion}
                onOpen={(index) => setSearchParams(index === null ? { view: "review" } : { view: "review", q: String(index + 1) })}
              />
            )}
          </section>
        )}
      </>}
    </div>
  );
}

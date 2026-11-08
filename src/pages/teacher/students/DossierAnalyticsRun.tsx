import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { CompletedDrillReview } from "@/components/drill/CompletedDrillReview";
import { loadStudentDrillRuns } from "@/lib/studentAnalytics";
import { useDossier } from "./StudentDossier";

/**
 * One of the student's drill runs, opened by a teacher: the same results table
 * and exam-screen review the student sees, read-only.
 */
export default function DossierAnalyticsRun() {
  const { studentId, studentName } = useDossier();
  const { runId } = useParams<{ runId: string }>();
  return <StudentRunView studentId={studentId} studentName={studentName} runId={runId ?? ""} backHref="../analytics" />;
}

export function StudentRunView({ studentId, studentName, runId, backHref }: {
  studentId: string; studentName: string | null; runId: string; backHref: string;
}) {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoading: bankLoading } = useQuestionBank();
  const { data: runs, isLoading, error } = useQuery({
    queryKey: ["student-drill-runs", studentId],
    queryFn: () => loadStudentDrillRuns(studentId),
    enabled: !!studentId,
  });
  const run = runs?.find((r) => r.id === runId);
  const q = Number(params.get("q"));
  const openIndex = Number.isInteger(q) && q > 0 ? q - 1 : null;

  if (isLoading || bankLoading) return <p role="status" className="p-6 text-sm text-black/60">Loading the drill…</p>;
  if (error) return <p role="alert" className="p-6 text-sm text-red-700">This drill could not be loaded.</p>;
  if (!run) return <p className="p-6 text-sm text-black/60">This drill is not in {studentName || "the student"}'s account.</p>;

  const attempts = run.session.attempts ?? [];
  const guided = run.source_key.startsWith("guided::");
  const adaptive = run.source_key === "drill::adaptive";
  const qids = adaptive || guided ? [...new Set(attempts.map((a) => a.qid))] : run.session.question_queue;
  const title = adaptive ? "Smart Drill" : run.label || (guided ? "Guided drill" : "LR drill");

  return (
    <div className="mx-auto w-full max-w-6xl p-5">
      <Button type="button" variant="ghost" className="mb-4" onClick={() => navigate(backHref)}><ArrowLeft className="mr-2 h-4 w-4" />Back to analytics</Button>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{studentName || "Student"} · {run.session.status === "completed" ? "Completed drill" : "Drill in progress"}</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{new Date(run.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
      </header>
      <CompletedDrillReview
        title={title}
        qids={qids}
        attempts={attempts}
        openIndex={openIndex}
        onOpen={(i) => setParams(i === null ? {} : { q: String(i + 1) })}
        viewerIsOwner={false}
        about={[
          ["Questions", qids.length],
          ["Answered", attempts.length],
          ["Status", run.session.status === "completed" ? "Completed" : "In progress"],
          ["Last activity", new Date(run.updated_at).toLocaleString()],
        ]}
      />
    </div>
  );
}

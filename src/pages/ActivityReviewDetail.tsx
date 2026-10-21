import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentAssignment, listResponsesForAssignment } from "@/features/activity-centre/api/activitiesClient";
import type { ActivityAssignment, ActivityItemResponse } from "@/features/activity-centre/api/types";

export default function ActivityReviewDetail() {
  const { assignmentId, itemOrder } = useParams();
  const order = Number(itemOrder);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get("returnTo");
  const returnTo = requestedReturn?.split("?")[0] === "/review/to-review"
    ? requestedReturn : "/review/to-review?reason=missed";
  const [assignment, setAssignment] = React.useState<ActivityAssignment | null>(null);
  const [responses, setResponses] = React.useState<ActivityItemResponse[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id || !assignmentId || !Number.isSafeInteger(order) || order < 1) {
      setLoading(false);
      setError("This Activity review link is invalid.");
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      getStudentAssignment(assignmentId, user.id),
      listResponsesForAssignment(assignmentId),
    ]).then(([owned, allResponses]) => {
      if (!active) return;
      setAssignment(owned);
      setResponses(allResponses.filter((response) => response.student_id === user.id && response.item_order === order));
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "This Activity review could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assignmentId, order, user?.id]);

  const item = assignment?.items.find((candidate) => candidate.order === order);
  const judged = responses
    .filter((response) => response.verdict != null)
    .sort((a, b) => a.attempt_no - b.attempt_no || a.created_at.localeCompare(b.created_at));
  const missed = judged.some((response) => response.verdict === "incorrect" || response.verdict === "partial");
  const available = assignment?.status === "completed"
    && assignment.mode !== "section"
    && assignment.item_format !== "spoken-recall"
    && !!item && missed;

  return <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6">
    <Button variant="ghost" type="button" onClick={() => navigate(returnTo)} className="mb-5">
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to Review
    </Button>
    {loading ? <p role="status">Loading Activity review…</p>
      : error ? <p role="alert" className="text-destructive">{error}</p>
      : !available || !assignment || !item ? <p role="status">This completed Activity item is not available for review in your account.</p>
      : <article className="space-y-7">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity · Item {order}</p>
          <h1 className="mt-2 text-2xl font-semibold">{assignment.title}</h1>
          {item.category && <p className="mt-1 text-sm text-muted-foreground">{item.category}</p>}
        </header>
        <section aria-label="The prompt" className="space-y-2">
          <h2 className="text-lg font-semibold">The prompt</h2>
          <p className="whitespace-pre-wrap leading-relaxed">{item.prompt}</p>
        </section>
        <section aria-label="Your responses" className="space-y-3">
          <h2 className="text-lg font-semibold">Your responses</h2>
          <ol className="space-y-3">{judged.map((response) => <li key={response.id} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attempt {response.attempt_no} · {response.verdict}</p>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">{response.response_text}</p>
          </li>)}</ol>
        </section>
        <section aria-label="Credited answer" className="space-y-2 border-t border-border pt-5">
          <h2 className="text-lg font-semibold">Credited answer</h2>
          <ul className="list-disc space-y-1 pl-5">{item.credited_answers.map((answer, index) => <li key={`${index}-${answer}`}>{answer}</li>)}</ul>
          {item.explanation && <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{item.explanation}</p>}
        </section>
      </article>}
  </div>;
}

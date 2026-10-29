import { safeReviewHubReturn } from '@/lib/reviewHubReturn';
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { fetchOwnedIntroLrAttempt, getAuthoredIntroLrQuestion, type IntroLrAttempt } from "@/components/review/introLrReviewSource";
import type { InteractiveDrillItem } from "@/bootcamps/main-conclusion/components/interactive-drills/types";

function savedAnswer(item: InteractiveDrillItem, raw: string | null): string {
  if (!raw) return "No answer was recorded for this attempt.";
  if (item.mode === "conclusion_click" || item.mode === "rebuttal_dissection") {
    const parts = raw.split(":");
    return parts.map((part) => item.parts?.find((candidate) => candidate.id === part)?.text ?? part).join(" · ");
  }
  if (item.mode === "first_sentence_check") return raw === "true" ? "Yes, the conclusion was the first sentence" : raw === "false" ? "No, the conclusion was not the first sentence" : raw;
  if (item.mode === "chain_mapping" || item.mode === "nested_claims") {
    try {
      const roles = JSON.parse(raw) as Record<string, string>;
      if (roles && typeof roles === "object" && !Array.isArray(roles)) return Object.entries(roles)
        .map(([id, role]) => `${item.parts?.find((part) => part.id === id)?.text ?? id}: ${role}`).join("\n");
    } catch { /* Old answers may be plain text. */ }
  }
  return raw;
}

function reasoning(item: InteractiveDrillItem): string {
  const payload = item.payload as { rationale?: string; layers?: { main_conclusion: string; intermediate_conclusion?: string; premises: string[] } };
  if (payload.rationale) return payload.rationale;
  if (payload.layers) return `Main conclusion: ${payload.layers.main_conclusion}. ${payload.layers.intermediate_conclusion ? `Intermediate conclusion: ${payload.layers.intermediate_conclusion}. ` : ""}Support: ${payload.layers.premises.join("; ")}.`;
  return "The authored answer map below shows the intended structure.";
}

export default function IntroLrReviewDetail() {
  const { attemptId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get("returnTo");
  const returnTo = safeReviewHubReturn(requestedReturn) ?? "/review/to-review?reason=missed";
  const [attempt, setAttempt] = React.useState<IntroLrAttempt | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id || !attemptId) {
      setLoading(false);
      setError("This review link is invalid.");
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void fetchOwnedIntroLrAttempt(user.id, attemptId).then((row) => {
      if (active) setAttempt(row);
    }).catch(() => {
      if (active) setError("This saved exercise attempt could not be loaded. Try again later.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, attemptId]);

  const question = attempt ? getAuthoredIntroLrQuestion(attempt.question_id) : null;
  return <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6">
    <Button variant="ghost" type="button" onClick={() => navigate(returnTo)} className="mb-5 min-h-11">
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to Review
    </Button>
    {loading ? <p role="status">Loading saved exercise attempt…</p>
      : error ? <p role="alert" className="text-destructive">{error}</p>
      : !attempt || !question ? <p role="status">This Intro to LR attempt is not available for review in your account.</p>
      : <article className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Intro to LR · Missed exercise attempt</p>
          <h1 className="mt-2 text-2xl font-semibold">{question.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{attempt.question_id} · {new Date(attempt.created_at).toLocaleDateString()}</p>
        </header>
        <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Authored exercise">
          <h2 className="text-lg font-semibold">The exercise</h2>
          <p>{question.prompt}</p>
          {question.stimulus && <p className="whitespace-pre-wrap">{question.stimulus}</p>}
          {question.mode === "pronoun_replacement" && "candidate_conclusion" in question.payload ? <p className="whitespace-pre-wrap">{String(question.payload.candidate_conclusion)}</p> : null}
          {question.parts?.length ? <ol className="list-decimal space-y-2 pl-5">{question.parts.map((part) => <li key={part.id}>{part.text}</li>)}</ol> : null}
          {question.mode === "signal_classification" && "highlighted_word" in question.payload ? <p>Highlighted phrase: <strong>{String(question.payload.highlighted_word)}</strong></p> : null}
        </section>
        <section className="space-y-2 rounded-xl border border-border bg-card p-5" aria-label="Saved answer">
          <h2 className="text-lg font-semibold">Your saved answer</h2>
          <p className="whitespace-pre-wrap">{savedAnswer(question, attempt.selected_answer)}</p>
          {attempt.selected_answer === null && <p className="text-sm text-muted-foreground">The original exercise marked this attempt incorrect, but did not store the answer text.</p>}
        </section>
        <section className="space-y-3 rounded-xl border border-border bg-card p-5" aria-label="Authored reasoning">
          <h2 className="text-lg font-semibold">How to reason through it</h2>
          <p>{reasoning(question)}</p>
          {question.revealMap?.length ? <ul className="space-y-2">{question.revealMap.map((entry) => <li key={entry.id}><strong>{entry.label}:</strong> {entry.text}</li>)}</ul> : null}
          {question.mode === "signal_classification" && "correct_category" in question.payload ? <p>Correct category: <strong>{String(question.payload.correct_category)}</strong></p> : null}
          {question.mode === "first_sentence_check" && "is_first_sentence_conclusion" in question.payload ? <p>Was the conclusion first? <strong>{question.payload.is_first_sentence_conclusion ? "Yes" : "No"}</strong></p> : null}
          {question.mode === "pronoun_replacement" && "acceptable_replacements" in question.payload ? <p>Model rewrite: <strong>{question.payload.candidate_conclusion.replace(question.payload.pronoun, question.payload.acceptable_replacements[0] ?? question.payload.pronoun)}</strong></p> : null}
        </section>
        <p className="text-xs text-muted-foreground">The answer and outcome are from this saved attempt. Exercise wording and reasoning are from the current authored content. Viewing this page does not create another attempt.</p>
      </article>}
  </div>;
}

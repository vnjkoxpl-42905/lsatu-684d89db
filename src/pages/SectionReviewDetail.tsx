import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { fetchOwnedSectionHistoryItem, sectionLabel, type SectionHistoryRow } from "@/lib/sectionHistory";
import { UNANSWERED } from "@/lib/sectionAnswer";
import { questionBank } from "@/lib/questionLoader";

export default function SectionReviewDetail() {
  const { historyId, qid } = useParams();
  const { user } = useAuth();
  const { isLoading: bankLoading, error: bankError } = useQuestionBank();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get("returnTo");
  const returnTo = requestedReturn?.split("?")[0] === "/review/to-review"
    ? requestedReturn : "/review/to-review?reason=skipped";
  const [history, setHistory] = React.useState<SectionHistoryRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.id || !historyId || !qid) {
      setLoading(false);
      setError("This section review link is invalid.");
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void fetchOwnedSectionHistoryItem(user.id, historyId).then((row) => {
      if (active) setHistory(row);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "This section review could not be loaded.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, historyId, qid]);

  const stat = history?.questions.find((item) => item.qid === qid);
  const available = history?.mode === "full-section" && !history.practiceTestRunId
    && stat?.initialAnswer === UNANSWERED && stat.everVisited === true;
  const question = available && !bankLoading && !bankError ? questionBank.getQuestion(qid!) : null;

  return <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6">
    <Button variant="ghost" type="button" onClick={() => navigate(returnTo)} className="mb-5 min-h-11">
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to Review
    </Button>
    {loading ? <p role="status">Loading section review…</p>
      : error ? <p role="alert" className="text-destructive">{error}</p>
      : !available || !history || !stat ? <p role="status">This completed section item is not available for review in your account.</p>
      : <article className="space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed LR section · Opened and left blank</p>
          <h1 className="mt-2 text-2xl font-semibold">{sectionLabel(history)} · Question {stat.qnum}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{stat.qtype} · Completed {new Date(history.completedAt).toLocaleDateString()}</p>
        </header>
        {bankLoading ? <p role="status">Loading question text…</p>
          : bankError ? <p role="alert" className="text-destructive">Question text could not be loaded. Your saved answer state is still shown below.</p>
          : question ? <section aria-label="Question and choices" className="space-y-4 rounded-xl border border-border bg-card p-5 leading-relaxed">
              {question.stimulus && <p className="whitespace-pre-wrap">{question.stimulus}</p>}
              <p className="font-medium whitespace-pre-wrap">{question.questionStem}</p>
              <ol className="space-y-2" aria-label="Answer choices">{(["A", "B", "C", "D", "E"] as const).map((letter) => <li key={letter} className="rounded-lg border border-border p-3" data-correct={stat.correctAnswer === letter || undefined}>
                <span className="font-semibold">{letter}. </span>{question.answerChoices[letter]}
                {stat.correctAnswer === letter && <span className="ml-2 font-semibold">Credited answer at completion</span>}
                {question.answerChoiceExplanations?.[letter] && <p className="mt-2 text-sm text-muted-foreground">{question.answerChoiceExplanations[letter].whyCorrect || question.answerChoiceExplanations[letter].whyIncorrect}</p>}
              </li>)}</ol>
            </section>
          : <p className="rounded-xl border border-border bg-card p-5">This question is no longer available in the question bank.</p>}
        <section className="rounded-xl border border-border bg-card p-5" aria-label="Saved section outcome">
          <h2 className="text-lg font-semibold">Saved section outcome</h2>
          <p className="mt-2">First answer: none recorded. You opened this question but left it blank.</p>
          <p className="mt-1">Credited answer at completion: <strong>{stat.correctAnswer}</strong></p>
          {stat.brAnswer && <p className="mt-1">Blind Review answer: <strong>{stat.brAnswer}</strong></p>}
        </section>
        {question && <p className="text-xs text-muted-foreground">Question wording is loaded from the current bank. The saved answer and visit state come from this completed sitting.</p>}
      </article>}
  </div>;
}

import * as React from "react";
import { ArrowLeft, Check, Lightbulb, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { questionBank } from "@/lib/questionLoader";
import { useLrExplanation } from "@/hooks/useLrExplanation";
import { cn } from "@/lib/utils";

/**
 * The one review surface for a finished drill: a question table that opens
 * each question in its original two-pane layout with Clean / Actual / BR.
 *
 * Every completed-drill page renders this. The old review hand-built its own
 * question markup in a stack of <details> rows and drifted away from the
 * drill layout; keeping the review here, and only here, is what stops that.
 */

export interface ReviewAttempt {
  qid?: string;
  selected_answer?: string;
  correct?: boolean;
  time_ms?: number;
}

type Mode = "clean" | "actual";
const LETTERS = ["A", "B", "C", "D", "E"] as const;

function formatTime(ms = 0) {
  const total = Math.round(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function ResultMark({ attempt, small }: { attempt?: ReviewAttempt; small?: boolean }) {
  const size = small ? "h-4 w-4" : "h-7 w-7";
  if (!attempt) return <span className={cn("inline-block rounded-full border-2 border-muted-foreground/40", size)} aria-label="Unanswered"><span className="sr-only">Unanswered</span></span>;
  return attempt.correct ? (
    <span className={cn("inline-flex items-center justify-center rounded-full bg-emerald-500 text-white", size)} aria-label="Correct"><Check className={small ? "h-3 w-3" : "h-4 w-4"} aria-hidden /><span className="sr-only">Correct</span></span>
  ) : (
    <span className={cn("inline-flex items-center justify-center rounded-full bg-red-400 text-white", size)} aria-label="Incorrect"><Minus className={small ? "h-3 w-3" : "h-4 w-4"} aria-hidden /><span className="sr-only">Incorrect</span></span>
  );
}

function questionLabel(qid: string) {
  const q = questionBank.getQuestion(qid);
  return q ? `PT${q.pt}.S${q.section}.Q${q.qnum}` : qid;
}

export function CompletedDrillReview({ title, qids, attempts, openIndex, onOpen }: {
  title: string;
  qids: string[];
  attempts: ReviewAttempt[];
  /** Index of the open question, or null for the table. */
  openIndex: number | null;
  onOpen: (index: number | null) => void;
}) {
  const byQid = React.useMemo(() => new Map(attempts.map((a) => [a.qid, a])), [attempts]);
  if (openIndex !== null && openIndex >= 0 && openIndex < qids.length) {
    return <QuestionView title={title} qids={qids} byQid={byQid} index={openIndex} onOpen={onOpen} />;
  }
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">{qids.length} question{qids.length === 1 ? "" : "s"}</p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 text-left">Question</th>
              <th className="px-2 py-3 text-center"><div>Result</div><div className="mt-1 flex justify-center gap-4 font-medium normal-case tracking-normal"><span>Actual</span><span>BR</span></div></th>
              <th className="hidden px-2 py-3 text-center sm:table-cell">Answer</th>
              <th className="px-4 py-3 text-right">Timing</th>
            </tr>
          </thead>
          <tbody>
            {qids.map((qid, index) => {
              const q = questionBank.getQuestion(qid);
              const attempt = byQid.get(qid);
              const tags = q ? [q.qtype, ...(q.questionFeatures ?? [])].filter(Boolean) : [];
              return (
                <tr key={`${qid}-${index}`} className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/40" onClick={() => onOpen(index)}>
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="w-5 pt-0.5 text-muted-foreground">{index + 1}</span>
                      <div>
                        <button type="button" className="font-semibold text-primary underline-offset-2 hover:underline" onClick={(e) => { e.stopPropagation(); onOpen(index); }}>{questionLabel(qid)}</button>
                        {tags.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>)}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4"><div className="flex items-center justify-center gap-6"><ResultMark attempt={attempt} /><span className="w-7 text-center text-muted-foreground">–</span></div></td>
                  <td className="hidden px-2 py-4 text-center sm:table-cell">
                    {attempt ? <span><span className={attempt.correct ? "font-semibold text-emerald-600" : "font-semibold text-red-500"}>{attempt.selected_answer}</span>{!attempt.correct && q && <span className="text-muted-foreground"> → {q.correctAnswer}</span>}</span> : <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-muted-foreground">{attempt ? formatTime(attempt.time_ms) : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuestionView({ title, qids, byQid, index, onOpen }: {
  title: string; qids: string[]; byQid: Map<string, ReviewAttempt>; index: number; onOpen: (index: number | null) => void;
}) {
  const qid = qids[index];
  const q = questionBank.getQuestion(qid);
  const attempt = byQid.get(qid);
  const [mode, setMode] = React.useState<Mode>("clean");
  const [showCorrect, setShowCorrect] = React.useState(false);
  const [showAnalysis, setShowAnalysis] = React.useState(false);
  const [openNotes, setOpenNotes] = React.useState<Set<string>>(new Set());
  React.useEffect(() => { setOpenNotes(new Set()); setShowAnalysis(false); }, [qid]);
  const { data } = useLrExplanation({ pt: q?.pt ?? 0, section: q?.section ?? 0, questionNumber: q?.qnum ?? 0 }, !!q);
  const style = data?.styles[0];

  const toggleNote = (letter: string) => setOpenNotes((prev) => {
    const next = new Set(prev);
    if (next.has(letter)) next.delete(letter); else next.add(letter);
    return next;
  });

  return (
    <section aria-label="Question review">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => onOpen(null)}><ArrowLeft className="mr-2 h-4 w-4" aria-hidden />All questions</Button>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex justify-end border-b border-border px-5 py-3 text-sm text-muted-foreground">{index + 1} of {qids.length}</div>
        {!q ? <p className="p-6 text-sm text-muted-foreground">This question is no longer available in the question bank.</p> : (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]">
            <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
              <button type="button" aria-pressed={showAnalysis} onClick={() => setShowAnalysis((v) => !v)} className={cn("mb-5 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium", showAnalysis && "bg-accent")}>
                <Lightbulb className="h-4 w-4" aria-hidden />{showAnalysis ? "Hide analysis" : "Show analysis"}
              </button>
              {q.stimulus && <p className="max-w-[52ch] whitespace-pre-wrap leading-relaxed">{q.stimulus}</p>}
              {showAnalysis && (
                <div className="mt-5 space-y-3 rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                  {style?.steps.length ? style.steps.map((step) => <p key={step.position}>{step.label && <span className="font-semibold">{step.label}: </span>}{step.body}</p>) : <p className="text-muted-foreground">No analysis has been written for this question yet.</p>}
                </div>
              )}
              <p className="mt-8 text-sm text-muted-foreground">{questionLabel(qid)}</p>
            </div>
            <div className="p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border">
                <div className="flex gap-5 text-sm font-medium" role="tablist" aria-label="Answer view">
                  {(["clean", "actual"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cn("-mb-px border-b-2 pb-2", mode === m ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{m === "clean" ? "Clean" : "Actual"}</button>
                  ))}
                  <button type="button" role="tab" aria-selected={false} disabled title="No blind review for this drill" className="-mb-px border-b-2 border-transparent pb-2 text-muted-foreground/60">BR –</button>
                </div>
                <label className="mb-2 flex items-center gap-2 text-sm">Show correct<Switch checked={showCorrect} onCheckedChange={setShowCorrect} aria-label="Show correct" /></label>
              </div>
              <p className="mb-4 whitespace-pre-wrap font-medium leading-relaxed">{index + 1}. {q.questionStem}</p>
              <ol className="space-y-2" aria-label={`Answer choices for question ${index + 1}`}>
                {LETTERS.map((letter) => {
                  const picked = mode === "actual" && attempt?.selected_answer === letter;
                  const correct = showCorrect && q.correctAnswer === letter;
                  const note = style?.notesByLetter[letter];
                  return (
                    <li key={letter} data-picked={picked || undefined} data-correct={correct || undefined}
                      className={cn("overflow-hidden rounded-lg border",
                        correct ? "border-emerald-500 ring-1 ring-emerald-500" : picked ? (attempt?.correct ? "border-emerald-500" : "border-red-400 ring-1 ring-red-400") : "border-border")}>
                      <div className="flex items-stretch">
                        <div className={cn("flex w-14 shrink-0 items-start justify-center pt-3 text-2xl",
                          picked ? (attempt?.correct ? "bg-emerald-500 text-white" : "bg-red-400 text-white") : correct ? "bg-emerald-500/15 text-emerald-700" : "text-foreground")}>{letter}</div>
                        <div className="flex-1 bg-muted/40 p-3 text-[15px] leading-relaxed">{q.answerChoices[letter]}</div>
                        {note && <button type="button" aria-label={`Explanation for ${letter}`} aria-expanded={openNotes.has(letter)} onClick={() => toggleNote(letter)} className="flex w-12 shrink-0 items-start justify-center bg-muted/40 pt-3"><span className={cn("rounded-lg border border-border bg-card p-1.5", openNotes.has(letter) && "bg-accent")}><Lightbulb className="h-4 w-4" aria-hidden /></span></button>}
                      </div>
                      {note && openNotes.has(letter) && <p className="border-t border-border p-3 text-sm leading-relaxed text-muted-foreground">{note}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>
      <nav className="mt-5 flex flex-wrap items-start justify-center gap-1.5" aria-label="Questions">
        <Button type="button" size="sm" disabled={index === 0} onClick={() => onOpen(index - 1)}>Prev</Button>
        {qids.map((id, i) => (
          <button key={`${id}-${i}`} type="button" aria-current={i === index ? "true" : undefined} aria-label={`Question ${i + 1}`} onClick={() => onOpen(i)}
            className={cn("relative mb-3 h-9 w-9 rounded-md border text-sm", i === index ? "border-primary bg-primary/10 font-semibold" : "border-border bg-card")}>
            {i + 1}
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2"><ResultMark attempt={byQid.get(id)} small /></span>
          </button>
        ))}
        <Button type="button" size="sm" disabled={index === qids.length - 1} onClick={() => onOpen(index + 1)}>Next</Button>
      </nav>
    </section>
  );
}

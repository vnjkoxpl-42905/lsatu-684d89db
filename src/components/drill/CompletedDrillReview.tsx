import * as React from "react";
import { Check, Minus } from "lucide-react";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";
import SectionReviewWalk, { type ReviewWalkSession } from "@/components/drill/SectionReviewWalk";

/**
 * The one review surface for a finished drill: a question table that opens
 * each question in the real exam screen (SectionReviewWalk, the same frame,
 * question pane and navigator the drill runs in), full screen, read-only.
 *
 * Never hand-build question markup here. Two earlier versions did (a <details>
 * stack, then a card on the page background) and both drifted from the drill
 * layout. Reusing the drill's own components is what stops that.
 */

export interface ReviewAttempt {
  qid?: string;
  selected_answer?: string;
  correct?: boolean;
  time_ms?: number;
}


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
    const session: ReviewWalkSession = {
      questionQueue: qids,
      attempts: new Map(attempts.filter((a) => a.qid).map((a) => [a.qid!, { selectedAnswer: a.selected_answer ?? null }])),
    };
    return (
      <div className="fixed inset-0 z-[200] overflow-auto bg-white" role="dialog" aria-modal="true" aria-label={`${title} review`}>
        <SectionReviewWalk
          session={session}
          backLabel="All questions"
          initialIndex={openIndex}
          onIndexChange={(i) => { if (i !== openIndex) onOpen(i); }}
          onBack={() => onOpen(null)}
        />
      </div>
    );
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

import { questionBank } from '@/lib/questionLoader';
import { ChevronRight } from 'lucide-react';

interface LrQuestionInspectListProps {
  qids: string[];
}

/** Reads the frozen set only. It never creates a run or records exposure. */
export function LrQuestionInspectList({ qids }: LrQuestionInspectListProps) {
  if (qids.length === 0) return <p className="text-muted-foreground">This set has no questions.</p>;

  return (
    <div className="lr-question-preview-list min-h-0 space-y-2 overflow-y-auto pr-1 text-sm">
      {qids.map((qid, index) => {
        const question = questionBank.getQuestion(qid);
        return (
          <details key={`${qid}-${index}`} className="group rounded-md border border-border/60 bg-card text-card-foreground">
            <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 rounded-md px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90 motion-reduce:transition-none" />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block font-medium">Question {index + 1}{question ? ` · ${question.qtype}` : ' · Unavailable'}</span>
                {question && <span className="block text-xs font-normal leading-5 text-muted-foreground">PT {question.pt} · Section {question.section} · Question {question.qnum}</span>}
              </span>
            </summary>
            {question ? (
              <div className="space-y-5 border-t border-border/60 px-4 py-5 text-base font-normal leading-relaxed">
                {question.stimulus && <p className="whitespace-pre-wrap">{question.stimulus}</p>}
                <p className="font-medium whitespace-pre-wrap">{question.questionStem}</p>
                <ol className="space-y-1" aria-label={`Answer choices for question ${index + 1}`}>
                  {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => (
                    <li key={letter} className="flex gap-3 rounded-sm px-1 py-2">
                      <span className="w-5 shrink-0 font-medium">{letter}.</span>
                      <span className="min-w-0 whitespace-pre-wrap">{question.answerChoices[letter]}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : <p className="border-t border-border/60 px-4 py-4 text-muted-foreground">This question is no longer available.</p>}
          </details>
        );
      })}
    </div>
  );
}

import { questionBank } from '@/lib/questionLoader';

interface LrQuestionInspectListProps {
  qids: string[];
  chosenQids?: ReadonlySet<string>;
}

/** Reads the frozen set only. It never creates a run or records exposure. */
export function LrQuestionInspectList({ qids, chosenQids }: LrQuestionInspectListProps) {
  if (qids.length === 0) return <p className="text-muted-foreground">This set has no questions.</p>;

  return (
    <div className="min-h-0 overflow-y-auto space-y-3 pr-2 text-sm">
      {qids.map((qid, index) => {
        const question = questionBank.getQuestion(qid);
        return (
          <details key={`${qid}-${index}`} className="rounded-lg border border-border bg-card p-3 open:p-4">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">
              {index + 1}. {question ? `PT${question.pt} · S${question.section} · Q${question.qnum} · ${question.qtype}` : `${qid} · unavailable`}
              {question && chosenQids ? <span className="ml-2 text-xs text-muted-foreground">{chosenQids.has(qid) ? 'Chosen' : 'From filters'} · L{question.difficulty}</span> : null}
            </summary>
            {question ? (
              <div className="mt-4 space-y-4 leading-relaxed">
                {question.stimulus && <p className="whitespace-pre-wrap">{question.stimulus}</p>}
                <p className="font-medium whitespace-pre-wrap">{question.questionStem}</p>
                <ol className="space-y-2" aria-label={`Answer choices for question ${index + 1}`}>
                  {(['A', 'B', 'C', 'D', 'E'] as const).map((letter) => (
                    <li key={letter} className="flex gap-2 rounded border border-border/60 p-2">
                      <span className="font-semibold">{letter}.</span>
                      <span className="whitespace-pre-wrap">{question.answerChoices[letter]}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : <p className="mt-3 text-muted-foreground">This question is no longer available in the question bank.</p>}
          </details>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import type { LRQuestion } from '@/lib/questionLoader';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

/** Read-only presentation. No runner, attempts, progress, or exposure mutations. */
export function FinderLrPreview({ question, onClose, onRestoreFocus }: { question: LRQuestion; onClose: () => void; onRestoreFocus: () => void }) {
  const [revealed, setRevealed] = useState(false);
  return <Sheet open onOpenChange={value => { if (!value) onClose(); }}>
    <SheetContent className="qf-lr-preview w-full sm:max-w-xl overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); onRestoreFocus(); }}>
      <SheetHeader>
        <SheetTitle>PT {question.pt} · Section {question.section} · Question {question.qnum}</SheetTitle>
        <SheetDescription>Read-only preview. This does not start or score a drill.</SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-5 text-sm">
        <p className="whitespace-pre-wrap leading-relaxed">{question.stimulus}</p>
        <p className="font-medium leading-relaxed">{question.questionStem}</p>
        <ol className="space-y-3" aria-label="Answer choices">
          {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => <li key={letter} className="rounded-md border p-3 leading-relaxed"><span className="font-semibold">{letter}. </span>{question.answerChoices[letter]}{revealed && question.correctAnswer === letter && <strong className="block mt-2">Correct answer</strong>}</li>)}
        </ol>
        <button className="underline underline-offset-4 min-h-11" type="button" onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>
        {revealed && question.answerChoiceExplanations && <section aria-label="Answer explanations" className="space-y-3">{(['A', 'B', 'C', 'D', 'E'] as const).map(letter => {
          const explanation = question.answerChoiceExplanations?.[letter];
          return explanation && <p key={letter}><strong>{letter}. </strong>{explanation.whyCorrect ?? explanation.whyIncorrect}</p>;
        })}</section>}
        <div><button type="button" className="rounded-md border px-4 min-h-11" onClick={onClose}>Back</button></div>
      </div>
    </SheetContent>
  </Sheet>;
}

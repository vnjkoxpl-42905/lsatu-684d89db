/** Rapid-fire cards for the two ideas the whole bootcamp rests on. The front asks, the back gives the answer first and one short note under it. **Double asterisks** mark bold words in the note. */
export interface TermCard { id: string; front: string; answer: string; note: string }
export const termCards: TermCard[] = [
  { id: 'sufficient', front: 'Which kind of condition is enough, by itself, to guarantee the result?', answer: 'Sufficient condition', note: 'It goes on the left of the arrow.' },
  { id: 'necessary', front: 'Which kind of condition must be present for the result to happen?', answer: 'Necessary condition', note: 'It goes on the right of the arrow.' },
  { id: 'reverse', front: 'Can you read a rule from right to left?', answer: 'No.', note: '**If** A, then B does not tell you that **if** B, then A.' },
  { id: 'fact', front: 'Does “If A, then B” tell you that A is true?', answer: 'No.', note: 'It tells you what follows **if** A is true.' },
];

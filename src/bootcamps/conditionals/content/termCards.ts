/** Rapid-fire cards for the two ideas the whole bootcamp rests on. The front asks, the back gives the answer first and one short note under it. */
export interface TermCard { id: string; front: string; answer: string; note: string }
export const termCards: TermCard[] = [
  { id: 'sufficient', front: 'Which condition is enough on its own to guarantee the other one?', answer: 'Sufficient condition', note: 'It goes on the left.' },
  { id: 'necessary', front: 'Which condition is required for the other one to happen?', answer: 'Necessary condition', note: 'It goes on the right.' },
  { id: 'reverse', front: 'Can you reverse the arrow?', answer: 'No.', note: 'A rule only works in one direction.' },
  { id: 'fact', front: 'Does a rule say the left side is true?', answer: 'No.', note: 'It says what follows if the left side is true.' },
];

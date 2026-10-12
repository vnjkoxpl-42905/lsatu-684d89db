/** Rapid-fire cards for the two ideas the whole bootcamp rests on. One short prompt, one short answer. */
export interface TermCard { id: string; front: string; back: string }
export const termCards: TermCard[] = [
  { id: 'sufficient', front: 'Sufficient condition', back: 'Enough on its own to prove the other one. It goes on the left.' },
  { id: 'necessary', front: 'Necessary condition', back: 'Required for the other one. It goes on the right.' },
  { id: 'reverse', front: 'Can you reverse the arrow?', back: 'No. A rule only works in one direction.' },
  { id: 'fact', front: 'Does a rule say the left side is true?', back: 'No. It says what follows if the left side is true.' },
];

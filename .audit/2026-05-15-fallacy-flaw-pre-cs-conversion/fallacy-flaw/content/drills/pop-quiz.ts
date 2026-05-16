import type { PopQuizQuestion } from '../../types/drill';

export const popQuiz: PopQuizQuestion[] = [
  // ── Part 1 · Generic trigger phrases (8) ──
  { id: 'pq-1', partLabel: 'Part 1 · Generic triggers', prompt: 'Takes for granted that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?' },
  { id: 'pq-2', partLabel: 'Part 1 · Generic triggers', prompt: 'Fails to consider that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?' },
  { id: 'pq-3', partLabel: 'Part 1 · Generic triggers', prompt: 'Presumes that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?' },
  { id: 'pq-4', partLabel: 'Part 1 · Generic triggers', prompt: 'Overlooks the possibility that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?' },
  { id: 'pq-5', partLabel: 'Part 1 · Generic triggers', prompt: 'Ignores the possibility that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?' },
  { id: 'pq-6', partLabel: 'Part 1 · Generic triggers', prompt: 'Assumes that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?' },
  { id: 'pq-7', partLabel: 'Part 1 · Generic triggers', prompt: 'Fails to establish that X', type: 'assumption', test: 'Make X FALSE. Does the argument crash?' },
  { id: 'pq-8', partLabel: 'Part 1 · Generic triggers', prompt: 'Neglects to consider that Y', type: 'objection', test: 'Take Y to be TRUE. Does the conclusion die?' },

  // ── Part 2 · Real LSAT answer choices (8) ──
  {
    id: 'pq-9',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"The author fails to consider that there are probably species in existence that have not yet been identified."',
    type: 'objection',
    test: 'If TRUE that species exist not yet identified, would that weaken the conclusion?',
  },
  {
    id: 'pq-10',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Ignores the possibility that the bottle contained an acidic liquid other than vinegar."',
    type: 'objection',
    test: 'If TRUE that the bottle contained an acidic liquid other than vinegar, would that weaken the conclusion?',
  },
  {
    id: 'pq-11',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Assumes that the fact of a labeling error is proof of an intention to deceive."',
    type: 'assumption',
    test: 'If a labeling error is NOT proof of an intention to deceive, does the argument crash?',
  },
  {
    id: 'pq-12',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Ignores the possibility that some food additives are harmful to most people."',
    type: 'objection',
    test: 'If TRUE that some food additives are harmful to most people, would that weaken the conclusion?',
  },
  {
    id: 'pq-13',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Presumes that most consumers heed the warning labels on beverage containers."',
    type: 'assumption',
    test: 'If most consumers do NOT heed the warning labels, does the argument crash?',
  },
  {
    id: 'pq-14',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Fails to consider that the economy might not improve."',
    type: 'objection',
    test: 'If TRUE that the economy might not improve, would that weaken the conclusion?',
  },
  {
    id: 'pq-15',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Ignores the possibility that the city council is not the only body that can make such decisions."',
    type: 'objection',
    test: 'If TRUE that the city council is not the only body, would that weaken the conclusion?',
  },
  {
    id: 'pq-16',
    partLabel: 'Part 2 · Real LSAT choices',
    prompt: '"Assumes that the economy will improve in the near future."',
    type: 'assumption',
    test: 'If the economy will NOT improve in the near future, does the argument crash?',
  },
];

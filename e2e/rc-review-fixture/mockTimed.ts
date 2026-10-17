import type { TimedSectionController, TimedSectionState } from '@/lib/timedSectionController';
import type { RcPassage } from '@/features/rc/lib/rcTypes';
export const sittingId = '20000000-0000-4000-8000-000000000001';
const passage = { passageId: 7, preptest: 140, section: 1, setNumber: 1, title: 'Synthetic RC acceptance passage', topic: null,
  format: null, frameworks: [], difficulty: null, text: 'Passage A\n\nA synthetic passage discusses how researchers compare competing explanations. A useful explanation must account for the observations.\n\nPassage B\n\nAnother researcher argues that a useful test distinguishes the explanations through a new observation.', summaries: {},
  questions: [1, 2].map((position) => ({ questionId: 500 + position, position, questionType: 'Main Point', questionTypeFamily: 'Big Picture', difficulty: null,
    prompt: `Synthetic question ${position}: Which claim best represents the passage?`, correctAnswer: 'A', hasWrittenExplanation: false, explanationBlocks: null,
    totalResponses: null, features: [], choices: ['A','B','C','D','E'].map(letter => ({letter, text: `Synthetic choice ${letter} for question ${position}.`})) })) } as RcPassage;
let current: TimedSectionState = { snapshot: { sitting: { id: sittingId, owner_id: 'synthetic-owner', pt: 140, section: 1, kind: 'rc', phase: 'running', budget_ms: 2100000 }, pending: null },
  passages: [passage], questions: passage.questions.map(q => ({ qid: String(q.questionId), qnum: q.position, questionStem: q.prompt, stimulus: passage.text,
    answerChoices: Object.fromEntries(q.choices.map(c => [c.letter,c.text])), correctAnswer: 'A', qtype: 'RC', difficulty: 3 })),
  answers: Object.fromEntries(passage.questions.map(q => [String(q.questionId), { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [] }])), currentIndex: 0 } as unknown as TimedSectionState;
export const syntheticTimedController = {
  load: async () => current, pending: () => null, rejection: () => null,
  clock: () => ({ writer: current.snapshot.sitting.phase === 'complete' ? 'terminal' : 'active', remainingMs: 2100000, elapsedMs: 0 }),
  checkpoint: async (_state: TimedSectionState, index: number, answers: TimedSectionState['answers']) => { current = { ...current, currentIndex: index, answers }; return current; },
  control: async (_state: TimedSectionState, operation: string) => { current = { ...current, snapshot: { ...current.snapshot, sitting: { ...current.snapshot.sitting, phase: operation === 'pause' ? 'paused' : 'running' } } }; return current; },
  close: async () => { current = { ...current, snapshot: { ...current.snapshot, sitting: { ...current.snapshot.sitting, phase: 'complete' } } }; return current; },
  reportHref: () => '/timed-fixture-report',
} as unknown as TimedSectionController;

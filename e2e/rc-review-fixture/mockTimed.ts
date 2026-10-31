import type { TimedChildController, TimedChildState } from '@/lib/timedChildController';
import { initialState } from '@/features/rc/lib/rcSession';
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

let child: TimedChildState;
export const syntheticChildController = {
  load: async () => {
    child = { questions: current.questions, passages: [passage], answers: current.answers, currentIndex: 0, pending: null,
      snapshot: { parent: { id: 'synthetic-run', user_id: 'synthetic-owner', pt: 140, current_leg: 0, timed_phase: 'leg-running',
        timed_frozen_legs: [{ kind: 'rc' }], section_seconds: 2100 }, observedAt: 0 },
      view: { state: initialState([passage]), session: { id: 'synthetic-child-session' } },
    } as unknown as TimedChildState;
    return child;
  },
  pending: () => null,
  clock: () => ({ writer: 'active', remainingMs: 2100000, elapsedMs: 0, leaseExpired: false }),
  checkpoint: async (_state: TimedChildState, index: number, answers: TimedChildState['answers']) => { child = { ...child, currentIndex: index, answers }; return child; },
  control: async (_state: TimedChildState, operation: string) => { child = { ...child, snapshot: { ...child.snapshot, parent: { ...child.snapshot.parent, timed_phase: operation === 'pause' ? 'leg-paused' : 'leg-running' } } }; return child; },
  close: async () => { child = { ...child, snapshot: { ...child.snapshot, parent: { ...child.snapshot.parent, current_leg: 1 } }, view: null }; return child; },
} as unknown as TimedChildController;

// LR child runner over the real PT107 plankton question, where a student's repeated drags once garbled the passage.
import pt107 from '../../public/data/PT107-S1-LR.json';
const lrRaw = (pt107 as { questionNumber: number; stimulus: string; questionStem: string; answerChoices: Record<string, string>; correctAnswer: string; questionType: string; questionDifficulty: number }[]).find(row => row.questionNumber === 11)!;
const lrQuestion = { qid: 'PT107-S1-Q11', qnum: 11, pt: 107, section: 1, qtype: lrRaw.questionType, difficulty: lrRaw.questionDifficulty, stimulus: lrRaw.stimulus.split('\n').slice(1).join('\n'),
  questionStem: lrRaw.questionStem, answerChoices: lrRaw.answerChoices, correctAnswer: lrRaw.correctAnswer };
const lrScenario = new URLSearchParams(location.search).get('scenario');
let lrPending: { operation: string; commandId: string } | null = lrScenario === 'pending-on-load' ? { operation: 'checkpoint', commandId: 'saved-before-reload' } : null;
export const lrFixtureLog: string[] = []; (window as unknown as { lrFixtureLog: string[] }).lrFixtureLog = lrFixtureLog;
let lrChild: TimedChildState;
const lrBase = (): TimedChildState => ({ questions: [lrQuestion], passages: [], answers: lrChild?.answers ?? {}, currentIndex: 0, pending: lrPending,
  snapshot: { parent: { id: 'synthetic-run', user_id: 'synthetic-owner', pt: 107, current_leg: 0, timed_phase: 'leg-running', timed_frozen_legs: [{ kind: 'lr' }], section_seconds: 2100 }, observedAt: 0, rejection: null },
  view: { questions: [lrQuestion], session: { regulation_answered_qids: undefined } } } as unknown as TimedChildState);
export const syntheticLrChildController = {
  load: async () => { lrChild = lrBase(); return lrChild; },
  pending: () => lrPending,
  clock: () => ({ writer: 'active', remainingMs: 2100000, elapsedMs: 0, leaseExpired: false }),
  checkpoint: async (_state: TimedChildState, index: number, answers: TimedChildState['answers']) => {
    lrPending = { operation: 'checkpoint', commandId: crypto.randomUUID() }; lrFixtureLog.push('checkpoint-prepared');
    if (lrScenario === 'slow-save') await new Promise(resolve => setTimeout(resolve, 3500));
    lrPending = null; lrFixtureLog.push('checkpoint-acknowledged'); lrChild = { ...lrBase(), answers, currentIndex: index, pending: null }; return lrChild;
  },
  retry: async () => { lrFixtureLog.push('retry'); lrPending = null; lrChild = { ...lrBase(), answers: lrChild?.answers ?? {}, pending: null }; return lrChild; },
  control: async (state: TimedChildState) => state,
  close: async () => lrChild,
} as unknown as TimedChildController;

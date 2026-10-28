/**
 * The RC drill session state machine.
 *
 * Holds every passage's questions as one continuously numbered list, tracks what
 * the student has selected, crossed out, flagged and had revealed, and decides
 * when an attempt is written to the database. The three reveal modes differ only
 * in *when* the reveal happens; the shape of the state is the same for all.
 *
 *   unanswered -> selected -> (confirmed) -> revealed
 */
import type {
  RcDrillConfig,
  RcLetter,
  RcPassage,
  RcQuestion,
  RcRevealMode,
} from './rcTypes';

/** One question, flattened out of its passage, with its session-wide number. */
export interface RcSessionItem {
  question: RcQuestion;
  passage: RcPassage;
  /** 1-based across the whole session, not restarted per passage. */
  number: number;
  passageIndex: number;
}

export interface RcSessionState {
  items: RcSessionItem[];
  currentIndex: number;
  answers: Map<number, RcLetter>;
  eliminations: Map<number, RcLetter[]>;
  flagged: Set<number>;
  /** Questions whose feedback is showing. */
  revealed: Set<number>;
  /** Questions already written to rc_attempts in this session. */
  recorded: Set<number>;
  /** Passages switched into review state (per_passage mode). */
  reviewedPassages: Set<number>;
  paused: boolean;
  submitted: boolean;
}

export function buildItems(passages: RcPassage[]): RcSessionItem[] {
  const items: RcSessionItem[] = [];
  let number = 1;
  passages.forEach((passage, passageIndex) => {
    for (const question of passage.questions) {
      items.push({ question, passage, number: number++, passageIndex });
    }
  });
  return items;
}

export function initialState(passages: RcPassage[]): RcSessionState {
  return {
    items: buildItems(passages),
    currentIndex: 0,
    answers: new Map(),
    eliminations: new Map(),
    flagged: new Set(),
    revealed: new Set(),
    recorded: new Set(),
    reviewedPassages: new Set(),
    paused: false,
    submitted: false,
  };
}

/* ------------------------------------------------------------------ queries */

export const currentItem = (s: RcSessionState): RcSessionItem | undefined => s.items[s.currentIndex];

export function itemsForPassage(s: RcSessionState, passageId: number): RcSessionItem[] {
  return s.items.filter((i) => i.passage.passageId === passageId);
}

/** Distinct passages in session order. */
export function passageOrder(s: RcSessionState): RcPassage[] {
  const seen = new Map<number, RcPassage>();
  for (const i of s.items) if (!seen.has(i.passage.passageId)) seen.set(i.passage.passageId, i.passage);
  return [...seen.values()];
}

export const isAnswered = (s: RcSessionState, questionId: number) => s.answers.has(questionId);

/** True once every question of the passage carries a selection. */
export function passageComplete(s: RcSessionState, passageId: number): boolean {
  const items = itemsForPassage(s, passageId);
  return items.length > 0 && items.every((i) => s.answers.has(i.question.questionId));
}

export function unansweredCount(s: RcSessionState): number {
  return s.items.filter((i) => !s.answers.has(i.question.questionId)).length;
}

export function isCorrect(item: RcSessionItem, selected: RcLetter | null | undefined): boolean | null {
  if (!selected) return null;
  return selected === item.question.correctAnswer;
}

/**
 * Whether feedback should be visible for a question right now.
 * per_question reveals one at a time, per_passage a passage at a time, and
 * end_of_set nothing at all until the session is submitted.
 */
export function isRevealed(s: RcSessionState, mode: RcRevealMode, item: RcSessionItem): boolean {
  if (s.submitted) return true;
  switch (mode) {
    case 'per_question':
      return s.revealed.has(item.question.questionId);
    case 'per_passage':
      return s.reviewedPassages.has(item.passage.passageId);
    case 'end_of_set':
      return false;
  }
}

/**
 * The pager row: every question in the session gets its own pill, with a
 * divider between passages — the official interface shows all of them at once
 * (1-7 | 8-15 | 16-21 | 22-27) rather than collapsing the passages you are not
 * currently in, so a student can see the whole section's shape and jump
 * anywhere in it.
 */
export interface RcPagerEntry {
  kind: 'question' | 'divider';
  passageId: number;
  /** Index into items. -1 for a divider, which is not navigable. */
  index: number;
  label: string;
  questionId?: number;
  sourceLabel?: string;
  passageLabel?: string;
}

export function pagerEntries(s: RcSessionState): RcPagerEntry[] {
  const entries: RcPagerEntry[] = [];

  for (const passage of passageOrder(s)) {
    const items = itemsForPassage(s, passage.passageId);
    if (items.length === 0) continue;

    if (entries.length > 0) {
      entries.push({
        kind: 'divider',
        passageId: passage.passageId,
        index: -1,
        label: '',
      });
    }

    for (const item of items) {
      entries.push({
        kind: 'question',
        passageId: passage.passageId,
        index: s.items.indexOf(item),
        label: String(item.number),
        questionId: item.question.questionId,
        sourceLabel: `PT ${passage.preptest} · Section ${passage.section} · Passage ${passage.setNumber} · Question ${item.question.position}`,
        passageLabel: `PT ${passage.preptest} · Section ${passage.section} · Passage ${passage.setNumber}${passage.title ? ` · ${passage.title}` : ''}`,
      });
    }
  }
  return entries;
}

/* ---------------------------------------------------------------- reduction */

export type RcSessionAction =
  | { type: 'goto'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'select'; questionId: number; letter: RcLetter }
  | { type: 'toggleElimination'; questionId: number; letter: RcLetter }
  | { type: 'toggleFlag'; questionId: number }
  | { type: 'reveal'; questionId: number }
  | { type: 'reviewPassage'; passageId: number }
  | { type: 'markRecorded'; questionIds: number[] }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'submit' }
  | { type: 'restore'; state: Partial<RcSessionState> };

export function rcSessionReducer(state: RcSessionState, action: RcSessionAction): RcSessionState {
  switch (action.type) {
    case 'goto':
      return { ...state, currentIndex: Math.max(0, Math.min(action.index, state.items.length - 1)) };

    case 'next':
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, state.items.length - 1) };

    case 'prev':
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };

    case 'select': {
      // Selecting a crossed-out choice un-crosses it.
      const eliminations = new Map(state.eliminations);
      const current = eliminations.get(action.questionId) ?? [];
      if (current.includes(action.letter)) {
        eliminations.set(
          action.questionId,
          current.filter((l) => l !== action.letter),
        );
      }
      const answers = new Map(state.answers);
      answers.set(action.questionId, action.letter);
      return { ...state, answers, eliminations };
    }

    case 'toggleElimination': {
      const eliminations = new Map(state.eliminations);
      const current = eliminations.get(action.questionId) ?? [];
      eliminations.set(
        action.questionId,
        current.includes(action.letter)
          ? current.filter((l) => l !== action.letter)
          : [...current, action.letter],
      );
      return { ...state, eliminations };
    }

    case 'toggleFlag': {
      const flagged = new Set(state.flagged);
      if (flagged.has(action.questionId)) flagged.delete(action.questionId);
      else flagged.add(action.questionId);
      return { ...state, flagged };
    }

    case 'reveal': {
      const revealed = new Set(state.revealed);
      revealed.add(action.questionId);
      return { ...state, revealed };
    }

    case 'reviewPassage': {
      const reviewedPassages = new Set(state.reviewedPassages);
      reviewedPassages.add(action.passageId);
      return { ...state, reviewedPassages };
    }

    case 'markRecorded': {
      const recorded = new Set(state.recorded);
      for (const id of action.questionIds) recorded.add(id);
      return { ...state, recorded };
    }

    case 'setPaused':
      return { ...state, paused: action.paused };

    case 'submit':
      return { ...state, submitted: true, paused: false };

    case 'restore':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

/** Default per-passage budget when a session is timed: 8:45. */
export const DEFAULT_SECONDS_PER_PASSAGE = 525;

export function totalBudgetSeconds(config: RcDrillConfig, passageCount: number): number | null {
  if (config.timing.mode !== 'per_passage_budget') return null;
  return config.timing.secondsPerPassage * passageCount;
}

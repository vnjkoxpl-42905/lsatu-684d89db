/**
 * Lesson state for "Engaging With The Passage".
 *
 * One reducer owns everything the footer needs to derive its single primary
 * action, so no component reaches out and mutates the Continue button. The
 * navigation rules here are the ones the prototype was verified against:
 * forward jumps stop at the furthest chapter actually reached, Back never
 * re-enters a timed read, and a chapter's completion pulse fires only on a
 * genuine forward crossing out of it.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  CHAPTERS,
  FIRST_WRITE_INDEX,
  SCREENS,
  TOTAL_SCREENS,
  WRITE_MIN_CHARS,
  type Screen,
} from './content';
import {
  AT_KEY,
  COMPLETED_KEY,
  FURTHEST_KEY,
  localAdapter,
  safeIndex,
  type LessonData,
  type PersistenceAdapter,
} from './persistence';

interface LessonState {
  hydrated: boolean;
  data: LessonData;
  index: number;
  furthest: number;
  celebrated: number[];
  /** Chapter index whose segment should pop once, consumed by the progress strip. */
  pulseChapter: number | null;
  finished: boolean;
  /** Per-screen state, cleared on every screen change. */
  beatsShown: number;
  picks: Record<number, number>;
  writeSkipped: boolean;
  revealed: boolean;
  /** Bumped on every completed save attempt so the write screen can react honestly. */
  saveToken: number;
  saveOk: boolean;
  writeSavePending: boolean;
  overlayOpen: boolean;
  tocOpen: boolean;
  /** Set by a Contents jump so the new screen's heading takes focus once. */
  focusHeading: boolean;
  announcement: string;
  urgentAnnouncement: string;
}

type Action =
  | { type: 'HYDRATE'; data: LessonData }
  | { type: 'GO'; delta: number }
  | { type: 'JUMP'; index: number }
  | { type: 'ADVANCE_BEAT' }
  | { type: 'PICK'; beatIndex: number; optionIndex: number; optionText: string }
  | { type: 'SET_WRITE'; storageKey: string; text: string }
  | { type: 'SKIP_WRITE' }
  | { type: 'REVEAL' }
  | { type: 'CONSUME_PULSE' }
  | { type: 'CONSUME_HEADING_FOCUS' }
  | { type: 'SET_OVERLAY'; open: boolean }
  | { type: 'SET_TOC'; open: boolean }
  | { type: 'FINISH'; completedAt: string }
  | { type: 'SAVE_RESULT'; ok: boolean }
  | { type: 'ANNOUNCE'; text: string; urgent?: boolean };

const FRESH_SCREEN = {
  beatsShown: 0,
  picks: {} as Record<number, number>,
  writeSkipped: false,
  revealed: false,
} satisfies Partial<LessonState>;

const initialState: LessonState = {
  hydrated: false,
  data: {},
  index: 0,
  furthest: 0,
  celebrated: [],
  pulseChapter: null,
  finished: false,
  ...FRESH_SCREEN,
  saveToken: 0,
  saveOk: false,
  writeSavePending: false,
  overlayOpen: false,
  tocOpen: false,
  focusHeading: false,
  announcement: '',
  urgentAnnouncement: '',
};

export function chapterOf(index: number): number {
  return SCREENS[index].chapterIndex;
}

function firstScreenOfChapter(chapterIndex: number): number {
  return SCREENS.findIndex((entry) => entry.chapterIndex === chapterIndex);
}

/**
 * A walkthrough always arrives with its first beat already on screen; every
 * other screen type has no beats. Continue reveals the next one from there.
 */
function initialBeats(index: number): number {
  return SCREENS[index].screen.type === 'walk' ? 1 : 0;
}

/** Move to `index`, recording position and the furthest point ever reached. */
function land(
  state: LessonState,
  index: number,
  pulseChapter: number | null,
  focusHeading = false,
): LessonState {
  const furthest = Math.max(state.furthest, index);
  return {
    ...state,
    ...FRESH_SCREEN,
    beatsShown: initialBeats(index),
    focusHeading,
    index,
    furthest,
    pulseChapter,
    finished: false,
    data: { ...state.data, [AT_KEY]: index, [FURTHEST_KEY]: furthest },
    announcement: `Chapter ${chapterOf(index) + 1} of ${CHAPTERS.length}: ${
      CHAPTERS[chapterOf(index)].name
    }.`,
  };
}

function reducer(state: LessonState, action: Action): LessonState {
  switch (action.type) {
    case 'HYDRATE': {
      const at = safeIndex(action.data[AT_KEY]) ?? 0;
      const furthest = Math.max(safeIndex(action.data[FURTHEST_KEY]) ?? 0, at);
      return {
        ...state,
        hydrated: true,
        data: { ...action.data, [AT_KEY]: at, [FURTHEST_KEY]: furthest },
        index: at,
        furthest,
        beatsShown: initialBeats(at),
      };
    }

    case 'GO': {
      const screen = SCREENS[state.index].screen;
      // On a walkthrough, Continue means "next beat" until the beats run out.
      if (action.delta > 0 && screen.type === 'walk' && state.beatsShown < screen.beats.length) {
        return { ...state, beatsShown: state.beatsShown + 1 };
      }
      let next = state.index + action.delta;
      // Back never re-enters a timed read.
      if (action.delta < 0) {
        while (next >= 0 && SCREENS[next].screen.type === 'read') next -= 1;
      }
      if (next >= TOTAL_SCREENS) return state; // Finish is an explicit action.
      if (next < 0) return state;

      const fromChapter = chapterOf(state.index);
      const crossesForward = action.delta > 0 && chapterOf(next) !== fromChapter;
      const shouldPulse = crossesForward && !state.celebrated.includes(fromChapter);
      const celebrated = shouldPulse ? [...state.celebrated, fromChapter] : state.celebrated;
      return { ...land(state, next, shouldPulse ? fromChapter : null), celebrated };
    }

    case 'JUMP': {
      // Forward jumps stop at the furthest chapter reached; backward is free.
      if (chapterOf(action.index) > chapterOf(state.furthest)) return state;
      return land(state, action.index, null, true);
    }

    case 'ADVANCE_BEAT':
      return { ...state, beatsShown: state.beatsShown + 1 };

    case 'PICK':
      return {
        ...state,
        picks: { ...state.picks, [action.beatIndex]: action.optionIndex },
        data: { ...state.data, [`pick-${state.index}-${action.beatIndex}`]: action.optionText },
      };

    case 'SET_WRITE':
      return {
        ...state,
        writeSavePending: true,
        data: { ...state.data, [action.storageKey]: action.text },
      };

    case 'SKIP_WRITE':
      return { ...state, writeSkipped: true };

    case 'REVEAL':
      return { ...state, revealed: true, announcement: 'Response revealed below.' };

    case 'CONSUME_PULSE':
      return { ...state, pulseChapter: null };

    case 'CONSUME_HEADING_FOCUS':
      return { ...state, focusHeading: false };

    // Both of these are driven by effects, so an unchanged value must return the
    // identical state object or the effect re-runs forever.
    case 'SET_OVERLAY':
      return state.overlayOpen === action.open ? state : { ...state, overlayOpen: action.open };

    case 'SET_TOC':
      return state.tocOpen === action.open ? state : { ...state, tocOpen: action.open };

    case 'FINISH': {
      const lastChapter = CHAPTERS.length - 1;
      return {
        ...state,
        finished: true,
        celebrated: state.celebrated.includes(lastChapter)
          ? state.celebrated
          : [...state.celebrated, lastChapter],
        pulseChapter: lastChapter,
        data: { ...state.data, [COMPLETED_KEY]: action.completedAt },
        announcement: 'Lesson complete.',
      };
    }

    case 'SAVE_RESULT':
      return {
        ...state,
        saveToken: state.saveToken + 1,
        saveOk: action.ok,
        writeSavePending: false,
      };

    case 'ANNOUNCE':
      return action.urgent
        ? { ...state, urgentAnnouncement: action.text }
        : { ...state, announcement: action.text };

    default:
      return state;
  }
}

interface LessonContextValue {
  state: LessonState;
  screen: Screen;
  chapterIndex: number;
  furthestChapter: number;
  isFirstWrite: boolean;
  go: (delta: number) => void;
  jumpToChapter: (chapterIndex: number) => void;
  setWrite: (storageKey: string, text: string) => void;
  skipWrite: () => void;
  reveal: () => void;
  pick: (beatIndex: number, optionIndex: number, optionText: string) => void;
  consumePulse: () => void;
  consumeHeadingFocus: () => void;
  setOverlay: (open: boolean) => void;
  setToc: (open: boolean) => void;
  finish: () => void;
  announce: (text: string, urgent?: boolean) => void;
}

const LessonContext = createContext<LessonContextValue | null>(null);

export function LessonProvider({
  adapter = localAdapter,
  children,
}: {
  adapter?: PersistenceAdapter;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const adapterRef = useRef(adapter);
  const latestDataRef = useRef(state.data);
  adapterRef.current = adapter;
  latestDataRef.current = state.data;

  useEffect(() => {
    let alive = true;
    adapterRef.current.load().then((data) => {
      if (alive) dispatch({ type: 'HYDRATE', data });
    });
    return () => {
      alive = false;
    };
  }, [adapter]);

  // Single write path: every change to the record is persisted, and the result
  // is reported back so the "Saved" pill can only ever reflect a real save.
  const lastPersisted = useRef<string>('');
  useEffect(() => {
    if (!state.hydrated) return;
    const serialized = JSON.stringify(state.data);
    if (serialized === lastPersisted.current) return;
    let alive = true;
    adapterRef.current.save(state.data).then((ok) => {
      if (ok) lastPersisted.current = serialized;
      if (alive) dispatch({ type: 'SAVE_RESULT', ok });
    });
    return () => {
      alive = false;
    };
  }, [state.data, state.hydrated]);

  // Closing the tab can happen between a React state update and the normal
  // persistence effect. Flush the latest snapshot while the page is still
  // alive; each adapter writes the browser mirror synchronously before waiting
  // on the cloud request.
  useEffect(() => {
    const flush = () => {
      if (state.hydrated) void adapterRef.current.save(latestDataRef.current);
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [state.hydrated]);

  // Every action closes over `dispatch` alone, so these identities are stable.
  // Effects depend on them; if they changed each render the effects would loop.
  const actions = useMemo(
    () => ({
      go: (delta: number) => dispatch({ type: 'GO' as const, delta }),
      jumpToChapter: (chapterIndex: number) => {
        const target = firstScreenOfChapter(chapterIndex);
        if (target >= 0) dispatch({ type: 'JUMP', index: target });
      },
      setWrite: (storageKey: string, text: string) =>
        dispatch({ type: 'SET_WRITE', storageKey, text }),
      skipWrite: () => dispatch({ type: 'SKIP_WRITE' }),
      reveal: () => dispatch({ type: 'REVEAL' }),
      pick: (beatIndex: number, optionIndex: number, optionText: string) =>
        dispatch({ type: 'PICK', beatIndex, optionIndex, optionText }),
      consumePulse: () => dispatch({ type: 'CONSUME_PULSE' }),
      consumeHeadingFocus: () => dispatch({ type: 'CONSUME_HEADING_FOCUS' }),
      setOverlay: (open: boolean) => dispatch({ type: 'SET_OVERLAY', open }),
      setToc: (open: boolean) => dispatch({ type: 'SET_TOC', open }),
      finish: () => dispatch({ type: 'FINISH', completedAt: new Date().toISOString() }),
      announce: (text: string, urgent?: boolean) => dispatch({ type: 'ANNOUNCE', text, urgent }),
    }),
    [],
  );

  const value = useMemo<LessonContextValue>(() => {
    const entry = SCREENS[state.index];
    return {
      state,
      screen: entry.screen,
      chapterIndex: entry.chapterIndex,
      furthestChapter: chapterOf(state.furthest),
      isFirstWrite: state.index === FIRST_WRITE_INDEX,
      ...actions,
    };
  }, [state, actions]);

  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}

export function useLesson(): LessonContextValue {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error('useLesson must be used inside <LessonProvider>');
  return ctx;
}

export interface PrimaryAction {
  label: string;
  /** Rendered with a chevron when true. */
  chevron: boolean;
  disabled: boolean;
  hint: string;
  onAct: () => void;
}

/**
 * The one derived description of the footer's primary button. Every screen type
 * expresses its gating here rather than reaching into the button.
 */
export function usePrimaryAction(): PrimaryAction {
  const { state, screen, go, finish, isFirstWrite } = useLesson();
  const isLast = state.index === TOTAL_SCREENS - 1;

  return useMemo(() => {
    if (state.finished) {
      return { label: 'Lesson complete', chevron: false, disabled: true, hint: '', onAct: () => {} };
    }

    const act = isLast ? finish : () => go(1);

    if (screen.type === 'instructions') {
      return { label: screen.ctaLabel, chevron: true, disabled: false, hint: '', onAct: act };
    }

    if (screen.type === 'write') {
      const text = String(state.data[screen.storageKey] ?? '').trim();
      const met = text.length >= WRITE_MIN_CHARS;
      const unlocked = met || state.writeSkipped;
      return {
        label: isLast ? 'Finish lesson' : 'Continue',
        chevron: !isLast,
        disabled: !unlocked,
        hint: unlocked
          ? ''
          : isFirstWrite
            ? 'Write your answer to continue.'
            : 'Write your answer, or skip.',
        onAct: act,
      };
    }

    if (screen.type === 'walk') {
      const beatIndex = state.beatsShown - 1;
      const current = screen.beats[beatIndex];
      const awaitingPick =
        current?.kind === 'checkin' && state.picks[beatIndex] === undefined;
      const beatsRemain = state.beatsShown < screen.beats.length;
      return {
        label: beatsRemain ? 'Continue' : isLast ? 'Finish lesson' : 'Next chapter',
        chevron: !isLast,
        disabled: awaitingPick,
        hint: awaitingPick ? 'Commit to an answer before you see mine.' : '',
        onAct: beatsRemain ? () => go(1) : act,
      };
    }

    return {
      label: isLast ? 'Finish lesson' : 'Continue',
      chevron: !isLast,
      disabled: false,
      hint: '',
      onAct: act,
    };
  }, [state, screen, go, finish, isFirstWrite, isLast]);
}

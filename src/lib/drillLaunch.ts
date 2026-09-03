/**
 * A Drill Launch is everything the runner needs to be told in order to start a
 * drill: which kind of drill, and the name of the particular run. It travels in
 * the URL and nowhere else.
 *
 * It names a run; it does not contain one. The ordered question list, every
 * attempt, the position and the clock already spent live in the Run Record
 * (`drillResumeSession`), which the runner adopts whole on resume. That is why
 * a launch can be short: refresh only ever destroyed the app's ability to work
 * out *which* run the student was in, never the run itself.
 *
 * See `docs/adr/0016-a-drill-link-names-a-run-it-does-not-contain-one.md`.
 *
 * This module is the codec — `launchDrill` writes a launch to a query string,
 * `parseDrillLaunch` reads one back, and the pair round-trips. `toDrillRouteState`
 * is the translator that hands `Drill.tsx` the shape it already expects, so the
 * page does not have to change yet.
 */

import type {
  DrillMode,
  FullSectionConfig,
  TimerMode,
  TypeDrillConfig,
} from '@/types/drill';
import type { DrillRouteState } from '@/lib/drillRouteState';

/**
 * Switches that mean the same thing whatever kind of drill is running. Anything
 * that belongs to one kind lives inside that kind instead, so that a link
 * cannot ask for a section timer on a Smart Drill.
 */
export interface DrillLaunchOptions {
  /** Where the runner's exit sends the student. Must be an app-relative path. */
  returnTo?: string;
  /** Heading shown while the drill runs. */
  label?: string;
  /** Open on this question rather than the first. Someone jumping deliberately. */
  initialIndex?: number;
  /**
   * Presentation only: render the adaptive Smart-Drill chrome even for a fixed
   * queue, so a hand-picked question looks identical to an Auto run.
   */
  present?: 'smart';
}

/**
 * Which test run and which leg of it this section belongs to. A practice-test
 * leg is a Section with a run attached, not a kind of its own: it runs, looks
 * and closes out identically, and the only difference is that something is
 * waiting on the result. Losing it on refresh is what left a practice test
 * permanently open, because the close-out had nothing to write against.
 */
export interface PtLegRef {
  runId: string;
  legIndex: number;
}

/**
 * What a legacy link said that the canonical grammar has no place for, because
 * the canonical grammar expresses it as a kind instead. Exists purely so the
 * translator can reproduce today's route state byte for byte during the
 * migration, and disappears with the legacy branch.
 */
interface LegacyCarry {
  mode: DrillMode;
  sealed: boolean;
  isGuidedDrill: boolean;
  guidedDurationMinutes?: number;
}

export type DrillLaunchBody =
  /** The app picks. One continuous adaptive run per student. */
  | { kind: 'smart-drill' }
  /** A real PT section, optionally timed and optionally sealed. */
  | {
      kind: 'section';
      pt: number;
      section: number;
      /**
       * The clock this section runs on. Omitted means the standard 35. A
       * section can also be sat at 52.5, at 70, or with no clock at all, which
       * is how an accommodation is honoured, so this cannot be reduced to a
       * number of minutes.
       */
      timerMode?: Exclude<TimerMode, '35'>;
      /** Only meaningful with a `custom` timer. */
      minutes?: number;
      /**
       * Answer and Explanation are never rendered, for the whole run. A section
       * assigned as a measurement stops measuring the moment the student can
       * check question 3 before answering question 4. Set by whoever assigns
       * the section, never by the student.
       */
      sealed?: boolean;
      ptLeg?: PtLegRef;
    }
  /** A set the student saved. Named by its row, so editing the set is reflected. */
  | { kind: 'saved-set'; setId: string }
  /** A classroom assignment. Its row owns the question list. */
  | { kind: 'assignment'; assignmentId: string; guidedSetId?: string }
  /** A guided drill, optionally the one handed over as an assignment. */
  | {
      kind: 'guided-drill';
      drillId?: string;
      assignmentId?: string;
      durationMinutes?: number;
    }
  /** A bootcamp module's practice set, named by its pool slug. */
  | { kind: 'practice-set'; slug: string; source?: string }
  /**
   * One day of a bootcamp, either its homework or its practice. The questions
   * are picked fresh each time from that day's filters, so the day and the part
   * are the run's real name — "Day 3 homework" — and the picked list is not.
   * Naming it this way means the link survives a change to how the picker
   * works, and the Run Record still holds the questions the student actually
   * got.
   *
   * Its Run Record is keyed by the day and part. The old question-list key is
   * read only as a migration fallback for runs started before that identity
   * existed.
   */
  | { kind: 'bootcamp-day'; day: number; part: 'homework' | 'practice' }
  /**
   * An ad-hoc list of specific questions: a question-finder jump, "redo this
   * one", a generated micro-drill. It has no row to point at, so the list is
   * the name.
   */
  | {
      kind: 'questions';
      qids: string[];
      /**
       * @deprecated Set only when this came from a legacy link, and only so the
       * translator can reproduce today's route state exactly. Change two drops
       * it, when guided drills, assignments and practice sets stop arriving as
       * a bare list of qids and start arriving as their own kinds.
       */
      legacy?: LegacyCarry;
    }
  /**
   * "Six Flaw questions, medium." What the student asked for, rather than what
   * it happened to draw. Refresh returns the same questions because the Run
   * Record holds the queue; the filter only has to survive as the run's name.
   */
  | {
      kind: 'filter';
      count: number;
      qtypes?: string[];
      difficulties?: number[];
      pts?: number[];
      sections?: number[];
      qfeatures?: string[];
    };

export type DrillLaunch = DrillLaunchBody & { options?: DrillLaunchOptions };

/** The kinds whose question list lives in a row we have to read before starting. */
const KINDS_NEEDING_RESOLUTION = new Set([
  'saved-set',
  'assignment',
  'guided-drill',
  'practice-set',
  'bootcamp-day',
]);

export function launchNeedsResolution(launch: DrillLaunch): boolean {
  return KINDS_NEEDING_RESOLUTION.has(launch.kind);
}

/** Thrown when a link asks for something that kind of drill cannot have. */
export class DrillLaunchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DrillLaunchError';
  }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

function setList(params: URLSearchParams, key: string, values?: Array<string | number>) {
  if (values && values.length > 0) params.set(key, values.join(','));
}

/**
 * Write a launch as a query string. Never needs to read anything: writing a
 * link is always possible from the launch alone, which is what lets `/drill`
 * canonicalize its own URL on arrival.
 *
 * Returns the query string without a leading `?`.
 */
export function launchDrill(launch: DrillLaunch): string {
  const p = new URLSearchParams();
  p.set('drill', launch.kind);

  switch (launch.kind) {
    case 'smart-drill':
      break;
    case 'section':
      p.set('pt', String(launch.pt));
      p.set('section', String(launch.section));
      if (launch.timerMode) p.set('timer', launch.timerMode);
      if (launch.minutes) p.set('minutes', String(launch.minutes));
      if (launch.sealed) p.set('sealed', '1');
      if (launch.ptLeg) {
        p.set('runId', launch.ptLeg.runId);
        p.set('leg', String(launch.ptLeg.legIndex));
      }
      break;
    case 'saved-set':
      p.set('set', launch.setId);
      break;
    case 'assignment':
      p.set('assignment', launch.assignmentId);
      if (launch.guidedSetId) p.set('guidedSet', launch.guidedSetId);
      break;
    case 'guided-drill':
      if (launch.drillId) p.set('guidedDrill', launch.drillId);
      if (launch.assignmentId) p.set('assignment', launch.assignmentId);
      if (launch.durationMinutes) p.set('minutes', String(launch.durationMinutes));
      break;
    case 'practice-set':
      p.set('slug', launch.slug);
      if (launch.source) p.set('source', launch.source);
      break;
    case 'bootcamp-day':
      p.set('day', String(launch.day));
      p.set('part', launch.part);
      break;
    case 'questions':
      p.set('qids', launch.qids.join(','));
      break;
    case 'filter':
      p.set('count', String(launch.count));
      setList(p, 'qtypes', launch.qtypes);
      setList(p, 'difficulties', launch.difficulties);
      setList(p, 'pts', launch.pts);
      setList(p, 'sections', launch.sections);
      setList(p, 'qfeatures', launch.qfeatures);
      break;
  }

  const o = launch.options;
  if (o?.returnTo) p.set('returnTo', o.returnTo);
  if (o?.label) p.set('label', o.label);
  if (o?.initialIndex != null) p.set('initialIndex', String(o.initialIndex));
  if (o?.present) p.set('present', o.present);

  return p.toString();
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

function positiveNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function nonNegativeInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const TIMER_MODES = ['52.5', '70', 'custom', 'unlimited'] as const;

function readTimerMode(value: string | null): Exclude<TimerMode, '35'> | undefined {
  return (TIMER_MODES as readonly string[]).includes(value ?? '')
    ? (value as Exclude<TimerMode, '35'>)
    : undefined;
}

function list(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function numberList(value: string | null): number[] {
  return list(value)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function undefinedIfEmpty(options: DrillLaunchOptions): DrillLaunchOptions | undefined {
  return Object.keys(options).length > 0 ? options : undefined;
}

function readOptions(p: URLSearchParams): DrillLaunchOptions | undefined {
  const options: DrillLaunchOptions = {};
  const returnTo = safeReturnTo(p.get('returnTo'));
  if (returnTo) options.returnTo = returnTo;
  const label = p.get('label') || undefined;
  if (label) options.label = label;
  const initialIndex = nonNegativeInt(p.get('initialIndex'));
  if (initialIndex != null) options.initialIndex = initialIndex;
  if (p.get('present') === 'smart') options.present = 'smart';
  return undefinedIfEmpty(options);
}

/**
 * A switch that changes what the student experiences, sent to a kind that has
 * no such switch, is rejected rather than ignored. A sealed section that
 * silently is not sealed is a broken measurement. Decoration (a heading, a back
 * link) is ignored, because nothing about the run depends on it.
 *
 * Legacy links are exempt: they are parsed permissively, exactly as before, so
 * that nothing already in a student's inbox starts erroring.
 */
function rejectForeignSwitches(kind: string, p: URLSearchParams) {
  const forbid = (param: string, allowed: string[]) => {
    if (p.has(param) && !allowed.includes(kind)) {
      throw new DrillLaunchError(
        `'${param}' does not belong to a ${kind} launch`,
      );
    }
  };
  forbid('sealed', ['section']);
  forbid('pt', ['section']);
  forbid('section', ['section']);
  forbid('minutes', ['section', 'guided-drill']);
  forbid('qids', ['questions']);
  forbid('count', ['filter']);
}

function parseCanonical(p: URLSearchParams): DrillLaunch {
  const kind = p.get('drill') as DrillLaunchBody['kind'];
  rejectForeignSwitches(kind, p);
  const options = readOptions(p);

  switch (kind) {
    case 'smart-drill':
      return { kind, options };

    case 'section': {
      const pt = positiveNumber(p.get('pt'));
      const section = positiveNumber(p.get('section'));
      if (!pt || !section) {
        throw new DrillLaunchError('a section launch needs both pt and section');
      }
      const runId = p.get('runId') || undefined;
      const legIndex = nonNegativeInt(p.get('leg'));
      return {
        kind,
        pt,
        section,
        timerMode: readTimerMode(p.get('timer')),
        minutes: positiveNumber(p.get('minutes')),
        sealed: p.get('sealed') === '1' ? true : undefined,
        ptLeg: runId && legIndex != null ? { runId, legIndex } : undefined,
        options,
      };
    }

    case 'saved-set': {
      const setId = p.get('set');
      if (!setId) throw new DrillLaunchError('a saved-set launch needs a set id');
      return { kind, setId, options };
    }

    case 'assignment': {
      const assignmentId = p.get('assignment');
      if (!assignmentId) {
        throw new DrillLaunchError('an assignment launch needs an assignment id');
      }
      return {
        kind,
        assignmentId,
        guidedSetId: p.get('guidedSet') || undefined,
        options,
      };
    }

    case 'guided-drill': {
      const drillId = p.get('guidedDrill') || undefined;
      const assignmentId = p.get('assignment') || undefined;
      if (!drillId && !assignmentId) {
        throw new DrillLaunchError(
          'a guided-drill launch needs a drill id or an assignment id',
        );
      }
      return {
        kind,
        drillId,
        assignmentId,
        durationMinutes: positiveNumber(p.get('minutes')),
        options,
      };
    }

    case 'practice-set': {
      const slug = p.get('slug');
      if (!slug) throw new DrillLaunchError('a practice-set launch needs a slug');
      return { kind, slug, source: p.get('source') || undefined, options };
    }

    case 'bootcamp-day': {
      const day = positiveNumber(p.get('day'));
      const part = p.get('part');
      if (!day || (part !== 'homework' && part !== 'practice')) {
        throw new DrillLaunchError(
          'a bootcamp-day launch needs a day and a part of homework or practice',
        );
      }
      return { kind, day, part, options };
    }

    case 'questions': {
      const qids = list(p.get('qids'));
      if (qids.length === 0) {
        throw new DrillLaunchError('a questions launch needs at least one qid');
      }
      return { kind, qids, options };
    }

    case 'filter': {
      const count = positiveNumber(p.get('count'));
      if (!count) throw new DrillLaunchError('a filter launch needs a count');
      const launch: DrillLaunch = { kind, count, options };
      const qtypes = list(p.get('qtypes'));
      if (qtypes.length) launch.qtypes = qtypes;
      const difficulties = numberList(p.get('difficulties'));
      if (difficulties.length) launch.difficulties = difficulties;
      const pts = numberList(p.get('pts'));
      if (pts.length) launch.pts = pts;
      const sections = numberList(p.get('sections'));
      if (sections.length) launch.sections = sections;
      const qfeatures = list(p.get('qfeatures'));
      if (qfeatures.length) launch.qfeatures = qfeatures;
      return launch;
    }

    default:
      throw new DrillLaunchError(`unknown drill kind '${kind}'`);
  }
}

/**
 * Today's grammar, kept so that assigned links already sitting in a student's
 * inbox keep opening. Never written — `launchDrill` only emits the canonical
 * form. Deletable once the old links have aged out.
 *
 * Deliberately permissive, matching `getResolvedDrillRouteState` exactly: a
 * legacy link that carried a switch it had no business carrying was ignored
 * before and is ignored now.
 */
function parseLegacy(p: URLSearchParams): DrillLaunch | null {
  const mode = p.get('mode');
  if (!mode) return null;

  const returnTo = safeReturnTo(p.get('returnTo'));
  const sealed = p.get('sealed') === '1';

  if (mode === 'full-section') {
    const pt = positiveNumber(p.get('pt'));
    const section = positiveNumber(p.get('section'));
    if (pt && section) {
      // Today's section branch reads a heading and does not read `present`.
      return {
        kind: 'section',
        pt,
        section,
        minutes: positiveNumber(p.get('minutes')),
        sealed: sealed || undefined,
        options: undefinedIfEmpty({
          ...(returnTo ? { returnTo } : {}),
          ...(p.get('label') ? { label: p.get('label') as string } : {}),
        }),
      };
    }
    // Falls through exactly as before: a malformed section link became an empty
    // type-drill rather than an error.
  }

  // ...and today's generic branch is the mirror image: it reads `present` and
  // never sets a heading, which is why `focus` is not read here even though
  // several launch sites send it.
  return {
    kind: 'questions',
    qids: list(p.get('qids')),
    options: undefinedIfEmpty({
      ...(returnTo ? { returnTo } : {}),
      ...(p.get('present') === 'smart' ? { present: 'smart' as const } : {}),
    }),
    legacy: {
      mode: (mode === 'practice-set' ? 'type-drill' : mode) as DrillMode,
      sealed,
      isGuidedDrill: p.get('guided') === '1' || !!p.get('guidedAssignmentId'),
      guidedDurationMinutes: positiveNumber(p.get('guidedDurationMinutes')),
    },
  };
}

/**
 * Read a launch from the address bar. The canonical grammar wins; today's
 * grammar is tried second. Returns null when the URL names no drill at all,
 * which is the case the caller handles by falling back to route state during
 * the migration.
 */
export function parseDrillLaunch(searchParams: URLSearchParams): DrillLaunch | null {
  if (searchParams.get('drill')) return parseCanonical(searchParams);
  return parseLegacy(searchParams);
}

// ---------------------------------------------------------------------------
// Translating
// ---------------------------------------------------------------------------

/**
 * Hand `Drill.tsx` the shape it already expects, so the page does not change in
 * this half of the work. Temporary: it exists only until the runner reads a
 * `DrillLaunch` directly, at which point this and `drillRouteState` both go.
 *
 * `resolvedQids` is how the id-named kinds arrive: their question list lives in
 * a row, and the caller reads that row before translating. Change two supplies
 * it; nothing calls those paths yet.
 */
export function toDrillRouteState(
  launch: DrillLaunch,
  resolvedQids?: string[],
  now: number = Date.now(),
): DrillRouteState {
  const options = launch.options ?? {};
  const base: DrillRouteState = {
    returnTo: options.returnTo,
    practicingLabel: options.label,
    present: options.present,
  };

  const typeDrillConfig = (qids: string[]): TypeDrillConfig => ({
    qtypes: [],
    difficulties: [],
    pts: [],
    count: qids.length,
    selectedQids: qids,
  });

  switch (launch.kind) {
    case 'smart-drill':
      return { ...base, mode: 'adaptive', sealed: false };

    case 'section': {
      const config: FullSectionConfig = {
        pt: launch.pt,
        section: launch.section,
        timer: {
          mode: launch.timerMode ?? (launch.minutes ? 'custom' : '35'),
          customMinutes: launch.minutes,
          isPaused: false,
          elapsedMs: 0,
          startedAt: now,
        },
      };
      return {
        ...base,
        mode: 'full-section',
        config,
        sealed: !!launch.sealed,
      };
    }

    case 'questions': {
      const carry = launch.legacy;
      return {
        ...base,
        mode: carry?.mode ?? 'type-drill',
        config: typeDrillConfig(launch.qids),
        sealed: carry?.sealed ?? false,
        isGuidedDrill: carry?.isGuidedDrill ?? false,
        guidedDurationMinutes: carry?.guidedDurationMinutes,
      };
    }

    case 'filter':
      return {
        ...base,
        mode: 'type-drill',
        config: {
          qtypes: launch.qtypes ?? [],
          difficulties: launch.difficulties ?? [],
          pts: launch.pts ?? [],
          sections: launch.sections,
          qfeatures: launch.qfeatures,
          count: launch.count,
        },
        sealed: false,
      };

    case 'saved-set':
    case 'assignment':
    case 'guided-drill':
    case 'practice-set':
    case 'bootcamp-day': {
      if (!resolvedQids) {
        throw new DrillLaunchError(
          `a ${launch.kind} launch must have its questions resolved before it can run`,
        );
      }
      return {
        ...base,
        mode: 'type-drill',
        config: typeDrillConfig(resolvedQids),
        sealed: false,
        isGuidedDrill: launch.kind === 'guided-drill',
        guidedDurationMinutes:
          launch.kind === 'guided-drill' ? launch.durationMinutes : undefined,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Expanding
// ---------------------------------------------------------------------------

/**
 * Write a launch in the grammar `Drill.tsx` already reads.
 *
 * The gate in front of the runner uses this: a short link arrives, the gate
 * resolves whatever row it names, and then replaces the address bar with the
 * long form the page understands. That is what lets the page stay untouched
 * while every launch still survives a refresh.
 *
 * Temporary by construction. When the runner reads a `DrillLaunch` directly,
 * this function and the legacy branch of the parser go together.
 */
export function expandToLegacySearch(
  launch: DrillLaunch,
  resolvedQids?: string[],
): string {
  const p = new URLSearchParams();
  const o = launch.options ?? {};

  const asQuestionList = (qids: string[]) => {
    p.set('mode', 'type-drill');
    if (qids.length > 0) p.set('qids', qids.join(','));
  };

  switch (launch.kind) {
    case 'smart-drill':
      p.set('mode', 'adaptive');
      break;

    case 'section':
      p.set('mode', 'full-section');
      p.set('pt', String(launch.pt));
      p.set('section', String(launch.section));
      if (launch.timerMode) p.set('timer', launch.timerMode);
      if (launch.minutes) p.set('minutes', String(launch.minutes));
      if (launch.sealed) p.set('sealed', '1');
      // The two values whose loss on refresh left a practice test permanently
      // open. The runner reads them from here now, not only from route state.
      if (launch.ptLeg) {
        p.set('runId', launch.ptLeg.runId);
        p.set('leg', String(launch.ptLeg.legIndex));
      }
      break;

    case 'questions':
      asQuestionList(launch.qids);
      // `asQuestionList` writes the common case. A handover that named a
      // different mode keeps it: the runner reads `natural-drill` down a
      // separate branch, so flattening it here would quietly change the drill.
      if (launch.legacy?.mode) p.set('mode', launch.legacy.mode);
      if (launch.legacy?.isGuidedDrill) p.set('guided', '1');
      if (launch.legacy?.guidedDurationMinutes) {
        p.set('guidedDurationMinutes', String(launch.legacy.guidedDurationMinutes));
      }
      if (launch.legacy?.sealed) p.set('sealed', '1');
      break;

    case 'filter':
      p.set('mode', 'type-drill');
      p.set('count', String(launch.count));
      setList(p, 'qtypes', launch.qtypes);
      setList(p, 'difficulties', launch.difficulties);
      setList(p, 'pts', launch.pts);
      setList(p, 'sections', launch.sections);
      setList(p, 'qfeatures', launch.qfeatures);
      break;

    case 'saved-set':
      asQuestionList(resolvedQids ?? []);
      break;

    case 'bootcamp-day':
      asQuestionList(resolvedQids ?? []);
      // The runner still reads the legacy grammar, but these two values keep
      // the Run Record named by the day instead of by the picked question list.
      p.set('bootcampDay', String(launch.day));
      p.set('bootcampPart', launch.part);
      break;

    case 'assignment':
      asQuestionList(resolvedQids ?? []);
      p.set('assignmentId', launch.assignmentId);
      if (launch.guidedSetId) p.set('guidedSetId', launch.guidedSetId);
      break;

    case 'guided-drill':
      asQuestionList(resolvedQids ?? []);
      p.set('guided', '1');
      if (launch.drillId) p.set('guidedDrillId', launch.drillId);
      if (launch.assignmentId) p.set('guidedAssignmentId', launch.assignmentId);
      if (launch.durationMinutes) {
        p.set('guidedDurationMinutes', String(launch.durationMinutes));
      }
      break;

    case 'practice-set':
      asQuestionList(resolvedQids ?? []);
      // The two params the runner uses to recognise an Intro to LR practice
      // set and map it back to its module-progress completion id.
      p.set('source', launch.source ?? 'intro-to-lr-practice-drills');
      p.set('practiceSlug', launch.slug);
      break;
  }

  if (o.returnTo) p.set('returnTo', o.returnTo);
  if (o.label) p.set('focus', o.label);
  if (o.initialIndex != null) p.set('initialIndex', String(o.initialIndex));
  if (o.present) p.set('present', o.present);

  return p.toString();
}

/**
 * Read a launch back out of the route state a button handed over in memory.
 *
 * This is how the eight buttons that never built a URL get one without being
 * touched: the gate takes what they passed, names it, and writes it into the
 * address bar. It can only recover what the button actually passed, which is
 * why two buttons still have to change — a saved set arrives as a bare list of
 * questions with its set id already discarded, and a bootcamp day arrives
 * without saying which day it was.
 *
 * Returns null when the state names no drill, which is the case where there is
 * nothing to canonicalize.
 */
export function launchFromRouteState(
  state: DrillRouteState | null | undefined,
  ptLeg?: PtLegRef,
): DrillLaunch | null {
  if (!state?.mode) return null;

  const options: DrillLaunchOptions = {};
  if (state.returnTo) options.returnTo = state.returnTo;
  if (state.practicingLabel) options.label = state.practicingLabel;
  if (state.present) options.present = state.present;
  const withOptions = undefinedIfEmpty(options);

  if (state.mode === 'adaptive') {
    return { kind: 'smart-drill', options: withOptions };
  }

  if (state.mode === 'full-section') {
    const config = state.config as FullSectionConfig | undefined;
    if (!config) return null;
    return {
      kind: 'section',
      pt: config.pt,
      section: config.section,
      timerMode: config.timer.mode === '35' ? undefined : config.timer.mode,
      minutes: config.timer.customMinutes,
      sealed: state.sealed || undefined,
      ptLeg,
      options: withOptions,
    };
  }

  const config = state.config as TypeDrillConfig | undefined;
  if (!config) return null;

  if (config.selectedQids && config.selectedQids.length > 0) {
    return {
      kind: 'questions',
      qids: config.selectedQids,
      options: withOptions,
      legacy: {
        mode: state.mode === 'practice-set' ? 'type-drill' : state.mode,
        sealed: !!state.sealed,
        isGuidedDrill: !!state.isGuidedDrill,
        guidedDurationMinutes: state.guidedDurationMinutes,
      },
    };
  }

  if (!config.count) return null;
  return {
    kind: 'filter',
    count: config.count,
    qtypes: config.qtypes?.length ? config.qtypes : undefined,
    difficulties: config.difficulties?.length ? config.difficulties : undefined,
    pts: config.pts?.length ? config.pts : undefined,
    sections: config.sections?.length ? config.sections : undefined,
    qfeatures: config.qfeatures?.length ? config.qfeatures : undefined,
    options: withOptions,
  };
}

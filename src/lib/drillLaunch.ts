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
 * This module is the codec — `launchDrill` writes a launch to a query string
 * and `parseDrillLaunch` reads one back, and the pair round-trips. The runner
 * consumes a launch through `drillRunSpecFromLaunch`; there is no second
 * grammar and no expansion step.
 */

import type {
  DrillMode,
  FullSectionConfig,
  TimerMode,
  TypeDrillConfig,
} from '@/types/drill';
import type { DrillResumeIdentity } from '@/lib/drillResumeSession';

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
 * What a bare list of questions is carrying on its back.
 *
 * The canonical grammar expresses most of this as a kind of its own — a guided
 * drill is `drill=guided-drill`, not a list of qids with a flag beside it. But
 * two things still produce a list plus a flag: a link already sitting in a
 * student's inbox, and a button that hands the run over in memory. Both name a
 * real run, so what they say has to survive being written into the address bar
 * and read back out.
 *
 * Every field here is optional except the two a `questions` launch always
 * knows. Nothing is inferred: a value that was not sent stays absent rather
 * than defaulting into a different run.
 */
export interface RunCarry {
  mode: DrillMode;
  sealed: boolean;
  isGuidedDrill: boolean;
  guidedDurationMinutes?: number;
  /** A classroom homework assignment the list belongs to. */
  assignmentId?: string;
  guidedSetId?: string;
  guidedDrillId?: string;
  guidedAssignmentId?: string;
  practiceSource?: string;
  practiceSlug?: string;
  /** Names the Run Record for a bootcamp day rather than for the drawn list. */
  resumeIdentity?: DrillResumeIdentity;
  ptLeg?: PtLegRef;
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
  | {
      kind: 'assignment';
      assignmentId: string;
      guidedSetId?: string;
      /** Only read when the assignment turns out to be one timed section. */
      timerMode?: Exclude<TimerMode, '35'>;
      /**
       * An assigned section is sealed by default: no Show Answer, no
       * Explanation, until it is scored. Only Joshua unseals one, at assign
       * time, and only on purpose.
       */
      revealAllowed?: boolean;
    }
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
       * Set when the list arrived from an older link or an in-memory handover
       * that also named which stored row the run belongs to. Absent for a
       * plain "drill these questions" link.
       */
      carry?: RunCarry;
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
      if (launch.timerMode) p.set('timer', launch.timerMode);
      if (launch.revealAllowed) p.set('reveal', '1');
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
    case 'questions': {
      p.set('qids', launch.qids.join(','));
      // The carry rides in its own params. It never reuses a param that
      // belongs to another kind, so a `questions` link cannot be mistaken for
      // a section or a guided drill it merely remembers the id of.
      const c = launch.carry;
      if (c) {
        if (c.mode !== 'type-drill') p.set('runMode', c.mode);
        if (c.sealed) p.set('runSealed', '1');
        if (c.isGuidedDrill) p.set('guided', '1');
        if (c.guidedDrillId) p.set('guidedDrill', c.guidedDrillId);
        if (c.guidedAssignmentId) p.set('guidedAssignment', c.guidedAssignmentId);
        if (c.guidedDurationMinutes) p.set('guidedMinutes', String(c.guidedDurationMinutes));
        if (c.assignmentId) p.set('assignment', c.assignmentId);
        if (c.guidedSetId) p.set('guidedSet', c.guidedSetId);
        if (c.practiceSource) p.set('source', c.practiceSource);
        if (c.practiceSlug) p.set('slug', c.practiceSlug);
        if (c.resumeIdentity) {
          p.set('day', String(c.resumeIdentity.day));
          p.set('part', c.resumeIdentity.part);
        }
        if (c.ptLeg) {
          p.set('runId', c.ptLeg.runId);
          p.set('leg', String(c.ptLeg.legIndex));
        }
      }
      break;
    }
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

/**
 * The heading, under whichever name the older grammar used for it. The generic
 * branch wrote `focus` and the section branch wrote `label`, and both reach the
 * runner as the same thing.
 */
function legacyLabel(p: URLSearchParams): string | undefined {
  return p.get('focus') || p.get('label') || undefined;
}

function readPart(value: string | null): 'homework' | 'practice' | undefined {
  return value === 'homework' || value === 'practice' ? value : undefined;
}

function readPtLeg(
  runIdValue: string | null,
  legValue: string | null,
): PtLegRef | undefined {
  const runId = runIdValue || undefined;
  const legIndex = nonNegativeInt(legValue);
  return runId && legIndex != null ? { runId, legIndex } : undefined;
}

function buildCarry(fields: Omit<RunCarry, 'mode' | 'sealed' | 'isGuidedDrill'> & {
  mode?: DrillMode;
  sealed?: boolean;
  isGuidedDrill?: boolean;
}): RunCarry | undefined {
  const { mode, sealed, isGuidedDrill, ...rest } = fields;
  const carriesSomething =
    (mode && mode !== 'type-drill') ||
    !!sealed ||
    !!isGuidedDrill ||
    Object.values(rest).some((v) => v !== undefined);
  if (!carriesSomething) return undefined;
  return {
    mode: mode ?? 'type-drill',
    sealed: !!sealed,
    isGuidedDrill: !!isGuidedDrill,
    ...rest,
  };
}

/** The carry as the canonical grammar writes it. Mirror of `launchDrill`. */
function readCarry(p: URLSearchParams): RunCarry | undefined {
  const day = positiveNumber(p.get('day'));
  const part = readPart(p.get('part'));
  return buildCarry({
    mode: (p.get('runMode') as DrillMode | null) ?? undefined,
    sealed: p.get('runSealed') === '1',
    isGuidedDrill: p.get('guided') === '1',
    guidedDurationMinutes: positiveNumber(p.get('guidedMinutes')),
    assignmentId: p.get('assignment') || undefined,
    guidedSetId: p.get('guidedSet') || undefined,
    guidedDrillId: p.get('guidedDrill') || undefined,
    guidedAssignmentId: p.get('guidedAssignment') || undefined,
    practiceSource: p.get('source') || undefined,
    practiceSlug: p.get('slug') || undefined,
    resumeIdentity: day && part ? { kind: 'bootcamp-day', day, part } : undefined,
    ptLeg: readPtLeg(p.get('runId'), p.get('leg')),
  });
}

/** The same carry as the older grammar wrote it, under its own param names. */
function readLegacyCarry(p: URLSearchParams, mode: DrillMode): RunCarry | undefined {
  const day = positiveNumber(p.get('bootcampDay'));
  const part = readPart(p.get('bootcampPart'));
  return buildCarry({
    mode,
    sealed: p.get('sealed') === '1',
    isGuidedDrill: p.get('guided') === '1' || !!p.get('guidedAssignmentId'),
    guidedDurationMinutes: positiveNumber(p.get('guidedDurationMinutes')),
    assignmentId: p.get('assignmentId') || undefined,
    guidedSetId: p.get('guidedSetId') || undefined,
    guidedDrillId: p.get('guidedDrillId') || undefined,
    guidedAssignmentId: p.get('guidedAssignmentId') || undefined,
    practiceSource: p.get('source') || undefined,
    practiceSlug: p.get('practiceSlug') || undefined,
    resumeIdentity: day && part ? { kind: 'bootcamp-day', day, part } : undefined,
    ptLeg: readPtLeg(p.get('runId'), p.get('leg')),
  });
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
      return {
        kind,
        pt,
        section,
        timerMode: readTimerMode(p.get('timer')),
        minutes: positiveNumber(p.get('minutes')),
        sealed: p.get('sealed') === '1' ? true : undefined,
        ptLeg: readPtLeg(p.get('runId'), p.get('leg')),
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
        timerMode: readTimerMode(p.get('timer')),
        revealAllowed: p.get('reveal') === '1' || undefined,
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
      return { kind, qids, carry: readCarry(p), options };
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
 * The older grammar, kept so that assigned links already sitting in a student's
 * inbox keep opening. Never written — `launchDrill` only emits the canonical
 * form. Deletable once the old links have aged out.
 *
 * Deliberately permissive: an old link that carried a switch it had no business
 * carrying was ignored before and is ignored now. It is also never rewritten,
 * so everything it says has to be read here or it is lost.
 */
function parseLegacy(p: URLSearchParams): DrillLaunch | null {
  const mode = p.get('mode');
  if (!mode) return null;

  const returnTo = safeReturnTo(p.get('returnTo'));
  const sealed = p.get('sealed') === '1';
  const initialIndex = nonNegativeInt(p.get('initialIndex'));

  if (mode === 'full-section') {
    const pt = positiveNumber(p.get('pt'));
    const section = positiveNumber(p.get('section'));
    if (pt && section) {
      // Today's section branch reads a heading and does not read `present`.
      return {
        kind: 'section',
        pt,
        section,
        // 52.5, 70 and unlimited are the accommodated clocks. Reducing them to
        // a number of minutes would quietly re-time an accommodated sitting.
        timerMode: readTimerMode(p.get('timer')),
        minutes: positiveNumber(p.get('minutes')),
        sealed: sealed || undefined,
        ptLeg: readPtLeg(p.get('runId'), p.get('leg')),
        options: undefinedIfEmpty({
          ...(returnTo ? { returnTo } : {}),
          ...(legacyLabel(p) ? { label: legacyLabel(p) as string } : {}),
          ...(initialIndex != null ? { initialIndex } : {}),
        }),
      };
    }
    // Falls through exactly as before: a malformed section link became an empty
    // type-drill rather than an error.
  }

  return {
    kind: 'questions',
    qids: list(p.get('qids')),
    options: undefinedIfEmpty({
      ...(returnTo ? { returnTo } : {}),
      ...(legacyLabel(p) ? { label: legacyLabel(p) as string } : {}),
      ...(initialIndex != null ? { initialIndex } : {}),
      ...(p.get('present') === 'smart' ? { present: 'smart' as const } : {}),
    }),
    carry: readLegacyCarry(
      p,
      (mode === 'practice-set' ? 'type-drill' : mode) as DrillMode,
    ),
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

/**
 * What a button puts in router state when it hands a drill over in memory.
 * Only the fields a handover can actually carry; everything else about a run
 * lives in the launch or in the Run Record.
 */
export interface DrillHandoverState {
  mode?: DrillMode;
  config?: FullSectionConfig | TypeDrillConfig;
  practicingLabel?: string;
  returnTo?: string;
  isGuidedDrill?: boolean;
  guidedDurationMinutes?: number;
  present?: 'smart';
  sealed?: boolean;
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
  state: DrillHandoverState | null | undefined,
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
      carry: {
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

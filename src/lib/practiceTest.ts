/**
 * Practice tests: a full sitting, assembled from real sections.
 *
 * A **practice test** here is what the modern LSAT is — three scored sections,
 * two Logical Reasoning and one Reading Comprehension, each run under its own
 * 35:00 clock, with a break in the middle. It is not a long drill: the
 * composition is fixed, the order is the published one, and nothing is revealed
 * until the whole sitting is over.
 *
 * The run is saved to the student's account by practiceTestStore. A device
 * copy remains available as a recovery aid. Each leg still uses the existing
 * question runner (`/drill` for LR, `/rc` for RC).
 */
import type { QuestionManifest } from '@/lib/questionLoader';
import type { RcSection } from '@/features/rc/lib/rcSections';

/** Section clock at standard pace. The same 35:00 both section kinds run. */
export const PRACTICE_TEST_SECTION_SECONDS = 35 * 60;

/** The break the real test gives you, after the second scored section. */
export const PRACTICE_TEST_BREAK_SECONDS = 10 * 60;

/**
 * An LR section below this is a partial capture, not a section. The bank
 * publishes only questions carrying a written explanation, so a short section
 * would misreport pacing rather than measure it. Never pad one to reach it.
 */
export const LR_FULL_SECTION_MIN_QUESTIONS = 24;

export type PracticeTestPaceId = 'standard' | 'time-and-a-half' | 'double-time' | 'untimed';

/**
 * One spelling per accommodation, for the whole room.
 *
 * This door said "Time & a Half" and "Double Time" while the section door said
 * "Time and a half" and "Double time", so the same two accommodations were
 * spelled two ways and cased two ways depending on which door a student opened.
 * Settled on the section door's form because AccommodationNote already says
 * "You have time and a half" and "You have double time" in prose: spelled out,
 * sentence case. The odd one out was this list.
 */
const PACE_LABELS: Record<PracticeTestPaceId, string> = {
  standard: 'Standard',
  'time-and-a-half': 'Time and a half',
  'double-time': 'Double time',
  untimed: 'Untimed',
};

/**
 * Each pace as a percentage of the student's OWN standard clock, not of 35:00.
 *
 * These were absolute before: 'standard' was hard-wired to 35 minutes whatever
 * the student's standing timing mode said. A student carrying extra time who
 * picked "Standard" was handed a 35-minute section, which is less time than
 * they are entitled to, across a whole two-hour sitting. The section door has
 * always read the setting (SectionSelector's baseMinutes); the practice test
 * door never did, so the same two words meant two different clocks in one room.
 *
 * 100% is whatever their standing default is, so "Standard" means "my normal
 * section" for everyone.
 */
const PACE_PERCENT: Record<PracticeTestPaceId, number | null> = {
  standard: 100,
  'time-and-a-half': 150,
  'double-time': 200,
  untimed: null,
};

/** The pace's display name. The clock it implies depends on the student. */
export function practiceTestPaceLabel(id: PracticeTestPaceId): string {
  return PACE_LABELS[id] ?? PACE_LABELS.standard;
}

/** Seconds one section runs for at this pace, off the student's own base. */
export function practiceTestSectionSeconds(
  pace: PracticeTestPaceId,
  baseSeconds: number = PRACTICE_TEST_SECTION_SECONDS,
): number | null {
  // Not `??`: untimed's percent IS null, and a nullish fallback would quietly
  // turn "no clock" into the standard one. Only an unrecognised id falls back.
  const percent = pace in PACE_PERCENT ? PACE_PERCENT[pace] : PACE_PERCENT.standard;
  if (percent === null) return null;
  return Math.round((baseSeconds * percent) / 100);
}

/** The pace options for a student whose own standard section is `baseSeconds`. */
export function practiceTestPaces(baseSeconds: number = PRACTICE_TEST_SECTION_SECONDS): {
  id: PracticeTestPaceId;
  label: string;
  /** Seconds per section. Null when untimed. */
  sectionSeconds: number | null;
}[] {
  return (Object.keys(PACE_LABELS) as PracticeTestPaceId[]).map((id) => ({
    id,
    label: PACE_LABELS[id],
    sectionSeconds: practiceTestSectionSeconds(id, baseSeconds),
  }));
}

/**
 * What a run's sections actually run for. Reads the seconds resolved when the
 * run was created rather than recomputing, so changing the timing setting
 * halfway through a two-hour sitting cannot move the clock under it. Runs
 * created before this was stored fall back to the old absolute reading.
 */
export function practiceTestRunSectionSeconds(run: PracticeTestRun): number | null {
  return run.sectionSeconds !== undefined
    ? run.sectionSeconds
    : practiceTestSectionSeconds(run.pace);
}

export type PracticeTestLegKind = 'lr' | 'rc';

export interface PracticeTestLeg {
  kind: PracticeTestLegKind;
  /** The section number it carried on the real PrepTest. */
  section: number;
  /** Questions in this leg — what it contributes to the raw score. */
  questionCount: number;
  /** RC only: the four passages, in published order. */
  passageIds?: number[];
  /** ISO stamp set when the student begins this leg. */
  startedAt?: string;
  /** ISO stamp set when its result is read back. */
  completedAt?: string;
  correct?: number;
  answered?: number;
  timeMs?: number;
}

export type PracticeTestStatus = 'in-progress' | 'complete' | 'abandoned';

export interface PracticeTestRun {
  id: string;
  /** Account owner. Older device-only runs may not have this field. */
  userId?: string;
  /** Server revision used for conditional writes across devices. */
  revision?: number;
  /** The browser currently allowed to write this run. */
  activeDeviceId?: string | null;
  updatedAt?: string;
  pt: number;
  pace: PracticeTestPaceId;
  /**
   * Seconds per section for this sitting, resolved against the student's own
   * standard clock when the run was created. Optional because runs stored
   * before it existed do not carry it; read it through
   * `practiceTestRunSectionSeconds`, never directly.
   */
  sectionSeconds?: number | null;
  legs: PracticeTestLeg[];
  /** Index of the leg the student is on. Equals legs.length when finished. */
  currentLeg: number;
  /** Legs completed before the break. The real test breaks after two. */
  breakAfterLeg: number;
  /** True once the student has taken (or skipped) the break. */
  breakTaken: boolean;
  /** ISO stamp set when the break clock started, so it survives a reload. */
  breakStartedAt?: string;
  /** Device backup of the clock at a failed break exit. Never a running clock. */
  breakRemainingSeconds?: number;
  status: PracticeTestStatus;
  createdAt: string;
}

/** Earlier PT118 sittings included experimental S3 and an extra S1 item. */
export function hasOutdatedPt118Structure(run: PracticeTestRun): boolean {
  if (run.pt !== 118) return false;
  const legs = run.legs.map((leg) => `${leg.kind}:${leg.section}:${leg.questionCount}`);
  return legs.join(',') !== 'lr:1:25,rc:2:27,lr:4:25';
}

export function practiceTestBreakRemainingSeconds(run: PracticeTestRun, now = Date.now()): number {
  if (run.breakRemainingSeconds !== undefined) return run.breakRemainingSeconds;
  if (!run.breakStartedAt) return PRACTICE_TEST_BREAK_SECONDS;
  return Math.max(0, PRACTICE_TEST_BREAK_SECONDS - (now - Date.parse(run.breakStartedAt)) / 1000);
}

/** A failed start or heartbeat resumes only after an account-acknowledged retry. */
export function retryPracticeTestBreakSave(accountRun: PracticeTestRun, pendingRun: PracticeTestRun, now = Date.now()): PracticeTestRun {
  if (pendingRun.breakTaken) return pendingRun;
  if (!accountRun.breakStartedAt && pendingRun.breakStartedAt) {
    return { ...pendingRun, breakStartedAt: new Date(now).toISOString() };
  }
  if (pendingRun.breakRemainingSeconds !== undefined) {
    const elapsed = PRACTICE_TEST_BREAK_SECONDS - pendingRun.breakRemainingSeconds;
    return { ...pendingRun, breakStartedAt: new Date(now - elapsed * 1000).toISOString() };
  }
  return pendingRun;
}

/** A heartbeat writes a clock snapshot to the device backup before account save. */
export function checkpointPracticeTestBreak(run: PracticeTestRun, now = Date.now()): PracticeTestRun {
  return { ...run, breakRemainingSeconds: practiceTestBreakRemainingSeconds(run, now) };
}

/** Keep the remaining time in the pending device copy while an exit save is unacknowledged. */
export function finishPracticeTestBreak(run: PracticeTestRun, now = Date.now()): PracticeTestRun {
  return {
    ...run,
    breakTaken: true,
    breakRemainingSeconds: practiceTestBreakRemainingSeconds(run, now),
    breakStartedAt: undefined,
  };
}

export interface PracticeTestBlueprint {
  pt: number;
  legs: Omit<PracticeTestLeg, 'startedAt' | 'completedAt' | 'correct' | 'answered' | 'timeMs'>[];
  questionCount: number;
  /**
   * False when the Reading Comprehension leg carries fewer questions than a
   * real section does. The sitting is still worth doing — the reading load is
   * identical and reading is what the clock is really measuring — but the raw
   * total is smaller, and every surface that offers this has to say so.
   */
  rcFullLength: boolean;
}

/**
 * Assemble every PrepTest that can be sat end to end.
 *
 * A test needs two full LR sections and one complete four-passage RC section
 * from the same PrepTest. It does NOT require the RC section to carry a real
 * section's worth of questions, and that is a deliberate reversal: gating on
 * question count left 11 of 58 PrepTests sittable, because the bank publishes
 * only the RC questions that carry a written explanation.
 *
 * Refusing on those grounds was the wrong trade. An RC section's clock is a
 * reading budget — four passages at 8:45 each, whatever the question count —
 * so a section short a few questions still trains the thing the section
 * measures. What it changes is the raw total, and the raw total is stated
 * everywhere it matters rather than hidden.
 *
 * Still excluded: a section whose passages are not all present, or where a
 * passage carries no answerable questions at all. Reading a passage you cannot
 * be asked about is not practice, it is padding.
 *
 * Where a PrepTest carries a third LR section, use the lowest-numbered two
 * unless the official key identifies the experimental section. PT118's key
 * identifies Section III as unscored, so its scored LR sections are I and IV.
 */
export function buildPracticeTests(
  manifest: QuestionManifest,
  rcSections: RcSection[],
): PracticeTestBlueprint[] {
  const lrByPt = new Map<number, { section: number; count: number }[]>();
  for (const s of manifest.sections) {
    // The modern PT118 key explicitly marks Section III as experimental.
    // A scored sitting uses its two scored LR sections, I and IV.
    if (s.pt === 118 && s.section === 3) continue;
    if (s.count < LR_FULL_SECTION_MIN_QUESTIONS) continue;
    const list = lrByPt.get(s.pt);
    if (list) list.push({ section: s.section, count: s.count });
    else lrByPt.set(s.pt, [{ section: s.section, count: s.count }]);
  }

  const rcByPt = new Map<number, RcSection>();
  for (const s of rcSections) {
    // Where a PrepTest offers more than one RC section, the fullest one wins:
    // a sitting should be scored out of as many real questions as the bank can
    // actually put in front of the student. Section number breaks the tie, so
    // the choice is stable across builds.
    const existing = rcByPt.get(s.preptest);
    if (
      !existing ||
      s.questionCount > existing.questionCount ||
      (s.questionCount === existing.questionCount && s.section < existing.section)
    ) {
      rcByPt.set(s.preptest, s);
    }
  }

  const tests: PracticeTestBlueprint[] = [];
  for (const [pt, lrList] of lrByPt) {
    const rc = rcByPt.get(pt);
    if (!rc) continue;
    const lr = [...lrList].sort((a, b) => a.section - b.section).slice(0, 2);
    if (lr.length < 2) continue;

    const legs: PracticeTestBlueprint['legs'] = [
      ...lr.map((s) => ({ kind: 'lr' as const, section: s.section, questionCount: s.count })),
      {
        kind: 'rc' as const,
        section: rc.section,
        questionCount: rc.questionCount,
        passageIds: rc.passageIds,
      },
    ].sort((a, b) => a.section - b.section);

    tests.push({
      pt,
      legs,
      questionCount: legs.reduce((n, l) => n + l.questionCount, 0),
      rcFullLength: rc.fullLength,
    });
  }

  return tests.sort((a, b) => a.pt - b.pt);
}

/**
 * Raw score to an estimated scaled score.
 *
 * These anchors describe a *typical* modern three-section LSAT curve, not this
 * PrepTest's official conversion table — we do not hold those. Every surface
 * that prints this number has to say "estimated", because a scaled score that
 * looks official and is not is the one number a student will quote back at an
 * admissions decision.
 */
const SCALE_ANCHORS: [raw: number, scaled: number][] = [
  [0, 120],
  [6, 120],
  [11, 125],
  [17, 130],
  [23, 135],
  [29, 140],
  [36, 145],
  [43, 150],
  [50, 155],
  [57, 160],
  [63, 165],
  [68, 170],
  [72, 175],
  [75, 180],
];

const ANCHOR_TOTAL = 75;

export function estimateScaledScore(raw: number, total: number): number {
  if (total <= 0) return 120;
  const pct = Math.max(0, Math.min(1, raw / total));
  for (let i = 1; i < SCALE_ANCHORS.length; i += 1) {
    const [prevRaw, prevScaled] = SCALE_ANCHORS[i - 1];
    const [nextRaw, nextScaled] = SCALE_ANCHORS[i];
    const prevPct = prevRaw / ANCHOR_TOTAL;
    const nextPct = nextRaw / ANCHOR_TOTAL;
    if (pct <= nextPct) {
      if (nextPct === prevPct) return nextScaled;
      const t = (pct - prevPct) / (nextPct - prevPct);
      return Math.round(prevScaled + t * (nextScaled - prevScaled));
    }
  }
  return 180;
}

/* -------------------------------------------------------------------------- */
/* Run store                                                                   */
/* -------------------------------------------------------------------------- */

const STORE_PREFIX = 'lsatu:practice-test:';

function storeKey(id: string) {
  return `${STORE_PREFIX}${id}`;
}

function newRunId(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `pt-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function createPracticeTestRun(
  blueprint: PracticeTestBlueprint,
  pace: PracticeTestPaceId,
  /**
   * Seconds per section, already resolved against the student's own clock.
   * Stored on the run so the sitting keeps the clock it started with even if
   * the timing setting changes while it is in progress.
   */
  sectionSeconds: number | null = practiceTestSectionSeconds(pace),
): PracticeTestRun {
  const run: PracticeTestRun = {
    id: newRunId(),
    pt: blueprint.pt,
    pace,
    sectionSeconds,
    legs: blueprint.legs.map((l) => ({ ...l })),
    currentLeg: 0,
    // Two sections, then the break — the shape of the real sitting. A test that
    // somehow has fewer legs breaks after the second-to-last rather than never.
    breakAfterLeg: Math.min(2, Math.max(1, blueprint.legs.length - 1)),
    breakTaken: false,
    status: 'in-progress',
    createdAt: new Date().toISOString(),
  };
  savePracticeTestRun(run);
  return run;
}

export function savePracticeTestRun(run: PracticeTestRun): void {
  try {
    localStorage.setItem(storeKey(run.id), JSON.stringify(run));
  } catch {
    // A full or disabled store must not take the sitting down. The student
    // keeps answering; only resume-after-reload is lost.
  }
}

export function loadPracticeTestRun(id: string): PracticeTestRun | null {
  try {
    const raw = localStorage.getItem(storeKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PracticeTestRun;
    if (!parsed || !Array.isArray(parsed.legs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listPracticeTestRuns(): PracticeTestRun[] {
  const runs: PracticeTestRun[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORE_PREFIX)) continue;
      const run = loadPracticeTestRun(key.slice(STORE_PREFIX.length));
      if (run) runs.push(run);
    }
  } catch {
    return [];
  }
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deletePracticeTestRun(id: string): void {
  try {
    localStorage.removeItem(storeKey(id));
  } catch {
    /* nothing to clean up */
  }
}

/* -------------------------------------------------------------------------- */
/* Derived views                                                               */
/* -------------------------------------------------------------------------- */

export function practiceTestRaw(run: PracticeTestRun): { correct: number; total: number } {
  return run.legs.reduce(
    (acc, leg) => ({
      correct: acc.correct + (leg.correct ?? 0),
      total: acc.total + leg.questionCount,
    }),
    { correct: 0, total: 0 },
  );
}

export function practiceTestScaled(run: PracticeTestRun): number {
  const { correct, total } = practiceTestRaw(run);
  return estimateScaledScore(correct, total);
}

export function legLabel(leg: PracticeTestLeg): string {
  return leg.kind === 'lr' ? 'Logical Reasoning' : 'Reading Comprehension';
}

/**
 * "35:00" — one leg's clock, or null when untimed. Takes seconds rather than a
 * pace id, because a pace id alone no longer determines the clock: the same
 * "Standard" is 35:00 for one student and 52:30 for another.
 */
export function formatPracticeTestClock(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

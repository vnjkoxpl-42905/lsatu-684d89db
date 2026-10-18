/**
 * Real RC sections, derived from the passage index.
 *
 * A **Section** here is what the test calls one: the four passages that appeared
 * together in one section of one PrepTest, in their published order. It is not a
 * drill you assemble — the composition is fixed, which is the whole point of
 * sitting one.
 *
 * Nothing new is stored. A section is expressed through the existing
 * `/rc?passages=…` link contract, and its clock through the existing
 * per-passage budget: `RC_STANDARD_SECONDS_PER_PASSAGE` (525s) across four
 * passages is 2100s — exactly the 35:00 a real section runs.
 */
import { sectionKey, type SectionFreshness } from '@/lib/sectionFreshness';
import { getQuestionHistory, listSessions } from '../api/rcProgress';
import { getRcExposureHistory } from '../api/rcExposure';
import { passageStatus } from './rcAdaptive';
import {
  RC_STANDARD_SECONDS_PER_PASSAGE,
  type RcDrillSession,
  type RcIndexPassage,
  type RcQuestionHistory,
  type RcRevealMode,
  type RcSessionStatus,
} from './rcTypes';

export type RcIndexPassageWithPt = RcIndexPassage & { preptest: number };

/** Every RC section on the modern test has exactly four passages. */
export const RC_SECTION_PASSAGE_COUNT = 4;

/**
 * A real RC section carries 26-28 questions. That is a fact about the test, not
 * about our bank — so a section below it is *short*, and saying so is the only
 * honest way to offer one. Sections fall short because the source publishes
 * answer choices only for questions carrying a written explanation, and the rest
 * cannot be rendered or drilled. Never pad a section to hit this number.
 */
export const RC_FULL_SECTION_MIN_QUESTIONS = 26;

/**
 * Standard section timing, and the accommodations multiples of it.
 *
 * The labels are spelled the way the rest of the app spells them: "Time and a
 * half", not "Time & a Half". Nothing renders this list today, so the wording
 * was free to drift, and it had: the Testing Centre and the section door were
 * reconciled on the spelled-out sentence-case form and this was the last copy
 * still carrying the old one, waiting to reintroduce the inconsistency the
 * moment something wired it up.
 */
export const RC_SECTION_PACES = [
  { id: 'standard', label: 'Standard', secondsPerPassage: RC_STANDARD_SECONDS_PER_PASSAGE },
  { id: 'time-and-a-half', label: 'Time and a half', secondsPerPassage: Math.round(RC_STANDARD_SECONDS_PER_PASSAGE * 1.5) },
  { id: 'double-time', label: 'Double time', secondsPerPassage: RC_STANDARD_SECONDS_PER_PASSAGE * 2 },
  { id: 'untimed', label: 'Untimed', secondsPerPassage: null },
] as const;

export type RcSectionPaceId = (typeof RC_SECTION_PACES)[number]['id'];

export interface RcSection {
  preptest: number;
  section: number;
  /** Passage ids in published order (Position 1-4). */
  passageIds: number[];
  passageCount: number;
  /** Drillable questions across the whole section. */
  questionCount: number;
  /** True when the section carries a real section's worth of questions. */
  fullLength: boolean;
}

/**
 * Group the index into sections, keeping only those a student can actually sit.
 *
 * A section with a passage that has no drillable questions is **excluded**, not
 * offered with a gap: reading three passages and answering questions on two is
 * not a section, and presenting it as one would misreport the student's pacing
 * more than it would help them. Three groups in the current bank are dropped by
 * this rule.
 */
export function buildRcSections(passages: RcIndexPassageWithPt[]): RcSection[] {
  const groups = new Map<string, RcIndexPassageWithPt[]>();
  for (const p of passages) {
    const key = `${p.preptest}:${p.section}`;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  const sections: RcSection[] = [];
  for (const group of groups.values()) {
    if (group.length !== RC_SECTION_PASSAGE_COUNT) continue;
    if (group.some((p) => p.questionCount <= 0)) continue;

    const ordered = [...group].sort((a, b) => a.setNumber - b.setNumber);
    const questionCount = ordered.reduce((n, p) => n + p.questionCount, 0);

    sections.push({
      preptest: ordered[0].preptest,
      section: ordered[0].section,
      passageIds: ordered.map((p) => p.passageId),
      passageCount: ordered.length,
      questionCount,
      fullLength: questionCount >= RC_FULL_SECTION_MIN_QUESTIONS,
    });
  }

  return sections.sort((a, b) => a.preptest - b.preptest || a.section - b.section);
}

export function rcSectionsForPreptest(sections: RcSection[], preptest: number): RcSection[] {
  return sections.filter((s) => s.preptest === preptest);
}

export function rcSectionPreptests(sections: RcSection[]): number[] {
  return [...new Set(sections.map((s) => s.preptest))].sort((a, b) => a - b);
}

export function rcSectionPace(id: RcSectionPaceId) {
  return RC_SECTION_PACES.find((p) => p.id === id) ?? RC_SECTION_PACES[0];
}

/** Total clock for a section at a given pace, in seconds. Null when untimed. */
export function rcSectionTotalSeconds(
  section: RcSection,
  paceId: RcSectionPaceId,
): number | null {
  const pace = rcSectionPace(paceId);
  return pace.secondsPerPassage === null ? null : pace.secondsPerPassage * section.passageCount;
}

/**
 * The link that starts a section. Uses the existing hub contract, so an
 * assignment link and a student-started section are the same thing — and
 * `end_of_set` because a section is sat under test conditions, with review
 * afterwards rather than between passages.
 */
export function rcSectionHref(
  section: RcSection,
  paceId: RcSectionPaceId = 'standard',
  reveal: RcRevealMode = 'end_of_set',
): string {
  const pace = rcSectionPace(paceId);
  const params = new URLSearchParams({
    passages: section.passageIds.join(','),
    reveal,
    timing: pace.secondsPerPassage === null ? 'untimed' : 'standard',
    start: '1',
    timedSection: 'manual-canonical',
  });
  // Only the non-default paces need to say so; a plain `standard` link stays
  // readable and keeps working on any build that predates this parameter.
  if (pace.secondsPerPassage !== null && pace.secondsPerPassage !== RC_STANDARD_SECONDS_PER_PASSAGE) {
    params.set('secondsPerPassage', String(pace.secondsPerPassage));
  }
  return `/rc?${params.toString()}`;
}

/** "35:00" / "52:30" — total section clock, or null when untimed. */
export function formatRcSectionClock(
  section: RcSection,
  paceId: RcSectionPaceId,
): string | null {
  const total = rcSectionTotalSeconds(section, paceId);
  if (total === null) return null;
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Maps a section-launcher timing setting to a protected practice-test pace id,
 * or returns null when the percentage does not correspond to a supported
 * protected pace (standard 100%, time-and-a-half 150%, double-time 200%, or
 * untimed).
 */
export function rcProtectedPaceForTiming(
  timing: { mode: 'timed'; percent: number } | { mode: 'unlimited' },
): RcSectionPaceId | null {
  if (timing.mode === 'unlimited') return 'untimed';
  if (timing.percent === 100) return 'standard';
  if (timing.percent === 150) return 'time-and-a-half';
  if (timing.percent === 200) return 'double-time';
  return null;
}

export interface RcSectionSessionExposure {
  passageIds: number[];
  status: RcSessionStatus;
  excludedFromAnalytics?: boolean;
  config?: { timedSectionSittingId?: string };
  timedSectionSittingId?: string;
}

/**
 * Section-level freshness for RC sections built on the T01 passage exposure
 * rules (`passageStatus(...).state !== 'not_attempted'`), including timed-sitting
 * sessions while ignoring sessions excluded from analytics.
 */
export function buildRcSectionFreshness(
  sections: RcSection[],
  passages: RcIndexPassageWithPt[],
  history: RcQuestionHistory,
  sessions: RcSectionSessionExposure[] = [],
  recordedExposures: ReadonlySet<number> = new Set(),
): Map<string, SectionFreshness> {
  const passageById = new Map<number, RcIndexPassageWithPt>();
  for (const p of passages) {
    passageById.set(p.passageId, p);
  }

  const timedSittingPassages = new Set<number>();
  for (const s of sessions) {
    if (s.excludedFromAnalytics) continue;
    if (s.status !== 'in_progress' && s.status !== 'completed' && s.status !== 'abandoned') {
      continue;
    }
    const sittingId = s.timedSectionSittingId ?? s.config?.timedSectionSittingId;
    if (!sittingId) continue;
    for (const pid of s.passageIds) {
      timedSittingPassages.add(pid);
    }
  }

  const out = new Map<string, SectionFreshness>();
  for (const sec of sections) {
    const total = sec.questionCount;
    if (total <= 0) continue;

    let unseen = 0;
    let anyPassageTouched = false;

    for (const pid of sec.passageIds) {
      const p = passageById.get(pid);
      if (!p) continue;
      const qids = p.questionIds ?? [];
      const status = passageStatus(p, qids, history);
      const touchedByTimedSitting = timedSittingPassages.has(pid) || recordedExposures.has(pid);

      if (status.state !== 'not_attempted' || touchedByTimedSitting) {
        anyPassageTouched = true;
      }

      if (touchedByTimedSitting) {
        continue;
      }

      if (qids.length > 0) {
        for (const qid of qids) {
          if ((history.get(qid)?.attempts ?? 0) === 0) {
            unseen++;
          }
        }
      } else if (status.state === 'not_attempted') {
        unseen += p.questionCount;
      }
    }

    if (anyPassageTouched && unseen >= total) {
      unseen = Math.max(0, total - 1);
    }

    out.set(sectionKey(sec.preptest, sec.section), {
      pt: sec.preptest,
      section: sec.section,
      total,
      unseen,
      percentFresh: Math.round((unseen / total) * 100),
      isFresh: !anyPassageTouched && unseen === total,
    });
  }
  return out;
}

export async function fetchRcSectionFreshness(
  sections: RcSection[],
  passages: RcIndexPassageWithPt[],
  userId?: string,
): Promise<Map<string, SectionFreshness>> {
  const [history, sessions, exposures] = await Promise.all([
    getQuestionHistory(userId),
    listSessions(),
    getRcExposureHistory(userId),
  ]);
  return buildRcSectionFreshness(sections, passages, history, sessions, exposures);
}


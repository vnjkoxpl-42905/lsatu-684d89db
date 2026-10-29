/**
 * The report on a sat section.
 *
 * Written to the spec in `docs/section-analysis-engine.md`, which is the 7Sage
 * tutoring webinar's diagnosis turned into rules. Read that first: every rule
 * here carries the number it has there, and the reasoning lives there rather
 * than in these comments.
 *
 * Two properties matter more than any single rule.
 *
 * 1. **A wrong answer is not a finding.** Why it was wrong is the finding,
 *    because the four categories prescribe different work and two of them
 *    prescribe opposite work — a fundamentals gap means stop sitting sections,
 *    a test-taking gap means sit more of them.
 * 2. **Every claim carries its questions.** No category without its question
 *    numbers, no percentage without the count behind it. A rule with nothing to
 *    say is silent rather than reassuring.
 *
 * Pure. Takes a finished section and returns the report; touches no database,
 * no clock, and no React. The caller stores what comes back and never
 * regenerates it, so a report stays a record of what was said at the time.
 */

import type { SectionQuestionStat } from '@/lib/sectionHistorySave';
import { UNANSWERED } from '@/lib/sectionHistorySave';

/** The webinar's four, in its order. */
export type ErrorCategory = 'reading' | 'fundamentals' | 'process' | 'test-taking';

export const CATEGORY_LABEL: Record<ErrorCategory, string> = {
  reading: 'Reading error',
  fundamentals: 'Logical reasoning error',
  process: 'Question type process error',
  'test-taking': 'Test-taking error',
};

/**
 * What each category tells the student to do next. Note that the first two
 * lines point in opposite directions; that is the whole reason for
 * categorising at all.
 */
export const CATEGORY_PRESCRIPTION: Record<ErrorCategory, string> = {
  fundamentals:
    'Go back to the curriculum on the reasoning underneath these, not to more sections. Sitting sections does not fix a gap in conditional or causal reasoning, and it uses up PrepTests while you have it.',
  process:
    'Rebuild the process for these question types, then drill that type on its own. Re-work every question of the type in this section, including the ones you got right, in case you got them right for the wrong reason.',
  'test-taking':
    'Sit more sections. This is not a study problem, it is a practice problem, and the only way to fix it is to keep making these decisions under a clock until they are automatic.',
  reading:
    'Slow down on the specific thing that was misread. This is not a curriculum gap: the reasoning was available, the sentence was not read as written.',
};

/**
 * The process a question type actually runs, which is what a student gets
 * wrong. The webinar's best move is grouping by this rather than by label:
 * six misses that look scattered across Strengthen, Weaken, Resolve and
 * Sufficient Assumption are one finding, because all four add new evidence to
 * an argument and the student was eliminating choices for not being in the
 * stimulus.
 */
export type ProcessFamily = 'add-evidence' | 'accept-stimulus' | 'argument-structure' | 'assumption';

export const FAMILY_LABEL: Record<ProcessFamily, string> = {
  'add-evidence': 'Adding new evidence',
  'accept-stimulus': 'Taking the stimulus as true',
  'argument-structure': 'Describing the argument',
  assumption: 'Assumption',
};

/** What the shared failure in each family sounds like, in the student's words. */
export const FAMILY_FAILURE: Record<ProcessFamily, string> = {
  'add-evidence':
    'Eliminating a choice because it was not stated in the argument. On these the answer IS new evidence, so it is not supposed to be there. That objection belongs on a Must Be True, not here.',
  'accept-stimulus':
    'Treating what is mentioned as what is supported. These two are different things, and the right answer is often about something the passage never names.',
  'argument-structure':
    'Reading for what the argument says rather than for what it is doing. These ask about the shape, not the content.',
  assumption:
    'Running a Necessary Assumption like a Strengthen. Strengthen only has to help; a necessary assumption has to be required, and a sufficient assumption has to make the conclusion airtight.',
};

const FAMILY_BY_TYPE: Record<string, ProcessFamily> = {
  Strengthen: 'add-evidence',
  Weaken: 'add-evidence',
  Paradox: 'add-evidence',
  'Sufficient Assumption': 'add-evidence',
  'Principle-Strengthen': 'add-evidence',
  Evaluate: 'add-evidence',
  'Most Strongly Supported': 'accept-stimulus',
  'Must Be True': 'accept-stimulus',
  'Must Be False': 'accept-stimulus',
  'Agree/Disagree': 'accept-stimulus',
  Flaw: 'argument-structure',
  'Method of Reasoning': 'argument-structure',
  'Main Conclusion': 'argument-structure',
  Role: 'argument-structure',
  'Parallel Reasoning': 'argument-structure',
  'Parallel Flaw': 'argument-structure',
  'Principle-Conform': 'argument-structure',
  'Necessary Assumption': 'assumption',
};

export const familyOf = (qtype: string): ProcessFamily | null => FAMILY_BY_TYPE[qtype] ?? null;

/**
 * One question of a sitting. `reasoningTypes` and `questionFeatures` are copied
 * onto the stat when the section is saved, so a report describes the question
 * as it was when it was sat rather than as the bank labels it today.
 */
export interface AnalysisQuestion extends SectionQuestionStat {
  /** Share of test takers who get it right, 0-1, where we have it. Beats stars. */
  cohortAccuracy?: number;
}

export interface AnalysisInput {
  questions: AnalysisQuestion[];
  /**
   * Milliseconds this student owed each question: their own section clock over
   * its questions. Null for an unlimited section, where nothing is owed and
   * every timing rule stays silent rather than inventing a standard.
   */
  paceMsPerQuestion: number | null;
  /** Whether a blind review was actually sat. Without it R10 cannot run. */
  blindReviewDone: boolean;
  /** RC reads differently from LR in a few places. */
  kind?: 'lr' | 'rc';
}

/** One thing the report says, with the questions that earned it. */
export interface Finding {
  /** The rule's number in the spec, so a finding can always be traced back. */
  rule: string;
  /** Which of the four this finding speaks to. Absent when it speaks to all. */
  category?: ErrorCategory;
  /** One sentence, in the student's second person. */
  headline: string;
  /** The detail, including the numbers. */
  detail: string;
  /** What to do about it. */
  prescription: string;
  /** Question numbers this is about. Never empty. */
  qnums: number[];
  /** How hard this hits: findings are reported worst first. */
  weight: number;
}

export interface CategoryBreakdown {
  category: ErrorCategory;
  qnums: number[];
  /** Share of the section's misses, 0-100, rounded. */
  percentOfMisses: number;
  prescription: string;
}

/**
 * One slice of the sitting: a question type, a feature, or the reasoning it
 * runs on. Every dimension is computed the same way so they can be ranked
 * against each other and read side by side.
 */
export interface Breakdown {
  dimension: 'qtype' | 'family' | 'feature' | 'reasoning' | 'difficulty';
  key: string;
  attempted: number;
  correct: number;
  /** 0-100. The scoring rate on this slice. */
  accuracyPercent: number;
  medianTimeMs: number;
  /** How this slice's median compares to the pace owed. Null when untimed. */
  paceRatio: number | null;
  /** Misses blind review recovered — timing, not knowledge. */
  recoveredInBlindReview: number;
  /** Misses that stayed wrong in review. The knowledge half. */
  stuckAfterBlindReview: number;
  /**
   * What to work on first, high is worse.
   *
   * Deficit times volume, so a slice missed once does not outrank a slice
   * missed four times, and a slice with two questions cannot claim to be a
   * pattern. A slice that is slow but accurate still scores: the webinar is
   * explicit that time over target is a finding even at minus zero.
   */
  priority: number;
}

export interface SectionAnalysis {
  /** The one sentence that opens the report. */
  headline: string;
  categories: CategoryBreakdown[];
  findings: Finding[];
  /** Per-question category calls, for the table. */
  perQuestion: Array<{ qnum: number; qtype: string; category: ErrorCategory; why: string }>;
  /**
   * Every slice of the sitting, worst first within each dimension. This is the
   * part a tutor reads before a session: what they are strongest at, what they
   * are weakest at, and how long each of them is costing.
   */
  breakdowns: Breakdown[];
  /**
   * The one thing worth saying about each category that fired. Findings are
   * ranked across the whole sitting, which buries a category that produced one
   * important finding under another category that produced three.
   */
  biggestInsights: Array<{ category: ErrorCategory; insight: string }>;
  totals: {
    answered: number;
    correct: number;
    missed: number;
    unanswered: number;
    /** Misses that blind review recovered: not knowledge gaps. */
    recoveredInBlindReview: number;
    medianTimeMs: number;
    paceMsPerQuestion: number | null;
  };
  /** Rules that could not run, and what they need. Honest about its own blind spots. */
  notRun: string[];
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
};

const clock = (ms: number): string => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const list = (qnums: number[]): string =>
  qnums.length === 1
    ? `Q${qnums[0]}`
    : `Q${qnums.slice(0, -1).join(', Q')} and Q${qnums[qnums.length - 1]}`;

const isUnanswered = (q: AnalysisQuestion) => q.initialAnswer === UNANSWERED;

/**
 * Where a miss belongs, and why.
 *
 * The order is the order of evidence strength, not the spec's numbering. Blind
 * review is asked first because it is the only signal that separates a
 * knowledge gap from a timing one, which is the split the whole report exists
 * to make.
 */
function categoriseMiss(
  q: AnalysisQuestion,
  ctx: {
    paceMs: number | null;
    blindReviewDone: boolean;
    familyMisses: Map<ProcessFamily, number>;
    tagMisses: Map<string, number>;
  },
): { category: ErrorCategory; why: string } {
  // Unanswered, and the two kinds of unanswered are opposite findings. Worked
  // and left blank is a decision the student made; never opened is the clock
  // deciding for them.
  if (isUnanswered(q)) {
    if (q.everVisited === true) {
      return {
        category: 'test-taking',
        why: `opened for ${clock(q.timeMs)} and left blank — a skip, not a shortfall`,
      };
    }
    return {
      category: 'test-taking',
      why:
        q.everVisited === false
          ? 'never opened — the clock ran out before you reached it'
          : 'never answered — the clock, not the question',
    };
  }

  // Blind review got it. Whatever went wrong, it was not that the reasoning was
  // beyond them: they can do it, just not the way they did it under time.
  if (ctx.blindReviewDone && q.brCorrect) {
    const slow = ctx.paceMs !== null && q.timeMs > ctx.paceMs * 1.5;
    const fast = ctx.paceMs !== null && q.timeMs < ctx.paceMs * 0.5;
    if (fast) {
      return {
        category: 'reading',
        why: `right in blind review, and answered in ${clock(q.timeMs)} — read too fast, not misunderstood`,
      };
    }
    return {
      category: 'test-taking',
      why: slow
        ? `right in blind review after ${clock(q.timeMs)} under time — a timing problem, not a knowledge one`
        : 'right in blind review — you have this; the timed run is what failed',
    };
  }

  // Wrong twice. Now it is a knowledge question, and the tags say which kind.
  const tagHit = (q.reasoningTypes ?? []).find((t) => (ctx.tagMisses.get(t) ?? 0) >= 2);
  if (tagHit) {
    return {
      category: 'fundamentals',
      why: `missed with ${tagHit} reasoning, and you missed others with it in this section`,
    };
  }

  const family = familyOf(q.qtype);
  if (family && (ctx.familyMisses.get(family) ?? 0) >= 2) {
    return {
      category: 'process',
      why: `part of a cluster in ${FAMILY_LABEL[family].toLowerCase()} questions`,
    };
  }

  // An answer they had and gave away is a reading call, not a knowledge one:
  // the right answer was in hand.
  if (gaveAwayCorrect(q)) {
    return {
      category: 'reading',
      why: 'you had the right answer and changed it',
    };
  }

  return {
    category: 'process',
    why: `wrong under time and wrong again in review on a ${q.qtype} question`,
  };
}

/** Did the trail hold the correct answer before its final entry? (R7) */
function gaveAwayCorrect(q: AnalysisQuestion): boolean {
  const trail = q.answerTrail ?? [];
  if (trail.length < 2) return false;
  const final = trail[trail.length - 1].answer;
  if (final === q.correctAnswer) return false;
  return trail.slice(0, -1).some((e) => e.answer === q.correctAnswer);
}


/**
 * Slice the sitting every way the bank knows how to slice it.
 *
 * One question lands in several slices at once — a Necessary Assumption
 * question tagged conditional counts under its type, its family, and under
 * conditional reasoning — which is the point. The three dimensions disagreeing
 * is itself the finding: a type that looks fine while the reasoning under it
 * looks bad means the process is sound and the logic is not.
 */
function buildBreakdowns(
  questions: AnalysisQuestion[],
  paceMs: number | null,
  blindReviewDone: boolean,
): Breakdown[] {
  const buckets = new Map<string, { dimension: Breakdown['dimension']; key: string; qs: AnalysisQuestion[] }>();

  const put = (dimension: Breakdown['dimension'], key: string, q: AnalysisQuestion) => {
    if (!key) return;
    const id = `${dimension}::${key}`;
    if (!buckets.has(id)) buckets.set(id, { dimension, key, qs: [] });
    buckets.get(id)!.qs.push(q);
  };

  for (const q of questions) {
    // An unanswered question tells you nothing about a question type. It is a
    // clock fact, and counting it as a miss on its type would blame the type
    // for the section running out.
    if (isUnanswered(q)) continue;
    put('qtype', q.qtype, q);
    const family = familyOf(q.qtype);
    if (family) put('family', FAMILY_LABEL[family], q);
    for (const f of q.questionFeatures ?? []) put('feature', f, q);
    for (const r of q.reasoningTypes ?? []) put('reasoning', r, q);
    put('difficulty', `Level ${q.difficulty}`, q);
  }

  const rows: Breakdown[] = [...buckets.values()].map(({ dimension, key, qs }) => {
    const correct = qs.filter((q) => q.initialCorrect).length;
    const missed = qs.filter((q) => !q.initialCorrect);
    const med = median(qs.map((q) => q.timeMs).filter((t) => t > 0));
    const accuracyPercent = Math.round((correct / qs.length) * 100);
    const paceRatio = paceMs ? Number((med / paceMs).toFixed(2)) : null;
    const recovered = blindReviewDone ? missed.filter((q) => q.brCorrect).length : 0;
    const stuck = blindReviewDone ? missed.length - recovered : 0;

    // Deficit times volume, plus a smaller charge for being slow. Volume is
    // square-rooted so four misses outrank one without a big slice drowning
    // out a small one that is failing completely.
    const deficit = (100 - accuracyPercent) / 100;
    const slowness = paceRatio && paceRatio > 1 ? Math.min(paceRatio - 1, 1.5) : 0;
    const priority = Math.round(
      (deficit * Math.sqrt(qs.length) * 100) + (slowness * Math.sqrt(qs.length) * 25),
    );

    return {
      dimension,
      key,
      attempted: qs.length,
      correct,
      accuracyPercent,
      medianTimeMs: med,
      paceRatio,
      recoveredInBlindReview: recovered,
      stuckAfterBlindReview: stuck,
      priority,
    };
  });

  // Worst first inside each dimension, and dimensions in the order a tutor
  // reads them: what they were asked, then how it was asked, then the logic.
  const order: Breakdown['dimension'][] = ['qtype', 'family', 'reasoning', 'feature', 'difficulty'];
  return rows.sort(
    (a, b) =>
      order.indexOf(a.dimension) - order.indexOf(b.dimension) ||
      b.priority - a.priority ||
      a.accuracyPercent - b.accuracyPercent,
  );
}

/** "Necessary Assumption 1/4 (25%), 2:14 median against 1:21 owed" */
function describeBreakdown(b: Breakdown): string {
  const pace =
    b.paceRatio === null
      ? clock(b.medianTimeMs)
      : `${clock(b.medianTimeMs)} median, ${b.paceRatio.toFixed(2)}x the pace owed`;
  const br =
    b.stuckAfterBlindReview > 0 || b.recoveredInBlindReview > 0
      ? `, ${b.recoveredInBlindReview} recovered in review and ${b.stuckAfterBlindReview} still wrong`
      : '';
  return `${b.key}: ${b.correct}/${b.attempted} (${b.accuracyPercent}%), ${pace}${br}`;
}

export function analyseSection(input: AnalysisInput): SectionAnalysis {
  const { questions, paceMsPerQuestion: paceMs, blindReviewDone } = input;
  const findings: Finding[] = [];
  const notRun: string[] = [];

  const answered = questions.filter((q) => !isUnanswered(q));
  const misses = questions.filter((q) => !q.initialCorrect);
  const times = answered.map((q) => q.timeMs).filter((t) => t > 0);
  const med = median(times);

  // Miss counts by family and by reasoning tag, computed before categorising so
  // a single question can be told a cluster from a one-off.
  const familyMisses = new Map<ProcessFamily, number>();
  const tagMisses = new Map<string, number>();
  for (const q of misses) {
    if (isUnanswered(q)) continue;
    const f = familyOf(q.qtype);
    if (f) familyMisses.set(f, (familyMisses.get(f) ?? 0) + 1);
    if (blindReviewDone && q.brCorrect) continue; // recovered: not a knowledge miss
    for (const t of q.reasoningTypes ?? []) tagMisses.set(t, (tagMisses.get(t) ?? 0) + 1);
  }

  const perQuestion = misses.map((q) => ({
    qnum: q.qnum,
    qtype: q.qtype,
    ...categoriseMiss(q, { paceMs, blindReviewDone, familyMisses, tagMisses }),
  }));

  // ── R1 · time debt upstream ───────────────────────────────────────────────
  // The rule students get backwards. Time spent on questions they got RIGHT
  // counts here: in the webinar it is the slow correct work at the start that
  // costs the questions at the end.
  const unreached = questions.filter(isUnanswered);
  if (paceMs !== null && unreached.length > 0) {
    const lastReachedIdx = questions.findIndex((q) => q.qnum === unreached[0].qnum);
    const upstream = questions
      .slice(0, Math.max(lastReachedIdx, 0))
      .filter((q) => q.timeMs > paceMs * 1.5);
    const overspend = upstream.reduce((sum, q) => sum + (q.timeMs - paceMs), 0);
    if (upstream.length > 0) {
      const neverOpened = unreached.filter((q) => q.everVisited === false);
      const skipped = unreached.filter((q) => q.everVisited === true);
      findings.push({
        rule: 'R1',
        category: 'test-taking',
        headline: `You did not run out of ability at the end of this section. You ran out of clock.`,
        detail: `${unreached.length} question${unreached.length === 1 ? '' : 's'} went unanswered (${list(unreached.map((q) => q.qnum))})${
          neverOpened.length > 0 && skipped.length > 0
            ? ` — ${list(neverOpened.map((q) => q.qnum))} you never reached, ${list(skipped.map((q) => q.qnum))} you opened and left`
            : neverOpened.length > 0
              ? ', none of which you ever reached'
              : skipped.length > 0
                ? ', all of which you opened and left blank'
                : ''
        }, and ${clock(overspend)} of overspend upstream is where that time went — ${list(upstream.map((q) => q.qnum))} each ran past the ${clock(paceMs)} they were owed. That includes questions you got right: slow and correct early is what costs you the ones at the end.`,
        prescription:
          'Work the earlier questions at the pace you worked the last ones. The rushed pace was not costing you accuracy and the slow pace was not buying any.',
        qnums: [...upstream.map((q) => q.qnum), ...unreached.map((q) => q.qnum)],
        weight: 100,
      });
    }
  }

  // ── R2 · time that bought nothing ─────────────────────────────────────────
  if (answered.length >= 8) {
    const half = Math.floor(answered.length / 2);
    const first = answered.slice(0, half);
    const second = answered.slice(half);
    const t1 = first.reduce((s, q) => s + q.timeMs, 0);
    const t2 = second.reduce((s, q) => s + q.timeMs, 0);
    const c1 = first.filter((q) => q.initialCorrect).length;
    const c2 = second.filter((q) => q.initialCorrect).length;
    const rate1 = c1 / first.length;
    const rate2 = c2 / second.length;
    const slowerFirst = t1 > t2 * 1.3;
    const slowerSecond = t2 > t1 * 1.3;
    if ((slowerFirst && rate1 <= rate2) || (slowerSecond && rate2 <= rate1)) {
      const slowHalf = slowerFirst ? 'first' : 'second';
      findings.push({
        rule: 'R2',
        category: 'test-taking',
        headline: `The extra time in the ${slowHalf} half did not buy accuracy.`,
        detail: `First half: ${clock(t1)} for ${c1}/${first.length}. Second half: ${clock(t2)} for ${c2}/${second.length}. The slower stretch scored no better than the faster one, so those minutes were not being converted.`,
        prescription:
          'Take the pace of the faster stretch as your working pace. The time is worth more spent on questions you have not reached than on questions you have already read twice.',
        qnums: (slowerFirst ? first : second).map((q) => q.qnum),
        weight: 70,
      });
    }
  }

  // ── R3 · bang for the buck ────────────────────────────────────────────────
  if (paceMs !== null) {
    const sinks = answered
      .filter((q) => q.timeMs > paceMs * 2.5)
      .sort((a, b) => b.timeMs - a.timeMs);
    if (sinks.length > 0) {
      const wrongSinks = sinks.filter((q) => !q.initialCorrect);
      const spent = sinks.reduce((s, q) => s + q.timeMs, 0);
      const got = sinks.filter((q) => q.initialCorrect).length;
      findings.push({
        rule: 'R3',
        category: 'test-taking',
        headline:
          wrongSinks.length > 0
            ? `You spent ${clock(spent)} on ${sinks.length} question${sinks.length === 1 ? '' : 's'} and got ${got} of them.`
            : `You spent ${clock(spent)} on ${sinks.length} question${sinks.length === 1 ? '' : 's'} you did get.`,
        detail: sinks
          .slice(0, 4)
          .map(
            (q) =>
              `Q${q.qnum} (${q.qtype}, level ${q.difficulty}) took ${clock(q.timeMs)} and you ${q.initialCorrect ? 'got it' : 'missed it'}.`,
          )
          .join(' '),
        prescription:
          'A question you cannot answer in about twice the pace is a question to flag and leave. Flagging moves it to the end of the section, which is where a question this expensive belongs.',
        qnums: sinks.map((q) => q.qnum),
        weight: 80,
      });
    }
  }

  // ── R4 · the second pass that changed nothing ─────────────────────────────
  // The webinar counts these out loud, by number: six questions she came back
  // to and left exactly as she found them, because she went back with the
  // reading that produced the wrong answer in the first place.
  const unchangedRevisits = questions.filter((q) => (q.noChangeRevisits ?? 0) > 0);
  if (unchangedRevisits.length > 0) {
    const wasted = unchangedRevisits.reduce((n, q) => n + (q.noChangeRevisits ?? 0), 0);
    const stillWrong = unchangedRevisits.filter((q) => !q.initialCorrect);
    findings.push({
      rule: 'R4',
      category: 'test-taking',
      headline: `You went back to ${unchangedRevisits.length} question${unchangedRevisits.length === 1 ? '' : 's'} and changed nothing.`,
      detail: `${list(unchangedRevisits.map((q) => q.qnum))} were opened again and left exactly as you found them${wasted > unchangedRevisits.length ? `, ${wasted} return visits in total` : ''}.${stillWrong.length > 0 ? ` ${list(stillWrong.map((q) => q.qnum))} were wrong both times.` : ''} Going back with the reading that produced the first answer gets you the first answer again.`,
      prescription:
        'On a second pass, throw the first reading away and redo the question from the stimulus. You flagged it because something went wrong and you do not know what — so treat it as wrong rather than re-checking the answer you already have. If that is too slow to do on every flag, come back to fewer questions and actually redo those.',
      qnums: unchangedRevisits.map((q) => q.qnum),
      weight: 78,
    });
  }

  // ── R5 · confidence errors ────────────────────────────────────────────────
  const overconfident = misses.filter((q) => !isUnanswered(q) && !q.flagged);
  if (overconfident.length > 0) {
    findings.push({
      rule: 'R5',
      category: 'test-taking',
      headline: `${overconfident.length} of your misses were never flagged.`,
      detail: `On ${list(overconfident.map((q) => q.qnum))} you did not know you were in trouble, so you never came back. That is the expensive kind of miss: a flag buys a second look, and an unflagged wrong answer buys nothing.`,
      prescription:
        'Flag when you are down to two answer choices, and flag anything you are 89% or less sure of. Do not flag when you confidently eliminated four and simply cannot say why the fifth is right — that question is finished.',
      qnums: overconfident.map((q) => q.qnum),
      weight: 75,
    });
  }
  /**
   * Down to two, and not flagged.
   *
   * The webinar's primary flag criterion, and until the eliminations were kept
   * the report could only recite the rule. Three choices crossed off means the
   * student was choosing between the last two and knew it — which is the exact
   * state he says must always be flagged, whatever the answer turned out to be.
   */
  const downToTwoUnflagged = questions.filter(
    (q) => (q.eliminations?.length ?? 0) >= 3 && !q.flagged && !isUnanswered(q),
  );
  if (downToTwoUnflagged.length > 0) {
    const missed = downToTwoUnflagged.filter((q) => !q.initialCorrect);
    findings.push({
      rule: 'R5',
      category: 'test-taking',
      headline: `You were down to two on ${list(downToTwoUnflagged.map((q) => q.qnum))} and flagged none of them.`,
      detail: `Three choices crossed off is a coin flip you can see yourself making.${missed.length > 0 ? ` ${list(missed.map((q) => q.qnum))} came out wrong, and a flag would have bought a second look at ${missed.length === 1 ? 'it' : 'them'}.` : ' They came out right, which is luck rather than method.'}`,
      prescription:
        'If you are down to two, flag it. That is the whole rule — not "if it feels hard", not "if you are unsure", but the specific moment when you have eliminated three and cannot separate the last two.',
      qnums: downToTwoUnflagged.map((q) => q.qnum),
      weight: 82,
    });
  }

  const underconfident = questions.filter((q) => q.flagged && q.initialCorrect);
  if (underconfident.length > 0) {
    findings.push({
      rule: 'R5',
      category: 'test-taking',
      headline: `${underconfident.length} question${underconfident.length === 1 ? '' : 's'} you flagged you had right all along.`,
      detail: `${list(underconfident.map((q) => q.qnum))} were correct when you flagged them. Any second pass spent there is a second pass not spent on something you could have converted.`,
      prescription:
        'Flagging is for converting points, not for recording unease. If you can say why the answer is right, it does not need the flag.',
      qnums: underconfident.map((q) => q.qnum),
      weight: 40,
    });
  }

  // ── R6 · question economics ───────────────────────────────────────────────
  if (paceMs !== null) {
    const hardSlow = answered.filter((q) => q.difficulty >= 4 && q.timeMs > paceMs * 2);
    const cheapMissed = misses.filter((q) => q.difficulty <= 2);
    if (hardSlow.length > 0 && cheapMissed.length > 0) {
      const spent = hardSlow.reduce((s, q) => s + q.timeMs, 0);
      findings.push({
        rule: 'R6',
        category: 'test-taking',
        headline: 'You bought the expensive questions and left cheap ones on the table.',
        detail: `${clock(spent)} went to ${list(hardSlow.map((q) => q.qnum))} at level 4-5, while ${list(cheapMissed.map((q) => q.qnum))} at level 1-2 went wrong. Every question is worth the same point and they cost very different amounts of time.`,
        prescription:
          'Buy the cheapest questions first. Spending time on a hard question while an easy one is still unworked is a bad trade even when the hard one comes out right.',
        qnums: [...hardSlow.map((q) => q.qnum), ...cheapMissed.map((q) => q.qnum)],
        weight: 85,
      });
    }
  }

  // ── R7 · the answer they had and gave away ────────────────────────────────
  const gaveAway = questions.filter(gaveAwayCorrect);
  if (gaveAway.length > 0) {
    findings.push({
      rule: 'R7',
      category: 'reading',
      headline: `You had the right answer on ${list(gaveAway.map((q) => q.qnum))} and changed it.`,
      detail: gaveAway
        .map((q) => {
          const trail = q.answerTrail ?? [];
          const at = trail.find((e) => e.answer === q.correctAnswer);
          return `Q${q.qnum}: ${q.correctAnswer} at ${clock(at?.atMs ?? 0)}, then ${q.initialAnswer} at ${clock(trail[trail.length - 1]?.atMs ?? q.timeMs)}${q.flagged ? ', flagged' : ', not flagged'}.`;
        })
        .join(' '),
      prescription:
        'A change of mind this late is worth flagging every time. If you were torn enough to switch, you were down to two, and down to two is the flag criterion.',
      qnums: gaveAway.map((q) => q.qnum),
      weight: 65,
    });
  }

  // ── R8 · process families ─────────────────────────────────────────────────
  for (const [family, count] of familyMisses) {
    if (count < 2) continue;
    const qs = misses.filter((q) => familyOf(q.qtype) === family);
    const types = [...new Set(qs.map((q) => q.qtype))];
    findings.push({
      rule: 'R8',
      category: 'process',
      headline: `${count} misses in one process: ${FAMILY_LABEL[family].toLowerCase()}.`,
      detail: `${list(qs.map((q) => q.qnum))} look scattered by label — ${types.join(', ')} — but they run the same process, so this is one problem rather than ${types.length}. ${FAMILY_FAILURE[family]}`,
      prescription:
        'Re-work every question of these types in this section, the ones you got right included. Getting one right for the wrong reason is the same problem waiting for a harder question.',
      qnums: qs.map((q) => q.qnum),
      weight: 90,
    });
  }

  // ── R10 · blind review as the separator ───────────────────────────────────
  const recovered = blindReviewDone ? misses.filter((q) => q.brCorrect) : [];
  if (blindReviewDone && misses.length > 0) {
    const stuck = misses.filter((q) => !q.brCorrect && !isUnanswered(q));
    findings.push({
      rule: 'R10',
      headline:
        recovered.length >= stuck.length
          ? 'Most of what you missed, you can already do.'
          : 'Most of what you missed stayed missed in review.',
      detail: `${recovered.length} of ${misses.length} misses came back right in blind review, which makes them timing or process rather than knowledge. ${stuck.length} stayed wrong, and those are the ones that point at the material itself.`,
      prescription:
        recovered.length >= stuck.length
          ? 'Your work this week is the clock and the decisions, not the content. Sit sections.'
          : 'Your work this week is the content. Sections will not fix what blind review could not.',
      qnums: misses.map((q) => q.qnum),
      weight: 95,
    });
  } else if (!blindReviewDone) {
    notRun.push(
      'R10 (knowledge gap versus timing gap) — no blind review was sat, and without one there is no way to tell a question you could not do from one you did not have time to do properly.',
    );
  }

  if (paceMs === null) {
    notRun.push(
      'R1, R3 and R6 (everything about the clock) — this section was sat untimed, so nothing was owed and no pace can be judged.',
    );
  }
  if (questions.every((q) => q.visitCount === undefined)) {
    notRun.push(
      'R4 (a second pass that changed nothing) and the difference between a question you skipped and one you never reached — this sitting predates visit tracking.',
    );
  }
  notRun.push(
    'R9 (EXCEPT-stem misreads) — the question bank does not yet flag which stems are EXCEPT / LEAST / NOT.',
  );

  // ── The categories, and the headline ──────────────────────────────────────
  const categories: CategoryBreakdown[] = (
    ['test-taking', 'process', 'fundamentals', 'reading'] as ErrorCategory[]
  )
    .map((category) => {
      const qnums = perQuestion.filter((p) => p.category === category).map((p) => p.qnum);
      return {
        category,
        qnums,
        percentOfMisses: misses.length ? Math.round((qnums.length / misses.length) * 100) : 0,
        prescription: CATEGORY_PRESCRIPTION[category],
      };
    })
    .filter((c) => c.qnums.length > 0)
    .sort((a, b) => b.qnums.length - a.qnums.length);

  const dominant = categories[0]?.category;
  const headline =
    misses.length === 0
      ? 'Clean section. Nothing to diagnose.'
      : dominant === 'test-taking'
        ? 'This was a timing section, not a knowledge section. What went wrong was decisions under the clock.'
        : dominant === 'fundamentals'
          ? 'This was a fundamentals section. The reasoning underneath these questions is the work, and more sections will not do it.'
          : dominant === 'process'
            ? 'This was a process section. You know the material; the way you are running these question types is what missed.'
            : 'This was a reading section. The reasoning was available in every one of these — the sentence was not read as written.';

  findings.sort((a, b) => b.weight - a.weight);

  const breakdowns = buildBreakdowns(questions, paceMs, blindReviewDone);

  /**
   * One line per category that fired. A finding if the category produced one,
   * otherwise the worst slice that category is about — because a fundamentals
   * or process category with no finding attached still has a reasoning tag or
   * a question type underneath it, and that is the sentence worth reading.
   */
  const biggestInsights = categories.map(({ category }) => {
    const owned = findings.find((f) => f.category === category);
    if (owned) return { category, insight: owned.headline };

    const dimension = category === 'fundamentals' ? 'reasoning' : 'qtype';
    const worst = breakdowns
      .filter((b) => b.dimension === dimension && b.attempted >= 2 && b.accuracyPercent < 100)
      .sort((a, b) => b.priority - a.priority)[0];
    if (worst) {
      return {
        category,
        insight: `Worst slice: ${describeBreakdown(worst)}.`,
      };
    }
    const qnums = perQuestion.filter((p) => p.category === category).map((p) => p.qnum);
    return { category, insight: `${list(qnums)}, with no pattern behind them yet.` };
  });

  return {
    headline,
    breakdowns,
    biggestInsights,
    categories,
    findings,
    perQuestion,
    totals: {
      answered: answered.length,
      correct: questions.filter((q) => q.initialCorrect).length,
      missed: misses.length,
      unanswered: unreached.length,
      recoveredInBlindReview: recovered.length,
      medianTimeMs: med,
      paceMsPerQuestion: paceMs,
    },
    notRun,
  };
}

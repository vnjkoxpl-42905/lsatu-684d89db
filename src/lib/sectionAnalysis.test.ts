/**
 * The engine, run against the webinar's own cases.
 *
 * Each test is one of the sections Chris Nguyen diagnoses on screen, rebuilt as
 * data: the RC student who blamed passage four, the student with six unchanged
 * second-pass answers, the one who had the right answer and changed it to E,
 * and the one whose scattered misses were all the same process. If the engine
 * reaches a different conclusion from the tutor on his own examples, it is
 * wrong, whatever the code says.
 */
import { describe, expect, it } from 'vitest';
import { analyseSection, familyOf, type AnalysisQuestion } from './sectionAnalysis';

const PACE = 81_000; // 35:00 over 26 questions

/** A question that went fine, unless the caller says otherwise. */
const q = (over: Partial<AnalysisQuestion> & { qnum: number }): AnalysisQuestion => ({
  qid: `q${over.qnum}`,
  qtype: 'Must Be True',
  difficulty: 3,
  initialAnswer: 'A',
  correctAnswer: 'A',
  initialCorrect: true,
  timeMs: PACE,
  switchCount: 0,
  flagged: false,
  ...over,
});

const run = (questions: AnalysisQuestion[], opts?: { br?: boolean; pace?: number | null }) =>
  analyseSection({
    questions,
    paceMsPerQuestion: opts?.pace === undefined ? PACE : opts.pace,
    blindReviewDone: opts?.br ?? true,
  });

describe('R1 — the misses at the end were caused at the start', () => {
  it('names the upstream questions, including the ones they got right', () => {
    const questions = [
      // Slow and CORRECT. The webinar's point: this is what costs the end.
      q({ qnum: 1, timeMs: 240_000 }),
      q({ qnum: 2, timeMs: 200_000 }),
      ...[3, 4, 5, 6].map((n) => q({ qnum: n, timeMs: 60_000 })),
      // Never reached.
      q({ qnum: 7, initialAnswer: '—', initialCorrect: false, timeMs: 0 }),
      q({ qnum: 8, initialAnswer: '—', initialCorrect: false, timeMs: 0 }),
    ];

    const r1 = run(questions).findings.find((f) => f.rule === 'R1');
    expect(r1).toBeTruthy();
    expect(r1!.qnums).toContain(1);
    expect(r1!.qnums).toContain(2);
    expect(r1!.detail).toMatch(/questions you got right/);
    // Unanswered is a clock failure, never a knowledge one.
    expect(run(questions).perQuestion.find((p) => p.qnum === 7)?.category).toBe('test-taking');
  });
});

describe('R10 — blind review separates a knowledge gap from a timing one', () => {
  it('calls a recovered miss timing, and a stuck one knowledge', () => {
    const questions = [
      q({ qnum: 1, initialCorrect: false, initialAnswer: 'B', brCorrect: true, timeMs: 200_000 }),
      q({ qnum: 2, initialCorrect: false, initialAnswer: 'B', brCorrect: false }),
    ];
    const out = run(questions);

    expect(out.perQuestion.find((p) => p.qnum === 1)?.category).toBe('test-taking');
    expect(out.perQuestion.find((p) => p.qnum === 1)?.why).toMatch(/blind review/);
    expect(out.perQuestion.find((p) => p.qnum === 2)?.category).not.toBe('test-taking');
    expect(out.totals.recoveredInBlindReview).toBe(1);
  });

  it('says so rather than guessing when no blind review was sat', () => {
    const out = run([q({ qnum: 1, initialCorrect: false })], { br: false });
    expect(out.findings.some((f) => f.rule === 'R10')).toBe(false);
    expect(out.notRun.join(' ')).toMatch(/no blind review was sat/);
  });
});

describe('R8 — misses that look scattered are one process', () => {
  it('groups Strengthen, Weaken and Resolve as adding new evidence', () => {
    expect(familyOf('Strengthen')).toBe('add-evidence');
    expect(familyOf('Paradox')).toBe('add-evidence');
    expect(familyOf('Necessary Assumption')).toBe('assumption');

    const out = run([
      q({ qnum: 5, qtype: 'Strengthen', initialCorrect: false, brCorrect: false }),
      q({ qnum: 9, qtype: 'Weaken', initialCorrect: false, brCorrect: false }),
      q({ qnum: 14, qtype: 'Paradox', initialCorrect: false, brCorrect: false }),
    ]);

    const r8 = out.findings.find((f) => f.rule === 'R8');
    expect(r8).toBeTruthy();
    expect(r8!.qnums).toEqual([5, 9, 14]);
    // The webinar's line, because it is the reusable one.
    expect(r8!.detail).toMatch(/not stated in the argument/);
  });
});

describe('R7 — the answer they had and gave away', () => {
  it('reads it off the trail and reports both times', () => {
    const out = run([
      q({
        qnum: 19,
        correctAnswer: 'C',
        initialAnswer: 'E',
        initialCorrect: false,
        brCorrect: false,
        timeMs: 90_000,
        answerTrail: [
          { answer: 'C', atMs: 40_000 },
          { answer: 'E', atMs: 85_000 },
        ],
      }),
    ]);

    const r7 = out.findings.find((f) => f.rule === 'R7');
    expect(r7!.detail).toMatch(/C at 0:40/);
    expect(r7!.detail).toMatch(/E at 1:25/);
    expect(r7!.detail).toMatch(/not flagged/);
  });
});

describe('R5 — confidence errors, both directions', () => {
  it('counts an unflagged miss as overconfidence and a flagged hit as underconfidence', () => {
    const out = run([
      q({ qnum: 3, initialCorrect: false, brCorrect: false }),
      q({ qnum: 8, flagged: true }),
    ]);
    const r5 = out.findings.filter((f) => f.rule === 'R5');

    expect(r5[0].headline).toMatch(/never flagged/);
    expect(r5.some((f) => /had right all along/.test(f.headline))).toBe(true);
    // His own threshold, quoted back as the fix.
    expect(r5[0].prescription).toMatch(/89%/);
  });
});

describe('R6 — buy the cheapest questions first', () => {
  it('fires when hard questions ate the clock and easy ones went wrong', () => {
    const out = run([
      q({ qnum: 13, difficulty: 5, timeMs: 280_000 }),
      q({ qnum: 20, difficulty: 2, initialCorrect: false, brCorrect: false }),
    ]);

    const r6 = out.findings.find((f) => f.rule === 'R6');
    expect(r6).toBeTruthy();
    // Correct-but-expensive still counts. The webinar is explicit about it.
    expect(r6!.qnums).toContain(13);
  });
});

describe('the report as a whole', () => {
  it('leads with the dominant cause, not the score', () => {
    const timing = run([
      q({ qnum: 1, initialCorrect: false, brCorrect: true }),
      q({ qnum: 2, initialCorrect: false, brCorrect: true }),
      q({ qnum: 3, initialCorrect: false, brCorrect: true }),
    ]);
    expect(timing.headline).toMatch(/timing section/);

    const knowledge = run([
      q({ qnum: 1, initialCorrect: false, brCorrect: false, reasoningTypes: ['conditional'] }),
      q({ qnum: 2, initialCorrect: false, brCorrect: false, reasoningTypes: ['conditional'] }),
    ]);
    expect(knowledge.headline).toMatch(/fundamentals section/);
    expect(knowledge.categories[0].category).toBe('fundamentals');
    expect(knowledge.categories[0].prescription).toMatch(/not to more sections/);
  });

  it('gives every category its questions and every finding its numbers', () => {
    const out = run([
      q({ qnum: 1, initialCorrect: false, brCorrect: false, reasoningTypes: ['causal'] }),
      q({ qnum: 2, initialCorrect: false, brCorrect: false, reasoningTypes: ['causal'] }),
      q({ qnum: 3, initialCorrect: false, brCorrect: true, timeMs: 250_000 }),
    ]);

    expect(out.categories.every((c) => c.qnums.length > 0)).toBe(true);
    expect(out.findings.every((f) => f.qnums.length > 0)).toBe(true);
    expect(out.categories.reduce((s, c) => s + c.qnums.length, 0)).toBe(out.totals.missed);
  });

  it('says nothing rather than something reassuring on a clean section', () => {
    const out = run([q({ qnum: 1 }), q({ qnum: 2 })]);
    expect(out.headline).toMatch(/Clean section/);
    expect(out.categories).toEqual([]);
  });

  it('keeps every timing rule silent on an untimed section', () => {
    const out = run([q({ qnum: 1, initialCorrect: false, brCorrect: false, timeMs: 600_000 })], {
      pace: null,
    });
    expect(out.findings.some((f) => ['R1', 'R3', 'R6'].includes(f.rule))).toBe(false);
    expect(out.notRun.join(' ')).toMatch(/sat untimed/);
  });

  it('names the rules it cannot run yet', () => {
    const out = run([q({ qnum: 1 })]);
    expect(out.notRun.join(' ')).toMatch(/R4/);
    expect(out.notRun.join(' ')).toMatch(/R9/);
  });
});

describe('breakdowns — every slice the bank knows how to cut', () => {
  const questions: AnalysisQuestion[] = [
    q({
      qnum: 1,
      qtype: 'Necessary Assumption',
      reasoningTypes: ['conditional'],
      questionFeatures: ['long stimulus'],
      initialCorrect: false,
      brCorrect: false,
      timeMs: 160_000,
    }),
    q({
      qnum: 2,
      qtype: 'Necessary Assumption',
      reasoningTypes: ['conditional'],
      initialCorrect: false,
      brCorrect: true,
      timeMs: 150_000,
    }),
    q({ qnum: 3, qtype: 'Strengthen', reasoningTypes: ['causal'], timeMs: 60_000 }),
    q({ qnum: 4, qtype: 'Strengthen', reasoningTypes: ['causal'], timeMs: 55_000 }),
  ];

  it('scores each dimension, with the rate, the pace, and the review split', () => {
    const out = run(questions);
    const na = out.breakdowns.find((b) => b.dimension === 'qtype' && b.key === 'Necessary Assumption')!;

    expect(na.attempted).toBe(2);
    expect(na.correct).toBe(0);
    expect(na.accuracyPercent).toBe(0);
    // 2:35 median against the 1:21 owed.
    expect(na.paceRatio).toBeGreaterThan(1.8);
    // One of the two misses came back in review: that half is timing, not knowledge.
    expect(na.recoveredInBlindReview).toBe(1);
    expect(na.stuckAfterBlindReview).toBe(1);
  });

  it('cuts by reasoning and by feature, not only by question type', () => {
    const out = run(questions);
    const dims = new Set(out.breakdowns.map((b) => b.dimension));

    expect(dims.has('reasoning')).toBe(true);
    expect(dims.has('feature')).toBe(true);
    expect(dims.has('family')).toBe(true);
    expect(dims.has('difficulty')).toBe(true);

    const conditional = out.breakdowns.find((b) => b.key === 'conditional')!;
    const causal = out.breakdowns.find((b) => b.key === 'causal')!;
    expect(conditional.accuracyPercent).toBe(0);
    expect(causal.accuracyPercent).toBe(100);
    // Worst first: the failing reasoning outranks the one that is fine.
    expect(conditional.priority).toBeGreaterThan(causal.priority);
  });

  it('ranks a slow-but-perfect slice above a fast perfect one', () => {
    const out = run([
      q({ qnum: 1, qtype: 'Flaw', timeMs: 200_000 }),
      q({ qnum: 2, qtype: 'Role', timeMs: 40_000 }),
    ]);
    const flaw = out.breakdowns.find((b) => b.key === 'Flaw')!;
    const role = out.breakdowns.find((b) => b.key === 'Role')!;

    expect(flaw.accuracyPercent).toBe(100);
    // The webinar is explicit: over target time is a finding at minus zero.
    expect(flaw.priority).toBeGreaterThan(role.priority);
  });

  it('keeps an unanswered question out of its question type', () => {
    const out = run([
      q({ qnum: 1, qtype: 'Paradox' }),
      q({ qnum: 2, qtype: 'Paradox', initialAnswer: '—', initialCorrect: false, timeMs: 0 }),
    ]);
    const paradox = out.breakdowns.find((b) => b.key === 'Paradox')!;

    // Never reached is a clock fact. Blaming the type for it is how a report
    // ends up telling someone to study Paradox when they ran out of time.
    expect(paradox.attempted).toBe(1);
    expect(paradox.accuracyPercent).toBe(100);
  });
});

describe('biggest insight per category', () => {
  it('gives every category that fired exactly one line', () => {
    const out = run([
      q({ qnum: 1, initialCorrect: false, brCorrect: true, timeMs: 250_000 }),
      q({
        qnum: 2,
        qtype: 'Must Be True',
        reasoningTypes: ['conditional'],
        initialCorrect: false,
        brCorrect: false,
      }),
      q({
        qnum: 3,
        qtype: 'Must Be True',
        reasoningTypes: ['conditional'],
        initialCorrect: false,
        brCorrect: false,
      }),
    ]);

    const cats = out.categories.map((c) => c.category);
    expect(out.biggestInsights.map((i) => i.category)).toEqual(cats);
    expect(out.biggestInsights.every((i) => i.insight.length > 0)).toBe(true);
    // The fundamentals line names the reasoning, not just the question numbers.
    const fundamentals = out.biggestInsights.find((i) => i.category === 'fundamentals');
    expect(fundamentals?.insight).toMatch(/conditional/);
  });
});

describe('R4 — the second pass that changed nothing', () => {
  it('counts them by number and says why going back failed', () => {
    const out = run([
      q({
        qnum: 7,
        initialCorrect: false,
        brCorrect: false,
        visitCount: 2,
        noChangeRevisits: 1,
      }),
      q({ qnum: 12, visitCount: 3, noChangeRevisits: 2 }),
      q({ qnum: 15, visitCount: 1 }),
    ]);

    const r4 = out.findings.find((f) => f.rule === 'R4')!;
    expect(r4.qnums).toEqual([7, 12]);
    expect(r4.detail).toMatch(/3 return visits in total/);
    // The webinar's actual reason, not a generic "review more carefully".
    expect(r4.detail).toMatch(/reading that produced the first answer/);
    expect(r4.prescription).toMatch(/throw the first reading away/);
  });

  it('says it cannot run on a sitting from before visits were tracked', () => {
    const out = run([q({ qnum: 1, initialCorrect: false, brCorrect: false })]);
    expect(out.findings.some((f) => f.rule === 'R4')).toBe(false);
    expect(out.notRun.join(' ')).toMatch(/predates visit tracking/);
  });
});

describe('a skip and a question never reached are different findings', () => {
  const blank = (qnum: number, everVisited?: boolean, timeMs = 0) =>
    q({ qnum, initialAnswer: '—', initialCorrect: false, timeMs, everVisited });

  it('calls one a decision and the other the clock', () => {
    const out = run([
      q({ qnum: 1, timeMs: 240_000 }),
      blank(2, true, 45_000),
      blank(3, false),
    ]);

    expect(out.perQuestion.find((p) => p.qnum === 2)?.why).toMatch(/a skip, not a shortfall/);
    expect(out.perQuestion.find((p) => p.qnum === 3)?.why).toMatch(/never opened/);
    // Both are still test-taking: the fix differs, the category does not.
    expect(out.perQuestion.find((p) => p.qnum === 2)?.category).toBe('test-taking');
    expect(out.perQuestion.find((p) => p.qnum === 3)?.category).toBe('test-taking');
  });

  it('splits them in the upstream finding rather than lumping them as unanswered', () => {
    const out = run([
      q({ qnum: 1, timeMs: 300_000 }),
      blank(2, true, 30_000),
      blank(3, false),
    ]);
    const r1 = out.findings.find((f) => f.rule === 'R1')!;

    expect(r1.detail).toMatch(/Q3 you never reached/);
    expect(r1.detail).toMatch(/Q2 you opened and left/);
  });
});

describe('down to two, and not flagged', () => {
  it('points at the moment rather than reciting the rule', () => {
    const out = run([
      q({
        qnum: 19,
        initialCorrect: false,
        brCorrect: false,
        eliminations: ['A', 'B', 'D'],
      }),
      q({ qnum: 4, eliminations: ['A'] }),
      q({ qnum: 8, eliminations: ['A', 'C', 'E'], flagged: true }),
    ]);

    const finding = out.findings.find((f) => /down to two/.test(f.headline))!;
    // Only Q19: Q4 crossed off one, and Q8 was down to two and did flag it.
    expect(finding.qnums).toEqual([19]);
    expect(finding.detail).toMatch(/a flag would have bought a second look/);
    expect(finding.prescription).toMatch(/eliminated three/);
  });

  it('stays silent on a sitting where nothing was crossed off', () => {
    const out = run([q({ qnum: 1, initialCorrect: false, brCorrect: false })]);
    expect(out.findings.some((f) => /down to two/.test(f.headline))).toBe(false);
  });
});

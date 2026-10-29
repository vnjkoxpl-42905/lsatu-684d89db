import { describe, it, expect } from 'vitest';
import {
  buildPracticeTests,
  estimateScaledScore,
  formatPracticeTestClock,
  hasOutdatedPt118Structure,
  LR_FULL_SECTION_MIN_QUESTIONS,
  practiceTestPaces,
  practiceTestRunSectionSeconds,
  practiceTestSectionSeconds,
} from './practiceTest';
import type { RcSection } from '@/features/rc/lib/rcSections';

const rc = (preptest: number, section: number, questionCount = 27, fullLength = true): RcSection => ({
  preptest,
  section,
  passageIds: [1, 2, 3, 4],
  passageCount: 4,
  questionCount,
  fullLength,
});

const manifest = (sections: { pt: number; section: number; count: number }[]) =>
  ({ sections: sections.map((s) => ({ ...s, filename: `PT${s.pt}-S${s.section}-LR.json` })) }) as never;

describe('buildPracticeTests', () => {
  it('uses only the scored PT118 sections', () => {
    const [test] = buildPracticeTests(
      manifest([
        { pt: 118, section: 1, count: 25 },
        { pt: 118, section: 3, count: 24 },
        { pt: 118, section: 4, count: 25 },
      ]),
      [rc(118, 2)],
    );
    expect(test.legs.map((leg) => leg.section)).toEqual([1, 2, 4]);
    expect(test.questionCount).toBe(77);
  });

  it('flags saved PT118 sittings that used the experimental section', () => {
    const oldRun = {
      pt: 118,
      legs: [
        { kind: 'lr', section: 1, questionCount: 26 },
        { kind: 'rc', section: 2, questionCount: 27 },
        { kind: 'lr', section: 3, questionCount: 25 },
      ],
    } as never;
    expect(hasOutdatedPt118Structure(oldRun)).toBe(true);
  });
  it('builds a three-section test from two LR sections and one RC section', () => {
    const tests = buildPracticeTests(
      manifest([
        { pt: 120, section: 1, count: 25 },
        { pt: 120, section: 3, count: 26 },
      ]),
      [rc(120, 4)],
    );
    expect(tests).toHaveLength(1);
    expect(tests[0].legs.map((l) => l.kind)).toEqual(['lr', 'lr', 'rc']);
    expect(tests[0].questionCount).toBe(78);
  });

  it('orders legs by the section number they carried on the real test', () => {
    const tests = buildPracticeTests(
      manifest([
        { pt: 121, section: 2, count: 25 },
        { pt: 121, section: 4, count: 25 },
      ]),
      [rc(121, 3)],
    );
    expect(tests[0].legs.map((l) => l.section)).toEqual([2, 3, 4]);
  });

  it('offers a PrepTest whose RC section is short, and flags it as short', () => {
    const tests = buildPracticeTests(
      manifest([
        { pt: 122, section: 1, count: 25 },
        { pt: 122, section: 3, count: 25 },
      ]),
      [rc(122, 4, 19, false)],
    );
    expect(tests).toHaveLength(1);
    expect(tests[0].rcFullLength).toBe(false);
    expect(tests[0].questionCount).toBe(69);
  });

  it('picks the fullest RC section when a PrepTest has more than one', () => {
    const tests = buildPracticeTests(
      manifest([
        { pt: 125, section: 1, count: 25 },
        { pt: 125, section: 2, count: 25 },
      ]),
      [rc(125, 3, 18, false), rc(125, 4, 27, true)],
    );
    expect(tests[0].legs.find((l) => l.kind === 'rc')?.section).toBe(4);
    expect(tests[0].rcFullLength).toBe(true);
  });

  it('drops a PrepTest with only one full LR section', () => {
    expect(
      buildPracticeTests(
        manifest([
          { pt: 123, section: 1, count: 25 },
          { pt: 123, section: 3, count: LR_FULL_SECTION_MIN_QUESTIONS - 1 },
        ]),
        [rc(123, 4)],
      ),
    ).toHaveLength(0);
  });

  it('uses the two lowest-numbered LR sections when a PrepTest has three', () => {
    const tests = buildPracticeTests(
      manifest([
        { pt: 124, section: 4, count: 25 },
        { pt: 124, section: 1, count: 25 },
        { pt: 124, section: 2, count: 25 },
      ]),
      [rc(124, 3)],
    );
    expect(tests[0].legs.filter((l) => l.kind === 'lr').map((l) => l.section)).toEqual([1, 2]);
  });
});

describe('estimateScaledScore', () => {
  it('floors at 120 and caps at 180', () => {
    expect(estimateScaledScore(0, 76)).toBe(120);
    expect(estimateScaledScore(76, 76)).toBe(180);
  });

  it('rises monotonically with the raw score', () => {
    let previous = 0;
    for (let raw = 0; raw <= 76; raw += 1) {
      const scaled = estimateScaledScore(raw, 76);
      expect(scaled).toBeGreaterThanOrEqual(previous);
      previous = scaled;
    }
  });

  it('is scored on percent correct, so a 75- and a 76-question test agree', () => {
    expect(Math.abs(estimateScaledScore(57, 75) - estimateScaledScore(58, 76))).toBeLessThanOrEqual(1);
  });

  it('never returns a score outside the LSAT band', () => {
    for (const raw of [0, 1, 30, 55, 70, 75, 999]) {
      const scaled = estimateScaledScore(raw, 75);
      expect(scaled).toBeGreaterThanOrEqual(120);
      expect(scaled).toBeLessThanOrEqual(180);
    }
  });
});

/**
 * The paces are a percentage of the student's OWN standard clock, not of 35:00.
 *
 * They were absolute before: 'standard' was hard-wired to 35 minutes whatever
 * the student's standing timing mode said, so a student carrying extra time who
 * chose "Standard" was handed a 35-minute section, less time than they are
 * entitled to, on every leg of a two-hour sitting. The section door had always
 * read the setting; this door never did.
 */
describe('practice test paces', () => {
  const MIN = 60;

  it('gives a student with no accommodation the ordinary clocks', () => {
    expect(practiceTestSectionSeconds('standard', 35 * MIN)).toBe(35 * MIN);
    expect(practiceTestSectionSeconds('time-and-a-half', 35 * MIN)).toBe(52.5 * MIN);
    expect(practiceTestSectionSeconds('double-time', 35 * MIN)).toBe(70 * MIN);
    expect(practiceTestSectionSeconds('untimed', 35 * MIN)).toBeNull();
  });

  it("treats an accommodated student's own clock as Standard", () => {
    // The defect: this returned 35 minutes for a student entitled to 52.5.
    expect(practiceTestSectionSeconds('standard', 52.5 * MIN)).toBe(52.5 * MIN);
    expect(practiceTestSectionSeconds('standard', 70 * MIN)).toBe(70 * MIN);
  });

  it('scales the accommodations off that base rather than off 35 minutes', () => {
    expect(practiceTestSectionSeconds('time-and-a-half', 52.5 * MIN)).toBe(78.75 * MIN);
    expect(practiceTestSectionSeconds('double-time', 52.5 * MIN)).toBe(105 * MIN);
  });

  it('spells each accommodation the way the section door spells it', () => {
    // One spelling per accommodation for the whole room. This list used to read
    // "Time & a Half" / "Double Time" while the section door read "Time and a
    // half" / "Double time", so the same two accommodations were spelled and
    // cased differently depending on which door a student opened.
    expect(practiceTestPaces().map((p) => p.label)).toEqual([
      'Standard',
      'Time and a half',
      'Double time',
      'Untimed',
    ]);
  });

  it('labels every pace, and states the clock the student will actually get', () => {
    const paces = practiceTestPaces(52.5 * MIN);
    expect(paces.map((p) => p.id)).toEqual(['standard', 'time-and-a-half', 'double-time', 'untimed']);
    expect(paces.find((p) => p.id === 'standard')?.sectionSeconds).toBe(52.5 * MIN);
    expect(formatPracticeTestClock(practiceTestSectionSeconds('standard', 52.5 * MIN))).toBe('52:30');
    expect(formatPracticeTestClock(null)).toBeNull();
  });

  it('reads a run back at the clock it was created with, not the current setting', () => {
    const run = { pace: 'standard', sectionSeconds: 52.5 * MIN } as never;
    expect(practiceTestRunSectionSeconds(run)).toBe(52.5 * MIN);
  });

  it('falls back to the old absolute reading for runs stored before this existed', () => {
    const legacy = { pace: 'time-and-a-half' } as never;
    expect(practiceTestRunSectionSeconds(legacy)).toBe(52.5 * MIN);
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildPracticeTests,
  estimateScaledScore,
  LR_FULL_SECTION_MIN_QUESTIONS,
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

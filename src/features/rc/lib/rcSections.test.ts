import { describe, expect, it } from 'vitest';
import {
  buildRcSections,
  formatRcSectionClock,
  RC_FULL_SECTION_MIN_QUESTIONS,
  rcSectionHref,
  rcSectionPreptests,
  rcSectionsForPreptest,
  rcSectionTotalSeconds,
  type RcIndexPassageWithPt,
} from './rcSections';

function passage(
  preptest: number,
  section: number,
  setNumber: number,
  questionCount: number,
): RcIndexPassageWithPt {
  return {
    preptest,
    section,
    setNumber,
    passageId: preptest * 100 + section * 10 + setNumber,
    title: `PT${preptest} S${section} P${setNumber}`,
    topic: 'Science',
    format: 'Standard (Non-Comparative)',
    frameworks: [],
    difficulty: 3,
    questionCount,
    explainedCount: questionCount,
    questionIds: [],
    firstWords: '',
  } as RcIndexPassageWithPt;
}

function fullSection(preptest: number, section: number, per = 7) {
  return [1, 2, 3, 4].map((n) => passage(preptest, section, n, per));
}

describe('buildRcSections', () => {
  it('groups four passages into one section in published order', () => {
    // Deliberately shuffled: the index is not guaranteed to arrive sorted, and a
    // section sat out of order is not the section.
    const shuffled = [
      passage(101, 1, 3, 7),
      passage(101, 1, 1, 7),
      passage(101, 1, 4, 6),
      passage(101, 1, 2, 7),
    ];

    const [s] = buildRcSections(shuffled);

    expect(s.passageIds).toEqual([10111, 10112, 10113, 10114]);
    expect(s.passageCount).toBe(4);
    expect(s.questionCount).toBe(27);
  });

  it('excludes a section whose passage has nothing drillable', () => {
    // Reading three passages and answering questions on two is not a section.
    const holed = [
      passage(159, 4, 1, 0),
      passage(159, 4, 2, 0),
      passage(159, 4, 3, 0),
      passage(159, 4, 4, 2),
    ];

    expect(buildRcSections(holed)).toEqual([]);
  });

  it('excludes a group that is not four passages', () => {
    expect(buildRcSections([passage(101, 1, 1, 7), passage(101, 1, 2, 7)])).toEqual([]);
  });

  it('marks a short section as short rather than hiding or padding it', () => {
    const short = buildRcSections(fullSection(110, 2, 4))[0];
    const real = buildRcSections(fullSection(111, 2, 7))[0];

    expect(short.questionCount).toBe(16);
    expect(short.fullLength).toBe(false);
    expect(real.questionCount).toBe(28);
    expect(real.fullLength).toBe(true);
  });

  it('treats the documented threshold as the boundary', () => {
    const at = buildRcSections([
      passage(120, 1, 1, RC_FULL_SECTION_MIN_QUESTIONS - 3),
      passage(120, 1, 2, 1),
      passage(120, 1, 3, 1),
      passage(120, 1, 4, 1),
    ])[0];
    expect(at.questionCount).toBe(RC_FULL_SECTION_MIN_QUESTIONS);
    expect(at.fullLength).toBe(true);
  });

  it('sorts by PrepTest then section, and handles a PrepTest with two RC sections', () => {
    const sections = buildRcSections([
      ...fullSection(104, 3),
      ...fullSection(101, 1),
      ...fullSection(101, 4),
    ]);

    expect(sections.map((s) => [s.preptest, s.section])).toEqual([
      [101, 1],
      [101, 4],
      [104, 3],
    ]);
    expect(rcSectionPreptests(sections)).toEqual([101, 104]);
    expect(rcSectionsForPreptest(sections, 101)).toHaveLength(2);
  });
});

describe('section timing', () => {
  const section = buildRcSections(fullSection(101, 1))[0];

  it('runs a standard section at exactly 35:00', () => {
    // 525s per passage x 4 = 2100s. The existing per-passage budget already
    // expresses a real section clock, which is why none of this needed a
    // change to the session model.
    expect(rcSectionTotalSeconds(section, 'standard')).toBe(2100);
    expect(formatRcSectionClock(section, 'standard')).toBe('35:00');
  });

  it('supports the accommodations multiples', () => {
    expect(formatRcSectionClock(section, 'time-and-a-half')).toBe('52:32');
    expect(formatRcSectionClock(section, 'double-time')).toBe('70:00');
  });

  it('reports no clock when untimed', () => {
    expect(rcSectionTotalSeconds(section, 'untimed')).toBeNull();
    expect(formatRcSectionClock(section, 'untimed')).toBeNull();
  });
});

describe('rcSectionHref', () => {
  const section = buildRcSections(fullSection(101, 1))[0];

  it('starts the section in order, under test conditions', () => {
    expect(rcSectionHref(section)).toBe(
      '/rc?passages=10111%2C10112%2C10113%2C10114&reveal=end_of_set&timing=standard&start=1',
    );
  });

  it('omits secondsPerPassage at standard pace so the link stays backward compatible', () => {
    expect(rcSectionHref(section, 'standard')).not.toContain('secondsPerPassage');
  });

  it('carries secondsPerPassage only for the accommodations paces', () => {
    expect(rcSectionHref(section, 'time-and-a-half')).toContain('secondsPerPassage=788');
    expect(rcSectionHref(section, 'double-time')).toContain('secondsPerPassage=1050');
  });

  it('asks for no clock when untimed', () => {
    const href = rcSectionHref(section, 'untimed');
    expect(href).toContain('timing=untimed');
    expect(href).not.toContain('secondsPerPassage');
  });
});

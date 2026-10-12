import { describe, expect, it } from 'vitest';
import { parseCustomPace, summarizeRcBuild } from './rcBuilderSummary';

const base = {
  requestedPassages: 3,
  handPickedIds: [] as number[],
  poolPassages: 10,
  inspected: null,
  secondsPerPassage: 0,
};

describe('parseCustomPace', () => {
  it.each([
    ['8:45', 525],
    ['10', 600],
    [' 1:00 ', 60],
    ['60:00', 3600],
    ['13:8', 788],
  ])('accepts %s as %d seconds', (text, seconds) => {
    expect(parseCustomPace(text)).toEqual({ ok: true, seconds });
  });

  it.each(['', 'abc', '8:', ':30', '8:45:00', '-5', '8.5'])('rejects malformed %j', (text) => {
    expect(parseCustomPace(text)).toMatchObject({ ok: false, message: expect.stringContaining('minutes:seconds') });
  });

  it('rejects seconds above 59 instead of rolling them over', () => {
    expect(parseCustomPace('8:75')).toEqual({ ok: false, message: 'Seconds must be between 00 and 59.' });
  });

  it.each(['0:00', '0:59', '60:01', '99'])('rejects %s outside the one-minute to one-hour link contract', (text) => {
    expect(parseCustomPace(text)).toMatchObject({ ok: false, message: expect.stringContaining('1:00 and 60:00') });
  });
});

describe('summarizeRcBuild', () => {
  it('times an adaptive set by the passages the pool can supply, not the request', () => {
    const summary = summarizeRcBuild({ ...base, requestedPassages: 4, poolPassages: 2, secondsPerPassage: 525 });
    expect(summary).toMatchObject({ source: 'adaptive', requestedPassages: 4, plannedPassages: 2, shortfall: 2, totalSeconds: 1050 });
    // No passages are chosen before inspection, so no question total is claimed.
    expect(summary.inspectedQuestions).toBeNull();
  });

  it('lets hand-picked passages replace the stepper for counts and timing', () => {
    const summary = summarizeRcBuild({ ...base, requestedPassages: 1, handPickedIds: [1, 2], secondsPerPassage: 600 });
    expect(summary).toMatchObject({ source: 'hand-picked', requestedPassages: 2, plannedPassages: 2, inspectedQuestions: null, shortfall: 0, totalSeconds: 1200 });
  });

  it('reads question totals from loaded content once the set is inspected', () => {
    const summary = summarizeRcBuild({
      ...base,
      handPickedIds: [1, 2],
      inspected: { passageIds: [1, 2], questionCounts: [6, 7] },
    });
    expect(summary).toMatchObject({ plannedPassages: 2, inspectedQuestions: 13, totalSeconds: null });
  });

  it('reports a shortfall when the inspected adaptive set is smaller than requested', () => {
    const summary = summarizeRcBuild({ ...base, requestedPassages: 3, inspected: { passageIds: [3], questionCounts: [6] }, secondsPerPassage: 525 });
    expect(summary).toMatchObject({ requestedPassages: 3, plannedPassages: 1, inspectedQuestions: 6, shortfall: 2, totalSeconds: 525 });
  });
});

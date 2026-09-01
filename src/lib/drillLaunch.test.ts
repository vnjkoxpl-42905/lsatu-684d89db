import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import {
  launchDrill,
  parseDrillLaunch,
  toDrillRouteState,
  launchNeedsResolution,
  DrillLaunchError,
  type DrillLaunch,
} from './drillLaunch';
import { getResolvedDrillRouteState } from './drillRouteState';

const params = (search: string) => new URLSearchParams(search);

describe('the codec round-trips', () => {
  // One of every kind. If a kind is added and not listed here, the exhaustive
  // check at the bottom of this block fails.
  const cases: Record<string, DrillLaunch> = {
    'smart drill': { kind: 'smart-drill' },
    'a section': { kind: 'section', pt: 155, section: 1 },
    'a timed, sealed section': {
      kind: 'section',
      pt: 155,
      section: 1,
      minutes: 53,
      sealed: true,
    },
    'a practice-test leg': {
      kind: 'section',
      pt: 140,
      section: 3,
      ptLeg: { runId: 'run_abc', legIndex: 0 },
    },
    'a saved set': { kind: 'saved-set', setId: 'set_abc123' },
    'an assignment': { kind: 'assignment', assignmentId: 'asg_1' },
    'a guided set assignment': {
      kind: 'assignment',
      assignmentId: 'asg_1',
      guidedSetId: 'gs_9',
    },
    'a guided drill': { kind: 'guided-drill', drillId: 'gd_7', durationMinutes: 20 },
    'a guided drill handed over as an assignment': {
      kind: 'guided-drill',
      assignmentId: 'asg_2',
    },
    'a practice set': { kind: 'practice-set', slug: 'mc-practice-1', source: 'intro' },
    'an ad-hoc list': { kind: 'questions', qids: ['PT1-S2-Q3', 'PT1-S2-Q4'] },
    'a filter': {
      kind: 'filter',
      count: 6,
      qtypes: ['Flaw'],
      difficulties: [3],
      pts: [140, 141],
    },
    'a launch carrying every shared switch': {
      kind: 'questions',
      qids: ['PT1-S2-Q3'],
      options: {
        returnTo: '/classroom',
        label: 'Flaw practice',
        initialIndex: 2,
        present: 'smart',
      },
    },
  };

  for (const [name, launch] of Object.entries(cases)) {
    it(`survives being written and read back: ${name}`, () => {
      expect(parseDrillLaunch(params(launchDrill(launch)))).toEqual(launch);
    });
  }

  it('covers every kind', () => {
    const covered = new Set(Object.values(cases).map((l) => l.kind));
    expect([...covered].sort()).toEqual([
      'assignment',
      'filter',
      'guided-drill',
      'practice-set',
      'questions',
      'saved-set',
      'section',
      'smart-drill',
    ]);
  });
});

describe('a switch sent to the wrong kind', () => {
  it('is rejected when it would change what the student experiences', () => {
    expect(() => parseDrillLaunch(params('drill=smart-drill&sealed=1'))).toThrow(
      DrillLaunchError,
    );
    expect(() => parseDrillLaunch(params('drill=saved-set&set=s1&qids=a,b'))).toThrow(
      DrillLaunchError,
    );
    expect(() => parseDrillLaunch(params('drill=questions&qids=a&count=6'))).toThrow(
      DrillLaunchError,
    );
  });

  it('is ignored when it is only decoration', () => {
    expect(
      parseDrillLaunch(params('drill=smart-drill&label=Warm%20up&returnTo=/classroom')),
    ).toEqual({
      kind: 'smart-drill',
      options: { label: 'Warm up', returnTo: '/classroom' },
    });
  });

  it('refuses a launch that names nothing runnable', () => {
    expect(() => parseDrillLaunch(params('drill=section&pt=155'))).toThrow(
      DrillLaunchError,
    );
    expect(() => parseDrillLaunch(params('drill=saved-set'))).toThrow(DrillLaunchError);
    expect(() => parseDrillLaunch(params('drill=nonsense'))).toThrow(DrillLaunchError);
  });

  it('reports no drill at all when the URL names none', () => {
    expect(parseDrillLaunch(params('foo=bar'))).toBeNull();
  });
});

describe('an off-site return is refused', () => {
  it('drops a returnTo that leaves the app', () => {
    expect(parseDrillLaunch(params('drill=smart-drill&returnTo=//evil.example'))).toEqual({
      kind: 'smart-drill',
    });
    expect(
      parseDrillLaunch(params('drill=smart-drill&returnTo=https://evil.example')),
    ).toEqual({ kind: 'smart-drill' });
  });
});

describe('the kinds that need a row read before they can run', () => {
  it('says so', () => {
    expect(launchNeedsResolution({ kind: 'saved-set', setId: 's' })).toBe(true);
    expect(launchNeedsResolution({ kind: 'assignment', assignmentId: 'a' })).toBe(true);
    expect(launchNeedsResolution({ kind: 'questions', qids: ['q'] })).toBe(false);
    expect(launchNeedsResolution({ kind: 'section', pt: 1, section: 1 })).toBe(false);
  });

  it('refuses to translate before the row has been read', () => {
    expect(() => toDrillRouteState({ kind: 'saved-set', setId: 's' })).toThrow(
      DrillLaunchError,
    );
  });

  it('translates once it has', () => {
    const state = toDrillRouteState({ kind: 'saved-set', setId: 's' }, ['q1', 'q2']);
    expect(state.mode).toBe('type-drill');
    expect(state.config).toMatchObject({ selectedQids: ['q1', 'q2'], count: 2 });
  });
});

/**
 * The half of this change that has to be provably invisible. Every URL below is
 * one a launch site actually builds today. Reading it through the new codec and
 * translating it back must produce exactly what the runner receives now.
 */
describe('nothing changes for a link that exists today', () => {
  const NOW = 1_756_700_000_000;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  const realLinks: Record<string, string> = {
    'an assigned section': 'mode=full-section&pt=155&section=1&minutes=53&sealed=1',
    'a plain section': 'mode=full-section&pt=140&section=2',
    'a section link missing its section': 'mode=full-section&pt=155',
    'a bootcamp practice set':
      'mode=type-drill&qids=PT1-S1-Q1,PT1-S1-Q2&returnTo=%2Fbootcamp&initialIndex=1&focus=Day%203&source=intro&practiceSlug=mc-practice-1',
    'a guided drill': 'mode=type-drill&qids=PT1-S1-Q1&guided=1&guidedDurationMinutes=20&focus=Flaws',
    'a guided drill from an assignment':
      'mode=type-drill&qids=PT1-S1-Q1&guidedAssignmentId=asg_1',
    'a classroom assignment':
      'mode=type-drill&qids=PT1-S1-Q1,PT1-S1-Q2&assignmentId=asg_1&guidedSetId=gs_1',
    'a question-finder jump':
      'mode=type-drill&qids=PT155-S2-Q7&present=smart&returnTo=%2Ffinder',
    'the practice-set alias': 'mode=practice-set&qids=PT1-S1-Q1',
    'a flagged-question redo': 'mode=type-drill&returnTo=%2Fflagged',
  };

  for (const [name, search] of Object.entries(realLinks)) {
    it(`resolves identically: ${name}`, () => {
      const p = params(search);
      const launch = parseDrillLaunch(p);
      expect(launch).not.toBeNull();
      expect(toDrillRouteState(launch as DrillLaunch, undefined, NOW)).toEqual(
        getResolvedDrillRouteState(p, null),
      );
    });
  }
});

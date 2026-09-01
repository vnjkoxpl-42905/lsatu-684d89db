import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import {
  launchDrill,
  parseDrillLaunch,
  toDrillRouteState,
  launchNeedsResolution,
  launchFromRouteState,
  expandToLegacySearch,
  DrillLaunchError,
  type DrillLaunch,
  type DrillLaunchBody,
} from './drillLaunch';
import { getResolvedDrillRouteState } from './drillRouteState';
import type { TimerMode } from '@/types/drill';

const params = (search: string) => new URLSearchParams(search);

describe('the codec round-trips', () => {
  // Keyed by kind, so adding a kind to the union without adding it here is a
  // type error rather than a quietly untested kind.
  const onePerKind: Record<DrillLaunchBody['kind'], DrillLaunch> = {
    'smart-drill': { kind: 'smart-drill' },
    section: { kind: 'section', pt: 155, section: 1 },
    'saved-set': { kind: 'saved-set', setId: 'set_abc123' },
    assignment: { kind: 'assignment', assignmentId: 'asg_1' },
    'guided-drill': { kind: 'guided-drill', drillId: 'gd_7' },
    'practice-set': { kind: 'practice-set', slug: 'mc-practice-1' },
    'bootcamp-day': { kind: 'bootcamp-day', day: 3, part: 'homework' },
    questions: { kind: 'questions', qids: ['PT1-S2-Q3'] },
    filter: { kind: 'filter', count: 6 },
  };

  for (const [kind, launch] of Object.entries(onePerKind)) {
    it(`survives being written and read back: ${kind}`, () => {
      expect(parseDrillLaunch(params(launchDrill(launch)))).toEqual(launch);
    });
  }

  // Variants worth pinning beyond one-of-each.
  const cases: Record<string, DrillLaunch> = {
    'a section at an accommodated clock': {
      kind: 'section',
      pt: 155,
      section: 1,
      timerMode: '52.5',
    },
    'an untimed section': { kind: 'section', pt: 155, section: 1, timerMode: 'unlimited' },
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
    'a guided set assignment': {
      kind: 'assignment',
      assignmentId: 'asg_1',
      guidedSetId: 'gs_9',
    },
    'a guided drill with a duration': {
      kind: 'guided-drill',
      drillId: 'gd_7',
      durationMinutes: 20,
    },
    'a guided drill handed over as an assignment': {
      kind: 'guided-drill',
      assignmentId: 'asg_2',
    },
    'a practice set with a source': {
      kind: 'practice-set',
      slug: 'mc-practice-1',
      source: 'intro',
    },
    'a multi-question list': { kind: 'questions', qids: ['PT1-S2-Q3', 'PT1-S2-Q4'] },
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

/**
 * The property the gate depends on. Every button that hands a drill over in
 * memory gets its launch named, written into the address bar, and read back by
 * the runner. If that round trip changed the run in any way, the gate would be
 * silently altering drills instead of merely making them refreshable.
 *
 * Compared as behaviour rather than object identity: the URL path always states
 * `isGuidedDrill` explicitly where the in-memory path leaves it undefined, and
 * `!!undefined === !!false`.
 */
describe('canonicalizing an in-memory launch does not change the run', () => {
  const NOW = 1_756_700_000_000;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  const normalize = (s: ReturnType<typeof getResolvedDrillRouteState>) => ({
    mode: s.mode,
    config: s.config,
    returnTo: s.returnTo,
    practicingLabel: s.practicingLabel,
    present: s.present,
    sealed: !!s.sealed,
    isGuidedDrill: !!s.isGuidedDrill,
    guidedDurationMinutes: s.guidedDurationMinutes,
  });

  const freshTimer = (mode: TimerMode, customMinutes?: number) => ({
    mode,
    customMinutes,
    isPaused: false,
    elapsedMs: 0,
    startedAt: NOW,
  });

  // Every one of these is the payload a real button passes today.
  const inMemoryLaunches: Record<string, unknown> = {
    'Smart Drill from the Mainhub': { mode: 'adaptive', returnTo: '/classroom' },
    'a Testing Centre section': {
      mode: 'full-section',
      config: { pt: 155, section: 1, timer: freshTimer('35') },
      returnTo: '/testing',
    },
    'an accommodated Testing Centre section': {
      mode: 'full-section',
      config: { pt: 155, section: 1, timer: freshTimer('52.5') },
      returnTo: '/testing',
    },
    'an untimed section': {
      mode: 'full-section',
      config: { pt: 140, section: 2, timer: freshTimer('unlimited') },
      returnTo: '/testing',
    },
    'a custom-length section': {
      mode: 'full-section',
      config: { pt: 140, section: 2, timer: freshTimer('custom', 53) },
      returnTo: '/testing',
    },
    'the Analytics weak-type drill': {
      mode: 'type-drill',
      config: { qtypes: ['Flaw'], difficulties: [3], pts: [140, 141], count: 6 },
    },
    'the Mainhub set builder': {
      mode: 'type-drill',
      config: { qtypes: [], difficulties: [], pts: [140], count: 10 },
      returnTo: '/classroom',
    },
    'a bootcamp day': {
      mode: 'practice-set',
      config: {
        qtypes: [],
        difficulties: [],
        pts: [],
        count: 2,
        selectedQids: ['PT1-S1-Q1', 'PT1-S1-Q2'],
      },
    },
    'redo one question from section results': {
      mode: 'type-drill',
      config: {
        qtypes: [],
        difficulties: [],
        pts: [],
        count: 1,
        selectedQids: ['PT155-S2-Q7'],
      },
    },
    'a generated micro-drill': {
      mode: 'type-drill',
      config: { qtypes: ['Flaw'], difficulties: [4], pts: [150, 151], count: 2 },
    },
  };

  for (const [name, routeState] of Object.entries(inMemoryLaunches)) {
    it(`survives being written to the address bar: ${name}`, () => {
      const before = getResolvedDrillRouteState(params(''), routeState);
      const launch = launchFromRouteState(before);
      expect(launch).not.toBeNull();

      const expanded = params(expandToLegacySearch(launch as DrillLaunch));
      expect(normalize(getResolvedDrillRouteState(expanded, null))).toEqual(
        normalize(before),
      );
    });
  }

  it('carries the practice-test leg the close-out needs', () => {
    const launch = launchFromRouteState(
      {
        mode: 'full-section',
        config: { pt: 140, section: 3, timer: freshTimer('35') },
        returnTo: '/sitting/run_abc',
      },
      { runId: 'run_abc', legIndex: 2 },
    );
    const expanded = params(expandToLegacySearch(launch as DrillLaunch));
    expect(expanded.get('runId')).toBe('run_abc');
    expect(expanded.get('leg')).toBe('2');
  });

  it('leaves a launch it cannot name alone', () => {
    expect(launchFromRouteState(null)).toBeNull();
    expect(launchFromRouteState({ returnTo: '/classroom' })).toBeNull();
    expect(launchFromRouteState({ mode: 'type-drill' })).toBeNull();
  });
});

describe('a short link expands to something the runner understands', () => {
  it('turns a saved set into its questions', () => {
    const search = expandToLegacySearch({ kind: 'saved-set', setId: 's1' }, ['q1', 'q2']);
    expect(params(search).get('mode')).toBe('type-drill');
    expect(params(search).get('qids')).toBe('q1,q2');
  });

  it('keeps the params the runner reads for a guided drill', () => {
    const search = expandToLegacySearch(
      { kind: 'guided-drill', assignmentId: 'asg_1', durationMinutes: 20 },
      ['q1'],
    );
    const p = params(search);
    expect(p.get('guided')).toBe('1');
    expect(p.get('guidedAssignmentId')).toBe('asg_1');
    expect(p.get('guidedDurationMinutes')).toBe('20');
  });

  it('keeps the params the runner reads for a practice set', () => {
    const p = params(expandToLegacySearch({ kind: 'practice-set', slug: 'mc-practice-1' }, ['q1']));
    expect(p.get('source')).toBe('intro-to-lr-practice-drills');
    expect(p.get('practiceSlug')).toBe('mc-practice-1');
  });

});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import {
  launchDrill,
  parseDrillLaunch,
  launchNeedsResolution,
  launchFromRouteState,
  DrillLaunchError,
  type DrillLaunch,
  type DrillLaunchBody,
} from './drillLaunch';
import { drillRunSpecFromLaunch, type DrillRunSpec } from './drillRunSpec';
import { drillResumeKey } from './drillResumeSession';
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

  it('refuses to build a run spec before the row has been read', () => {
    expect(() => drillRunSpecFromLaunch({ kind: 'saved-set', setId: 's' })).toThrow(
      DrillLaunchError,
    );
  });

  it('builds one once it has', () => {
    const spec = drillRunSpecFromLaunch({ kind: 'saved-set', setId: 's' }, ['q1', 'q2']);
    expect(spec.mode).toBe('type-drill');
    expect(spec.config).toMatchObject({ selectedQids: ['q1', 'q2'], count: 2 });
  });
});

/**
 * Every URL below is one a launch site actually builds, or built before the
 * canonical grammar existed. The runner has one reader now, so what these links
 * mean is pinned here rather than left to agree with a second parser by
 * coincidence. A change to any of these values is a change to a live link.
 */
describe('an older link still names the run it always named', () => {
  const NOW = 1_756_700_000_000;

  const timer = (mode: TimerMode, customMinutes?: number) => ({
    mode,
    customMinutes,
    isPaused: false,
    elapsedMs: 0,
    startedAt: NOW,
  });
  const queue = (...qids: string[]) => ({
    qtypes: [],
    difficulties: [],
    pts: [],
    count: qids.length,
    selectedQids: qids,
  });

  const realLinks: Record<string, [string, DrillRunSpec]> = {
    'an assigned section': [
      'mode=full-section&pt=155&section=1&minutes=53&sealed=1',
      {
        mode: 'full-section',
        config: { pt: 155, section: 1, timer: timer('custom', 53) },
        sealed: true,
      },
    ],
    // The accommodated clocks. Reducing 70 to a number of minutes, or dropping
    // it, would re-time an accommodated sitting as a standard one.
    'an accommodated assigned section': [
      'mode=full-section&pt=155&section=1&timer=70&sealed=1',
      {
        mode: 'full-section',
        config: { pt: 155, section: 1, timer: timer('70') },
        sealed: true,
      },
    ],
    'a plain section': [
      'mode=full-section&pt=140&section=2',
      {
        mode: 'full-section',
        config: { pt: 140, section: 2, timer: timer('35') },
        sealed: false,
      },
    ],
    // The two values whose loss on refresh left a practice test permanently
    // open, because the close-out had nothing to write against.
    'a leg of a sitting': [
      'mode=full-section&pt=140&section=3&runId=run_abc&leg=2',
      {
        mode: 'full-section',
        config: { pt: 140, section: 3, timer: timer('35') },
        sealed: false,
        ptRun: { runId: 'run_abc', legIndex: 2 },
      },
    ],
    // A malformed section fell through to an empty question list rather than
    // erroring, and still does.
    'a section link missing its section': [
      'mode=full-section&pt=155',
      { mode: 'full-section', config: queue(), sealed: false, isGuidedDrill: false },
    ],
    'a bootcamp practice set': [
      'mode=type-drill&qids=PT1-S1-Q1,PT1-S1-Q2&returnTo=%2Fbootcamp&initialIndex=1&focus=Day%203&source=intro&practiceSlug=mc-practice-1',
      {
        mode: 'type-drill',
        config: queue('PT1-S1-Q1', 'PT1-S1-Q2'),
        returnTo: '/bootcamp',
        practicingLabel: 'Day 3',
        initialIndex: 1,
        sealed: false,
        isGuidedDrill: false,
        practiceSource: 'intro',
        practiceSlug: 'mc-practice-1',
      },
    ],
    'a guided drill': [
      'mode=type-drill&qids=PT1-S1-Q1&guided=1&guidedDurationMinutes=20&focus=Flaws',
      {
        mode: 'type-drill',
        config: queue('PT1-S1-Q1'),
        practicingLabel: 'Flaws',
        sealed: false,
        isGuidedDrill: true,
        guidedDurationMinutes: 20,
      },
    ],
    'a guided drill from an assignment': [
      'mode=type-drill&qids=PT1-S1-Q1&guidedAssignmentId=asg_1',
      {
        mode: 'type-drill',
        config: queue('PT1-S1-Q1'),
        sealed: false,
        isGuidedDrill: true,
        guidedAssignmentId: 'asg_1',
      },
    ],
    'a classroom assignment': [
      'mode=type-drill&qids=PT1-S1-Q1,PT1-S1-Q2&assignmentId=asg_1&guidedSetId=gs_1',
      {
        mode: 'type-drill',
        config: queue('PT1-S1-Q1', 'PT1-S1-Q2'),
        sealed: false,
        isGuidedDrill: false,
        assignmentId: 'asg_1',
        guidedSetId: 'gs_1',
      },
    ],
    'a bootcamp day': [
      'mode=type-drill&qids=q1,q2&bootcampDay=3&bootcampPart=homework',
      {
        mode: 'type-drill',
        config: queue('q1', 'q2'),
        sealed: false,
        isGuidedDrill: false,
        resumeIdentity: { kind: 'bootcamp-day', day: 3, part: 'homework' },
      },
    ],
    'a question-finder jump': [
      'mode=type-drill&qids=PT155-S2-Q7&present=smart&returnTo=%2Ffinder',
      {
        mode: 'type-drill',
        config: queue('PT155-S2-Q7'),
        returnTo: '/finder',
        present: 'smart',
        sealed: false,
        isGuidedDrill: false,
      },
    ],
    'the practice-set alias': [
      'mode=practice-set&qids=PT1-S1-Q1',
      { mode: 'type-drill', config: queue('PT1-S1-Q1'), sealed: false, isGuidedDrill: false },
    ],
    'a flagged-question redo': [
      'mode=type-drill&returnTo=%2Fflagged',
      { mode: 'type-drill', config: queue(), returnTo: '/flagged', sealed: false, isGuidedDrill: false },
    ],
  };

  for (const [name, [search, expected]] of Object.entries(realLinks)) {
    it(`still means the same run: ${name}`, () => {
      const launch = parseDrillLaunch(params(search));
      expect(launch).not.toBeNull();
      const spec = drillRunSpecFromLaunch(launch as DrillLaunch, undefined, NOW);
      for (const [key, value] of Object.entries(expected)) {
        expect({ [key]: spec[key as keyof DrillRunSpec] }).toEqual({ [key]: value });
      }
    });
  }

  it('never rewrites an older link, so nothing it says can be dropped', () => {
    // The gate leaves these URLs alone. If that ever changes, everything above
    // has to survive `launchDrill` as well.
    const search = 'mode=type-drill&qids=q1&guided=1&assignmentId=asg_1&bootcampDay=3&bootcampPart=practice';
    const launch = parseDrillLaunch(params(search)) as DrillLaunch;
    const spec = drillRunSpecFromLaunch(launch, undefined, NOW);
    expect(spec.isGuidedDrill).toBe(true);
    expect(spec.assignmentId).toBe('asg_1');
    expect(spec.resumeIdentity).toEqual({ kind: 'bootcamp-day', day: 3, part: 'practice' });
  });
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

  const normalize = (s: DrillRunSpec) => ({
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
      const launch = launchFromRouteState(routeState as never);
      expect(launch).not.toBeNull();
      const before = drillRunSpecFromLaunch(launch as DrillLaunch, undefined, NOW);

      const reread = parseDrillLaunch(params(launchDrill(launch as DrillLaunch)));
      expect(reread).not.toBeNull();
      expect(normalize(drillRunSpecFromLaunch(reread as DrillLaunch, undefined, NOW))).toEqual(
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
    const written = params(launchDrill(launch as DrillLaunch));
    expect(written.get('runId')).toBe('run_abc');
    expect(written.get('leg')).toBe('2');
    expect(
      drillRunSpecFromLaunch(parseDrillLaunch(written) as DrillLaunch, undefined, NOW).ptRun,
    ).toEqual({ runId: 'run_abc', legIndex: 2 });
  });

  it('leaves a launch it cannot name alone', () => {
    expect(launchFromRouteState(null)).toBeNull();
    expect(launchFromRouteState({ returnTo: '/classroom' })).toBeNull();
    expect(launchFromRouteState({ mode: 'type-drill' })).toBeNull();
  });
});

describe('a short link becomes a run the runner can start', () => {
  it('turns a saved set into its questions', () => {
    const spec = drillRunSpecFromLaunch({ kind: 'saved-set', setId: 's1' }, ['q1', 'q2']);
    expect(spec.mode).toBe('type-drill');
    expect((spec.config as { selectedQids?: string[] }).selectedQids).toEqual(['q1', 'q2']);
  });

  it('keeps the ids the runner needs for a guided drill', () => {
    const spec = drillRunSpecFromLaunch(
      {
        kind: 'guided-drill',
        drillId: 'gd_7',
        assignmentId: 'asg_1',
        durationMinutes: 20,
      },
      ['q1'],
    );
    expect(spec.isGuidedDrill).toBe(true);
    expect(spec.guidedDrillId).toBe('gd_7');
    expect(spec.guidedAssignmentId).toBe('asg_1');
    expect(spec.guidedDurationMinutes).toBe(20);
  });

  it('keeps a bootcamp day as the Run Record name after drawing its questions', () => {
    const spec = drillRunSpecFromLaunch(
      { kind: 'bootcamp-day', day: 3, part: 'homework' },
      ['q1', 'q2'],
    );
    expect(spec.resumeIdentity).toEqual({ kind: 'bootcamp-day', day: 3, part: 'homework' });
    expect(
      drillResumeKey({
        mode: 'type-drill',
        config: spec.config,
        identity: spec.resumeIdentity,
      }),
    ).toBe('drill::bootcamp-day::3::homework');
  });

  it('keeps the ids the runner needs for a classroom assignment', () => {
    const spec = drillRunSpecFromLaunch(
      { kind: 'assignment', assignmentId: 'asg_1', guidedSetId: 'gs_1' },
      ['q1', 'q2'],
    );
    expect(spec.assignmentId).toBe('asg_1');
    expect(spec.guidedSetId).toBe('gs_1');
    expect((spec.config as { selectedQids?: string[] }).selectedQids).toEqual(['q1', 'q2']);
  });

  it('keeps the ids the runner needs for a practice set', () => {
    const spec = drillRunSpecFromLaunch({ kind: 'practice-set', slug: 'mc-practice-1' }, ['q1']);
    expect(spec.practiceSource).toBe('intro-to-lr-practice-drills');
    expect(spec.practiceSlug).toBe('mc-practice-1');
  });
});

describe('a handover keeps the mode it named', () => {
  // `natural-drill` has no live launch site today, but the runner reads it down
  // a separate branch. Expanding it as a type-drill would be a silent change of
  // drill, so the round-trip is pinned here rather than left to be rediscovered.
  it('carries natural-drill through state -> address bar -> run spec', () => {
    const launch = launchFromRouteState({
      mode: 'natural-drill',
      config: { qtypes: [], difficulties: [], pts: [], count: 2, selectedQids: ['PT1-S1-Q1', 'PT1-S1-Q2'] },
    } as never);
    expect(launch).not.toBeNull();

    const search = launchDrill(launch!);
    expect(new URLSearchParams(search).get('runMode')).toBe('natural-drill');

    const back = parseDrillLaunch(new URLSearchParams(search));
    expect(drillRunSpecFromLaunch(back!).mode).toBe('natural-drill');
  });

  it('still reads practice-set as the type-drill the runner runs', () => {
    const launch = launchFromRouteState({
      mode: 'practice-set',
      config: { qtypes: [], difficulties: [], pts: [], count: 1, selectedQids: ['PT1-S1-Q1'] },
    } as never);
    const back = parseDrillLaunch(new URLSearchParams(launchDrill(launch!)));
    expect(drillRunSpecFromLaunch(back!).mode).toBe('type-drill');
  });
});

import { describe, it, expect } from 'vitest';

import { resolveDrillLaunch, DeadDrillLinkError } from './drillLaunchResolve';
import { getPracticePool } from '@/bootcamps/main-conclusion/data/practiceDrillPools';
import { pickHomeworkForDay } from '@/bootcamps/principle-flaw/lib/dayQuestions';

/**
 * Only the kinds that resolve out of static data are covered here. Saved sets
 * and assignments read rows, and are covered through the gate instead.
 */
describe('resolving a launch that names static data', () => {
  it('gives a practice set exactly the questions its pool declares', async () => {
    const pool = getPracticePool('first-sentence-conclusions');
    expect(pool).toBeTruthy();

    const qids = await resolveDrillLaunch(
      { kind: 'practice-set', slug: 'first-sentence-conclusions' },
      'user_1',
    );
    expect(qids).toEqual([...pool!.qids]);
  });

  it('resolves the same practice set the same way twice, which is what makes the link safe', async () => {
    const launch = { kind: 'practice-set', slug: 'first-sentence-conclusions' } as const;
    const first = await resolveDrillLaunch(launch, 'user_1');
    const second = await resolveDrillLaunch(launch, 'user_1');
    expect(second).toEqual(first);
  });

  it('calls a missing practice set a dead link rather than drilling something else', async () => {
    await expect(
      resolveDrillLaunch({ kind: 'practice-set', slug: 'no-such-pool' }, 'user_1'),
    ).rejects.toBeInstanceOf(DeadDrillLinkError);
  });

  it('calls a bootcamp day with nothing to give a dead link', async () => {
    // The day picker draws from the loaded question bank, which is empty here.
    // That is the same condition the gate would hit if it resolved a day before
    // the bank finished loading, and it must say so rather than start an empty
    // drill.
    expect(pickHomeworkForDay(1)).toEqual([]);
    await expect(
      resolveDrillLaunch({ kind: 'bootcamp-day', day: 1, part: 'homework' }, undefined),
    ).rejects.toBeInstanceOf(DeadDrillLinkError);
  });

  it('leaves a launch that needs no resolution alone', async () => {
    expect(
      await resolveDrillLaunch({ kind: 'questions', qids: ['PT1-S1-Q1'] }, 'user_1'),
    ).toBeUndefined();
    expect(
      await resolveDrillLaunch({ kind: 'section', pt: 155, section: 1 }, 'user_1'),
    ).toBeUndefined();
  });

  it('refuses a saved set when nobody is signed in', async () => {
    await expect(
      resolveDrillLaunch({ kind: 'saved-set', setId: 's1' }, undefined),
    ).rejects.toBeInstanceOf(DeadDrillLinkError);
  });
});

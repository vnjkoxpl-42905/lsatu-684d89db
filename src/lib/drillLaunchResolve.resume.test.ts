import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  loadDrillResumeSession: vi.fn(),
  getRecentExposureSet: vi.fn(),
  pickHomeworkForDay: vi.fn(),
  pickPracticeForDay: vi.fn(),
}));

vi.mock('@/lib/drillResumeSession', async () => {
  const actual = await vi.importActual<typeof import('@/lib/drillResumeSession')>(
    '@/lib/drillResumeSession',
  );
  return { ...actual, loadDrillResumeSession: dependencies.loadDrillResumeSession };
});

vi.mock('@/lib/questionExposure', () => ({
  getRecentExposureSet: dependencies.getRecentExposureSet,
}));

vi.mock('@/bootcamps/principle-flaw/lib/dayQuestions', () => ({
  pickHomeworkForDay: dependencies.pickHomeworkForDay,
  pickPracticeForDay: dependencies.pickPracticeForDay,
}));

import { resolveDrillLaunch } from './drillLaunchResolve';

const storedRun = {
  status: 'in_progress',
  question_queue: ['stored-q1', 'stored-q2'],
  current_index: 1,
  attempts: [{ qid: 'stored-q1' }],
};

describe('resolving an identity-named bootcamp run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getRecentExposureSet.mockResolvedValue(new Set(['seen-q1']));
    dependencies.pickHomeworkForDay.mockReturnValue(['fresh-q1', 'fresh-q2']);
  });

  it('uses the stored queue before drawing again when the day-keyed row exists', async () => {
    dependencies.loadDrillResumeSession.mockResolvedValue(storedRun);

    await expect(
      resolveDrillLaunch(
        { kind: 'bootcamp-day', day: 3, part: 'homework' },
        'user_1',
      ),
    ).resolves.toEqual(['stored-q1', 'stored-q2']);
    expect(dependencies.loadDrillResumeSession).toHaveBeenCalledWith(
      'user_1',
      'drill::bootcamp-day::3::homework',
    );
    expect(dependencies.pickHomeworkForDay).not.toHaveBeenCalled();
  });

  it('falls back to the old question-list row after drawing when no day-keyed row exists', async () => {
    dependencies.loadDrillResumeSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedRun);

    await expect(
      resolveDrillLaunch(
        { kind: 'bootcamp-day', day: 3, part: 'homework' },
        'user_1',
      ),
    ).resolves.toEqual(['stored-q1', 'stored-q2']);
    expect(dependencies.pickHomeworkForDay).toHaveBeenCalledWith(
      3,
      undefined,
      new Set(['seen-q1']),
    );
    expect(dependencies.loadDrillResumeSession).toHaveBeenNthCalledWith(
      2,
      'user_1',
      expect.stringMatching(/^drill::type-drill::set-/),
    );
  });

  it('does not resurrect an old question-list run after the day-keyed run was completed', async () => {
    dependencies.loadDrillResumeSession
      .mockResolvedValueOnce({
        ...storedRun,
        status: 'completed',
      })
      .mockResolvedValueOnce(storedRun);

    await expect(
      resolveDrillLaunch(
        { kind: 'bootcamp-day', day: 3, part: 'homework' },
        'user_1',
      ),
    ).resolves.toEqual(['fresh-q1', 'fresh-q2']);
    expect(dependencies.loadDrillResumeSession).toHaveBeenCalledTimes(1);
  });
});

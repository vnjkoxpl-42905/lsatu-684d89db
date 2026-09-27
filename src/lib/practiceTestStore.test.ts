// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PracticeTestRun } from './practiceTest';

const account = vi.hoisted(() => ({ id: 'student-one', from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: account.id } }, error: null }) },
    from: account.from,
  },
}));

import {
  getPracticeTestDeviceId,
  importOwnedDevicePracticeTestRuns,
  isActivePracticeTestDevice,
  readPendingPracticeTestBackup,
  saveAccountPracticeTestRun,
  PracticeTestConflictError,
} from './practiceTestStore';

const run = (overrides: Partial<PracticeTestRun> = {}): PracticeTestRun => ({
  id: 'old-run', pt: 101, pace: 'standard', sectionSeconds: 2100,
  legs: [{ kind: 'lr', section: 1, questionCount: 25 }],
  currentLeg: 0, breakAfterLeg: 1, breakTaken: false,
  status: 'in-progress', createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  account.id = 'student-one';
  account.from.mockReset();
});

describe('practice test account ownership', () => {
  it('leaves an ownerless browser run untouched instead of assigning it to the signed-in account', async () => {
    const legacy = run();
    localStorage.setItem(`lsatu:practice-test:${legacy.id}`, JSON.stringify(legacy));

    expect(await importOwnedDevicePracticeTestRuns('student-one')).toBe(0);
    expect(account.from).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('lsatu:practice-test:old-run')!)).toEqual(legacy);
  });

  it('rejects another account before reading or writing account rows', async () => {
    await expect(importOwnedDevicePracticeTestRuns('student-two')).rejects.toThrow('account session changed');
    expect(account.from).not.toHaveBeenCalled();
  });

  it('does not let a stale or foreign device advance an exam', async () => {
    await expect(saveAccountPracticeTestRun('student-one', run({
      userId: 'student-one', revision: 2, activeDeviceId: 'another-device',
    }))).rejects.toBeInstanceOf(PracticeTestConflictError);
    expect(account.from).not.toHaveBeenCalled();
  });

  it('checks the database owner before a practice-test leg writes', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { status: 'in-progress', active_device_id: 'another-device' }, error: null,
      }),
    };
    account.from.mockReturnValue(query);
    expect(await isActivePracticeTestDevice('student-one', 'old-run')).toBe(false);
    expect(query.eq).toHaveBeenCalledWith('user_id', 'student-one');
  });

  it('keeps a failed account write in an account-scoped device backup', async () => {
    const deviceId = getPracticeTestDeviceId();
    const update = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }),
    };
    account.from.mockReturnValue({ update: () => update });
    const changed = run({ userId: 'student-one', revision: 0, activeDeviceId: deviceId, currentLeg: 1 });

    await expect(saveAccountPracticeTestRun('student-one', changed)).rejects.toThrow('offline');
    expect(update.eq).toHaveBeenCalledWith('revision', 0);
    expect(update.eq).toHaveBeenCalledWith('active_device_id', deviceId);
    expect(readPendingPracticeTestBackup('student-one', changed.id)?.currentLeg).toBe(1);
    expect(readPendingPracticeTestBackup('student-two', changed.id)).toBeNull();
  });
});

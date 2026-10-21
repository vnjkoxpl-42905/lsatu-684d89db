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

  it('keeps a frozen break snapshot only in the failed heartbeat backup', async () => {
    const deviceId = getPracticeTestDeviceId();
    const update = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }),
    };
    account.from.mockReturnValue({ update: () => update });
    const running = run({ userId: 'student-one', revision: 0, activeDeviceId: deviceId,
      breakStartedAt: '2026-09-01T00:00:00.000Z' });
    const backup = { ...running, breakRemainingSeconds: 585 };

    await expect(saveAccountPracticeTestRun('student-one', running, backup)).rejects.toThrow('offline');
    expect(readPendingPracticeTestBackup('student-one', running.id)).toEqual(backup);
    expect(running.breakRemainingSeconds).toBeUndefined();
  });

  it('preserves a stale device backup when another device has taken the revision', async () => {
    const deviceId = getPracticeTestDeviceId();
    const update = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    account.from.mockReturnValue({ update: () => update });
    const stale = run({ userId: 'student-one', revision: 2, activeDeviceId: deviceId,
      breakStartedAt: '2026-09-01T00:00:00.000Z', breakTaken: true, breakRemainingSeconds: 480 });

    await expect(saveAccountPracticeTestRun('student-one', stale)).rejects.toBeInstanceOf(PracticeTestConflictError);
    expect(update.eq).toHaveBeenCalledWith('revision', 2);
    expect(update.eq).toHaveBeenCalledWith('active_device_id', deviceId);
    expect(readPendingPracticeTestBackup('student-one', stale.id)).toEqual(stale);
  });
});


describe('protected and legacy parent separation', () => {
  it('refuses the legacy save before creating a device backup for a protected row', async () => {
    await expect(saveAccountPracticeTestRun('student-one', run({ userId: 'student-one', timedContractVersion: 1, revision: 2, activeDeviceId: getPracticeTestDeviceId() }))).rejects.toThrow('atomic timed writer');
    expect(account.from).not.toHaveBeenCalled();
    expect(readPendingPracticeTestBackup('student-one', 'old-run')).toBeNull();
  });
  it('excludes protected rows from the old child writer even on this device', async () => {
    account.from.mockReturnValue({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { timed_contract_version: 1, status: 'in-progress', active_device_id: getPracticeTestDeviceId() }, error: null }) });
    expect(await isActivePracticeTestDevice('student-one', 'protected')).toBe(false);
  });
});

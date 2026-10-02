import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeMock, fromMock, updates } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock }, from: fromMock },
}));

import { setStudentTier, setStudentAccess, withAccessTiers } from '@/lib/accessTierClient';
import { tierFlags, type ManagedUser } from '@/lib/adminUsers';

const user = (class_id: string) => ({ class_id, role: 'user' }) as unknown as ManagedUser;

describe('accessTierClient against an older admin-manage-users', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
    updates.length = 0;
  });

  it('reads tiers from profiles when the list has none, so nobody looks undecided', async () => {
    fromMock.mockReturnValue({
      select: () =>
        Promise.resolve({
          data: [
            { class_id: 'a', access_tier: 'tier_1' },
            { class_id: 'b', access_tier: 'tier_2' },
          ],
          error: null,
        }),
    });
    const rows = await withAccessTiers([user('a'), user('b')]);
    expect(rows.map((r) => r.access_tier)).toEqual(['tier_1', 'tier_2']);
  });

  it('leaves a list that already carries tiers alone', async () => {
    const rows = [{ ...user('a'), access_tier: 'tier_3' } as ManagedUser];
    expect(await withAccessTiers(rows)).toBe(rows);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('writes the tier and its switches to profiles when the function does not know set_tier', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('Unknown action') });
    fromMock.mockReturnValue({
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return {
          eq: () => ({
            select: () => Promise.resolve({ data: [{ class_id: 'a', access_tier: 'tier_3', ...values }], error: null }),
          }),
        };
      },
    });

    await setStudentTier('a', 'tier_3');

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      access_tier: 'tier_3',
      has_classroom_access: false,
      has_chat_access: true,
      has_schedule_access: true,
      has_drill_access: false,
      has_waj_access: false,
    });
  });

  it('Tier 2 through the fallback applies its complete fixed preset', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('Unknown action') });
    fromMock.mockReturnValue({
      update: (values: Record<string, unknown>) => {
        updates.push(values);
        return {
          eq: () => ({
            select: () => Promise.resolve({ data: [{ class_id: 'a', access_tier: 'tier_2', ...values }], error: null }),
          }),
        };
      },
    });

    await setStudentTier('a', 'tier_2');
    expect(updates[0]).toEqual({ access_tier: 'tier_2', ...tierFlags('tier_2') });
  });
  it('corrects an older endpoint that acknowledges Tier 2 but preserves Tier 1 switches', async () => {
    invokeMock.mockResolvedValue({ data: { profile: { access_tier: 'tier_2', ...tierFlags('tier_1') } }, error: null });
    fromMock.mockReturnValue({ update: (values: Record<string, unknown>) => {
      updates.push(values);
      return { eq: () => ({ select: () => Promise.resolve({ data: [values], error: null }) }) };
    } });
    await setStudentTier('a', 'tier_2');
    expect(updates).toEqual([{ access_tier: 'tier_2', ...tierFlags('tier_2') }]);
  });
  it('a rapid override writes only its changed door, preserving other concurrent edits', async () => {
    fromMock.mockReturnValue({ update: (values: Record<string, unknown>) => {
      updates.push(values);
      return { eq: () => ({ select: () => Promise.resolve({ data: [{ ...tierFlags('tier_1'), has_drill_access: false }], error: null }) }) };
    } });
    await setStudentAccess({ ...user('a'), ...tierFlags('tier_2') } as ManagedUser, 'has_drill_access', false);
    expect(updates).toEqual([{ has_drill_access: false }]);
  });
});

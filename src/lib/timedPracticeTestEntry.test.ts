import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ capability: vi.fn(), prepare: vi.fn(), launch: vi.fn() }));
vi.mock('./timedWorkClient', () => ({ TimedWorkClient: class { requireCapability = mock.capability; } }));
vi.mock('./timedPracticeTestStore', () => ({ TimedPracticeTestStore: class { prepare = mock.prepare; }, timedPracticeTestChildLaunch: mock.launch }));
vi.mock('./practiceTestStore', () => ({ getPracticeTestDeviceId: () => 'device' }));
import { officialTimedChildPath, prepareOfficialPracticeTest } from './timedPracticeTestEntry';
beforeEach(() => { vi.clearAllMocks(); mock.capability.mockResolvedValue(undefined); mock.prepare.mockResolvedValue(undefined); });
describe('protected official entry', () => {
  it('verifies capability then retains creation before returning a navigation identity', async () => { const id = await prepareOfficialPracticeTest('owner', 101, 'standard', 2100); expect(id).toMatch(/^[0-9a-f-]{36}$/); expect(mock.capability).toHaveBeenCalledWith('create'); expect(mock.prepare).toHaveBeenCalledWith('create', { pt: 101, pace: 'standard', sectionSeconds: 2100 }, null); expect(mock.capability.mock.invocationCallOrder[0]).toBeLessThan(mock.prepare.mock.invocationCallOrder[0]); });
  it('never prepares a legacy sitting when capability is unavailable', async () => { mock.capability.mockRejectedValue(new Error('Inactive')); await expect(prepareOfficialPracticeTest('owner', 101, 'standard', 2100)).rejects.toThrow('Inactive'); expect(mock.prepare).not.toHaveBeenCalled(); });
  it('requires an acknowledged checkpoint before selecting a dedicated route', () => { mock.launch.mockReturnValue({ runId: 'id', kind: 'rc', legIndex: 1 }); expect(officialTimedChildPath({} as never)).toBe('/testing/test/id/rc/1'); mock.launch.mockImplementation(() => { throw new Error('No checkpoint'); }); expect(() => officialTimedChildPath({} as never)).toThrow('No checkpoint'); });
});

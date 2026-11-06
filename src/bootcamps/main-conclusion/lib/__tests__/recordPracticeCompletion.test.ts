import { describe, expect, it, vi } from 'vitest';
import { recordPracticeDrillCompletion } from '@/bootcamps/main-conclusion/lib/recordPracticeCompletion';
import { progressIdFor } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { TABLES, type ModuleProgress } from '@/bootcamps/main-conclusion/persistence/records';

const mockReady = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock('@/bootcamps/main-conclusion/persistence/factory', () => ({
  getPersistence: () => ({
    ready: mockReady,
    get: mockGet,
    set: mockSet,
  }),
}));

describe('recordPracticeDrillCompletion', () => {
  it('awaits persistence hydration before reading existing module_progress so prior completions are preserved', async () => {
    const userId = '00000000-0000-4000-8000-000000000099';
    const progressId = progressIdFor(userId);
    let hydrated = false;

    mockReady.mockImplementation(async () => {
      hydrated = true;
    });

    mockGet.mockImplementation(async (table: string, id: string) => {
      expect(hydrated).toBe(true);
      expect(table).toBe(TABLES.module_progress);
      expect(id).toBe(progressId);
      return {
        id: progressId,
        user_id: userId,
        unlocked_modules: ['M1', 'M2', 'M3', 'M5', 'M6'],
        unlocked_routes: ['/lessons/1.1'],
        completed_lessons: ['MC-LSN-1.1', 'MC-LSN-1.9'],
        completed_drills: ['MC-DRL-CLS'],
        completed_milestones: [],
        completed_hard_sections: [],
        completed_capstones: [],
        updated_at: '2026-11-05T12:00:00.000Z',
      } satisfies ModuleProgress;
    });

    mockSet.mockResolvedValue(undefined);

    await recordPracticeDrillCompletion(userId, 'MC-PRC-FS');

    expect(mockReady).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [, savedId, savedProgress] = mockSet.mock.calls[0];
    expect(savedId).toBe(progressId);
    expect(savedProgress.completed_lessons).toEqual(['MC-LSN-1.1', 'MC-LSN-1.9']);
    expect(savedProgress.completed_drills).toEqual(['MC-DRL-CLS', 'MC-PRC-FS']);
  });
});

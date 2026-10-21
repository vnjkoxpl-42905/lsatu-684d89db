import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getAssignment: vi.fn(),
  getGuidedDrill: vi.fn(),
  resolveGuidedDrillQidsForLevel: vi.fn(),
  getLocalGuidedDrillBySlug: vi.fn(),
  loadGuidedDrillSession: vi.fn(),
}));

vi.mock('@/lib/guidedDrills', () => ({
  getAssignment: dependencies.getAssignment,
  getGuidedDrill: dependencies.getGuidedDrill,
  resolveGuidedDrillQidsForLevel: dependencies.resolveGuidedDrillQidsForLevel,
}));

vi.mock('@/lib/guidedDrillsLocal', () => ({
  getLocalGuidedDrillBySlug: dependencies.getLocalGuidedDrillBySlug,
  isEmptyBankFilter: () => false,
}));

vi.mock('@/lib/guidedDrillSession', async () => {
  const actual = await vi.importActual<typeof import('@/lib/guidedDrillSession')>(
    '@/lib/guidedDrillSession',
  );
  return { ...actual, loadGuidedDrillSession: dependencies.loadGuidedDrillSession };
});

import { resolveDrillLaunch } from './drillLaunchResolve';

describe('resolving an identity-named guided run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dependencies.getGuidedDrill.mockResolvedValue({
      id: 'gd_7',
      slug: 'parallel-flaw',
      bank_filter: { qtypes: ['Flaw'] },
      question_count: 6,
    });
  });

  it('adopts the stored queue by drill identity before drawing again', async () => {
    dependencies.loadGuidedDrillSession.mockResolvedValue({
      status: 'in_progress',
      question_queue: ['stored-q1', 'stored-q2'],
      attempts: [{ qid: 'stored-q1' }],
    });

    await expect(
      resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1'),
    ).resolves.toEqual(['stored-q1', 'stored-q2']);
    expect(dependencies.loadGuidedDrillSession).toHaveBeenCalledWith(
      'user_1',
      'guided::drill:gd_7',
      'guided::slug:parallel-flaw',
    );
    expect(dependencies.resolveGuidedDrillQidsForLevel).not.toHaveBeenCalled();
  });

  it('draws from the named drill only when neither key has a stored run', async () => {
    dependencies.loadGuidedDrillSession.mockResolvedValue(null);
    dependencies.resolveGuidedDrillQidsForLevel.mockReturnValue({
      qids: ['fresh-q1', 'fresh-q2'],
      warning: null,
    });

    await expect(
      resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1'),
    ).resolves.toEqual(['fresh-q1', 'fresh-q2']);
    expect(dependencies.resolveGuidedDrillQidsForLevel).toHaveBeenCalledWith({
      drill: expect.objectContaining({ id: 'gd_7', slug: 'parallel-flaw' }),
      assignment: null,
    });
  });

  it('resolves an assigned guided drill through its guided assignment row', async () => {
    const assignment = {
      id: 'asg_1',
      question_count: 4,
      guided_drill: {
        id: 'gd_7',
        slug: 'parallel-flaw',
        bank_filter: { qtypes: ['Flaw'] },
        question_count: 6,
      },
    };
    dependencies.getAssignment.mockResolvedValue(assignment);
    dependencies.loadGuidedDrillSession.mockResolvedValue(null);
    dependencies.resolveGuidedDrillQidsForLevel.mockReturnValue({
      qids: ['assigned-q1'],
      warning: null,
    });

    await expect(
      resolveDrillLaunch(
        { kind: 'guided-drill', assignmentId: 'asg_1' },
        'user_1',
      ),
    ).resolves.toEqual(['assigned-q1']);
    expect(dependencies.loadGuidedDrillSession).toHaveBeenCalledWith(
      'user_1',
      'guided::asg_1',
      null,
    );
    expect(dependencies.resolveGuidedDrillQidsForLevel).toHaveBeenCalledWith({
      drill: assignment.guided_drill,
      assignment,
    });
  });
});

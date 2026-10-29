import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  getAssignment: vi.fn(),
  getGuidedDrill: vi.fn(),
  resolveGuidedDrillQidsForLevel: vi.fn(),
  getLocalGuidedDrillBySlug: vi.fn(),
  loadGuidedDrillSession: vi.fn(),
  listStandaloneDrillRuns: vi.fn(),
  loadStandaloneDrillRun: vi.fn(),
}));

vi.mock('@/lib/drillRunLedger', () => ({
  listStandaloneDrillRuns: dependencies.listStandaloneDrillRuns,
  loadStandaloneDrillRun: dependencies.loadStandaloneDrillRun,
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
    dependencies.listStandaloneDrillRuns.mockResolvedValue([]);
    dependencies.loadStandaloneDrillRun.mockResolvedValue(null);
    dependencies.getGuidedDrill.mockResolvedValue({
      id: 'gd_7',
      slug: 'parallel-flaw',
      bank_filter: { qtypes: ['Flaw'] },
      question_count: 6,
    });
  });

  it('resolves a bundled slug identity without querying a UUID database column', async () => {
    dependencies.getLocalGuidedDrillBySlug.mockReturnValueOnce({ id: 'local-slug', slug: 'local-slug', bank_filter: {}, question_count: 2 });
    dependencies.loadGuidedDrillSession.mockResolvedValue(null);
    dependencies.resolveGuidedDrillQidsForLevel.mockReturnValue({ qids: ['local-q1'], warning: null });
    await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'local-slug' }, 'user_1')).resolves.toEqual(['local-q1']);
    expect(dependencies.getGuidedDrill).not.toHaveBeenCalled();
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
      student_id: 'user_1',
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

  it('restores the latest answered owned sitting before an empty current pool', async () => {
    dependencies.listStandaloneDrillRuns.mockResolvedValue([{
      source_key: 'guided::drill:gd_7',
      session: { status: 'in_progress', question_queue: ['frozen-q1', 'frozen-q2'], attempts: [{}] },
    }]);
    dependencies.resolveGuidedDrillQidsForLevel.mockReturnValue({ qids: [], warning: 'empty' });
    await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1'))
      .resolves.toEqual(['frozen-q1', 'frozen-q2']);
    expect(dependencies.resolveGuidedDrillQidsForLevel).not.toHaveBeenCalled();
    expect(dependencies.loadGuidedDrillSession).not.toHaveBeenCalled();
  });

  it('restores an explicitly requested sitting without drawing or selecting another sitting', async () => {
    dependencies.loadStandaloneDrillRun.mockResolvedValue({
      source_key: 'guided::drill:gd_7',
      session: { status: 'in_progress', question_queue: ['requested-q'], attempts: [] },
    });
    await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1', 'run_1'))
      .resolves.toEqual(['requested-q']);
    expect(dependencies.loadStandaloneDrillRun).toHaveBeenCalledWith('user_1', 'run_1');
    expect(dependencies.listStandaloneDrillRuns).not.toHaveBeenCalled();
  });

  it.each([null, { source_key: 'guided::other-assignment', session: { question_queue: ['wrong-q'] } }])(
    'refuses missing or other-source requested sittings without a fresh draw', async (run) => {
      dependencies.loadStandaloneDrillRun.mockResolvedValue(run);
      await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1', 'run_1'))
        .rejects.toThrow('could not be found in your account');
      expect(dependencies.resolveGuidedDrillQidsForLevel).not.toHaveBeenCalled();
    },
  );

  it.each([null, { student_id: 'other-user', guided_drill: { id: 'gd_7' } }])(
    'checks the current assignment before reading saved sittings', async (assignment) => {
      dependencies.getAssignment.mockResolvedValue(assignment);
      await expect(resolveDrillLaunch({ kind: 'guided-drill', assignmentId: 'asg_1' }, 'user_1', 'run_1'))
        .rejects.toThrow('not available in your account');
      expect(dependencies.loadStandaloneDrillRun).not.toHaveBeenCalled();
    },
  );

  it('does not restore saved questions when the source drill was removed', async () => {
    dependencies.getGuidedDrill.mockResolvedValue(null);
    dependencies.getLocalGuidedDrillBySlug.mockReturnValue(null);
    await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1', 'run_1'))
      .rejects.toThrow('no longer exists');
    expect(dependencies.loadStandaloneDrillRun).not.toHaveBeenCalled();
  });

  it('does not revive a legacy queue superseded by an acknowledged completion', async () => {
    const session = { question_queue: ['legacy-q'], attempts: [{ qid: 'legacy-q', selected_answer: 'A' }] };
    dependencies.listStandaloneDrillRuns.mockResolvedValue([{
      source_key: 'guided::drill:gd_7', session: { ...session, status: 'completed' },
    }]);
    dependencies.loadGuidedDrillSession.mockResolvedValue({ ...session, status: 'in_progress' });
    dependencies.resolveGuidedDrillQidsForLevel.mockReturnValue({ qids: ['fresh-q'], warning: null });
    await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7' }, 'user_1'))
      .resolves.toEqual(['fresh-q']);
  });

  it('rejects assignment and drill identity disagreement before reading the sitting', async () => {
    dependencies.getAssignment.mockResolvedValue({ student_id: 'user_1', guided_drill: { id: 'gd_other' } });
    await expect(resolveDrillLaunch({ kind: 'guided-drill', drillId: 'gd_7', assignmentId: 'asg_1' }, 'user_1', 'run_1'))
      .rejects.toThrow('does not match');
    expect(dependencies.loadStandaloneDrillRun).not.toHaveBeenCalled();
  });
});

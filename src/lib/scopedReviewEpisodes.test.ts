import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/studentScopedWork', () => ({ assertActiveStudentScope: vi.fn() }));
import { boundedReviewBinding, loadScopedReviewSelections, projectReviewEpisodes, selectScopedReview, type scopedReviewDependencies } from './scopedReviewEpisodes';
import type { ReviewQueueItem } from '@/components/review/reviewQueueModel';
import type { ReviewEpisode, ReviewEpisodeEvent } from './reviewEpisodes';
const item: ReviewQueueItem = { key: 'native-lab:attempt', area: 'lr', qid: 'Q1', label: 'Saved lab', qtype: 'Lab', reasons: ['missed'], sources: ['native_lab_attempts'], firstAnswer: 'A', latestAnswer: 'A', correctAnswer: null, firstMissAt: '2026-09-30T12:00:00Z', lastActivityAt: '2026-09-30T12:00:00Z', reflection: null, flaggedNote: null, href: '/review/native-lab/attempt' };
const episode: ReviewEpisode = { id: 'episode', student_id: 'student', actor_id: 'student', source_kind: 'intro_lr_attempts', source_id: 'attempt', question_id: 'Q1', reason: 'missed', selection_reason: null, created_at: '2026-09-30T12:00:00Z' };
const done: ReviewEpisodeEvent = { id: 'done', episode_id: 'episode', actor_id: 'student', kind: 'complete', payload: {}, created_at: '2026-09-30T13:00:00Z' };
const scope = { mode: 'selected_student' as const, actorId: 'teacher', studentId: 'student' };
function deps() { return { assertScope: vi.fn().mockResolvedValue(undefined), resolveOwnerId: vi.fn().mockResolvedValue('student'), native: vi.fn().mockResolvedValue([item]), hardSentences: vi.fn().mockResolvedValue({ items: [], unavailable: [] }), list: vi.fn().mockResolvedValue({ episodes: [], events: [] }), open: vi.fn().mockResolvedValue({ ...episode, actor_id: 'teacher', reason: 'teacher_selected', selection_reason: 'Compare scope.' }) } satisfies typeof scopedReviewDependencies; }
describe('bounded scoped Review', () => {
  it('completes only an exact attempt task, preserves flags and later repeated question attempts', () => {
    const flag = { ...item, key: 'flag', href: '/flagged/Q1', sources: ['flagged_questions' as const], reasons: ['flagged' as const] };
    const later = { ...item, key: 'later', href: '/review/native-lab/later' };
    const inputs = [item, flag, later]; const original = structuredClone(inputs);
    expect(projectReviewEpisodes(inputs, 'student', [episode], [done]).items.map(row => row.key)).toEqual(['flag', 'later']);
    expect(inputs).toEqual(original);
  });
  it('gives teacher selection a separate exact task and never hides an incomplete miss', () => {
    const selected = { ...episode, id: 'teacher-task', actor_id: 'teacher', reason: 'teacher_selected' as const, selection_reason: 'Compare scope.' };
    const result = projectReviewEpisodes([item], 'student', [selected], []);
    expect(result.items).toHaveLength(2); expect(result.items.find(row => row.key === 'review-episode:teacher-task')).toMatchObject({ href: '/review/native-lab/attempt?episode=teacher-task', reflection: 'Compare scope.', reasons: ['teacher_selected'] });
    expect(projectReviewEpisodes([item], 'student', [selected], [{ ...done, episode_id: 'teacher-task' }]).items).toEqual([item]);
  });
  it('does not bind an episode by question alone or another owner; reports unavailable source', () => {
    expect(projectReviewEpisodes([item], 'student', [{ ...episode, source_id: 'another' }], []).unavailable).toBe(1);
    expect(projectReviewEpisodes([item], 'student', [{ ...episode, student_id: 'other' }], [done]).items).toEqual([item]);
    expect(boundedReviewBinding({ ...item, href: '/journal/Q1' })).toBeNull();
  });
  it('verifies actor/subject before and after independent source reads, preserving partial results', async () => {
    const mock = deps(); mock.hardSentences.mockRejectedValue(new Error('offline'));
    const result = await loadScopedReviewSelections(scope, mock);
    expect(result.items).toEqual([item]); expect(result.unavailable).toEqual(['Hard Sentences misses']);
    expect(mock.native).toHaveBeenCalledWith('student'); expect(mock.list).toHaveBeenCalledWith('teacher', 'student'); expect(mock.assertScope).toHaveBeenCalledTimes(2);
  });
  it('requires reason and selected scope, then acknowledges the exact source question', async () => {
    const mock = deps(); await expect(selectScopedReview(scope, item, ' ', mock)).rejects.toThrow('reason'); expect(mock.open).not.toHaveBeenCalled();
    await selectScopedReview(scope, item, ' Compare scope. ', mock);
    expect(mock.open).toHaveBeenCalledWith({ actorId: 'teacher', studentId: 'student', source: 'intro_lr_attempts', sourceId: 'attempt', reason: 'teacher_selected', selectionReason: 'Compare scope.' });
    mock.open.mockResolvedValueOnce({ ...episode, question_id: 'foreign-question' });
    await expect(selectScopedReview(scope, item, 'reason', mock)).rejects.toThrow('question');
  });
  it('does not acknowledge a selection after the active account changes', async () => {
    const mock = deps(); mock.assertScope.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('account changed'));
    await expect(selectScopedReview(scope, item, 'reason', mock)).rejects.toThrow('account changed');
  });
  it('requires canonical account identity before source reads or teacher writes and retains class scope', async () => {
    const mock = deps(); mock.resolveOwnerId.mockRejectedValue(new Error('canonical identity conflict'));
    await expect(loadScopedReviewSelections(scope, mock)).rejects.toThrow('identity conflict');
    await expect(selectScopedReview(scope, item, 'reason', mock)).rejects.toThrow('identity conflict');
    expect(mock.native).not.toHaveBeenCalled(); expect(mock.list).not.toHaveBeenCalled(); expect(mock.open).not.toHaveBeenCalled();
    expect(scope.studentId).toBe('student');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HS_DRILL_ID, HS_DRILL_ITEMS } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';
import { M5_CAPSTONE } from '@/bootcamps/main-conclusion/content/m5-capstone.source';
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));
import { fetchOwnedHardSentencesAttempt, hardSentencesQueueItem, loadHardSentencesReview, parseHardSentencesCapstone, parseHardSentencesCluster } from './hardSentencesReviewSource';

const cluster = { id: 'submission-1', user_id: 'student', drill_id: HS_DRILL_ID, question_id: HS_DRILL_ITEMS[0].id,
  mode: 'cluster_decomposition', correct: false, selected_answer: '', created_at: '2026-09-30T12:00:00Z' };
const capstone = { id: 'old-payload-id', user_id: 'student', calibration_only: true, calibration_module: 'M5',
  item_id: M5_CAPSTONE[0].id, picked: 'B', correct: false, attempted_at: '2026-09-30T12:01:00Z' };
function chain(data: unknown, error: unknown = null) {
  return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error }), maybeSingle: vi.fn().mockResolvedValue({ data, error }) };
}
beforeEach(() => from.mockReset());
describe('Hard Sentences saved Review source', () => {
  it('retains valid rows beside malformed cluster and capstone submissions with safe counts', async () => {
    from.mockImplementation(table => table === 'intro_lr_attempts'
      ? chain([{ ...cluster, id: 'bad', question_id: 'retired' }, cluster])
      : chain([{ record_id: 'bad', data: { ...capstone, picked: 'invalid secret payload' } }, { record_id: 'valid', data: capstone }]));
    const result = await loadHardSentencesReview('student');
    expect(result.items).toHaveLength(2);
    expect(result.unavailable).toEqual(['1 Hard Sentences cluster submissions unavailable', '1 Hard Sentences capstone submissions unavailable']);
    expect(JSON.stringify(result)).not.toContain('invalid secret payload');
  });
  it('preserves empty lift and repeat submission identity without claiming a first answer', () => {
    const a = parseHardSentencesCluster(cluster, 'student')!;
    const b = parseHardSentencesCluster({ ...cluster, id: 'repeat' }, 'student')!;
    expect(a.answer).toBe('');
    expect(hardSentencesQueueItem(a).firstAnswer).toBeNull();
    expect(hardSentencesQueueItem(a).qtype).toBe('Cluster decomposition');
    expect(hardSentencesQueueItem(a).key).not.toBe(hardSentencesQueueItem(b).key);
  });
  it('uses envelope identity for legacy capstone rows without rewriting payload', () => {
    const result = parseHardSentencesCapstone(capstone, 'envelope-id', 'student')!;
    expect(result.key).toBe('envelope-id');
    expect(hardSentencesQueueItem(result).href).toContain('/capstone/envelope-id');
    expect(hardSentencesQueueItem(result).qtype).toBe('Cluster decomposition capstone');
    expect(capstone.id).toBe('old-payload-id');
  });
  it('rejects conflicting owner and malformed recognized source data', () => {
    expect(() => parseHardSentencesCluster({ ...cluster, user_id: 'other' }, 'student')).toThrow();
    expect(() => parseHardSentencesCapstone({ ...capstone, picked: 'Z' }, 'k', 'student')).toThrow();
    expect(() => parseHardSentencesCapstone({ ...capstone, attempted_at: 'invalid' }, 'k', 'student')).toThrow();
  });
  it('excludes correct and unknown or unrelated authored IDs', () => {
    expect(parseHardSentencesCluster({ ...cluster, correct: true }, 'student')).toBeNull();
    expect(parseHardSentencesCapstone({ ...capstone, item_id: 'unknown' }, 'k', 'student')).toBeNull();
    expect(parseHardSentencesCapstone({ ...capstone, calibration_module: 'M1' }, 'k', 'student')).toBeNull();
    expect(() => parseHardSentencesCluster({ ...cluster, question_id: 'retired-cluster' }, 'student')).toThrow(/wording is unavailable/);
    expect(() => parseHardSentencesCapstone({ ...capstone, item_id: 'MC-HS-CAP-retired' }, 'k', 'student')).toThrow(/wording is unavailable/);
  });
  it('retains independent capstone source when cluster read fails and names failure', async () => {
    const c = chain(null, new Error('offline'));
    const k = chain([{ record_id: 'envelope', data: capstone }]);
    from.mockImplementation(table => table === 'intro_lr_attempts' ? c : k);
    const result = await loadHardSentencesReview('student');
    expect(result.items).toHaveLength(1);
    expect(result.unavailable).toEqual(['Hard Sentences cluster attempts']);
    expect(c.eq).toHaveBeenCalledWith('user_id', 'student');
    expect(k.eq).toHaveBeenCalledWith('table_name', 'calibration_attempts');
  });
  it('reports null successful transport response as unavailable', async () => {
    from.mockReturnValue(chain(null));
    expect((await loadHardSentencesReview('student')).unavailable).toHaveLength(2);
  });
  it('fetches exact capstone envelope under the owner and namespace without any write', async () => {
    const k = chain({ record_id: 'envelope', data: capstone }); from.mockReturnValue(k);
    expect((await fetchOwnedHardSentencesAttempt('student', 'capstone', 'envelope'))?.key).toBe('envelope');
    expect(k.eq.mock.calls).toEqual([['user_id', 'student'], ['table_name', 'calibration_attempts'], ['record_id', 'envelope']]);
    expect(await fetchOwnedHardSentencesAttempt('student', 'bad-source', 'envelope')).toBeNull();
  });
});

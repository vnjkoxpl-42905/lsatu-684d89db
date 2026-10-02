import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { createReviewEpisodeService, reviewEpisodeState, validateReviewEvent, type ReviewEpisode, type ReviewEpisodeEvent } from './reviewEpisodes';
const episode: ReviewEpisode = { id: 'episode', student_id: 'student', actor_id: 'student', source_kind: 'intro_lr_attempts', source_id: 'attempt', question_id: 'question', reason: 'missed', selection_reason: null, created_at: '2026-09-30T12:00:00Z' };
const event = (kind: ReviewEpisodeEvent['kind'], payload: Record<string, string> = {}): ReviewEpisodeEvent => ({ id: kind, episode_id: episode.id, actor_id: 'student', kind, payload, created_at: '2026-09-30T12:01:00Z' });
describe('durable review episode contract', () => {
  it('requires both diagnoses only for missed completion', () => {
    expect(() => validateReviewEvent('complete', {}, 'missed')).toThrow('right answer');
    expect(() => validateReviewEvent('complete', { error_diagnosis: 'scope', right_answer_diagnosis: 'matches conclusion' }, 'missed')).not.toThrow();
    expect(() => validateReviewEvent('complete', {}, 'teacher_selected')).not.toThrow();
  });
  it('completion changes episode state without changing supplied attempt or flag records', () => {
    const source = { answer: 'A', flagged: true }; const before = structuredClone(source);
    expect(reviewEpisodeState([event('blind_answer', { answer: 'B' }), event('complete')])).toEqual({ completed: true, revealed: false, blindAnswer: 'B', reflection: null });
    expect(source).toEqual(before);
    expect(reviewEpisodeState([]).completed).toBe(false);
  });
  it('retains response identity for retries and rejects zero-row acknowledgement', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: new Error('offline') }).mockResolvedValueOnce({ data: event('reveal'), error: null });
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc });
    await expect(service.append('student', episode, 'reveal', 'reveal', {})).rejects.toThrow('offline');
    await expect(service.append('student', episode, 'reveal', 'reveal', {})).resolves.toMatchObject({ id: 'reveal' });
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(service.append('student', episode, 'reveal', 'reveal', {})).rejects.toThrow('acknowledged');
  });
  it('rejects account switches before and after transport', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: event('reveal'), error: null });
    const actor = vi.fn().mockResolvedValueOnce('student').mockResolvedValueOnce('admin');
    await expect(createReviewEpisodeService({ actor, rpc }).append('student', episode, 'reveal', 'reveal', {})).rejects.toThrow('account changed');
    await expect(createReviewEpisodeService({ actor: async () => 'admin', rpc }).append('student', episode, 'reveal', 'reveal', {})).rejects.toThrow('account changed');
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('requires teacher reason before transport and verifies exact selected student identity', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { ...episode, student_id: 'other' }, error: null });
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc });
    await expect(service.open({ actorId: 'student', studentId: 'student', source: 'intro_lr_attempts', sourceId: 'attempt', reason: 'teacher_selected' })).rejects.toThrow('reason');
    expect(rpc).not.toHaveBeenCalled();
    await expect(service.open({ actorId: 'student', studentId: 'student', source: 'intro_lr_attempts', sourceId: 'attempt', reason: 'missed' })).rejects.toThrow('acknowledged');
  });
  it('rejects cross-episode event leakage in a student read', async () => {
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc: async () => ({ data: { episodes: [episode], events: [{ ...event('reveal'), episode_id: 'foreign' }] }, error: null }) });
    await expect(service.list('student', 'student')).rejects.toThrow('scope');
  });
  it.each([
    { ...event('reveal'), created_at: undefined },
    { ...event('reveal'), kind: 'unknown' },
    { ...event('reveal'), actor_id: 'other' },
    { ...event('blind_answer'), payload: { answer: 5 } },
    event('complete'),
  ])('rejects malformed saved events before treating them as review state: %j', async malformed => {
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc: async () => ({ data: { episodes: [episode], events: [malformed] }, error: null }) });
    await expect(service.list('student', 'student')).rejects.toThrow();
  });
  it.each([{ ...episode, id: '' }, { ...episode, source_kind: 'unsupported' }, { ...episode, reason: 'unknown' }, { ...episode, created_at: 'invalid' }])('rejects malformed episode records: %j', async malformed => {
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc: async () => ({ data: { episodes: [malformed], events: [] }, error: null }) });
    await expect(service.list('student', 'student')).rejects.toThrow();
  });
  it('rejects an incomplete acknowledgement and preserves the exact retry identity', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: { ...event('reveal'), created_at: '' }, error: null }).mockResolvedValueOnce({ data: event('reveal'), error: null });
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc });
    await expect(service.append('student', episode, 'reveal', 'reveal', {})).rejects.toThrow('acknowledged');
    await expect(service.append('student', episode, 'reveal', 'reveal', {})).resolves.toMatchObject({ id: 'reveal' });
    expect(rpc.mock.calls[0][1]).toEqual(rpc.mock.calls[1][1]);
  });
  it('rejects duplicate episode and event identities in a read', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: { episodes: [episode, episode], events: [] }, error: null }).mockResolvedValueOnce({ data: { episodes: [episode], events: [event('reveal'), event('reveal')] }, error: null });
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc });
    await expect(service.list('student', 'student')).rejects.toThrow('identity');
    await expect(service.list('student', 'student')).rejects.toThrow('identity');
  });
  it('rejects repeated immutable state events even when IDs differ', async () => {
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc: async () => ({ data: { episodes: [episode], events: [event('reveal'), { ...event('reveal'), id: 'second-reveal' }] }, error: null }) });
    await expect(service.list('student', 'student')).rejects.toThrow('history');
  });
  it.each([{}, { text: '' }])('retains server-valid historical reflection payloads: %j', async payload => {
    const saved = event('reflection', payload);
    const service = createReviewEpisodeService({ actor: async () => 'student', rpc: async () => ({ data: { episodes: [episode], events: [saved] }, error: null }) });
    await expect(service.list('student', 'student')).resolves.toMatchObject({ events: [saved] });
  });
});

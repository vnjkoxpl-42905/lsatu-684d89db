import { beforeEach, describe, expect, it, vi } from 'vitest';
interface FixtureConfig { source: string; clockElapsedSeconds?: number; learningRecords?: unknown[]; timedSectionSittingId?: string; [key: string]: unknown }
interface FixtureRow { id: string; user_id: string; status: string; passage_ids: number[]; config: FixtureConfig }
const store = vi.hoisted(() => ({ actor: 'owner', row: {} as FixtureRow, race: false, lost: false, switchActor: false, updates: 0, tables: [] as string[] }));
vi.mock('../api/rcSupabase.types', () => ({ RC_SESSIONS_TABLE: 'rc_drill_sessions', rcDb: {
  auth: { getUser: async () => ({ data: { user: { id: store.actor } } }) },
  from: (table: string) => {
    store.tables.push(table); let payload: { config: FixtureConfig } | null = null; const filters: Record<string, unknown> = {};
    const query = { select: () => query, update: (next: { config: FixtureConfig }) => { payload = next; return query; }, eq: (field: string, value: unknown) => { filters[field] = value; return query; },
      maybeSingle: async () => {
        if (!payload) { const copy = JSON.parse(JSON.stringify(store.row)); if (store.switchActor) store.actor = 'other'; return { data: copy, error: null }; }
        store.updates++;
        if (store.race) { store.race = false; store.row.config.clockElapsedSeconds = 44; return { data: null, error: null }; }
        if (filters.config !== JSON.stringify(store.row.config)) return { data: null, error: null };
        store.row.config = payload.config;
        if (store.lost) { store.lost = false; return { data: null, error: { message: 'Reply lost' } }; }
        return { data: { id: store.row.id }, error: null };
      },
    }; return query;
  },
} }));
vi.mock('./rcBank', () => ({ loadPassage: async () => ({ passageId: 7, text: 'Original evidence text.', questions: [{ questionId: 10 }] }) }));
import { createRcLearningEvent, getRcLearningEvents, readRcLearningEvent, recordRcLearningEvent } from './rcLearning';
import { rcEvidenceFingerprint } from './rcEvidenceFingerprint';
beforeEach(() => { store.actor = 'owner'; store.row = { id: 'session', user_id: 'owner', status: 'in_progress', passage_ids: [7], config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' }, draftAnswers: [{ questionId: 10, selected: 'B' }], clockElapsedSeconds: 12 } }; store.race = false; store.lost = false; store.switchActor = false; store.updates = 0; store.tables = []; });
const request = () => createRcLearningEvent('owner', 'session', 7, 10, 'prediction', 'The answer should describe the disagreement.');
describe('separate RC learning records', () => {
  it('appends a learning event while preserving a concurrent clock update and original drafts', async () => {
    store.race = true; const event = request(); await recordRcLearningEvent(event);
    expect(store.row.config.clockElapsedSeconds).toBe(44); expect(store.row.config.draftAnswers).toEqual([{ questionId: 10, selected: 'B' }]);
    expect(store.row.config.learningRecords).toEqual([event]); expect(store.updates).toBe(2); expect(new Set(store.tables)).toEqual(new Set(['rc_drill_sessions']));
  });
  it('recovers a committed note after a lost reply without a duplicate write', async () => {
    const event = request(); store.lost = true; await expect(recordRcLearningEvent(event)).rejects.toThrow('Reply lost');
    await expect(recordRcLearningEvent(event)).resolves.toEqual(event); expect(store.row.config.learningRecords).toHaveLength(1); expect(store.updates).toBe(1);
  });
  it('rejects protected and assignment records before writing learning metadata', async () => {
    store.row.config.source = 'assignment'; await expect(recordRcLearningEvent(request())).rejects.toThrow('ordinary practice'); expect(store.updates).toBe(0);
    store.row.config.source = 'manual'; store.row.config.timedSectionSittingId = 'protected'; await expect(recordRcLearningEvent(request())).rejects.toThrow('ordinary practice');
  });
  it('rejects a changed actor and a passage outside the saved selection', async () => {
    store.switchActor = true; await expect(recordRcLearningEvent(request())).rejects.toThrow('account changed'); expect(store.updates).toBe(0);
    store.switchActor = false; store.actor = 'owner'; await expect(recordRcLearningEvent({ ...request(), passageId: 99 })).rejects.toThrow('outside');
  });
  it('rejects a question that does not belong to the saved passage', async () => {
    await expect(recordRcLearningEvent({ ...request(), questionId: 999 })).rejects.toThrow('outside the saved passage');
    expect(store.updates).toBe(0);
  });
  it('does not infer confidence or accept malformed notes', () => {
    const event = request(); expect(readRcLearningEvent({ ...event, kind: 'confidence', value: 'unknown' })).toBeNull();
    expect(readRcLearningEvent({ ...event, kind: 'confidence', value: 'low' })?.value).toBe('low');
    expect(readRcLearningEvent({ ...event, kind: 'reading-progress', value: -1 })).toBeNull();
    expect(readRcLearningEvent({ ...event, value: ' ' })).toBeNull();
  });
  it('reads only this actor and session learning events', async () => {
    const event = request(); store.row.config.learningRecords = [event, { ...event, actorId: 'other', id: crypto.randomUUID() }, { ...event, sessionId: 'other', id: crypto.randomUUID() }];
    expect(await getRcLearningEvents('owner', 'session')).toEqual([event]);
  });
  it('validates evidence coordinates against unchanged source before writing', async () => {
    const evidence = { target: 'passage', sourceAlgorithm: 'sha256', sourceFingerprint: await rcEvidenceFingerprint('Original evidence text.'), start: 9, end: 17, quote: 'evidence', note: 'This supports the claim.' };
    const event = createRcLearningEvent('owner', 'session', 7, 10, 'evidence-note', JSON.stringify(evidence));
    await recordRcLearningEvent(event);
    expect(store.row.config.learningRecords).toEqual([event]);
    await expect(recordRcLearningEvent({ ...event, id: crypto.randomUUID(), value: JSON.stringify({ ...evidence, start: 0, end: 8 }) })).rejects.toThrow('original passage');
    await expect(recordRcLearningEvent({ ...event, id: crypto.randomUUID(), value: JSON.stringify({ ...evidence, sourceFingerprint: '0'.repeat(64) }) })).rejects.toThrow('original passage');
    expect(store.updates).toBe(1);
  });
  it('rejects inferred or malformed pane observations', () => {
    const event = request();
    expect(readRcLearningEvent({ ...event, kind: 'pane-observation', value: JSON.stringify({ passageMs: 10, questionMs: 20, sharedMs: 30 }) })).not.toBeNull();
    expect(readRcLearningEvent({ ...event, kind: 'pane-observation', value: JSON.stringify({ passageMs: -1, questionMs: 20, sharedMs: 30 }) })).toBeNull();
    expect(readRcLearningEvent({ ...event, kind: 'evidence-note', value: JSON.stringify({ start: 0, end: 8, quote: 'wrong', note: 'A note' }) })).toBeNull();
  });
});

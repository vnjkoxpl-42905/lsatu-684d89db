import { loadPassage } from './rcBank';
import { rcEvidenceFingerprint } from './rcEvidenceFingerprint';
import { rcDb, RC_SESSIONS_TABLE } from '../api/rcSupabase.types';

export type RcLearningKind = 'prediction' | 'reflection' | 'confidence' | 'reading-progress' | 'evidence-note' | 'pane-observation';
export interface RcEvidenceNote { target: 'passage'; sourceAlgorithm: 'sha256'; sourceFingerprint: string; start: number; end: number; quote: string; note: string }
export interface RcPaneObservation { passageMs: number; questionMs: number; sharedMs: number }
export function readRcEvidenceNote(value: unknown): RcEvidenceNote | null {
  try {
    const row = typeof value === 'string' ? JSON.parse(value) : value;
    return row && row.target === 'passage' && row.sourceAlgorithm === 'sha256' && typeof row.sourceFingerprint === 'string' && /^[a-f0-9]{64}$/.test(row.sourceFingerprint)
      && Number.isSafeInteger(row.start) && row.start >= 0 && Number.isSafeInteger(row.end) && row.end > row.start
      && typeof row.quote === 'string' && row.quote.length === row.end - row.start && row.quote.length <= 2000
      && typeof row.note === 'string' && row.note.trim().length > 0 && row.note.length <= 1500
      ? { target: row.target, sourceAlgorithm: row.sourceAlgorithm, sourceFingerprint: row.sourceFingerprint, start: row.start, end: row.end, quote: row.quote, note: row.note } : null;
  } catch { return null; }
}
export function readRcPaneObservation(value: unknown): RcPaneObservation | null {
  try {
    const row = typeof value === 'string' ? JSON.parse(value) : value;
    return row && ['passageMs', 'questionMs', 'sharedMs'].every(key => Number.isSafeInteger(row[key]) && row[key] >= 0 && row[key] <= 604800000)
      ? { passageMs: row.passageMs, questionMs: row.questionMs, sharedMs: row.sharedMs } : null;
  } catch { return null; }
}
export interface RcLearningEvent { id: string; actorId: string; sessionId: string; passageId: number; questionId: number; kind: RcLearningKind; value: string | number; createdAt: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readRcLearningEvent(value: unknown): RcLearningEvent | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as RcLearningEvent;
  if (typeof row.id !== 'string' || !uuid.test(row.id) || typeof row.actorId !== 'string' || !row.actorId || typeof row.sessionId !== 'string' || !row.sessionId || typeof row.createdAt !== 'string' || !Number.isSafeInteger(row.passageId) || row.passageId <= 0
    || !Number.isSafeInteger(row.questionId) || row.questionId <= 0 || !Number.isFinite(Date.parse(row.createdAt))) return null;
  const valid = row.kind === 'evidence-note' ? typeof row.value === 'string' && row.value.length <= 4000 && !!readRcEvidenceNote(row.value)
    : row.kind === 'pane-observation' ? typeof row.value === 'string' && !!readRcPaneObservation(row.value)
    : row.kind === 'confidence' ? typeof row.value === 'string' && ['low', 'medium', 'high'].includes(row.value)
    : row.kind === 'reading-progress' ? typeof row.value === 'number' && Number.isSafeInteger(row.value) && row.value >= 0 && row.value <= 1000
    : ['prediction', 'reflection'].includes(row.kind) && typeof row.value === 'string' && row.value.trim().length > 0 && row.value.length <= 4000;
  return valid ? { id: row.id, actorId: row.actorId, sessionId: row.sessionId, passageId: row.passageId, questionId: row.questionId,
    kind: row.kind, value: row.value, createdAt: row.createdAt } : null;
}
export function createRcLearningEvent(actorId: string, sessionId: string, passageId: number, questionId: number, kind: RcLearningKind, value: string | number): RcLearningEvent {
  const event = readRcLearningEvent({ id: crypto.randomUUID(), actorId, sessionId, passageId, questionId, kind, value, createdAt: new Date().toISOString() });
  if (!event) throw new Error('This learning note could not be verified.');
  return event;
}
async function requireActor(actorId: string) {
  const { data, error } = await rcDb.auth.getUser();
  if (error || data?.user?.id !== actorId) throw new Error('The signed-in account changed.');
}
async function readSession(actorId: string, sessionId: string) {
  await requireActor(actorId);
  const { data, error } = await rcDb.from(RC_SESSIONS_TABLE).select().eq('id', sessionId).eq('user_id', actorId).maybeSingle();
  if (error) throw new Error(error.message);
  await requireActor(actorId);
  if (!data || data.id !== sessionId || data.user_id !== actorId || !data.config || typeof data.config !== 'object' || Array.isArray(data.config)) throw new Error('This learning session could not be loaded.');
  if (!['manual', 'adaptive'].includes(data.config.source) || data.config.timedSectionSittingId || data.config.practiceTestRunId
    || data.timed_section_sitting_id || data.practice_test_run_id || !['in_progress', 'completed'].includes(data.status)) {
    throw new Error('Training is only available in ordinary practice drills.');
  }
  return data;
}
export async function getRcLearningEvents(actorId: string, sessionId: string): Promise<RcLearningEvent[]> {
  const row = await readSession(actorId, sessionId);
  return (Array.isArray(row.config.learningRecords) ? row.config.learningRecords : []).map(readRcLearningEvent)
    .filter((event): event is RcLearningEvent => !!event && event.actorId === actorId && event.sessionId === sessionId);
}
/** Append a separate learning event. Never update attempts, answers, marks or timing. */
export async function recordRcLearningEvent(request: RcLearningEvent): Promise<RcLearningEvent> {
  const event = readRcLearningEvent(request);
  if (!event) throw new Error('This learning note could not be verified.');
  for (let retry = 0; retry < 3; retry++) {
    const row = await readSession(event.actorId, event.sessionId);
    if (!Array.isArray(row.passage_ids) || !row.passage_ids.includes(event.passageId)) throw new Error('This passage is outside the saved drill.');
    const passage = await loadPassage(event.passageId);
    if (!passage || passage.passageId !== event.passageId || !passage.questions.some(question => question.questionId === event.questionId)) throw new Error('This question is outside the saved passage.');
    if (event.kind === 'evidence-note') {
      const evidence = readRcEvidenceNote(event.value)!;
      if (passage.text.slice(evidence.start, evidence.end) !== evidence.quote || await rcEvidenceFingerprint(passage.text) !== evidence.sourceFingerprint) throw new Error('This evidence span no longer matches the original passage source.');
    }
    if (row.config.learningRecords !== undefined && !Array.isArray(row.config.learningRecords)) throw new Error('Existing learning notes could not be verified.');
    const records = row.config.learningRecords ?? [];
    const prior = records.find((value: { id?: string }) => value?.id === event.id);
    if (prior) {
      if (JSON.stringify(readRcLearningEvent(prior)) !== JSON.stringify(event)) throw new Error('The saved learning command does not match this note.');
      await requireActor(event.actorId);
      return event;
    }
    await requireActor(event.actorId);
    const { data, error } = await rcDb.from(RC_SESSIONS_TABLE).update({ config: { ...row.config, learningRecords: [...records, event] } })
      .eq('id', event.sessionId).eq('user_id', event.actorId).eq('status', row.status).eq('config', JSON.stringify(row.config)).select('id').maybeSingle();
    if (error) throw new Error(error.message);
    await requireActor(event.actorId);
    if (data?.id === event.sessionId) return event;
  }
  throw new Error('The drill changed while saving this learning note. Retry the same note.');
}

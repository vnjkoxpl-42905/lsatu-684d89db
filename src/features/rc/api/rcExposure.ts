import { rcDb } from './rcSupabase.types';

export type RcExposureSource = 'preview' | 'builder-preview' | 'player' | 'timed-reader';
export interface RcExposureRequest { id: string; actorId: string; passageId: number; source: RcExposureSource }
const sources: RcExposureSource[] = ['preview', 'builder-preview', 'player', 'timed-reader'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function isRcExposureRequest(value: unknown): value is RcExposureRequest {
  const request = value as RcExposureRequest;
  return !!request && typeof request.id === 'string' && uuid.test(request.id) && typeof request.actorId === 'string'
    && !!request.actorId && Number.isSafeInteger(request.passageId) && request.passageId > 0 && sources.includes(request.source);
}
export function createRcExposureRequest(actorId: string, passageId: number, source: RcExposureSource): RcExposureRequest {
  const request = { id: crypto.randomUUID(), actorId, passageId, source };
  if (!isRcExposureRequest(request)) throw new Error('The passage exposure could not be prepared.');
  return request;
}
const keyFor = (request: RcExposureRequest) => `rc:v1:passage:${request.passageId}:${request.source}`;
async function verifyActor(actorId: string) {
  const { data, error } = await rcDb.auth.getUser();
  if (error || !actorId || data?.user?.id !== actorId) throw new Error('The signed-in account changed.');
}
/** An exact retry is acknowledged from its UUID; a lost reply cannot insert twice. */
export async function recordRcPassageExposure(request: RcExposureRequest): Promise<void> {
  if (!isRcExposureRequest(request)) throw new Error('The passage exposure could not be verified.');
  await verifyActor(request.actorId);
  const expected = { id: request.id, user_id: request.actorId, question_id: keyFor(request) };
  const check = (row: Record<string, unknown> | null) => {
    if (!row || Object.entries(expected).some(([key, value]) => row[key] !== value)) throw new Error('The passage exposure acknowledgment did not match.');
  };
  const { data: prior, error: priorError } = await rcDb.from('question_exposures').select('id,user_id,question_id')
    .eq('id', request.id).eq('user_id', request.actorId).maybeSingle();
  if (priorError) throw new Error('Passage exposure history is unavailable. Retry before revealing the text.');
  if (prior) { check(prior); await verifyActor(request.actorId); return; }
  await verifyActor(request.actorId);
  const { data, error } = await rcDb.from('question_exposures').insert(expected).select('id,user_id,question_id').single();
  if (error?.code === '23505') {
    const retry = await rcDb.from('question_exposures').select('id,user_id,question_id').eq('id', request.id).eq('user_id', request.actorId).maybeSingle();
    if (retry.error) throw new Error('The passage exposure save could not be confirmed. Retry this reveal.');
    check(retry.data);
  } else {
    if (error) throw new Error('The passage exposure did not save. Retry before revealing the text.');
    check(data);
  }
  await verifyActor(request.actorId);
}

/** All recorded RC exposures. Errors, including missing tables, are unknown rather than empty. */
export async function getRcExposureHistory(expectedActorId?: string): Promise<Set<number>> {
  const actorId = expectedActorId ?? (await rcDb.auth.getUser()).data?.user?.id;
  if (!actorId) throw new Error('Sign in to check passage exposure history.');
  await verifyActor(actorId);
  const result = new Set<number>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await rcDb.from('question_exposures').select('id,user_id,question_id')
      .eq('user_id', actorId).like('question_id', 'rc:v1:passage:%')
      .order('shown_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 999);
    if (error) throw new Error('Passage exposure history could not be checked. Freshness is unknown.');
    for (const row of data ?? []) {
      if (row.user_id !== actorId) throw new Error('Passage exposure history could not be verified.');
      const match = /^rc:v1:passage:([1-9]\d*):(preview|builder-preview|player|timed-reader)$/.exec(row.question_id);
      if (!match || !Number.isSafeInteger(Number(match[1]))) throw new Error('Passage exposure history could not be verified.');
      result.add(Number(match[1]));
    }
    if ((data?.length ?? 0) < 1000) break;
  }
  await verifyActor(actorId);
  return result;
}

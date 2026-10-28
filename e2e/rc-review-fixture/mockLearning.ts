import type { RcLearningEvent, RcLearningKind } from '../../src/features/rc/lib/rcLearning';
const key = 'rc-fixture-learning';
let failWrites = new URLSearchParams(location.search).has('learningFail');
export const allowFixtureLearningSave = () => { failWrites = false; };
export const readRcLearningEvent = (value: unknown) => value && typeof value === 'object' && 'id' in value ? value as RcLearningEvent : null;
export const createRcLearningEvent = (actorId: string, sessionId: string, passageId: number, questionId: number, kind: RcLearningKind, value: string | number): RcLearningEvent => ({ id: crypto.randomUUID(), actorId, sessionId, passageId, questionId, kind, value, createdAt: new Date().toISOString() });
export const getRcLearningEvents = async (actorId: string, sessionId: string): Promise<RcLearningEvent[]> => JSON.parse(localStorage.getItem(key) || '[]').filter((event: RcLearningEvent) => event.actorId === actorId && event.sessionId === sessionId);
export const recordRcLearningEvent = async (event: RcLearningEvent) => {
  await new Promise(resolve => setTimeout(resolve, 250));
  if (failWrites) throw new Error('Synthetic learning save rejected.');
  const events = JSON.parse(localStorage.getItem(key) || '[]');
  if (!events.some((row: RcLearningEvent) => row.id === event.id)) events.push(event);
  localStorage.setItem(key, JSON.stringify(events)); return event;
};

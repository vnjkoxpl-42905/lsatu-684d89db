export type CoachSource = { sourceKind: "assignment" | "preview"; sourceId: string };
export type CoachRequest = CoachSource & { contractVersion: 1; requestId: string; itemOrder: number; studentResponse: string; attemptNo: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Persist exact request identity before a potentially paid call, including retries after reload. */
export function retainCoachRequest(actor: string, source: CoachSource, itemOrder: number, studentResponse: string, attemptNo: number, storage: Storage = localStorage): CoachRequest {
  if (!actor || !source || !["assignment", "preview"].includes(source.sourceKind) || !uuid.test(source.sourceId) || !Number.isSafeInteger(itemOrder) || itemOrder < 1 || ![1, 2].includes(attemptNo) || !studentResponse.trim() || studentResponse.length > 10000) throw new Error("This Activity grading source is unavailable.");
  const identity = { actor, ...source, itemOrder, studentResponse, attemptNo };
  const key = `lsatu:activity-coach:v1:${JSON.stringify(identity)}`;
  const prior = storage.getItem(key);
  if (prior !== null) {
    const saved = JSON.parse(prior);
    if (JSON.stringify(saved.identity) !== JSON.stringify(identity) || !uuid.test(saved.requestId)) throw new Error("The saved grading request could not be verified.");
    return { contractVersion: 1, requestId: saved.requestId, ...source, itemOrder, studentResponse, attemptNo };
  }
  const requestId = crypto.randomUUID();
  storage.setItem(key, JSON.stringify({ identity, requestId }));
  const verified = storage.getItem(key);
  if (verified !== JSON.stringify({ identity, requestId })) throw new Error("The grading request could not be saved on this device.");
  return { contractVersion: 1, requestId, ...source, itemOrder, studentResponse, attemptNo };
}

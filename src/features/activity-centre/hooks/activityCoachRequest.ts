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

/** Called only after the server confirms a terminal, revision-only conflict.
 * Ordinary conflicts and uncertain outcomes must keep their original ID.
 * If another caller already replaced it, reuse that durable replacement.
 */
export function replaceRevisionCoachRequest(actor: string, request: CoachRequest, storage: Storage = localStorage): CoachRequest {
  const source = { sourceKind: request.sourceKind, sourceId: request.sourceId };
  const current = retainCoachRequest(actor, source, request.itemOrder, request.studentResponse, request.attemptNo, storage);
  if (current.requestId !== request.requestId) return current;
  // Keep the storage identity identical to retainCoachRequest (no requestId or
  // contractVersion in the source), so reload/retry finds this replacement.
  const identity = { actor, sourceKind: request.sourceKind, sourceId: request.sourceId, itemOrder: request.itemOrder, studentResponse: request.studentResponse, attemptNo: request.attemptNo };
  const key = `lsatu:activity-coach:v1:${JSON.stringify(identity)}`;
  const requestId = crypto.randomUUID();
  const saved = JSON.stringify({ identity, requestId });
  storage.setItem(key, saved);
  if (storage.getItem(key) !== saved) throw new Error("The replacement grading request could not be saved.");
  return { ...request, requestId };
}

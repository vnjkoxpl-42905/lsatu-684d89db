import type { RcExposureRequest } from '../../src/features/rc/api/rcExposure';
const shown = new Set<number>();
export function createRcExposureRequest(actorId: string, passageId: number, source: RcExposureRequest['source']): RcExposureRequest {
  return { id: crypto.randomUUID(), actorId, passageId, source };
}
export function isRcExposureRequest(value: unknown): value is RcExposureRequest {
  const request = value as RcExposureRequest;
  return Boolean(request?.id && request.actorId && request.passageId && request.source);
}
export async function recordRcPassageExposure(request: RcExposureRequest) {
  if (new URLSearchParams(location.search).has('exposureFail')) throw new Error('Synthetic passage exposure save rejected.');
  if (request.actorId !== 'synthetic-owner') throw new Error('Synthetic exposure account mismatch.');
  shown.add(request.passageId);
}
export async function getRcExposureHistory() { return new Set(shown); }

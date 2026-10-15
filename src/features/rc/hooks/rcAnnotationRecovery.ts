import type { RcHighlight } from '../lib/rcTypes';

const keyFor = (actorId: string, passageId: number) => `rc:annotations:pending:${encodeURIComponent(actorId)}:${passageId}`;

export function readAnnotationRecovery(actorId: string, passageId: number): { highlights: RcHighlight[]; intentId: string } | null {
  const raw = localStorage.getItem(keyFor(actorId, passageId));
  if (!raw) return null;
  const value = JSON.parse(raw) as { actorId: string; passageId: number; highlights: RcHighlight[]; intentId?: string };
  if (value.actorId !== actorId || value.passageId !== passageId || !Array.isArray(value.highlights)) throw new Error('The pending passage marks could not be read.');
  const intentId = value.intentId ?? crypto.randomUUID();
  if (!value.intentId) writeAnnotationRecovery(actorId, passageId, value.highlights, intentId);
  return { highlights: value.highlights, intentId };
}

export function writeAnnotationRecovery(actorId: string, passageId: number, highlights: RcHighlight[], intentId: string): void {
  localStorage.setItem(keyFor(actorId, passageId), JSON.stringify({ actorId, passageId, highlights, intentId }));
}

/** Clear only the exact acknowledged intent; a newer edit must remain pending. */
export function clearAnnotationRecovery(actorId: string, passageId: number, intentId: string): void {
  const current = readAnnotationRecovery(actorId, passageId);
  if (current?.intentId === intentId) localStorage.removeItem(keyFor(actorId, passageId));
}

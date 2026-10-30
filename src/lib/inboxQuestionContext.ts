import { safeRcReturnTo } from '@/features/rc/lib/rcReturnTo';

export interface InboxQuestionContext { actorId: string; text: string; returnTo: string }

/** Context is a draft request, scoped to the actor who explicitly opened it. */
export function readInboxQuestionContext(value: unknown, actorId?: string | null): InboxQuestionContext | null {
  if (!value || typeof value !== 'object' || !actorId) return null;
  const context = value as InboxQuestionContext;
  const returnTo = typeof context.returnTo === 'string' ? safeRcReturnTo(context.returnTo) : null;
  if (context.actorId !== actorId || typeof context.text !== 'string' || !context.text.trim()
    || context.text.length > 4000 || !returnTo || !returnTo.startsWith('/rc/drill?')) return null;
  return { actorId, text: context.text, returnTo };
}

export function seedQuestionContext(body: string, context: string): string {
  return body.trim() ? body : context;
}

export function appendQuestionContext(body: string, context: string): string {
  return body.includes(context) ? body : body.trim() ? `${body}\n\n${context}` : context;
}

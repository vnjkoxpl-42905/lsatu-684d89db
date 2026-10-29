import { isReleasedAnswer, type GradedQuestionAnswer } from './firstAnswerProgress';

export type ProgressReviewCapability =
  | { status: 'available'; label: string; href: string; scope: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'pending'; reason?: string };

export interface ProgressReviewAccess {
  actorId: string | null;
  ownerId: string | null;
  resolved: boolean;
  isAdmin?: boolean;
  analytics?: boolean;
  classroom?: boolean;
  drill?: boolean;
  practice?: boolean;
  journal?: boolean;
  journalState?: 'pending' | 'ready' | 'error';
  /** Existing journal records already read through their own owner/grant boundary. */
  journalQuestionIds?: ReadonlySet<string>;
  /** Enable only after current SELECT policies and downstream release gates are recorded. */
  exactRcPolicyVerified?: boolean;
  exactPtPolicyVerified?: boolean;
}

const unavailable = (reason: string): ProgressReviewCapability => ({ status: 'unavailable', reason });
const available = (href: string, scope: string, label = 'Review saved work'): ProgressReviewCapability => ({ status: 'available', label, href, scope });

/** Capability hints never replace the destination's ownership, permission or release checks. */
export function resolveProgressReviewCapability(answer: GradedQuestionAnswer, access: ProgressReviewAccess): ProgressReviewCapability {
  if (!access.resolved) return { status: 'pending', reason: 'Checking review access.' };
  if (!access.actorId || !access.ownerId) return unavailable('Sign in to review saved work.');
  if (!isReleasedAnswer(answer)) return unavailable('Results have not been revealed for this saved work.');
  const source = answer.provenance;
  if (!source || source.ownerId !== access.ownerId || access.actorId !== access.ownerId) return unavailable('This saved source is not available in your personal review.');
  if (source.kind === 'lr-attempt') {
    if (!(access.isAdmin || access.journal)) return unavailable('Wrong-answer journal access is required.');
    if (access.journalState === 'pending') return { status: 'pending', reason: 'Checking saved journal entries.' };
    if (access.journalState === 'error') return unavailable('The saved journal entry could not be verified.');
    if (!access.journalQuestionIds?.has(source.qid)) return unavailable('There is no saved journal entry for this question.');
    return available(`/journal/${encodeURIComponent(source.qid)}`, 'Question-level journal', 'Open journal entry');
  }
  if (source.runId) {
    if (!access.exactPtPolicyVerified) return unavailable('Exact full-test review is not available from this view yet.');
    if (source.kind === 'rc-session' && source.reportBinding !== 'physical') return unavailable('This older RC session is not linked to the saved full-test report.');
    if (!(access.isAdmin || access.practice || access.classroom)) return unavailable('Practice-test review access is required.');
    if (!Number.isSafeInteger(source.legIndex) || source.legIndex! < 0 || source.legIndex! > 3) return unavailable('The saved full-test leg is unavailable.');
    const q = source.kind === 'lr-section' ? source.qid : String(source.questionId);
    return available(`/testing/test/${encodeURIComponent(source.runId)}?leg=${source.legIndex}&q=${encodeURIComponent(q)}`, 'Exact completed full-test sitting');
  }
  if (source.kind === 'lr-section') {
    if (!(access.isAdmin || access.analytics || access.classroom)) return unavailable('Saved-work review access is required.');
    return available(`/review/section/${encodeURIComponent(source.historyId)}/${encodeURIComponent(source.qid)}`, 'Exact saved section sitting');
  }
  if (source.timedSittingId) return unavailable('Use the protected timed-section report to review this sitting.');
  if (!access.exactRcPolicyVerified) return unavailable('Exact RC review is not available from this view yet.');
  if (!(access.isAdmin || access.drill)) return unavailable('Drill access is required to review this RC session.');
  return available(`/rc/drill?sessionId=${encodeURIComponent(source.sessionId)}&review=1&q=${source.questionId}`, 'Exact completed RC session');
}

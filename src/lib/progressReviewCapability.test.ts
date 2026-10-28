import { describe, expect, it } from 'vitest';
import { resolveProgressReviewCapability, type ProgressReviewAccess } from './progressReviewCapability';
import type { GradedQuestionAnswer } from './firstAnswerProgress';
const access: ProgressReviewAccess = { actorId: 'owner', ownerId: 'owner', resolved: true, analytics: true };
const answer: GradedQuestionAnswer = { attemptId: 'attempt:a', questionKey: 'LR:q', area: 'LR', source: 'lr_attempts', mode: 'adaptive', correct: false, gradedAt: '2026-10-01', provenance: { kind: 'lr-attempt', ownerId: 'owner', attemptId: 'a', qid: 'q' } };
describe('saved evidence capabilities', () => {
  it('keeps unresolved, foreign, missing and withheld provenance unavailable', () => {
    expect(resolveProgressReviewCapability(answer, { ...access, resolved: false }).status).toBe('pending');
    for (const row of [{ ...answer, provenance: undefined }, { ...answer, correct: null, resultVisibility: 'withheld' as const }]) expect(resolveProgressReviewCapability(row, access).status).toBe('unavailable');
    expect(resolveProgressReviewCapability(answer, { ...access, actorId: 'other' }).status).toBe('unavailable');
  });
  it('opens only a real permitted journal and labels its question-wide scope', () => {
    expect(resolveProgressReviewCapability(answer, { ...access, journal: true }).status).toBe('unavailable');
    expect(resolveProgressReviewCapability(answer, { ...access, journal: true, journalQuestionIds: new Set(['q']) })).toMatchObject({ status: 'available', href: '/journal/q', scope: 'Question-level journal' });
  });
  it('mirrors the owned-work detail gate independently of drill and practice', () => {
    const row = { ...answer, provenance: { kind: 'lr-section' as const, ownerId: 'owner', historyId: 's', qid: 'q' } };
    expect(resolveProgressReviewCapability(row, access)).toMatchObject({ status: 'available', href: '/review/section/s/q' });
    expect(resolveProgressReviewCapability(row, { ...access, analytics: false, drill: true, practice: true }).status).toBe('unavailable');
  });
  it('requires current policy proof and drill gate for standalone RC, retaining exact session', () => {
    const row = { ...answer, area: 'RC' as const, provenance: { kind: 'rc-session' as const, ownerId: 'owner', sessionId: 'rc1', questionId: 7, passageId: 2 } };
    expect(resolveProgressReviewCapability(row, { ...access, drill: true }).status).toBe('unavailable');
    expect(resolveProgressReviewCapability(row, { ...access, exactRcPolicyVerified: true }).status).toBe('unavailable');
    expect(resolveProgressReviewCapability(row, { ...access, drill: true, exactRcPolicyVerified: true })).toMatchObject({ status: 'available', href: '/rc/drill?sessionId=rc1&review=1&q=7' });
    expect(resolveProgressReviewCapability({ ...row, provenance: { ...row.provenance, timedSittingId: 'timed' } }, { ...access, isAdmin: true, exactRcPolicyVerified: true }).status).toBe('unavailable');
  });
  it('requires exact complete-parent provenance, verified policy and destination gate for PT', () => {
    const row = { ...answer, provenance: { kind: 'lr-section' as const, ownerId: 'owner', historyId: 's', qid: 'q', runId: 'pt', legIndex: 2 } };
    expect(resolveProgressReviewCapability(row, { ...access, practice: true }).status).toBe('unavailable');
    expect(resolveProgressReviewCapability(row, { ...access, exactPtPolicyVerified: true }).status).toBe('unavailable');
    expect(resolveProgressReviewCapability(row, { ...access, classroom: true, exactPtPolicyVerified: true })).toMatchObject({ status: 'available', href: '/testing/test/pt?leg=2&q=q' });
    expect(resolveProgressReviewCapability({ ...row, provenance: { ...row.provenance, legIndex: undefined } }, { ...access, isAdmin: true, exactPtPolicyVerified: true }).status).toBe('unavailable');
  });
});

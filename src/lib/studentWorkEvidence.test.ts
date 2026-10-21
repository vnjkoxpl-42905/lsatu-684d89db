import { describe, expect, it } from 'vitest';
import { practiceSessionIdFor } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { projectGuidedWorkEvidence, projectHomeworkWorkEvidence } from './studentWorkEvidence';

const studentId = '11111111-1111-4111-8111-111111111111';

function row(assignmentId: string, attempts: unknown[] = [], prefix = 'guided::') {
  const poolSlug = `${prefix}${assignmentId}`;
  const id = practiceSessionIdFor(studentId, poolSlug);
  return {
    record_id: id,
    data: {
      id,
      user_id: studentId,
      pool_slug: poolSlug,
      completion_id: poolSlug,
      question_queue: ['PT101-S2-Q1'],
      current_index: 0,
      attempts,
      status: 'in_progress',
      started_at: '2026-09-28T12:00:00.000Z',
      updated_at: '2026-09-28T12:00:00.000Z',
    },
  };
}

describe('account-saved guided assignment evidence', () => {
  it('does not count a launched drill with no saved answer', () => {
    expect(projectGuidedWorkEvidence(studentId, [row('assignment-a')])).toEqual({});
  });

  it('links saved answers to each issued assignment instance', () => {
    const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };
    const evidence = projectGuidedWorkEvidence(studentId, [row('assignment-a', [answer]), row('assignment-b', [answer])]);
    expect(Object.keys(evidence).sort()).toEqual(['assignment-a', 'assignment-b']);
    expect(evidence['assignment-a'].savedAnswerCount).toBe(1);
  });

  it('rejects records for another account and mismatched keys', () => {
    const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };
    const good = row('assignment-a', [answer]);
    expect(projectGuidedWorkEvidence(studentId, [
      { ...good, record_id: 'not-the-matching-record' },
      { ...good, data: { ...good.data, user_id: '22222222-2222-4222-8222-222222222222' } },
    ])).toEqual({});
  });

  it('links homework answers to the issued homework row', () => {
    const answer = { qid: 'PT101-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1000 };
    const opened = row('homework-a', [], 'drill::assignment::');
    const answered = row('homework-b', [answer], 'drill::assignment::');
    const evidence = projectHomeworkWorkEvidence(studentId, [opened, answered]);
    expect(Object.keys(evidence)).toEqual(['homework-b']);
    expect(evidence['homework-b'].savedAnswerCount).toBe(1);
  });
});

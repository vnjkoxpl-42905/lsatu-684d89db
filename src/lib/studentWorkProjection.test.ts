import { describe, expect, it } from 'vitest';
import { activityWorkStatus, guidedWorkStatus, homeworkWorkStatus, studentWorkKey, teacherWorkStatus } from './studentWorkProjection';

describe('assignment-instance projection', () => {
  it('keys repeated content by issued assignment, not content ID', () => {
    expect(studentWorkKey({ sourceTable: 'guided_drill_assignments', assignmentId: 'issue-a' }))
      .not.toBe(studentWorkKey({ sourceTable: 'guided_drill_assignments', assignmentId: 'issue-b' }));
  });

  it('does not count reading a drill card or merely opening written work as progress', () => {
    expect(guidedWorkStatus({ status: 'read', completed_at: null }))
      .toBe('assigned');
    expect(teacherWorkStatus({ status: 'viewed', response_saved_at: null, completed_at: null }))
      .toBe('assigned');
  });

  it('counts saved guided attempts and written responses as progress', () => {
    expect(guidedWorkStatus({ status: 'started', completed_at: null }, { sessionId: 'session-a', savedAnswerCount: 1, status: 'in_progress' }))
      .toBe('in_progress');
    expect(teacherWorkStatus({ status: 'viewed', response_saved_at: '2026-09-28', completed_at: null }))
      .toBe('in_progress');
  });

  it('requires a persisted completion timestamp to show Completed', () => {
    expect(guidedWorkStatus({ status: 'completed', completed_at: null }))
      .toBe('assigned');
    expect(guidedWorkStatus({ status: 'completed', completed_at: '2026-09-28' }))
      .toBe('completed');
  });

  it('counts a saved Activity response, not opening its page', () => {
    const opened = { status: 'in_progress' as const, completed_at: null };
    expect(activityWorkStatus(opened, false)).toBe('assigned');
    expect(activityWorkStatus(opened, true)).toBe('in_progress');
    expect(activityWorkStatus({ status: 'completed', completed_at: '2026-09-28' }, true)).toBe('completed');
  });

  it('keeps homework Assigned after first-question render until an answer is saved', () => {
    const opened = { status: 'in_progress' as const, completed_at: null };
    expect(homeworkWorkStatus(opened)).toBe('assigned');
    expect(homeworkWorkStatus(opened, { sessionId: 'run', savedAnswerCount: 1, status: 'in_progress' }))
      .toBe('in_progress');
  });
});

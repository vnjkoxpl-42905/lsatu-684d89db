import { describe, expect, it } from 'vitest';
import { filterDismissed, sortTeacherTodos } from './useTeacherTodoQueue';
import type { TeacherTodoItem } from './teacherTodoTypes';

const emailItem: TeacherTodoItem = {
  id: 'gmail:thread-1',
  sourceKind: 'gmail',
  sourceId: 'thread-1',
  threadId: 'thread-1',
  priorityBand: 'email',
  label: 'Email',
  subject: 'Lydia Student',
  title: 'Question',
  preview: 'Can you help?',
  timing: '10m waiting',
  sortScore: 3_100,
  from: 'Lydia <lydia@example.com>',
  fromName: 'Lydia',
  fromEmail: 'lydia@example.com',
  subjectLine: 'Question',
  snippet: 'Can you help?',
  internalDate: 1,
};

const calendarItem: TeacherTodoItem = {
  id: 'calendar:event-1',
  sourceKind: 'calendar',
  sourceId: 'event-1',
  eventId: 'event-1',
  priorityBand: 'calendar',
  label: 'Calendar',
  subject: 'Session',
  title: 'Session',
  preview: 'Upcoming calendar session.',
  timing: '2:00 PM',
  sortScore: 2_100,
  startAt: '2026-06-19T18:00:00Z',
  endAt: '2026-06-19T19:00:00Z',
  location: null,
  htmlLink: null,
  description: null,
};

describe('teacher todo queue helpers', () => {
  it('sorts email before calendar and filters manually dismissed rows', () => {
    expect(sortTeacherTodos([calendarItem, emailItem]).map((item) => item.id)).toEqual(['gmail:thread-1', 'calendar:event-1']);

    expect(
      filterDismissed([emailItem, calendarItem], [{ source_kind: 'gmail', source_id: 'thread-1' }]).map((item) => item.id),
    ).toEqual(['calendar:event-1']);
  });
});

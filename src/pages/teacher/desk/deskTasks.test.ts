import { describe, expect, it, vi } from 'vitest';
import {
  approveLabel,
  approvedLabel,
  buildPriorityChips,
  buildSeedCommand,
  buildTaskContext,
  classroomItemToScheduleTask,
  conversationToReplyTask,
  draftToReviewTask,
  firstName,
  isWithinUpcomingDays,
  sortTasks,
  studentToAssignTask,
  type DeskTask,
} from './deskTasks';
import type { AITADraft } from '@/hooks/useAITADrafts';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import type { Conversation } from '@/hooks/useInbox';
import type { HubStudentRow } from '@/hooks/useHubStudents';

function task(overrides: Partial<DeskTask>): DeskTask {
  return {
    id: 'task-1',
    mode: 'reply',
    verb: 'Reply',
    subject: 'Meghan Mullins',
    reason: 'Unread question',
    timing: 'Today',
    sourceLabel: 'Unread message',
    title: 'Reply to Meghan Mullins',
    preview: 'Student needs a reply',
    studentId: 'student-1',
    studentName: 'Meghan Mullins',
    priority: 50,
    primaryActionLabel: 'Send reply',
    secondaryActionLabel: 'Open thread',
    openPath: '/teacher/conversations',
    sourceKind: 'conversation',
    sourceId: 'conversation-1',
    ...overrides,
  };
}

describe('desk task assistant contract', () => {
  it('builds top cross-mode priority chips plus the freeform ask chip', () => {
    const chips = buildPriorityChips({
      reply: [task({ id: 'reply-1', mode: 'reply', verb: 'Reply', priority: 99, studentName: 'Meghan Mullins' })],
      review: [task({ id: 'review-1', mode: 'review', verb: 'Review', sourceKind: 'draft', priority: 105, studentName: 'Adriana Perez', reason: 'Session recap draft waiting' })],
      assign: [task({ id: 'assign-1', mode: 'assign', verb: 'Assign', sourceKind: 'assignment-gap', priority: 80, studentName: 'Dakota Brown' })],
    });

    expect(chips.map((chip) => chip.id)).toEqual(['chip-review-1', 'chip-reply-1', 'chip-assign-1', 'chip-ask']);
    expect(chips.map((chip) => chip.label)).toEqual([
      "Approve Adriana's recap",
      'Reply to Meghan',
      'Assign Dakota',
      'Ask about the workspace',
    ]);
  });

  it('attaches typed task context without polluting the visible seed command', () => {
    const replyTask = task({
      id: 'reply-99',
      reason: 'Weaken drill timing',
      preview: 'x'.repeat(400),
      sourceKind: 'conversation',
      sourceId: 'conversation-99',
      studentId: 'student-99',
    });

    expect(buildSeedCommand(replyTask)).toBe('Draft a reply to Meghan Mullins about: "Weaken drill timing".');
    expect(buildTaskContext(replyTask)).toEqual({
      surface: 'teacher_desk',
      taskId: 'reply-99',
      mode: 'reply',
      studentId: 'student-99',
      sourceKind: 'conversation',
      sourceId: 'conversation-99',
      sourcePreview: 'x'.repeat(280),
    });
  });

  it('uses consequence-accurate labels for every desk card action', () => {
    const cases: Array<[DeskTask, string, string]> = [
      [task({ sourceKind: 'conversation' }), 'Send to student', 'Sent to student'],
      [task({ sourceKind: 'draft', reason: 'session recap draft waiting' }), 'Post recap', 'Recap posted'],
      [task({ sourceKind: 'draft', reason: 'next session plan draft waiting' }), 'Approve draft', 'Draft approved'],
      [task({ sourceKind: 'upload' }), 'Mark reviewed', 'Marked reviewed'],
      [task({ sourceKind: 'assignment-gap' }), 'Assign drill', 'Drill assigned'],
    ];

    for (const [deskTask, approve, approved] of cases) {
      expect(approveLabel(deskTask)).toBe(approve);
      expect(approvedLabel(deskTask)).toBe(approved);
    }
  });

  it('converts an unread conversation into a reply task with stripped preview text', () => {
    vi.setSystemTime(new Date('2026-06-18T12:00:00Z'));
    const conversation = {
      id: 'conversation-1',
      subject: 'Timing question',
      last_message_at: '2026-06-18T11:40:00Z',
      unread: true,
      participants: [
        { user_id: 'admin-1', display_name: 'Joshua', is_admin: true },
        { user_id: 'student-1', display_name: 'Meghan Mullins', is_admin: false },
      ],
      last_message: {
        body: '**Can you help** with `weaken` timing?',
        created_at: '2026-06-18T11:40:00Z',
      },
    } as Conversation;

    expect(conversationToReplyTask(conversation)).toMatchObject({
      id: 'reply-conversation-1',
      mode: 'reply',
      title: 'Reply to Meghan Mullins',
      preview: 'Can you help with weaken timing?',
      studentId: 'student-1',
      sourceKind: 'conversation',
      sourceId: 'conversation-1',
      timing: '20m waiting',
    });
  });

  it('maps a recap draft into a markdown-stripped review task with editable body', () => {
    const draft = {
      id: 'draft-1',
      student_id: 'student-1',
      draft_type: 'session_recap',
      created_at: '2026-06-18T11:00:00Z',
      draft_markdown: '# Recap\n\n- improved on **structure**',
      prompt: 'Draft a recap',
    } as AITADraft;
    const student = {
      class_id: 'student-1',
      display_name: 'Dakota Brown',
      email: 'dakota@example.com',
    } as HubStudentRow;

    expect(draftToReviewTask(draft, student)).toMatchObject({
      id: 'draft-draft-1',
      mode: 'review',
      reason: 'session recap draft waiting',
      preview: 'Recap improved on structure',
      editableText: '# Recap\n\n- improved on **structure**',
      sourceKind: 'draft',
      sourceId: 'draft-1',
    });
  });

  it('prioritizes assignment gaps for students with mostly completed work', () => {
    const student = {
      class_id: 'student-1',
      display_name: 'Dakota Brown',
      email: 'dakota@example.com',
      assignments_total: 10,
      assignments_completed: 8,
    } as HubStudentRow;

    expect(studentToAssignTask(student)).toMatchObject({
      id: 'assign-student-1',
      mode: 'assign',
      sourceKind: 'assignment-gap',
      priority: 80,
      title: 'Assign next work to Dakota Brown',
      sourceId: 'student-1',
      reason: '80% complete',
    });
  });

  it('converts classroom calendar items into schedule to-do tasks', () => {
    vi.setSystemTime(new Date('2026-06-18T12:00:00Z'));
    const item = {
      id: 'calendar-1',
      student_id: 'student-1',
      type: 'weekly_plan_task',
      title: 'Timed LR review',
      description: 'Review weaken timing before the next drill.',
      status: 'assigned',
      due_at: '2026-06-18T20:00:00Z',
      unlock_at: null,
      created_at: '2026-06-17T20:00:00Z',
    } as ClassroomItem;
    const student = {
      class_id: 'student-1',
      display_name: 'Dakota Brown',
      email: 'dakota@example.com',
    } as HubStudentRow;

    expect(classroomItemToScheduleTask(item, student)).toMatchObject({
      id: 'schedule-calendar-1',
      verb: 'Schedule',
      subject: 'Dakota Brown',
      reason: 'Timed LR review',
      timing: 'Today',
      sourceLabel: 'Calendar item',
      openPath: '/teacher/schedule?student=student-1',
      sourceKind: 'schedule',
      sourceId: 'calendar-1',
    });
  });

  it('keeps calendar to-do rows inside the upcoming schedule window', () => {
    vi.setSystemTime(new Date('2026-06-18T12:00:00Z'));

    expect(isWithinUpcomingDays('2026-06-19T12:00:00Z', 14)).toBe(true);
    expect(isWithinUpcomingDays('2026-07-10T12:00:00Z', 14)).toBe(false);
  });

  it('sorts by priority and falls back to a neutral first-name label', () => {
    expect(sortTasks([task({ id: 'low', priority: 1 }), task({ id: 'high', priority: 3 })]).map((t) => t.id)).toEqual([
      'high',
      'low',
    ]);
    expect(firstName('')).toBe('this student');
  });
});

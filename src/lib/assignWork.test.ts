import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreateClassroomItem, mockNotify, mockFrom } = vi.hoisted(() => ({
  mockCreateClassroomItem: vi.fn(),
  mockNotify: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/classroomItems', () => ({
  createClassroomItem: (args: unknown) => mockCreateClassroomItem(args),
}));

vi.mock('@/lib/classroomNotify', () => ({
  notifyStudentOfClassroomItem: (args: unknown) => mockNotify(args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

import { assignWork, assignWorkBundle } from './assignWork';

const TEACHER = 'teacher-uuid';

/** Rows inserted per table, and ids deleted per table, across one test. */
let inserted: Record<string, Record<string, unknown>[]>;
let deleted: Record<string, string[]>;
let insertShouldFail: string | null;

function selectableRow(row: Record<string, unknown>) {
  return {
    select: () => ({ single: async () => ({ data: row, error: null }) }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  inserted = {};
  deleted = {};
  insertShouldFail = null;

  mockNotify.mockResolvedValue({ inbox_ok: true, bell_ok: true, email_ok: true });
  mockCreateClassroomItem.mockImplementation(async () => ({ id: 'item-1' }));

  mockFrom.mockImplementation((table: string) => ({
    // Reads: the item being assigned.
    select: () => ({
      eq: () => ({
        single: async () => ({
          data:
            table === 'homework_sets'
              ? { id: 'set-1', title: 'Weaken set', description: 'Ten weakeners', question_qids: ['q1'] }
              : { id: 'drill-1', title: 'First sentence conclusions' },
          error: null,
        }),
      }),
    }),
    insert: (row: Record<string, unknown>) => {
      if (insertShouldFail === table) {
        return { select: () => ({ single: async () => ({ data: null, error: new Error('insert blew up') }) }) };
      }
      (inserted[table] ??= []).push(row);
      return selectableRow({ id: `${table}-row-${inserted[table].length}` });
    },
    delete: () => ({
      eq: async (_col: string, id: string) => {
        (deleted[table] ??= []).push(id);
        return { error: null };
      },
    }),
  }));
});

describe('assignWork', () => {
  it('gives the assignment row to the student, not the teacher', async () => {
    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'homework_set', setId: 'set-1' },
    });

    expect(result.failed).toEqual([]);
    // class_id is what makes the work visible to the student. Pointing it at
    // the teacher (or at the set's owner) silently hides the assignment.
    expect(inserted.homework_assignments[0]).toMatchObject({
      class_id: 'student-a',
      student_id: 'student-a',
      assigned_by: TEACHER,
    });
  });

  it('creates the row, the classroom item, and the notification for each student', async () => {
    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
    });

    expect(result.ok).toHaveLength(2);
    expect(inserted.guided_drill_assignments).toHaveLength(2);
    expect(mockCreateClassroomItem).toHaveBeenCalledTimes(2);
    expect(mockNotify).toHaveBeenCalledTimes(2);
  });

  it('rolls the row back when the classroom item cannot be created', async () => {
    mockCreateClassroomItem.mockRejectedValueOnce(new Error('rls said no'));

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
    });

    expect(result.ok).toEqual([]);
    expect(result.failed[0]).toMatchObject({ studentId: 'student-a' });
    // An assignment row the student can never see would block a re-assign.
    expect(deleted.guided_drill_assignments).toEqual(['guided_drill_assignments-row-1']);
  });

  it('rolls back both writes when notifying throws', async () => {
    mockNotify.mockRejectedValueOnce(new Error('smtp down'));

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
    });

    expect(result.ok).toEqual([]);
    expect(deleted.classroom_items).toEqual(['item-1']);
    expect(deleted.guided_drill_assignments).toEqual(['guided_drill_assignments-row-1']);
  });

  it('keeps the assignment when a notification channel merely reports failure', async () => {
    mockNotify.mockResolvedValueOnce({ inbox_ok: true, bell_ok: true, email_ok: false });

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
    });

    // The work is visible in the Classroom; only the email went missing.
    // Deleting it here would destroy real work over a mail problem.
    expect(result.failed).toEqual([]);
    expect(result.ok[0].notify?.email_ok).toBe(false);
    expect(deleted.guided_drill_assignments).toBeUndefined();
  });

  it('isolates one student failing from the rest of the batch', async () => {
    mockCreateClassroomItem
      .mockImplementationOnce(async () => ({ id: 'item-1' }))
      .mockRejectedValueOnce(new Error('rls said no'))
      .mockImplementationOnce(async () => ({ id: 'item-3' }));

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b', 'student-c'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
    });

    expect(result.ok.map((r) => r.studentId)).toEqual(['student-a', 'student-c']);
    expect(result.failed.map((r) => r.studentId)).toEqual(['student-b']);
  });

  it('reports every student as failed when the item itself cannot be read', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: new Error('no such set') }) }),
      }),
    }));

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      item: { kind: 'homework_set', setId: 'gone' },
    });

    expect(result.ok).toEqual([]);
    expect(result.failed).toHaveLength(2);
    expect(result.failed[0].error).toContain('no such set');
  });

  it('unlocks a scheduled day at local midnight, not the evening before', async () => {
    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
      scheduledForLocalDate: '2026-08-05',
    });

    const unlockAt = inserted.guided_drill_assignments[0].unlock_at as string;
    // Whatever the runner's timezone, that instant has to still be Aug 5 locally.
    const local = new Date(unlockAt);
    expect(local.getFullYear()).toBe(2026);
    expect(local.getMonth()).toBe(7);
    expect(local.getDate()).toBe(5);
  });

  it('writes no assignment row for a bootcamp, which is the classroom item itself', async () => {
    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'bootcamp', topicId: 'principle-flaw' },
    });

    expect(result.ok).toHaveLength(1);
    expect(result.ok[0].assignmentId).toBeUndefined();
    expect(inserted).toEqual({});
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(
      expect.objectContaining({ sourceTable: 'bootcamps', type: 'bootcamp_module' }),
    );
  });
});

describe('assignWorkBundle', () => {
  const BUNDLE = [
    { kind: 'guided_drill' as const, drillId: 'drill-1' },
    { kind: 'homework_set' as const, setId: 'set-1' },
  ];

  it('writes every kind but pings the student once', async () => {
    const result = await assignWorkBundle({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      items: BUNDLE,
    });

    expect(result.failed).toEqual([]);
    expect(inserted.guided_drill_assignments).toHaveLength(1);
    expect(inserted.homework_assignments).toHaveLength(1);
    // A card per piece of work — they are separate work in the Classroom.
    expect(mockCreateClassroomItem).toHaveBeenCalledTimes(2);
    // One handoff, one message.
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '2 new pieces of work',
        route: '/classroom',
        description: '• First sentence conclusions\n• Weaken set',
      }),
    );
  });

  it('reports every row it wrote for the student', async () => {
    const result = await assignWorkBundle({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      items: BUNDLE,
    });

    expect(result.ok[0].assignmentIds).toEqual([
      'guided_drill_assignments-row-1',
      'homework_assignments-row-1',
    ]);
    expect(result.ok[0].classroomItemIds).toHaveLength(2);
  });

  it('rolls the earlier items back when a later one fails', async () => {
    // The drill lands, then the homework insert blows up.
    insertShouldFail = 'homework_assignments';

    const result = await assignWorkBundle({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      items: BUNDLE,
    });

    expect(result.ok).toEqual([]);
    expect(result.failed).toHaveLength(1);
    // Half a bundle is worse than none: the drill row and its card go too.
    expect(deleted.guided_drill_assignments).toEqual(['guided_drill_assignments-row-1']);
    expect(deleted.classroom_items).toEqual(['item-1']);
    // And nobody is told about work that no longer exists.
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('keeps one student\'s bundle failing from costing the next student theirs', async () => {
    mockCreateClassroomItem
      .mockImplementationOnce(async () => {
        throw new Error('classroom item refused');
      })
      .mockImplementation(async () => ({ id: 'item-1' }));

    const result = await assignWorkBundle({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      items: BUNDLE,
    });

    expect(result.failed.map((r) => r.studentId)).toEqual(['student-a']);
    expect(result.ok.map((r) => r.studentId)).toEqual(['student-b']);
  });

  it('does nothing at all when given no items', async () => {
    const result = await assignWorkBundle({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      items: [],
    });

    expect(result).toEqual({ ok: [], failed: [] });
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
  });
});

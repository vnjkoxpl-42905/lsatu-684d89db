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
/** class_id -> proficiency_level, as the profiles table would return it. */
let studentLevels: Record<string, string | null>;
let levelLookupShouldFail: boolean | 'missing-column';

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
  studentLevels = {};
  levelLookupShouldFail = false;

  mockNotify.mockResolvedValue({ inbox_ok: true, bell_ok: true, email_ok: true });
  mockCreateClassroomItem.mockImplementation(async () => ({ id: 'item-1' }));

  mockFrom.mockImplementation((table: string) => ({
    // Reads: the item being assigned, or the students' levels.
    select: () => ({
      eq: () => ({
        single: async () => ({
          data:
            table === 'homework_sets'
              ? { id: 'set-1', title: 'Weaken set', description: 'Ten weakeners', question_qids: ['q1'] }
              : { id: 'drill-1', title: 'First sentence conclusions', question_count: 6 },
          error: null,
        }),
      }),
      // profiles: one batched lookup of every student's proficiency level.
      in: async (_col: string, ids: string[]) =>
        levelLookupShouldFail === 'missing-column'
          ? {
              data: null,
              error: Object.assign(
                new Error("column profiles.proficiency_level does not exist"),
                { code: '42703' },
              ),
            }
          : levelLookupShouldFail
          ? { data: null, error: new Error('profiles unreachable') }
          : {
              data: ids
                .filter((id) => id in studentLevels)
                .map((id) => ({ class_id: id, proficiency_level: studentLevels[id] })),
              error: null,
            },
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

  it('persists the exact conditional skill and level in the classroom item', async () => {
    const conditionalTarget = { scope: 'skill', mode: 'practice', unitId: 'group-3', difficulty: 'advanced' } as const;
    const result = await assignWork({ teacherId: TEACHER, studentIds: ['student-a'],
      item: { kind: 'bootcamp', topicId: 'conditionals', conditionalTarget }, notify: false });
    expect(result.failed).toEqual([]);
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: '/bootcamp/conditionals/practice?level=advanced&unit=group-3',
      metadata: expect.objectContaining({ bootcamp_id: 'conditionals', conditional_target: conditionalTarget,
        conditional_target_key: 'skill:group-3:practice:advanced' }),
    }));
    expect(inserted).toEqual({});
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it('rejects an unknown conditional skill before writing or notifying', async () => {
    const result = await assignWork({ teacherId: TEACHER, studentIds: ['student-a'], item: {
      kind: 'bootcamp', topicId: 'conditionals', conditionalTarget: {
        scope: 'skill', mode: 'practice', unitId: 'missing-skill', difficulty: 'medium',
      },
    } });
    expect(result.ok).toEqual([]);
    expect(result.failed).toEqual([{ studentId: 'student-a', error: 'Choose an existing conditional skill.' }]);
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
  });
  it('persists a curriculum starting stage without imposing one level on the course', async () => {
    const conditionalTarget = { scope: 'stage', mode: 'learn', unitId: 'direct-linking', difficulty: 'beginner' } as const;
    const result = await assignWork({ teacherId: TEACHER, studentIds: ['student-a'],
      item: { kind: 'bootcamp', topicId: 'conditionals', conditionalTarget }, notify: false });
    expect(result.failed).toEqual([]);
    expect(mockCreateClassroomItem).toHaveBeenCalledWith(expect.objectContaining({
      sourceId: '/bootcamp/conditionals?start=direct-linking',
      metadata: expect.objectContaining({ conditional_target: conditionalTarget, conditional_target_key: 'stage:direct-linking' }),
    }));
    expect(mockNotify).not.toHaveBeenCalled();
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

describe('assignWork — student level on guided drills', () => {
  const DRILL = { kind: 'guided_drill', drillId: 'drill-1' } as const;

  it('stamps each student with their own profile level', async () => {
    studentLevels = { 'student-a': 'beginner', 'student-b': 'advanced' };

    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      item: DRILL,
    });

    const rows = inserted.guided_drill_assignments;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ student_id: 'student-a', level: 'beginner' });
    expect(rows[1]).toMatchObject({ student_id: 'student-b', level: 'advanced' });
  });

  it('reads every level in one query, not one per student', async () => {
    studentLevels = { 'student-a': 'beginner', 'student-b': 'beginner', 'student-c': 'advanced' };

    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b', 'student-c'],
      item: DRILL,
    });

    const profileCalls = mockFrom.mock.calls.filter(([table]) => table === 'profiles');
    expect(profileCalls).toHaveLength(1);
  });

  it('does not touch profiles when nothing in the bundle is a guided drill', async () => {
    await assignWorkBundle({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      items: [
        { kind: 'homework_set', setId: 'set-1' },
        { kind: 'bootcamp', topicId: 'intro-to-lr' },
      ],
    });

    expect(mockFrom.mock.calls.filter(([t]) => t === 'profiles')).toHaveLength(0);
  });

  it('lets a per-assignment override beat the profile level', async () => {
    studentLevels = { 'student-a': 'beginner' };

    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: DRILL,
      levelOverrides: { 'student-a': 'advanced' },
    });

    expect(inserted.guided_drill_assignments[0]).toMatchObject({ level: 'advanced' });
  });

  it('honours an explicit null override as "assign this one unlevelled"', async () => {
    studentLevels = { 'student-a': 'advanced' };

    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: DRILL,
      levelOverrides: { 'student-a': null },
    });

    expect(inserted.guided_drill_assignments[0]).toMatchObject({ level: null });
  });

  it('gives a student with no profile row no level, rather than a default', async () => {
    studentLevels = {};

    await assignWork({ teacherId: TEACHER, studentIds: ['ghost'], item: DRILL });

    // Guessing "intermediate" here would be the system overruling the teacher.
    expect(inserted.guided_drill_assignments[0]).toMatchObject({ level: null });
  });

  it('ignores a level string the app does not recognise', async () => {
    studentLevels = { 'student-a': 'Beginner' };

    await assignWork({ teacherId: TEACHER, studentIds: ['student-a'], item: DRILL });

    expect(inserted.guided_drill_assignments[0]).toMatchObject({ level: null });
  });

  it('records a question count override so the drill can be shortened', async () => {
    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: DRILL,
      questionCountOverride: 4,
    });

    expect(inserted.guided_drill_assignments[0]).toMatchObject({ question_count: 4 });
  });

  it('leaves question_count null when the drill is not being shortened', async () => {
    await assignWork({ teacherId: TEACHER, studentIds: ['student-a'], item: DRILL });

    expect(inserted.guided_drill_assignments[0]).toMatchObject({ question_count: null });
  });

  it('still assigns, unlevelled, if the column is not deployed to this DB yet', async () => {
    // The code and the migration do not land atomically. A missing column must
    // degrade to the pre-level behaviour, not break every guided drill assign.
    levelLookupShouldFail = 'missing-column';

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: DRILL,
    });

    expect(result.failed).toEqual([]);
    expect(inserted.guided_drill_assignments[0]).toMatchObject({ level: null });
  });

  it('fails every student and writes nothing when the level lookup breaks', async () => {
    levelLookupShouldFail = true;

    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      item: DRILL,
    });

    expect(result.ok).toEqual([]);
    expect(result.failed.map((r) => r.studentId)).toEqual(['student-a', 'student-b']);
    expect(inserted.guided_drill_assignments).toBeUndefined();
    expect(mockCreateClassroomItem).not.toHaveBeenCalled();
  });

  it('still assigns, but sends nothing, when the caller owns the messaging', async () => {
    // The weekly-plan builder sends one summary for the whole week. Per-drill
    // pings would put seven entries in the bell for one plan.
    const result = await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: DRILL,
      notify: false,
    });

    expect(result.failed).toEqual([]);
    expect(inserted.guided_drill_assignments).toHaveLength(1);
    expect(mockCreateClassroomItem).toHaveBeenCalledTimes(1);
    expect(mockNotify).not.toHaveBeenCalled();
    expect(result.ok[0].notify).toBeUndefined();
  });

  it('notifies by default, so opting out has to be deliberate', async () => {
    await assignWork({ teacherId: TEACHER, studentIds: ['student-a'], item: DRILL });
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('never freezes a question list at assign time', async () => {
    studentLevels = { 'student-a': 'beginner' };

    await assignWork({ teacherId: TEACHER, studentIds: ['student-a'], item: DRILL });

    // Writing question_qids here would pin the set forever: it wins at runtime
    // and there is no UI to clear it, so every re-attempt would show the same
    // questions. The level is recorded and the draw happens at open time.
    expect(inserted.guided_drill_assignments[0]).not.toHaveProperty('question_qids');
  });
});

describe('freeze-on-attach', () => {
  const QIDS_A = ['PT104-S2-Q14', 'PT112-S3-Q7', 'PT118-S1-Q3'];
  const QIDS_B = ['PT141-S2-Q2', 'PT150-S3-Q9'];

  it('sends no question_qids key at all when not freezing', async () => {
    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
    });

    const row = inserted.guided_drill_assignments[0];
    // Not "is null" — the key must be absent, so the default path is provably
    // byte-identical to what it sent before freezing existed.
    expect('question_qids' in row).toBe(false);
  });

  it('pins exactly the given qids, in the given order, per student', async () => {
    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
      frozenQidsByStudent: { 'student-a': QIDS_A, 'student-b': QIDS_B },
    });

    const rows = inserted.guided_drill_assignments;
    expect(rows).toHaveLength(2);
    // Two students at different bands freeze different sets from one drill.
    expect(rows[0].question_qids).toEqual(QIDS_A);
    expect(rows[1].question_qids).toEqual(QIDS_B);
  });

  it('records why the row is pinned', async () => {
    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
      frozenQidsByStudent: { 'student-a': QIDS_A },
    });

    expect(mockCreateClassroomItem.mock.calls[0][0]).toMatchObject({
      metadata: { frozen_reason: 'artifact_attached' },
    });
  });

  it('leaves a student out of the freeze unpinned rather than guessing', async () => {
    await assignWork({
      teacherId: TEACHER,
      studentIds: ['student-a', 'student-b'],
      item: { kind: 'guided_drill', drillId: 'drill-1' },
      frozenQidsByStudent: { 'student-a': QIDS_A },
    });

    const rows = inserted.guided_drill_assignments;
    expect(rows[0].question_qids).toEqual(QIDS_A);
    expect('question_qids' in rows[1]).toBe(false);
  });

  it('throws before writing anything when no guided drill is being assigned', async () => {
    await expect(
      assignWork({
        teacherId: TEACHER,
        studentIds: ['student-a'],
        item: { kind: 'homework_set', setId: 'set-1' },
        frozenQidsByStudent: { 'student-a': QIDS_A },
      }),
    ).rejects.toThrow(/no guided drill/);
    expect(inserted.homework_assignments).toBeUndefined();
  });

  it('throws before writing anything when the freeze names an unknown student', async () => {
    await expect(
      assignWork({
        teacherId: TEACHER,
        studentIds: ['student-a'],
        item: { kind: 'guided_drill', drillId: 'drill-1' },
        frozenQidsByStudent: { 'student-ghost': QIDS_A },
      }),
    ).rejects.toThrow(/not in this assign/);
    expect(inserted.guided_drill_assignments).toBeUndefined();
  });

  it('throws on an empty qid list rather than silently not freezing', async () => {
    await expect(
      assignWork({
        teacherId: TEACHER,
        studentIds: ['student-a'],
        item: { kind: 'guided_drill', drillId: 'drill-1' },
        frozenQidsByStudent: { 'student-a': [] },
      }),
    ).rejects.toThrow(/is empty/);
    expect(inserted.guided_drill_assignments).toBeUndefined();
  });
});

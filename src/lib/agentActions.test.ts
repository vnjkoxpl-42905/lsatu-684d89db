import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActionProposal } from './agentActions';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const assignResourceToStudent = vi.fn();
const createClassroomItem = vi.fn();
const notifyStudentOfClassroomItem = vi.fn();

vi.mock('./teacherAssignResource', () => ({
  assignResourceToStudent: (...args: unknown[]) => assignResourceToStudent(...args),
}));
vi.mock('./classroomItems', () => ({
  createClassroomItem: (...args: unknown[]) => createClassroomItem(...args),
}));
vi.mock('./classroomNotify', () => ({
  notifyStudentOfClassroomItem: (...args: unknown[]) => notifyStudentOfClassroomItem(...args),
}));

// Minimal chainable Supabase stub. Records the last table touched and replays
// canned terminal results for the homework path.
const fromCalls: string[] = [];
vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    b.select = chain;
    b.eq = chain;
    b.insert = chain;
    b.maybeSingle = () =>
      Promise.resolve({
        data: {
          id: 'set-1',
          title: 'Conditional Logic HW',
          description: 'desc',
          question_qids: ['q1', 'q2'],
          class_id: 'class-1',
        },
        error: null,
      });
    b.single = () => Promise.resolve({ data: { id: 'asg-1' }, error: null });
    return b;
  };
  return {
    supabase: {
      from: (table: string) => {
        fromCalls.push(table);
        return builder(table);
      },
    },
  };
});

// Import AFTER mocks are registered.
import { executeActionProposal } from './agentActions';

const STUDENT = { id: 'stu-1', name: 'Maya' };

function proposal(over: Partial<ActionProposal>): ActionProposal {
  return {
    type: 'action',
    kind: 'guided_drill',
    student: STUDENT,
    summary: 's',
    ...over,
  };
}

beforeEach(() => {
  assignResourceToStudent.mockReset().mockResolvedValue({ ok: true, route: '/r', notify: {} });
  createClassroomItem.mockReset().mockResolvedValue({ id: 'ci-1' });
  notifyStudentOfClassroomItem.mockReset().mockResolvedValue({});
  fromCalls.length = 0;
});

describe('executeActionProposal', () => {
  it('routes guided_drill through assignResourceToStudent', async () => {
    await executeActionProposal(
      proposal({ kind: 'guided_drill', resource: { id: 'd1', title: 'Negation Station', kind: 'guided_drill' } }),
      'admin-1',
    );
    expect(assignResourceToStudent).toHaveBeenCalledTimes(1);
    const arg = assignResourceToStudent.mock.calls[0][0];
    expect(arg.resource.kind).toBe('guided_drill');
    expect(arg.resource.source_id).toBe('d1');
    expect(arg.studentId).toBe('stu-1');
  });

  it('routes bootcamp_module through assignResourceToStudent with a route', async () => {
    await executeActionProposal(
      proposal({
        kind: 'bootcamp_module',
        resource: { title: 'Intro to LR', kind: 'bootcamp_module', route: '/bootcamp/intro-lr' },
      }),
      'admin-1',
    );
    const arg = assignResourceToStudent.mock.calls[0][0];
    expect(arg.resource.kind).toBe('bootcamp_module');
    expect(arg.resource.url).toBe('/bootcamp/intro-lr');
  });

  it('creates a classroom note for a note proposal', async () => {
    await executeActionProposal(
      proposal({ kind: 'note', resource: { title: 'Redo flaw', kind: 'note' }, generated_html: '<p>do it</p>' }),
      'admin-1',
    );
    expect(assignResourceToStudent).not.toHaveBeenCalled();
    expect(createClassroomItem).toHaveBeenCalledTimes(1);
    const arg = createClassroomItem.mock.calls[0][0];
    expect(arg.type).toBe('note');
    expect(arg.title).toBe('Redo flaw');
    expect(notifyStudentOfClassroomItem).toHaveBeenCalledTimes(1);
  });

  it('assigns homework by reading the set then inserting an assignment', async () => {
    const res = await executeActionProposal(
      proposal({ kind: 'homework', resource: { id: 'set-1', title: 'Conditional Logic HW', kind: 'homework' } }),
      'admin-1',
    );
    expect(fromCalls).toContain('homework_sets');
    expect(fromCalls).toContain('homework_assignments');
    expect(createClassroomItem).toHaveBeenCalledTimes(1);
    expect(createClassroomItem.mock.calls[0][0].type).toBe('homework');
    expect(res.ok).toBe(true);
  });
});

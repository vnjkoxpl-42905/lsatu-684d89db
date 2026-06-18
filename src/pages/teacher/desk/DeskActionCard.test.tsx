import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeskActionCard, type DeskCardStatus } from './DeskActionCard';
import type { DeskTask } from './deskTasks';

function task(overrides: Partial<DeskTask>): DeskTask {
  return {
    id: 'reply-1',
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
    priority: 100,
    primaryActionLabel: 'Send reply',
    secondaryActionLabel: 'Open thread',
    openPath: '/teacher/conversations',
    sourceKind: 'conversation',
    sourceId: 'conversation-1',
    ...overrides,
  };
}

function renderCard(overrides: {
  task?: Partial<DeskTask>;
  status?: DeskCardStatus;
  body?: string;
  editing?: boolean;
} = {}) {
  const handlers = {
    onBodyChange: vi.fn(),
    onToggleEdit: vi.fn(),
    onStartBlank: vi.fn(),
    onDrillChange: vi.fn(),
    onDueChange: vi.fn(),
    onApprove: vi.fn(),
    onDiscard: vi.fn(),
  };

  render(
    <DeskActionCard
      task={task(overrides.task ?? {})}
      status={overrides.status ?? 'ready'}
      body={overrides.body ?? 'Draft **reply**'}
      editing={overrides.editing ?? false}
      drillId=""
      dueAt=""
      drillOptions={[
        { id: 'drill-1', title: 'Weaken causal claims' },
        { id: 'drill-2', title: 'Sufficient assumption short set' },
      ]}
      drillsLoading={false}
      {...handlers}
    />,
  );

  return handlers;
}

describe('DeskActionCard', () => {
  it('renders markdown and sends through the consequence-specific approval label', () => {
    const handlers = renderCard();

    expect(screen.getByText('reply')).toBeInTheDocument();
    const approve = screen.getByRole('button', { name: /send to student/i });
    fireEvent.click(approve);

    expect(handlers.onApprove).toHaveBeenCalledTimes(1);
  });

  it('keeps an empty reply from being sent and exposes edit/start blank paths', () => {
    const handlers = renderCard({ body: '' });

    expect(screen.getByRole('button', { name: /send to student/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.click(screen.getByRole('button', { name: /start blank/i }));

    expect(handlers.onToggleEdit).toHaveBeenCalledTimes(1);
    expect(handlers.onStartBlank).toHaveBeenCalledTimes(1);
  });

  it('shows assignment controls and blocks approval until a drill is picked', () => {
    renderCard({
      task: {
        id: 'assign-1',
        mode: 'assign',
        verb: 'Assign',
        sourceKind: 'assignment-gap',
        sourceLabel: 'Assignment suggested',
        studentName: 'Dakota Brown',
      },
      body: 'Start with a short diagnostic set.',
    });

    expect(screen.getByRole('button', { name: /assign drill/i })).toBeDisabled();
    expect(screen.getByLabelText(/guided drill to assign/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it('renders completed and discarded terminal states without action buttons', () => {
    const { rerender } = render(
      <DeskActionCard
        task={task({ sourceKind: 'draft', reason: 'session recap draft waiting' })}
        status="done"
        body="Done"
        editing={false}
        drillId=""
        dueAt=""
        drillOptions={[]}
        drillsLoading={false}
        onBodyChange={vi.fn()}
        onToggleEdit={vi.fn()}
        onStartBlank={vi.fn()}
        onDrillChange={vi.fn()}
        onDueChange={vi.fn()}
        onApprove={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText(/recap posted/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /post recap/i })).not.toBeInTheDocument();

    rerender(
      <DeskActionCard
        task={task({ sourceKind: 'conversation' })}
        status="discarded"
        body="Discarded"
        editing={false}
        drillId=""
        dueAt=""
        drillOptions={[]}
        drillsLoading={false}
        onBodyChange={vi.fn()}
        onToggleEdit={vi.fn()}
        onStartBlank={vi.fn()}
        onDrillChange={vi.fn()}
        onDueChange={vi.fn()}
        onApprove={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/discarded/i)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /send to student/i })).not.toBeInTheDocument();
  });
});

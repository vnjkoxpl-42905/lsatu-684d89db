import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyWorkTabCount } from './MyWorkTabCount';

const feed = vi.hoisted(() => ({ value: { loading: false, failed: false, rows: [] as unknown[] } }));
const notes = vi.hoisted(() => ({ value: { isLoading: false, isError: false, data: [] as unknown[] } }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: false, has_classroom_access: true }) }));
vi.mock('@/hooks/useAssignedTodoFeed', () => ({ useAssignedTodoFeed: () => feed.value }));
vi.mock('@/hooks/useClassroomItems', () => ({ useClassroomItems: () => notes.value }));

const work = (key: string, status: string) => ({ key, status, sourceTable: 'homework_assignments' });

describe('My Work tab counts', () => {
  it('counts work to do and completed work separately', () => {
    feed.value = { loading: false, failed: false, rows: [work('a', 'assigned'), work('b', 'in_progress'), work('c', 'completed')] };
    const { container, rerender } = render(<MyWorkTabCount path="/my-work/to-do" readingCenterAssigned={false} />);
    expect(container).toHaveTextContent('2 to do');
    rerender(<MyWorkTabCount path="/my-work/completed" readingCenterAssigned={false} />);
    expect(container).toHaveTextContent('1 completed');
  });
  it('shows no count while loading or after a failed read', () => {
    feed.value = { loading: false, failed: true, rows: [work('a', 'assigned')] };
    const { container } = render(<MyWorkTabCount path="/my-work/to-do" readingCenterAssigned={false} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('counts only unread notes on the Notes tab', () => {
    notes.value = { isLoading: false, isError: false, data: [] };
    const { container } = render(<MyWorkTabCount path="/my-work/notes" readingCenterAssigned={false} />);
    expect(container).toHaveTextContent('0 unread');
  });
});

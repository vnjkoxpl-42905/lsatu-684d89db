import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AssignedWorkPanel from './AssignedWorkPanel';

const state = vi.hoisted(() => ({ uncertain: true, retry: vi.fn() }));
vi.mock('@/components/classroom/shell/ClassroomLayout', () => ({ useOptionalClassroomLayout: () => null }));
vi.mock('@/hooks/useAssignedTodoFeed', () => ({
  routeWithReturnTo: (route: string) => route,
  useAssignedTodoFeed: () => ({ loading: false, failed: state.uncertain, retry: state.retry,
    evidenceWarnings: state.uncertain ? ['saved assignment sessions'] : [],
    rows: [{ key: 'issued', title: 'Reasoning drill', subtitle: '5 questions', status: 'assigned', route: '/guided/issued', progressUnverified: state.uncertain }],
  }),
}));
afterEach(cleanup);
it('names uncertain saved progress, keeps the next assignment available, and clears on recovery', () => {
  state.uncertain = true;
  state.retry.mockClear();
  const view = render(<MemoryRouter><AssignedWorkPanel /></MemoryRouter>);
  expect(screen.getByText('Reasoning drill')).toBeTruthy();
  expect(screen.getByText('Progress unverified')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain('saved assignment sessions');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(state.retry).toHaveBeenCalledOnce();
  state.uncertain = false;
  view.rerender(<MemoryRouter><AssignedWorkPanel /></MemoryRouter>);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText('Progress unverified')).toBeNull();
  expect(screen.getByText('Next')).toBeTruthy();
});

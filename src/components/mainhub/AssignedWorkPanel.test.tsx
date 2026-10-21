import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import AssignedWorkPanel from './AssignedWorkPanel';
import type { AssignedTodoRow } from '@/hooks/useAssignedTodoFeed';

const state = vi.hoisted(() => ({ uncertain: true, retry: vi.fn(), rows: null as AssignedTodoRow[] | null }));
vi.mock('@/components/classroom/shell/classroomLayoutContext', () => ({ useOptionalClassroomLayout: () => null }));
vi.mock('@/hooks/useAssignedTodoFeed', () => ({
  routeWithReturnTo: (route: string) => route,
  useAssignedTodoFeed: () => ({ loading: false, failed: state.uncertain, retry: state.retry,
    evidenceWarnings: state.uncertain ? ['saved assignment sessions'] : [],
    rows: state.rows ?? [{ key: 'issued', title: 'Reasoning drill', subtitle: '5 questions', status: 'assigned', route: '/guided/issued', progressUnverified: state.uncertain }],
  }),
}));
afterEach(() => { cleanup(); state.rows = null; });
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

it('shows only verified RC assignments and uses their status without inventing a Next priority', () => {
  state.uncertain = false;
  state.rows = [
    { key: 'lr', title: 'Conditional Indicators Refresher', status: 'assigned', route: '/lr', workSection: 'lr' },
    { key: 'unknown', title: 'RC in the title', status: 'assigned', route: '/unknown' },
    { key: 'mixed', title: 'Mixed practice', status: 'assigned', route: '/mixed', workSection: 'mixed' },
    { key: 'rc', title: 'Assigned passage practice', status: 'assigned', route: '/rc', workSection: 'rc' },
    { key: 'rc-progress', title: 'Continue passages', status: 'in_progress', route: '/rc-progress', workSection: 'rc' },
    { key: 'done', title: 'Finished passages', status: 'completed', route: '/done', workSection: 'rc' },
  ] as AssignedTodoRow[];
  const view = render(<MemoryRouter><AssignedWorkPanel scope="rc" /></MemoryRouter>);
  expect(screen.getByRole('region', { name: 'Assigned RC work' })).toBeTruthy();
  expect(screen.getByText('Assigned passage practice')).toBeTruthy();
  expect(screen.getByText('Ready')).toBeTruthy();
  expect(screen.getByText('In progress')).toBeTruthy();
  expect(screen.queryByText('Next')).toBeNull();
  expect(screen.queryByText('Conditional Indicators Refresher')).toBeNull();
  expect(screen.queryByText('RC in the title')).toBeNull();
  expect(screen.queryByText('Mixed practice')).toBeNull();
  expect(screen.queryByText('Finished passages')).toBeNull();
  view.rerender(<MemoryRouter><AssignedWorkPanel /></MemoryRouter>);
  expect(screen.getByText('Conditional Indicators Refresher')).toBeTruthy();
  expect(screen.getByText('RC in the title')).toBeTruthy();
  expect(screen.getByText('Mixed practice')).toBeTruthy();
  expect(screen.getByText('Next')).toBeTruthy();
});

it('explains RC-scoped emptiness without claiming the general assigned list is empty', () => {
  state.uncertain = false;
  state.rows = [{ key: 'lr', title: 'LR work', status: 'assigned', route: '/lr', workSection: 'lr' }] as AssignedTodoRow[];
  render(<MemoryRouter><AssignedWorkPanel scope="rc" /></MemoryRouter>);
  expect(screen.getByText('No RC work assigned right now. All your assigned work is available in My Work.')).toBeTruthy();
  expect(screen.queryByText('Nothing assigned right now.')).toBeNull();
});

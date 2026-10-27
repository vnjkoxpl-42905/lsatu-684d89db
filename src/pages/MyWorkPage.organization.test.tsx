import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
const state = vi.hoisted(() => ({ rows: [] as any[], failed: false }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: false, has_classroom_access: true }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: false }) }));
vi.mock('@/components/classroom/PrescribedWeek', () => ({ default: () => <div>Weekly plan</div> }));
vi.mock('@/hooks/useAssignedTodoFeed', async (original) => ({ ...await original<typeof import('@/hooks/useAssignedTodoFeed')>(), useAssignedTodoFeed: () => ({ rows: state.rows, loading: false, failed: state.failed, retry: vi.fn() }) }));
import MyWorkPage from './MyWorkPage';
function row(id: string, changes = {}) { return { key: id, refId: id, sourceTable: 'guided_drill_assignments', kind: 'guided', title: `Assignment ${id}`, subtitle: 'Practice the reasoning', route: `/guided/${id}`, status: 'assigned', workSection: 'lr', createdAt: '2026-10-20T12:00:00Z', dueAt: null, ...changes }; }
function open(completed = false, path = '/my-work/to-do') { return render(<MemoryRouter initialEntries={[path]}><MyWorkPage completed={completed} /></MemoryRouter>); }
describe('My Work organization', () => {
  it('separates reliable in-progress work, work to start and unverified progress without dropping identities', () => {
    state.failed = false;
    state.rows = [row('a'), row('b', { status: 'in_progress' }), row('c', { status: 'in_progress', progressUnverified: true })];
    open();
    expect(within(screen.getByRole('region', { name: 'In progress' })).getByText('Assignment b')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'To start' })).getByText('Assignment a')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Progress to confirm' })).getByText('Assignment c')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
  it('combines subject and search filters and preserves the query on guided drill return', async () => {
    state.rows = [row('a'), row('b', { title: 'Passage review', workSection: 'rc' })]; open();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Assignment subject' }), { key: 'ArrowDown' });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Reading Comprehension' }), { key: 'Enter' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Passage' } });
    const link = screen.getByRole('link', { name: /Passage review/ });
    const target = new URL(link.getAttribute('href')!, 'https://example.test');
    expect(target.searchParams.get('returnTo')).toBe('/my-work/to-do?subject=rc&q=Passage');
    expect(screen.queryByText('Assignment a')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
  it('combines work type with search and retains that filter when opening assigned work', async () => {
    state.failed = false;
    state.rows = [row('a'), row('b', { kind: 'activity', title: 'Recall passage' })];
    open();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Assignment type' }), { key: 'ArrowDown' });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Activity' }), { key: 'Enter' });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Recall' } });
    expect(screen.queryByText('Assignment a')).not.toBeInTheDocument();
    const target = new URL(screen.getByRole('link', { name: /Recall passage/ }).getAttribute('href')!, 'https://example.test');
    expect(target.searchParams.get('returnTo')).toBe('/my-work/to-do?kind=Activity&q=Recall');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
  it('keeps repeated completed assignments and labels the available date as assigned', () => {
    state.rows = [row('a', { title: 'Same task', status: 'completed' }), row('b', { title: 'Same task', status: 'completed', createdAt: '2026-10-21T12:00:00Z' })];
    open(true, '/my-work/completed');
    expect(screen.getAllByRole('link', { name: /Same task/ })).toHaveLength(2);
    expect(screen.getAllByText(/Assigned/)).toHaveLength(2);
    expect(screen.queryByText(/Recently completed/)).not.toBeInTheDocument();
    expect(screen.queryByText('Weekly plan')).not.toBeInTheDocument();
  });
});

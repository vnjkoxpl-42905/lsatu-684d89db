const groupAck = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useStudentWorkState', () => ({ useAssignmentGroupAcknowledgment: groupAck }));
import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
const state = vi.hoisted(() => ({ rows: [] as any[], failed: false, generalAccess: true, readingCenterAccess: false }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: false, has_classroom_access: state.generalAccess }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: state.readingCenterAccess }) }));
vi.mock('@/components/classroom/PrescribedWeek', () => ({ default: () => <div>Weekly plan</div> }));
vi.mock('@/hooks/useAssignedTodoFeed', async (original) => ({ ...await original<typeof import('@/hooks/useAssignedTodoFeed')>(), useAssignedTodoFeed: () => ({ rows: state.rows, loading: false, failed: state.failed, retry: vi.fn() }) }));
const notifyIntent = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useClassroomMotion', () => ({ notifyClassroomListIntent: (...args: any[]) => notifyIntent(...args) }));
import MyWorkPage from './MyWorkPage';
beforeEach(() => { state.failed = false; state.generalAccess = true; state.readingCenterAccess = false; notifyIntent.mockReset(); });
function row(id: string, changes = {}) { return { key: id, refId: id, sourceTable: 'guided_drill_assignments', kind: 'guided', title: `Assignment ${id}`, subtitle: 'Practice the reasoning', route: `/guided/${id}`, status: 'assigned', workSection: 'lr', createdAt: '2026-10-20T12:00:00Z', dueAt: null, ...changes }; }
function open(completed = false, path = '/my-work/to-do') { return render(<MemoryRouter initialEntries={[path]}><MyWorkPage completed={completed} /></MemoryRouter>); }
describe('My Work organization', () => {
  it.each([[0, 'keyboard'], [1, 'pointer']])('recovers focus after failed-empty Clear with %s-detail %s activation', (detail) => {
    state.rows = []; state.failed = true;
    open(false, '/my-work/to-do?kind=Activity');
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    clear.focus();
    fireEvent.click(clear, { detail });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    if (detail === 0) expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    else expect(screen.getByRole('alert')).toHaveFocus();
  });

  it('does not open the search keyboard after pointer Clear filters', () => {
    state.rows = [row('a')]; open(false, '/my-work/to-do?kind=Activity');
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    clear.focus();
    fireEvent.click(clear, { detail: 1 });
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
    expect(screen.getByRole('region', { name: 'Work to do' })).toHaveFocus();
  });
  it.each([
    ['kind=Activity', 'Assignment type', 'All work types'],
    ['subject=rc', 'Assignment subject', 'All subjects'],
  ])('keeps pointer portal reset away from Search: %s', async (query, label, allLabel) => {
    state.rows = [row('a')]; open(false, `/my-work/to-do?${query}`);
    const trigger = screen.getByRole('combobox', { name: new RegExp(`^${label} `) });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const all = await screen.findByRole('option', { name: allLabel });
    act(() => all.focus());
    fireEvent.pointerDown(all, { pointerType: 'touch', button: 0 });
    fireEvent.click(all, { detail: 1 });
    expect(screen.queryByRole('combobox', { name: new RegExp(`^${label} `) })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).not.toHaveFocus();
    expect(screen.getByRole('region', { name: 'Work to do' })).toHaveFocus();
  });

  it('returns keyboard focus to Search after Clear filters removes the no-match action', () => {
    state.rows = [row('a')]; open(false, '/my-work/to-do?kind=Activity');
    const clear = screen.getByRole('button', { name: 'Clear filters' });
    clear.focus();
    fireEvent.click(clear, { detail: 0 });
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(screen.getByRole('link', { name: /Assignment a/ })).toBeInTheDocument();
  });
  it('keeps a valid Reading Center filter across denied, granted and revoked access without exposing other work', async () => {
    state.generalAccess = false;
    state.rows = [row('private', { kind: 'activity' }), row('rc', { sourceTable: 'reading_center', refId: 'library', workSection: 'rc', title: 'Reading Center library' }), row('invalid', { sourceTable: 'reading_center', refId: 'private-library', workSection: 'mixed' })];
    const view = open(false, '/my-work/to-do?kind=Reading+Center');
    const assertDenied = () => {
      expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveTextContent('Reading Center');
      expect(screen.getByText('0 of 0 to do')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /^Assignment subject / })).not.toBeInTheDocument();
    };
    assertDenied();
    state.readingCenterAccess = true;
    view.rerender(<MemoryRouter><MyWorkPage completed={false} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Reading Center library/ })).toBeInTheDocument();
    expect(screen.getByText('1 of 1 to do')).toBeInTheDocument();
    expect(screen.queryByText('Assignment private')).not.toBeInTheDocument();
    expect(screen.queryByText('Assignment invalid')).not.toBeInTheDocument();
    const type = screen.getByRole('combobox', { name: /^Assignment type / });
    fireEvent.keyDown(type, { key: 'ArrowDown' });
    expect(await screen.findByRole('option', { name: 'Reading Center' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Activity' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    state.readingCenterAccess = false;
    view.rerender(<MemoryRouter><MyWorkPage completed={false} /></MemoryRouter>);
    assertDenied();
  });

  it.each([
    ['kind=Activity', 'Assignment type', 'All work types'],
    ['subject=rc', 'Assignment subject', 'All subjects'],
  ])('recovers keyboard focus when clearing an absent selected filter: %s', async (query, label, allLabel) => {
    state.rows = [row('a')]; open(false, `/my-work/to-do?${query}`);
    const trigger = screen.getByRole('combobox', { name: new RegExp(`^${label} `) });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const all = await screen.findByRole('option', { name: allLabel });
    act(() => all.focus());
    fireEvent.keyDown(all, { key: 'Enter' });
    expect(screen.queryByRole('combobox', { name: new RegExp(`^${label} `) })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });
  it('does not move focus when a feed refresh removes an unselected picker', () => {
    state.rows = [row('a'), row('b', { kind: 'activity' })];
    const view = open();
    const link = screen.getByRole('link', { name: /Assignment a/ });
    link.focus();
    state.rows = [row('a')];
    view.rerender(<MemoryRouter><MyWorkPage completed={false} /></MemoryRouter>);
    expect(link).toHaveFocus();
    expect(screen.queryByRole('combobox', { name: /^Assignment type / })).not.toBeInTheDocument();
  });

  it('keeps a valid absent work type selected during a partial feed refresh', () => {
    state.failed = true;
    state.rows = [row('a', { kind: 'activity' })];
    const view = open(false, '/my-work/to-do?kind=Guided+drill');
    expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveTextContent('Guided drill');
    expect(screen.getByText('No assignments match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    state.rows = [...state.rows, row('b')];
    view.rerender(<MemoryRouter initialEntries={['/my-work/to-do?kind=Guided+drill']}><MyWorkPage completed={false} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Assignment b/ })).toBeInTheDocument();
    expect(screen.queryByText('Assignment a')).not.toBeInTheDocument();
  });
  it('retains selected type after the last matching assignment is completed', () => {
    state.rows = [row('a')];
    const view = open(false, '/my-work/to-do?kind=Guided+drill');
    state.rows = [row('a', { status: 'completed' })];
    view.rerender(<MemoryRouter><MyWorkPage completed={false} /></MemoryRouter>);
    expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveTextContent('Guided drill');
    expect(screen.getByText('No assignments match these filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Nothing is assigned right now.')).toBeInTheDocument();
    expect(notifyIntent).toHaveBeenCalledWith(expect.any(HTMLElement), 'filter');
  });
  it('preserves a valid absent subject with other rows present', () => {
    state.rows = [row('a')]; open(false, '/my-work/to-do?subject=rc');
    expect(screen.getByRole('combobox', { name: /^Assignment subject / })).toHaveTextContent('Reading Comprehension');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
  it('keeps both valid selected options and Clear filters when no rows exist', () => {
    state.rows = []; open(false, '/my-work/to-do?subject=rc&kind=Activity');
    expect(screen.getByRole('combobox', { name: /^Assignment subject / })).toHaveTextContent('Reading Comprehension');
    expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveTextContent('Activity');
    expect(screen.getByText('0 of 0 to do')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });
  it('keeps active filters recoverable even when the empty feed fails', () => {
    state.rows = []; state.failed = true;
    open(false, '/my-work/to-do?kind=Guided+drill');
    expect(screen.getByRole('alert')).toHaveTextContent('could not load your assignments or confirm');
    expect(screen.queryByText('No assignments match these filters.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Your saved work is still shown/)).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveTextContent('Guided drill');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
  it('fails open for invalid domain values, including inherited object names', () => {
    state.rows = [row('a')]; open(false, '/my-work/to-do?subject=toString&kind=unrecognized');
    expect(screen.getByRole('link', { name: /Assignment a/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('1 to do')).toBeInTheDocument();
  });
  it('never derives counts or available options from unauthorized rows', () => {
    state.rows = [row('a'), row('rc', { sourceTable: 'reading_center', refId: 'library', workSection: 'rc', kind: 'activity' })];
    open();
    expect(screen.getByText('1 to do')).toBeInTheDocument();
    expect(screen.queryByText('Assignment rc')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('puts opened work with nothing saved in Continue without changing its status', () => {
    state.failed = false;
    state.rows = [row('a'), row('b', { openedAt: '2026-10-30T10:00:00Z', isUnread: false })];
    open();
    expect(within(screen.getByRole('region', { name: 'Continue' })).getByText('Assignment b')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Assignment b/ })).toHaveTextContent('Opened, not started');
    expect(within(screen.getByRole('region', { name: 'To start' })).getByText('Assignment a')).toBeInTheDocument();
  });

  it('separates reliable in-progress work, work to start and unverified progress without dropping identities', () => {
    state.failed = false;
    state.rows = [row('a'), row('b', { status: 'in_progress' }), row('c', { status: 'in_progress', progressUnverified: true })];
    open();
    expect(within(screen.getByRole('region', { name: 'Continue' })).getByText('Assignment b')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'To start' })).getByText('Assignment a')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Progress to confirm' })).getByText('Assignment c')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });
  it('combines subject and search filters and preserves the query on guided drill return', async () => {
    state.rows = [row('a'), row('b', { title: 'Passage review', workSection: 'rc' })]; open();
    expect(screen.getByRole('combobox', { name: /^Assignment subject / })).toHaveAccessibleName('Assignment subject All subjects');
    fireEvent.keyDown(screen.getByRole('combobox', { name: /^Assignment subject / }), { key: 'ArrowDown' });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Reading Comprehension' }), { key: 'Enter' });
    expect(screen.getByRole('combobox', { name: /^Assignment subject / })).toHaveAccessibleName('Assignment subject Reading Comprehension');
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
    expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveAccessibleName('Assignment type All work types');
    fireEvent.keyDown(screen.getByRole('combobox', { name: /^Assignment type / }), { key: 'ArrowDown' });
    notifyIntent.mockImplementationOnce(() => { expect(screen.getAllByRole('link', { hidden: true })).toHaveLength(2); });
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Activity' }), { key: 'Enter' });
    expect(notifyIntent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox', { name: /^Assignment type / })).toHaveAccessibleName('Assignment type Activity');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Recall' } });
    expect(screen.queryByText('Assignment a')).not.toBeInTheDocument();
    const target = new URL(screen.getByRole('link', { name: /Recall passage/ }).getAttribute('href')!, 'https://example.test');
    expect(target.searchParams.get('returnTo')).toBe('/my-work/to-do?kind=Activity&q=Recall');
    expect(notifyIntent).toHaveBeenCalledWith(expect.any(HTMLElement), 'filter');
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

 it('shows unread independently of saved progress and completed work', () => {
 state.rows = [row('new', {isUnread:true}), row('started',{status:'in_progress',isUnread:false,openedAt:'2026-10-28T12:00:00Z'})];
 const view=open();
 expect(screen.getAllByText('Unread')).toHaveLength(1);
 expect(screen.getByRole('link', {name:/Assignment started/})).toHaveTextContent('Continue');
 expect(screen.getByRole('link', {name:/Assignment started/})).toHaveTextContent('Started, not finished');
 view.unmount();state.rows=[row('finished',{status:'completed',isUnread:true})];open(true);
 expect(screen.queryByText('Unread')).not.toBeInTheDocument();
 expect(screen.getByText('Review')).toBeInTheDocument();
 });

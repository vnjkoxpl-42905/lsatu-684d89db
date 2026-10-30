import { describe, expect, it } from 'vitest';
import type { AssignedTodoRow } from '@/hooks/useAssignedTodoFeed';
import { groupAssignedWork, workDisplayState, workProgressLine } from './assignedWorkOrganization';

const row = (over: Partial<AssignedTodoRow>) => ({ key: 'k', status: 'assigned', openedAt: null, ...over }) as AssignedTodoRow;

describe('work display state', () => {
  it('shows unopened assigned work as to start', () => {
    expect(workDisplayState(row({}))).toBe('to_start');
    expect(workProgressLine(row({}))).toBe('Not started');
  });
  it('treats opening alone as continue without changing the stored status', () => {
    const opened = row({ openedAt: '2026-10-30T10:00:00Z' });
    expect(workDisplayState(opened)).toBe('continue');
    expect(opened.status).toBe('assigned');
    expect(workProgressLine(opened)).toBe('Opened, not started');
  });
  it('treats saved progress as continue', () => {
    expect(workProgressLine(row({ status: 'in_progress' }))).toBe('Started, not finished');
  });
  it('keeps unverifiable work in Assigned, outside Continue', () => {
    const unverified = row({ openedAt: '2026-10-30T10:00:00Z', progressUnverified: true });
    expect(workDisplayState(unverified)).toBe('unverified');
    expect(groupAssignedWork([unverified], false).map((g) => g.label)).toEqual(['Progress to confirm']);
  });
  it('never lets an opened receipt complete work', () => {
    expect(workDisplayState(row({ openedAt: 'x' }))).not.toBe('completed');
  });
  it('orders Continue above To start', () => {
    const groups = groupAssignedWork([row({ key: 'a' }), row({ key: 'b', openedAt: 'x' })], false);
    expect(groups.map((g) => g.label)).toEqual(['Continue', 'To start']);
  });
});

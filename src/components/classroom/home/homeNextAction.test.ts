import { describe, expect, it } from 'vitest';
import { manualCompletionAllowed, nextActionFor, workSummary } from './homeNextAction';
import type { HomeRow } from './homeModel';

const row = (overrides: Partial<HomeRow> = {}): HomeRow => ({
  key: 'guided_drill_assignments:a1', title: 'A guided drill', kind: 'guided', tone: 'drill',
  meta: 'Guided drill', route: '/guided/a1', actionLabel: 'Open', emphasis: false,
  isNew: true, dueToday: false, overdue: false, workStatus: 'assigned', ...overrides,
});

describe('Home next action', () => {
  it('says Start before there is saved work and Continue after there is saved work', () => {
    expect(nextActionFor(row())).toEqual({ label: 'Start', reason: 'This is your next assigned task.' });
    expect(nextActionFor(row({ workStatus: 'in_progress' }))).toEqual({ label: 'Continue', reason: 'You have saved work to pick up.' });
  });

  it('explains a deadline without changing the saved-work label', () => {
    expect(nextActionFor(row({ dueToday: true })).reason).toBe('This assignment is due today.');
    expect(nextActionFor(row({ overdue: true, workStatus: 'in_progress' }))).toEqual({ label: 'Continue', reason: 'This assignment is overdue.' });
  });

  it('counts the full visible work ledger, including repeated assignments', () => {
    expect(workSummary([
      row({ key: 'guided:a1', workStatus: 'assigned' }),
      row({ key: 'guided:a2', workStatus: 'in_progress' }),
      row({ key: 'guided:a3', workStatus: 'in_progress' }),
    ])).toEqual({ open: 3, inProgress: 2 });
  });

  it('never exposes manual completion for practice work', () => {
    for (const kind of ['activity', 'guided', 'homework', 'bootcamp'] as const) {
      expect(manualCompletionAllowed(kind)).toBe(false);
    }
    expect(manualCompletionAllowed('ta')).toBe(true);
    expect(manualCompletionAllowed('plan')).toBe(true);
    expect(manualCompletionAllowed('ta', true)).toBe(false);
  });
});

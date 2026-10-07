import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ owner: 'a', sectionFail: false, pending: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: fixture.owner } }) }));
vi.mock('@/lib/drillHistory', async original => ({ ...await original<typeof import('@/lib/drillHistory')>(), filterCompletedHistorySections: async (_owner: string, rows: unknown[]) => rows, fetchDrillHistory: async (owner: string) => fixture.pending ? new Promise(() => {}) : [{ user_id: owner, source: 'lr', question_key: owner, question_ref: `Saved ${owner}`, detail: null, correct: true, time_ms: 1000, selected_answer: 'A', mode: 'first', attempted_at: '2026-09-30' }] }));
vi.mock('@/lib/sectionHistory', () => ({ fetchSectionHistory: async () => { if (fixture.sectionFail) throw new Error('offline'); return []; } }));
vi.mock('@/components/analytics/FirstAnswerHistoryPanel', () => ({ default: () => null }));
vi.mock('@/components/analytics/ProgressWindowControl', () => ({ default: () => null }));
vi.mock('@/hooks/useProgressWindow', () => ({ useProgressWindow: () => ['all', vi.fn()] }));
vi.mock('@/components/history/SectionHistoryList', () => ({ default: () => <p>Empty section list</p> }));
import DrillHistory from './DrillHistory';
afterEach(cleanup);
beforeEach(() => { fixture.owner = 'a'; fixture.sectionFail = false; fixture.pending = false; });
describe('saved history account and availability', () => {
  it('removes prior-owner results immediately on account switch', async () => {
    const view = render(<DrillHistory />);
    await screen.findByText('Saved a');
    fixture.owner = 'b'; fixture.pending = true;
    await act(async () => { view.rerender(<DrillHistory />); });
    expect(screen.queryByText('Saved a')).toBeNull();
    expect(screen.queryByTitle('Correct')).toBeNull();
  });
  it('shows unavailable section history rather than an empty section record', async () => {
    fixture.sectionFail = true;
    render(<DrillHistory />);
    await screen.findByText('Saved a');
    fireEvent.click(screen.getByRole('button', { name: /Sections/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('could not be loaded'));
    expect(screen.queryByText('Empty section list')).toBeNull();
  });
});

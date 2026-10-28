import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProgressPage from './ProgressPage';
import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';

const state = vi.hoisted(() => ({ data: {} as Record<string, unknown>, calls: [] as unknown[][], actor: 's', authReady: true, journalCalls: [] as boolean[], permissions: {} as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.actor }, authReady: state.authReady }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => state.permissions }));
vi.mock('@/hooks/useJournalEntries', () => ({ useJournalEntries: (enabled: boolean) => {
  state.journalCalls.push(enabled);
  return { classId: state.actor, data: [], isLoading: false, isError: false };
} }));
vi.mock('@/hooks/useFirstAnswerProgress', () => ({
  useFirstAnswerProgress: (...args: unknown[]) => { state.calls.push(args); return state.data; },
}));

const coverage: ProgressCoverage = { includedSources: ['lr_attempts', 'lr_section_history', 'rc_attempts'], missingSources: [], excludedRows: {} };
const now = Date.parse('2026-10-28T15:00:00Z');
const answers: GradedQuestionAnswer[] = [1, 2, 3, 4].map((n) => ({ attemptId: `a-${n}`, questionKey: `LR:PT101-S2-Q${n}`, area: 'LR', source: 'lr_attempts', mode: 'type-drill', correct: n > 2, gradedAt: new Date(now - n * 86_400_000).toISOString(), topic: 'Weaken' }));
const loaded = (over: Record<string, unknown> = {}) => ({
  resolution: { state: 'ready' }, progress: null, ledger: { answers, coverage, ownerId: 's' }, accountId: 's',
  asOf: new Date(now).toISOString(), dataUpdatedAt: now, loading: false, fetching: false, error: null, refreshError: null, refresh: vi.fn(), ...over,
});
const renderPage = (view: 'overview' | 'types' | 'history' = 'overview', url = '/progress/overview') => render(<MemoryRouter initialEntries={[url]}><ProgressPage view={view} /></MemoryRouter>);

beforeEach(() => {
  state.calls = []; state.journalCalls = []; state.actor = 's'; state.authReady = true;
  state.permissions = { loading: false, resolved: true, resolvedFor: 's', is_admin: false,
    has_analytics_access: true, has_classroom_access: true, has_drill_access: true,
    has_practice_access: true, has_journal_access: true };
});
afterEach(cleanup);

describe('Progress container', () => {
  it('reads with Progress-only revalidation and shows the real record in production mode', () => {
    state.data = loaded();
    renderPage();
    expect(state.calls[0][2]).toEqual({ revalidateOnMount: true, enabled: true });
    expect(state.calls[0][0]).toBe(30);
    expect(screen.queryByText(/Design preview/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Design comparison')).not.toBeInTheDocument();
    expect(screen.getByText('Checked Oct 28, 11:00 AM EDT')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Question-type evidence' })).toBeInTheDocument();
  });

  it('passes the validated URL window, ignoring anything else', () => {
    state.data = loaded();
    renderPage('overview', '/progress/overview?window=14&junk=1');
    expect(state.calls[0][0]).toBe(14);
    cleanup();
    renderPage('overview', '/progress/overview?window=banana');
    expect(state.calls.at(-1)![0]).toBe(30);
  });

  it('is honest while loading, denied and failed', () => {
    state.data = loaded({ ledger: null, accountId: null, asOf: null, dataUpdatedAt: null, loading: true });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Loading your saved answers' })).toBeInTheDocument();
    cleanup();
    state.data = loaded({ ledger: null, accountId: null, asOf: null, dataUpdatedAt: null, resolution: { state: 'denied' } });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('This account cannot view this progress.');
    cleanup();
    state.data = loaded({ ledger: null, accountId: null, asOf: null, dataUpdatedAt: null, error: new Error('source down') });
    renderPage();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not load your saved answers.');
    expect(alert).not.toHaveTextContent('source down');
  });

  it('keeps stale answers visible with a visible refresh failure and the last checked time', () => {
    state.data = loaded({ error: new Error('offline'), refreshError: new Error('offline') });
    renderPage();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We could not refresh your saved answers.');
    expect(alert).toHaveTextContent('Showing answers checked Oct 28, 11:00 AM EDT');
    expect(alert).not.toHaveTextContent('offline');
    expect(within(screen.getByRole('region', { name: 'Question-type evidence' })).getByRole('heading', { name: 'Weaken' })).toBeInTheDocument();
  });

  it('says partial sources are partial and withholds the affected recommendation', () => {
    state.data = loaded({ ledger: { answers, ownerId: 's', coverage: { ...coverage, missingSources: [{ source: 'lr_section_history', reason: 'raw database error' }] } } });
    renderPage();
    expect(screen.getByText(/Some answer sources could not load/)).toBeInTheDocument();
    expect(screen.queryByText('Look here first')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('raw database error');
  });

  it('renders the history view from the route', () => {
    state.data = loaded();
    renderPage('history', '/progress/history?historyResult=missed');
    expect(screen.getByRole('region', { name: 'Practice history' })).toBeInTheDocument();
    expect(screen.getByLabelText('Active filters')).toHaveTextContent('Missed');
  });
  it('does not read journal records without a resolved current-actor grant', () => {
    state.data = loaded(); state.permissions = { ...state.permissions, loading: true, resolved: false };
    renderPage(); expect(state.journalCalls.every((enabled) => !enabled)).toBe(true);
    cleanup(); state.journalCalls = [];
    state.permissions = { ...state.permissions, loading: false, resolved: true, has_journal_access: false };
    renderPage(); expect(state.journalCalls.every((enabled) => !enabled)).toBe(true);
  });

  it('withholds journal reads during an account switch even with the previous ledger', () => {
    state.data = loaded(); state.actor = 'next';
    renderPage(); expect(state.journalCalls.every((enabled) => !enabled)).toBe(true);
    cleanup(); state.journalCalls = [];
    state.permissions = { ...state.permissions, resolvedFor: 'next' };
    renderPage(); expect(state.journalCalls.every((enabled) => !enabled)).toBe(true);
  });

  it('enables the journal only for the matching owner and granted actor', () => {
    state.data = loaded(); renderPage(); expect(state.journalCalls.at(-1)).toBe(true);
  });

});

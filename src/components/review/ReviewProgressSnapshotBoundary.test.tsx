import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ actor: 'a', reads: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: state.actor } }) }));
vi.mock('@/hooks/useStudentSubjectScope', () => ({ useStudentSubjectScope: () => ({state: 'ready', scope: {actorId: state.actor, studentId: state.actor}}) }));
vi.mock('@/lib/firstAnswerSources', () => ({ loadFirstAnswerLedger: (scope: {studentId: string}) => state.reads(scope.studentId) }));
import Boundary, { useReviewProgressSnapshot } from './ReviewProgressSnapshotBoundary';

function View() {
  const data = useReviewProgressSnapshot();
  return <><output>{data?.ledger?.ownerId ?? 'pending'}</output><button onClick={() => void data?.refresh()}>Refresh</button></>;
}

describe('shared owner-bound review snapshot', () => {
  it('reuses sibling views, refreshes explicit/fresh entries, and isolates actor switches', async () => {
    state.actor = 'a';
    state.reads.mockReset().mockImplementation(async (ownerId) => ({ownerId, answers: [], coverage: {includedSources: [], missingSources: [], excludedRows: {}}}));
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    const tree = () => <QueryClientProvider client={client}><MemoryRouter initialEntries={['/review/progress']}>
      <Link to="/review/progress">Progress</Link><Link to="/review/history">History</Link><Link to="/review/to-review">Queue</Link>
      <Routes><Route element={<Boundary />}><Route path="/review/progress" element={<View />} /><Route path="/review/history" element={<View />} /></Route><Route path="/review/to-review" element={<p>Queue content</p>} /></Routes>
    </MemoryRouter></QueryClientProvider>;
    const rendered = render(tree());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('a'));
    expect(state.reads).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', {name: 'History'}));
    expect(screen.getByRole('status')).toHaveTextContent('a');
    expect(state.reads).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name: 'Refresh'}));
    await waitFor(() => expect(state.reads).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('link', {name: 'Queue'}));
    fireEvent.click(screen.getByRole('link', {name: 'Progress'}));
    await waitFor(() => expect(state.reads).toHaveBeenCalledTimes(3));
    await act(async () => { state.actor = 'b'; rendered.rerender(tree()); });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('b'));
    expect(state.reads).toHaveBeenLastCalledWith('b');
  });
});

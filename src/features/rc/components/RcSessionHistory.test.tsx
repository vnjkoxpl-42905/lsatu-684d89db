import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/rcProgress', () => ({
  abandonSession: vi.fn(),
  getSessionAttempts: vi.fn(async () => []),
  listSessions: vi.fn(async () => []),
}));

import { listSessions, abandonSession } from '../api/rcProgress';
import { RcSessionHistory } from './RcSessionHistory';

const mount = () =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <RcSessionHistory />
    </MemoryRouter>,
  );

describe('RcSessionHistory', () => {
  beforeEach(() => {
    vi.mocked(listSessions).mockImplementation(async () => []);
  });

  it('says nothing has been drilled only when the query actually succeeded', async () => {
    mount();
    expect(await screen.findByText('No reading drills yet.')).toBeInTheDocument();
  });

  it('reports a failed load as a failure, never as an empty history', async () => {
    vi.mocked(listSessions).mockImplementation(async () => {
      throw new Error('RLS');
    });
    mount();
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
    // The empty state would tell a student their drills are gone.
    expect(screen.queryByText('No reading drills yet.')).not.toBeInTheDocument();
  });
  it('keeps failed discards visible and removes only after acknowledgement', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(listSessions).mockResolvedValue([{ id: 'open', userId: 'owner', passageIds: [7], status: 'in_progress', startedAt: '2026-10-17T12:00:00Z', completedAt: null, excludedFromAnalytics: false, config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } } }]);
    vi.mocked(abandonSession).mockRejectedValueOnce(new Error('Discard did not save')).mockResolvedValueOnce(undefined);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Discard did not save');
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull());
    expect(abandonSession).toHaveBeenCalledTimes(2);
  });

});

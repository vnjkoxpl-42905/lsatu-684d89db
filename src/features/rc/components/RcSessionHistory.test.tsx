import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/rcProgress', () => ({
  deleteSession: vi.fn(),
  getSessionAttempts: vi.fn(async () => []),
  listSessions: vi.fn(async () => []),
}));

import { listSessions } from '../api/rcProgress';
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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import DrillLaunchGate from './DrillLaunchGate';
import { DeadDrillLinkError } from '@/lib/drillLaunchResolve';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user_1' } }),
}));

const resolveDrillLaunch = vi.fn();
vi.mock('@/lib/drillLaunchResolve', async () => {
  const actual = await vi.importActual<typeof import('@/lib/drillLaunchResolve')>(
    '@/lib/drillLaunchResolve',
  );
  return {
    ...actual,
    resolveDrillLaunch: (...args: unknown[]) => resolveDrillLaunch(...args),
  };
});

/** Stands in for the runner, and reports what the address bar ended up saying. */
function Runner() {
  const location = useLocation();
  return <div data-testid="runner">{location.search}</div>;
}

function renderAt(entry: { pathname: string; search?: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/drill"
          element={
            <DrillLaunchGate>
              <Runner />
            </DrillLaunchGate>
          }
        />
        <Route path="/classroom" element={<div>classroom</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const searchOf = () => new URLSearchParams(screen.getByTestId('runner').textContent ?? '');

describe('the gate', () => {
  beforeEach(() => {
    resolveDrillLaunch.mockReset();
  });

  it('runs a drill that already says what it is, without touching the URL', async () => {
    renderAt({ pathname: '/drill', search: '?mode=type-drill&qids=PT1-S1-Q1' });

    const runner = await screen.findByTestId('runner');
    expect(runner.textContent).toBe('?mode=type-drill&qids=PT1-S1-Q1');
    expect(resolveDrillLaunch).not.toHaveBeenCalled();
  });

  it('writes an in-memory launch into the address bar so a refresh can rebuild it', async () => {
    renderAt({
      pathname: '/drill',
      state: { mode: 'adaptive', returnTo: '/classroom' },
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(searchOf().get('mode')).toBe('adaptive'));
    expect(searchOf().get('returnTo')).toBe('/classroom');
  });

  it('writes a practice-test leg into the address bar, which is what the close-out needs', async () => {
    renderAt({
      pathname: '/drill',
      state: {
        mode: 'full-section',
        config: {
          pt: 140,
          section: 3,
          timer: { mode: '35', isPaused: false, elapsedMs: 0, startedAt: 0 },
        },
        returnTo: '/sitting/run_abc',
        ptRun: { runId: 'run_abc', legIndex: 2 },
      },
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(searchOf().get('runId')).toBe('run_abc'));
    expect(searchOf().get('leg')).toBe('2');
    expect(searchOf().get('pt')).toBe('140');
  });

  it('keeps an accommodated clock when it writes a section out', async () => {
    renderAt({
      pathname: '/drill',
      state: {
        mode: 'full-section',
        config: {
          pt: 155,
          section: 1,
          timer: { mode: '52.5', isPaused: false, elapsedMs: 0, startedAt: 0 },
        },
      },
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(searchOf().get('timer')).toBe('52.5'));
  });

  it('resolves a short link and expands it to the questions it names', async () => {
    resolveDrillLaunch.mockResolvedValue(['PT1-S1-Q1', 'PT1-S1-Q2']);
    renderAt({ pathname: '/drill', search: '?drill=saved-set&set=set_1' });

    await screen.findByTestId('runner');
    await waitFor(() => expect(searchOf().get('qids')).toBe('PT1-S1-Q1,PT1-S1-Q2'));
    expect(searchOf().get('mode')).toBe('type-drill');
    expect(resolveDrillLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'saved-set', setId: 'set_1' }),
      'user_1',
    );
  });

  it('says so when the link names something that is gone, rather than drilling anything else', async () => {
    resolveDrillLaunch.mockRejectedValue(
      new DeadDrillLinkError('That saved set no longer exists.'),
    );
    renderAt({ pathname: '/drill', search: '?drill=saved-set&set=deleted' });

    expect(await screen.findByText('That saved set no longer exists.')).toBeTruthy();
    expect(screen.queryByTestId('runner')).toBeNull();
  });

  it('refuses a malformed link instead of running a drill it did not ask for', async () => {
    renderAt({ pathname: '/drill', search: '?drill=section&pt=155' });

    expect(await screen.findByText(/a section launch needs both pt and section/i)).toBeTruthy();
    expect(screen.queryByTestId('runner')).toBeNull();
  });
});

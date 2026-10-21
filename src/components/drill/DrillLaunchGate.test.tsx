import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import DrillLaunchGate from './DrillLaunchGate';
import { useDrillRunSpec } from './DrillRunSpecContext';
import { DeadDrillLinkError } from '@/lib/drillLaunchResolve';
import type { DrillRunSpec } from '@/lib/drillRunSpec';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user_1' } }),
}));

const resolveDrillLaunch = vi.fn();
const recordExposures = vi.fn();
const questionBankState = vi.hoisted(() => ({ isLoading: false }));

vi.mock('@/contexts/QuestionBankContext', () => ({
  useQuestionBank: () => questionBankState,
}));

vi.mock('@/lib/questionExposure', () => ({
  recordExposures: (...args: unknown[]) => recordExposures(...args),
}));

vi.mock('@/lib/drillLaunchResolve', async () => {
  const actual = await vi.importActual<typeof import('@/lib/drillLaunchResolve')>(
    '@/lib/drillLaunchResolve',
  );
  return {
    ...actual,
    resolveDrillLaunch: (...args: unknown[]) => resolveDrillLaunch(...args),
  };
});

/**
 * Stands in for the runner. Reports both halves of the gate's contract: what
 * the address bar ended up saying, and what the runner was actually handed.
 */
function Runner() {
  const location = useLocation();
  const spec = useDrillRunSpec();
  return (
    <>
      <div data-testid="runner">{location.search}</div>
      <div data-testid="spec">{JSON.stringify(spec)}</div>
    </>
  );
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
const specOf = (): DrillRunSpec => JSON.parse(screen.getByTestId('spec').textContent || '{}');
const queueOf = () => (specOf().config as { selectedQids?: string[] } | undefined)?.selectedQids;

describe('the gate', () => {
  beforeEach(() => {
    resolveDrillLaunch.mockReset();
    recordExposures.mockReset();
    recordExposures.mockResolvedValue(undefined);
    questionBankState.isLoading = false;
  });

  it('runs an older link without touching the URL', async () => {
    renderAt({ pathname: '/drill', search: '?mode=type-drill&qids=PT1-S1-Q1' });

    const runner = await screen.findByTestId('runner');
    expect(runner.textContent).toBe('?mode=type-drill&qids=PT1-S1-Q1');
    expect(queueOf()).toEqual(['PT1-S1-Q1']);
    expect(resolveDrillLaunch).not.toHaveBeenCalled();
  });

  it('writes an in-memory launch into the address bar so a refresh can rebuild it', async () => {
    renderAt({
      pathname: '/drill',
      state: { mode: 'adaptive', returnTo: '/classroom' },
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(searchOf().get('drill')).toBe('smart-drill'));
    expect(searchOf().get('returnTo')).toBe('/classroom');
    expect(specOf().mode).toBe('adaptive');
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

  it('resolves a short link into a run, and leaves the link short', async () => {
    resolveDrillLaunch.mockResolvedValue(['PT1-S1-Q1', 'PT1-S1-Q2']);
    renderAt({ pathname: '/drill', search: '?drill=saved-set&set=set_1' });

    await screen.findByTestId('runner');
    await waitFor(() => expect(queueOf()).toEqual(['PT1-S1-Q1', 'PT1-S1-Q2']));
    expect(specOf().mode).toBe('type-drill');
    // The point of the short link: the address bar still names the set, so a
    // refresh re-reads the row instead of replaying a frozen question list.
    expect(searchOf().get('set')).toBe('set_1');
    expect(searchOf().get('qids')).toBeNull();
    expect(resolveDrillLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'saved-set', setId: 'set_1' }),
      'user_1',
    );
  });

  it('keeps a bootcamp day as the Run Record name after resolving its questions', async () => {
    resolveDrillLaunch.mockResolvedValue(['PT1-S1-Q1', 'PT1-S1-Q2']);
    renderAt({
      pathname: '/drill',
      search: '?drill=bootcamp-day&day=3&part=homework',
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(queueOf()).toEqual(['PT1-S1-Q1', 'PT1-S1-Q2']));
    expect(specOf().resumeIdentity).toEqual({
      kind: 'bootcamp-day',
      day: 3,
      part: 'homework',
    });
    expect(recordExposures).toHaveBeenCalledWith(
      'user_1',
      ['PT1-S1-Q1', 'PT1-S1-Q2'],
    );
  });

  it('keeps a guided drill id as the Run Record name after resolving its questions', async () => {
    resolveDrillLaunch.mockResolvedValue(['PT1-S1-Q1']);
    renderAt({
      pathname: '/drill',
      search: '?drill=guided-drill&guidedDrill=gd_7',
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(queueOf()).toEqual(['PT1-S1-Q1']));
    expect(specOf().isGuidedDrill).toBe(true);
    expect(specOf().guidedDrillId).toBe('gd_7');
  });

  it('resolves a link exactly once, even though it also rewrites the URL', async () => {
    resolveDrillLaunch.mockResolvedValue(['PT1-S1-Q1']);
    renderAt({
      pathname: '/drill',
      state: {
        mode: 'type-drill',
        config: { qtypes: [], difficulties: [], pts: [], count: 1, selectedQids: ['PT1-S1-Q1'] },
      },
    });

    await screen.findByTestId('runner');
    await waitFor(() => expect(searchOf().get('drill')).toBe('questions'));
    // A question list carries its own questions, so nothing is read at all;
    // what matters is that the rewrite does not send the gate round again.
    expect(resolveDrillLaunch).not.toHaveBeenCalled();
    expect(queueOf()).toEqual(['PT1-S1-Q1']);
  });

  it('does not resolve a generated link before the question bank is ready', async () => {
    questionBankState.isLoading = true;
    renderAt({
      pathname: '/drill',
      search: '?drill=bootcamp-day&day=3&part=homework',
    });

    expect(await screen.findByText('Opening your drill…')).toBeTruthy();
    await waitFor(() => expect(resolveDrillLaunch).not.toHaveBeenCalled());
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

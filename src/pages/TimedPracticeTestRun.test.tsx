vi.mock('@/hooks/useStudentWorkState', () => ({ useLoadedStudentWorkAcknowledgment: vi.fn(), useLoadedPracticeTestAcknowledgment: vi.fn() }));
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const mock = vi.hoisted(() => ({ load: vi.fn(), prepare: vi.fn(), retry: vi.fn(), heartbeat: vi.fn(), archive: vi.fn(), pending: null as unknown, rejection: null as unknown, path: vi.fn(), clock: vi.fn() }));
vi.mock('@/lib/practiceTestStore', () => ({ getPracticeTestDeviceId: () => 'device' }));
vi.mock('@/lib/timedWorkClient', () => ({ TimedWorkClient: class { readPending() { return mock.pending; } readRejection() { return mock.rejection; } } }));
vi.mock('@/lib/timedPracticeTestStore', () => ({ TimedPracticeTestStore: class { load = mock.load; prepare = mock.prepare; retry = mock.retry; heartbeat = mock.heartbeat; archiveRejectedCommand = mock.archive; }, timedPracticeTestClock: mock.clock }));
vi.mock('@/lib/timedPracticeTestEntry', () => ({ officialTimedChildPath: mock.path }));
vi.mock('./PracticeTestRun', () => ({ ScoreReport: () => <p>Saved score report</p> }));
import TimedPracticeTestRun from './TimedPracticeTestRun';
const snapshot = (phase = 'ready', overrides = {}) => ({ parent: { timed_phase: phase, timed_lease_ms: 30000 }, run: { pt: 101, pace: 'standard', status: 'in-progress', currentLeg: 0, breakTaken: false, breakAfterLeg: 2, legs: [{ kind: 'lr', section: 1, questionCount: 25 }] }, pending: null, ...overrides });
function mount() { render(<MemoryRouter><Routes><Route path="/" element={<TimedPracticeTestRun ownerId="owner" runId="run" />} /><Route path="/child" element={<p>Child opened</p>} /></Routes></MemoryRouter>); }
beforeEach(() => { vi.clearAllMocks(); mock.pending = null; mock.rejection = null; mock.clock.mockReturnValue({ writer: 'active', remainingMs: 600000 }); mock.path.mockReturnValue('/child'); mock.load.mockResolvedValue(snapshot()); mock.prepare.mockImplementation(async (operation) => { mock.pending = { operation }; }); mock.retry.mockImplementation(async () => { mock.pending = null; return snapshot('leg-running'); }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('acknowledged parent controls', () => {
  it('opens a section only after start-leg acknowledgement', async () => { let resolve!: (value: unknown) => void; mock.retry.mockImplementation(() => new Promise(r => { resolve = r; })); mount(); fireEvent.click(await screen.findByText('Begin section 1')); await waitFor(() => expect(mock.prepare).toHaveBeenCalledWith('start-leg', {}, expect.anything())); expect(screen.queryByText('Child opened')).toBeNull(); await act(async () => { mock.pending = null; resolve(snapshot('leg-running')); }); expect(await screen.findByText('Child opened')).toBeTruthy(); });
  it('does not navigate when a start reply arrives after leaving the parent', async () => { let resolve!: (value: unknown) => void; mock.retry.mockImplementation(() => new Promise(r => { resolve = r; })); mount(); fireEvent.click(await screen.findByText('Begin section 1')); await waitFor(() => expect(mock.retry).toHaveBeenCalled()); cleanup(); await act(async () => { resolve(snapshot('leg-running')); }); expect(mock.path).not.toHaveBeenCalled(); });
  it('keeps a failed start command visible and retries without preparing a replacement', async () => { mock.retry.mockRejectedValueOnce(new Error('Reply lost')); mount(); fireEvent.click(await screen.findByText('Begin section 1')); expect(await screen.findByText('Reply lost')).toBeTruthy(); expect(screen.queryByText('Child opened')).toBeNull(); fireEvent.click(screen.getByText('Retry saved change')); await waitFor(() => expect(mock.retry).toHaveBeenCalledTimes(2)); expect(mock.prepare).toHaveBeenCalledTimes(1); });
  it('confirms retained creation without a spurious missing-parent read', async () => { mock.pending = { operation: 'create' }; mock.load.mockRejectedValue(new Error('Not created yet')); mount(); expect(await screen.findByText('Confirm and start sitting')).toBeTruthy(); expect(mock.load).not.toHaveBeenCalled(); expect(screen.queryByRole('alert')).toBeNull(); expect(screen.getByText(/ready to save/)).toBeTruthy(); fireEvent.click(screen.getByText('Confirm and start sitting')); await waitFor(() => expect(mock.retry).toHaveBeenCalled()); expect(mock.prepare).not.toHaveBeenCalled(); });
  it('retries an ambiguous create reply with the same retained command', async () => {
    const command = { operation: 'create', commandId: 'exact-command', workId: 'exact-run', payload: { pt: 101 } };
    mock.pending = command;
    mock.retry.mockRejectedValueOnce(new Error('Create reply lost'));
    mount();
    fireEvent.click(await screen.findByText('Confirm and start sitting'));
    expect(await screen.findByText('Create reply lost')).toBeTruthy();
    expect(mock.pending).toBe(command);
    fireEvent.click(screen.getByText('Confirm and start sitting'));
    await waitFor(() => expect(mock.retry).toHaveBeenCalledTimes(2));
    expect(mock.prepare).not.toHaveBeenCalled();
    expect(mock.load).not.toHaveBeenCalled();
  });
  it('still reports an unavailable existing sitting without a retained create', async () => {
    mock.load.mockRejectedValue(new Error('Protected owned work unavailable'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Protected owned work unavailable');
    expect(mock.load).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Confirm and start sitting')).toBeNull();
  });
  it('waits for an acknowledged pause before leaving a running break', async () => { mock.load.mockResolvedValue(snapshot('break-running')); mock.retry.mockRejectedValueOnce(new Error('Pause not saved')); mount(); fireEvent.click(await screen.findByText('Back to Practice Exams')); await waitFor(() => expect(mock.prepare).toHaveBeenCalledWith('pause', {}, expect.anything())); expect(await screen.findByText('Pause not saved')).toBeTruthy(); expect(screen.getByText('Retry saved change')).toBeTruthy(); });
  it('shows confirmed terminal result without a parent-side score write', async () => { mock.load.mockResolvedValue(snapshot('complete', { run: { ...snapshot().run, status: 'complete' } })); mount(); expect(await screen.findByText('Saved score report')).toBeTruthy(); expect(mock.prepare).not.toHaveBeenCalled(); });
  it('exposes deliberate archival only for a definite rejected command', async () => { mock.pending = { operation: 'checkpoint' }; mock.rejection = { code: 'PT410' }; mock.archive.mockResolvedValue(snapshot('leg-paused')); mount(); fireEvent.click(await screen.findByText('Preserve rejected change and reload')); await waitFor(() => expect(mock.archive).toHaveBeenCalled()); expect(mock.prepare).not.toHaveBeenCalled(); });
  it('bounds break heartbeat cadence and gates continuation after a save failure', async () => { vi.useFakeTimers(); mock.load.mockResolvedValue(snapshot('break-running')); mock.heartbeat.mockRejectedValue(new Error('Connection lost')); mount(); await act(async () => {}); await act(async () => { vi.advanceTimersByTime(5000); }); expect(mock.heartbeat).toHaveBeenCalledTimes(1); expect(screen.getByRole('alert')).toHaveTextContent('Connection lost'); expect(screen.queryByText('Finish break and continue')).toBeNull(); await act(async () => { vi.advanceTimersByTime(10000); }); expect(mock.heartbeat).toHaveBeenCalledTimes(1); });
});

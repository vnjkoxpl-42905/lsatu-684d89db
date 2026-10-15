// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ load: vi.fn(), pending: vi.fn(), review: vi.fn() }));
vi.mock('@/lib/practiceTestStore', () => ({ loadAccountPracticeTestRun: mocks.load }));
vi.mock('@/lib/timedWorkClient', () => ({ TimedWorkClient: class { readPending() { return mocks.pending(); } } }));
vi.mock('./TimedPracticeTestRun', () => ({ default: () => <p>Protected parent</p> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/contexts/QuestionBankContext', () => ({ useQuestionBank: () => ({ isLoading: false }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: false }) }));
vi.mock('@/lib/questionLoader', () => ({ questionBank: { getQuestion: () => null } }));
vi.mock('@/lib/practiceTestReview', () => ({ loadPracticeTestReview: mocks.review }));
import PracticeTestRunPage from './PracticeTestRun';
const run = { id: 'run', userId: 'owner', pt: 101, pace: 'standard', sectionSeconds: 2100, legs: [{ kind: 'lr', section: 1, questionCount: 1, correct: 1, completedAt: '2026-09-30T00:00:00Z' }], currentLeg: 1, status: 'complete', breakAfterLeg: 2, breakTaken: true, createdAt: '2026-09-30T00:00:00Z' };
function mount() { render(<MemoryRouter initialEntries={['/testing/test/run']}><Routes><Route path="/testing/test/:runId" element={<PracticeTestRunPage />} /></Routes></MemoryRouter>); }
beforeEach(() => { vi.clearAllMocks(); mocks.pending.mockReturnValue(null); mocks.review.mockResolvedValue([]); });
afterEach(cleanup);
describe('official practice test dispatch', () => {
  it('routes protected rows before mounting a legacy writer', async () => { mocks.load.mockResolvedValue({ ...run, status: 'in-progress', timedContractVersion: 1 }); mount(); expect(await screen.findByText('Protected parent')).toBeTruthy(); expect(mocks.review).not.toHaveBeenCalled(); });
  it('retains the recovery door for creation without an account row', async () => { mocks.pending.mockReturnValue({ operation: 'create' }); mount(); expect(await screen.findByText('Protected parent')).toBeTruthy(); expect(mocks.load).not.toHaveBeenCalled(); });
  it('routes an existing retained checkpoint to protected recovery before a failed account lookup', async () => { mocks.pending.mockReturnValue({ operation: 'checkpoint' }); mount(); expect(await screen.findByText('Protected parent')).toBeTruthy(); expect(mocks.load).not.toHaveBeenCalled(); });
  it('preserves legacy completed reports', async () => { mocks.load.mockResolvedValue(run); mount(); expect(await screen.findByText('Score report')).toBeTruthy(); await waitFor(() => expect(mocks.review).toHaveBeenCalled()); });
  it('excludes earlier in-progress sittings and unsupported contracts from writing', async () => { mocks.load.mockResolvedValue({ ...run, status: 'in-progress' }); mount(); expect(await screen.findByText(/This earlier sitting remains saved/)).toBeTruthy(); expect(screen.queryByText(/Begin section/)).toBeNull(); expect(mocks.review).not.toHaveBeenCalled(); });
  it('fails closed on account read failure', async () => { mocks.load.mockRejectedValue(new Error('Account unavailable')); mount(); expect(await screen.findByRole('alert')).toHaveTextContent('Account unavailable'); expect(screen.queryByText('Protected parent')).toBeNull(); });
});

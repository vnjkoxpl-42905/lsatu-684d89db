import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Analytics from './Analytics';

const state = vi.hoisted(() => ({
  user: { id: 'student-1' },
  classId: 'class-1',
  classIdLoading: false,
  rpc: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('@/hooks/useClassId', () => ({
  useClassId: () => ({ classId: state.classId, loading: state.classIdLoading }),
}));
vi.mock('@/hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => ({ ref: { current: null }, isVisible: true }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc } }));
vi.mock('@/lib/questionLoader', () => ({ questionBank: { getManifest: () => ({ byPT: {} }) } }));
vi.mock('@/components/analytics/FirstAnswerProgressPanel', () => ({
  default: () => <section aria-label="First-answer progress">First-answer accuracy is available</section>,
}));
vi.mock('@/components/analytics/BreakdownPanel', () => ({ default: () => <div>Tag breakdown</div> }));
vi.mock('@/components/analytics/FlaggedQuestionsList', () => ({ default: () => <div>Flags</div> }));
vi.mock('@/components/analytics/ImportedMetricsPanel', () => ({ default: () => <div>Imported metrics</div> }));

const renderPage = () => render(<MemoryRouter><Analytics /></MemoryRouter>);

describe('Progress page independent panels', () => {
  beforeEach(() => {
    state.classId = 'class-1';
    state.classIdLoading = false;
    state.rpc.mockReset();
  });

  it('shows first-answer progress while the legacy rollup is pending', () => {
    state.rpc.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('region', { name: 'First-answer progress' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading breakdown and opportunity charts');
    expect(screen.getByText('Tag breakdown')).toBeInTheDocument();
  });

  it('keeps first-answer progress visible when the legacy rollup fails', async () => {
    state.rpc.mockResolvedValue({ data: null, error: new Error('offline') });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Could not load analytics/)).toBeInTheDocument());
    expect(screen.getByRole('region', { name: 'First-answer progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a useful lower-section state when class resolution ends without an ID', () => {
    state.classId = '';
    renderPage();
    expect(screen.getByRole('region', { name: 'First-answer progress' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh this page to try again');
    expect(state.rpc).not.toHaveBeenCalled();
  });
});

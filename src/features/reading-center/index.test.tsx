import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { Link, MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReadingCenter from './index';

const access = vi.hoisted(() => ({ hub: false, lr: true, shellMounts: 0, shellUnmounts: 0 }));
vi.mock('@/components/ReadingCenterGate', () => ({ default: ({ children }) => access.hub ? children : <div>Hub locked</div> }));
vi.mock('@/components/AssignmentGate', () => ({ ReadingCenterRrcGate: ({ children }) => access.lr ? children : <div>LR locked</div> }));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./components/AppShell', () => ({
  AppShell: () => {
    useEffect(() => { access.shellMounts += 1; return () => { access.shellUnmounts += 1; }; }, []);
    return <><nav>Activity rail<Link to="/reading-center/rc-recall">to RC</Link><Link to="/reading-center/rrc">to LR</Link><Link to="/reading-center">to Dashboard</Link></nav><Outlet /></>;
  },
  useAppTheme: vi.fn(),
}));
vi.mock('./pages/ReadingCenterHome', () => ({ default: () => <h1>Dashboard stage</h1> }));
vi.mock('./pages/RrcPage', () => ({ default: () => <h1>LR stage</h1> }));
vi.mock('./rc-recall/RcRecallPage', () => ({ default: () => <h1>RC Recall stage</h1> }));
vi.mock('./rc-recall/RcTrainingInstructions', () => ({ default: () => <h1>RC Training instructions</h1> }));
vi.mock('./pages/LibraryPage', () => ({ default: () => <h1>Speed library</h1> }));
vi.mock('./pages/ReaderPage', () => ({ default: () => <h1>Saved reader</h1> }));
vi.mock('./pages/ProfilePage', () => ({ default: () => null }));
vi.mock('./pages/TagsPage', () => ({ default: () => null }));
vi.mock('./pages/CoursesPage', () => ({ default: () => null }));
vi.mock('./pages/AdminPassagesPage', () => ({ default: () => null }));

function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/reading-center/*" element={<ReadingCenter />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { access.hub = false; access.lr = true; access.shellMounts = 0; access.shellUnmounts = 0; });
describe('Reading Center route boundaries', () => {
  it('opens Dashboard by default inside the activity rail for hub members', () => {
    access.hub = true;
    open('/reading-center');
    expect(screen.getByText('Dashboard stage')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
  it('opens a legacy LR-only grant inside the rail without requiring a hub grant', () => {
    open('/reading-center/rrc');
    expect(screen.getByText('LR stage')).toBeInTheDocument();
    expect(screen.queryByText('Hub locked')).not.toBeInTheDocument();
  });
  it.each(['/reading-center', '/reading-center/speed-reading', '/reading-center/read/my-passage', '/reading-center/rc-recall/instructions'])('retains the hub gate on %s', (path) => {
    open(path);
    expect(screen.getByText('Hub locked')).toBeInTheDocument();
  });
  it('retains the hub gate on Tags, inside the shared rail', () => {
    open('/reading-center/tags');
    expect(screen.getByText('Hub locked')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
  it('opens RC Recall for hub members and keeps it behind the hub gate', () => {
    access.hub = true;
    open('/reading-center/rc-recall');
    expect(screen.getByText('RC Recall stage')).toBeInTheDocument();
  });
  it('opens the separate instructions page within the shared activity rail', () => {
    access.hub = true;
    open('/reading-center/rc-recall/instructions');
    expect(screen.getByRole('heading', { name: 'RC Training instructions' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.queryByText('RC Recall stage')).not.toBeInTheDocument();
  });
  it('does not open RC Recall from an LR-only grant', () => {
    open('/reading-center/rc-recall');
    expect(screen.getByText('Hub locked')).toBeInTheDocument();
    expect(screen.queryByText('RC Recall stage')).not.toBeInTheDocument();
  });
  it('retains the LR library gate independently of hub routing', () => {
    access.lr = false;
    open('/reading-center/rrc');
    expect(screen.getByText('LR locked')).toBeInTheDocument();
  });
});

describe('one shell for LR and RC, with separate access checks', () => {
  it('keeps the same shell mounted while moving LR to RC and back', () => {
    access.hub = true;
    open('/reading-center/rrc');
    expect(screen.getByText('LR stage')).toBeInTheDocument();
    fireEvent.click(screen.getByText('to RC'));
    expect(screen.getByText('RC Recall stage')).toBeInTheDocument();
    fireEvent.click(screen.getByText('to LR'));
    expect(screen.getByText('LR stage')).toBeInTheDocument();
    fireEvent.click(screen.getByText('to Dashboard'));
    expect(screen.getByText('Dashboard stage')).toBeInTheDocument();
    expect(access.shellMounts).toBe(1);
    expect(access.shellUnmounts).toBe(0);
  });

  it('LR-only: sharing the shell does not unlock RC; the RC page stays gated while LR stays open', () => {
    open('/reading-center/rrc');
    fireEvent.click(screen.getByText('to RC'));
    expect(screen.getByText('Hub locked')).toBeInTheDocument();
    expect(screen.queryByText('RC Recall stage')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('to LR'));
    expect(screen.getByText('LR stage')).toBeInTheDocument();
    expect(access.shellMounts).toBe(1);
  });

  it('hub-only: RC opens while LR stays behind its own gate', () => {
    access.hub = true; access.lr = false;
    open('/reading-center/rc-recall');
    expect(screen.getByText('RC Recall stage')).toBeInTheDocument();
    fireEvent.click(screen.getByText('to LR'));
    expect(screen.getByText('LR locked')).toBeInTheDocument();
    expect(screen.queryByText('LR stage')).not.toBeInTheDocument();
  });
});

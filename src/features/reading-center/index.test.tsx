import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReadingCenter from './index';

const access = vi.hoisted(() => ({ hub: false, lr: true }));
vi.mock('@/components/ReadingCenterGate', () => ({ default: ({ children }) => access.hub ? children : <div>Hub locked</div> }));
vi.mock('@/components/AssignmentGate', () => ({ ReadingCenterRrcGate: ({ children }) => access.lr ? children : <div>LR locked</div> }));
vi.mock('@/components/ProtectedRoute', () => ({ default: ({ children }) => children }));
vi.mock('./components/AppShell', () => ({ AppShell: () => <><nav>Activity rail</nav><Outlet /></>, useAppTheme: vi.fn() }));
vi.mock('./pages/ReadingCenterHome', () => ({ default: () => <h1>Dashboard stage</h1> }));
vi.mock('./pages/RrcPage', () => ({ default: () => <h1>LR stage</h1> }));
vi.mock('./pages/LibraryPage', () => ({ default: () => <h1>Speed library</h1> }));
vi.mock('./pages/ReaderPage', () => ({ default: () => <h1>Saved reader</h1> }));
vi.mock('./pages/ProfilePage', () => ({ default: () => null }));
vi.mock('./pages/TagsPage', () => ({ default: () => null }));
vi.mock('./pages/CoursesPage', () => ({ default: () => null }));
vi.mock('./pages/AdminPassagesPage', () => ({ default: () => null }));

function open(path: string) {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/reading-center/*" element={<ReadingCenter />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { access.hub = false; access.lr = true; });
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
  it.each(['/reading-center', '/reading-center/speed-reading', '/reading-center/read/my-passage', '/reading-center/tags'])('retains the hub gate on %s', (path) => {
    open(path);
    expect(screen.getByText('Hub locked')).toBeInTheDocument();
  });
  it('retains the LR library gate independently of hub routing', () => {
    access.lr = false;
    open('/reading-center/rrc');
    expect(screen.getByText('LR locked')).toBeInTheDocument();
  });
});

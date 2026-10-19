import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RrcPage from './RrcPage';
const exitPath = vi.hoisted(() => vi.fn().mockResolvedValue('/reading-center'));
const access = vi.hoisted(() => ({ allowed: true, isPending: false }));
const permissions = vi.hoisted(() => ({ is_admin: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student' } }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => access }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => permissions }));
vi.mock('../lib/rrcNavigation', () => ({ rrcExitPath: exitPath }));
vi.mock('@/features/activity-centre/components/SectionLibraryPanel', () => ({
  SectionLibraryPanel: ({ onExit, compact, showProgress }: { onExit: () => void; compact: boolean; showProgress: boolean }) => <>
    <button onClick={onExit}>Leave RRC library</button>
    <div data-testid="library" data-compact={compact} data-progress={showProgress} />
  </>,
}));
describe('RRC home', () => {
  beforeEach(() => {
    access.allowed = true;
    access.isPending = false;
    permissions.is_admin = false;
  });
  it('mounts the existing library outside reader styles and exits to the hub', async () => {
    exitPath.mockResolvedValue('/reading-center');
    render(<MemoryRouter initialEntries={['/reading-center/rrc']}><Routes>
      <Route path="/reading-center/rrc" element={<RrcPage />} />
      <Route path="/reading-center" element={<div>Reading Center hub</div>} />
    </Routes></MemoryRouter>);
    expect(document.querySelector('.rc-root')).toBeNull();
    expect(document.querySelector('[data-reading-activity="rrc"].activity-centre')).not.toBeNull();
    expect(screen.getByTestId('library')).toHaveAttribute('data-compact', 'true');
    expect(screen.getByTestId('library')).toHaveAttribute('data-progress', 'false');
    fireEvent.click(screen.getByText('Leave RRC library'));
    expect(await screen.findByText('Reading Center hub')).toBeInTheDocument();
    expect(exitPath).toHaveBeenCalledWith('student', true);
  });
  it('exits a legacy library to assigned work when the hub is unavailable', async () => {
    exitPath.mockResolvedValue('/classroom');
    access.allowed = false;
    render(<MemoryRouter initialEntries={['/reading-center/rrc']}><Routes>
      <Route path="/reading-center/rrc" element={<RrcPage />} />
      <Route path="/classroom" element={<div>Assigned work</div>} />
    </Routes></MemoryRouter>);
    expect(screen.getByTestId('library')).toHaveAttribute('data-progress', 'true');
    fireEvent.click(screen.getByText('Leave RRC library'));
    expect(await screen.findByText('Assigned work')).toBeInTheDocument();
  });
  it('does not briefly show duplicate history while hub access is loading', () => {
    access.allowed = false;
    access.isPending = true;
    render(<MemoryRouter><RrcPage /></MemoryRouter>);
    expect(screen.getByTestId('library')).toHaveAttribute('data-progress', 'false');
  });
  it('does not keep the legacy history panel for an administrator', () => {
    access.allowed = false;
    permissions.is_admin = true;
    render(<MemoryRouter><RrcPage /></MemoryRouter>);
    expect(screen.getByTestId('library')).toHaveAttribute('data-progress', 'false');
  });
});

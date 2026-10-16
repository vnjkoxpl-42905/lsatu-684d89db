import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import RrcPage from './RrcPage';
const exitPath = vi.hoisted(() => vi.fn().mockResolvedValue('/reading-center'));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student' } }) }));
vi.mock('../lib/rrcNavigation', () => ({ rrcExitPath: exitPath }));
vi.mock('@/features/activity-centre/components/SectionLibraryPanel', () => ({
  SectionLibraryPanel: ({ onExit }: { onExit: () => void }) => <button onClick={onExit}>Leave RRC library</button>,
}));
describe('RRC home', () => {
  it('mounts the existing library outside reader styles and exits to the hub', async () => {
    exitPath.mockResolvedValue('/reading-center');
    render(<MemoryRouter initialEntries={['/reading-center/rrc']}><Routes>
      <Route path="/reading-center/rrc" element={<RrcPage />} />
      <Route path="/reading-center" element={<div>Reading Center hub</div>} />
    </Routes></MemoryRouter>);
    expect(document.querySelector('.rc-root')).toBeNull();
    expect(document.querySelector('[data-reading-activity="rrc"].activity-centre')).not.toBeNull();
    fireEvent.click(screen.getByText('Leave RRC library'));
    expect(await screen.findByText('Reading Center hub')).toBeInTheDocument();
    expect(exitPath).toHaveBeenCalledWith('student', true);
  });
  it('exits a legacy library to assigned work when the hub is unavailable', async () => {
    exitPath.mockResolvedValue('/classroom');
    render(<MemoryRouter initialEntries={['/reading-center/rrc']}><Routes>
      <Route path="/reading-center/rrc" element={<RrcPage />} />
      <Route path="/classroom" element={<div>Assigned work</div>} />
    </Routes></MemoryRouter>);
    fireEvent.click(screen.getByText('Leave RRC library'));
    expect(await screen.findByText('Assigned work')).toBeInTheDocument();
  });
});

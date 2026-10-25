import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { useReadingExerciseLayout } from './ReadingExerciseLayout';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, useAppTheme } from './AppShell';

const state = vi.hoisted(() => ({ allowed: true, theme: 'dark', admin: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'student' }, authReady: true }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: state.admin }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: state.allowed }) }));
vi.mock('../hooks/useReadingCenterData', () => ({
  usePreferences: () => ({ data: { theme: state.theme } }),
  useTags: () => ({ data: [] }), useDeleteTag: vi.fn(), useSaveTag: vi.fn(),
}));
vi.mock('./AddText', () => ({ AddTextScreen: () => <div>Add text dialog</div> }));

beforeEach(() => {
  state.allowed = true; state.theme = 'dark'; state.admin = false;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) });
});
afterEach(() => vi.restoreAllMocks());

function shell(rrcOnly = false) {
  return render(<MemoryRouter initialEntries={['/reading-center/rrc']}><Routes>
    <Route element={<AppShell rrcOnly={rrcOnly} />}>
      <Route path="/reading-center/rrc" element={<h1>Existing LR collection</h1>} />
    </Route>
  </Routes></MemoryRouter>);
}

describe('Reading Center activity rail', () => {
  it('shows RC Training as its own activity beside the existing LR stage', () => {
    shell(true);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/reading-center');
    expect(screen.getByRole('link', { name: 'LR Training' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'RC Training' })).toHaveAttribute('href', '/reading-center/rc-recall');
    expect(screen.getAllByRole('link', { name: 'RC Training' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'RC Practice' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RC Training' })).not.toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Speed Reading' })).toHaveAttribute('href', '/reading-center/speed-reading');
    expect(screen.getByRole('link', { name: 'Tags' })).toHaveAttribute('href', '/reading-center/tags');
    expect(screen.getByRole('heading', { name: 'Existing LR collection' })).toBeInTheDocument();
  });
  it('does not send a legacy LR-only student into locked hub destinations', () => {
    state.allowed = false;
    shell(true);
    expect(screen.getByRole('link', { name: 'LR Training' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Speed Reading' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Text' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reading Center home' })).toHaveAttribute('href', '/reading-center/rrc');
    expect(screen.getByRole('link', { name: 'LSAT U Home' })).toHaveAttribute('href', '/classroom');
  });
  it('gives a narrow LR stage the full width and opens navigation as a drawer', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    shell(true);
    expect(screen.getByRole('heading', { name: 'Existing LR collection' })).toBeInTheDocument();
    const menu = screen.getByRole('button', { name: 'Open Reading Center menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: 'LR Training' })).not.toBeInTheDocument();
    expect(document.getElementById('reading-center-navigation')).toBeNull();
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'LR Training' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('reading-center-navigation')).toBeNull();
    fireEvent.click(menu);
    expect(screen.getByRole('dialog', { name: 'Reading Center navigation' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(menu).toHaveFocus();
  });
});

function ThemeProbe({ reader = false }: { reader?: boolean }) {
  useAppTheme(reader);
  return <div id="reading-center-root" />;
}
describe('Reading Center appearance scope', () => {
  it('uses white workspace chrome while retaining a saved dark reader preference', async () => {
    const view = render(<ThemeProbe />);
    await waitFor(() => expect(document.getElementById('reading-center-root')).toHaveAttribute('data-rc-theme', 'light'));
    view.rerender(<ThemeProbe reader />);
    await waitFor(() => expect(document.getElementById('reading-center-root')).toHaveAttribute('data-rc-theme', 'dark'));
    view.rerender(<ThemeProbe />);
    await waitFor(() => expect(document.getElementById('reading-center-root')).toHaveAttribute('data-rc-theme', 'light'));
    expect(state.theme).toBe('dark');
  });
  it('retains the explicit high contrast workspace preference', async () => {
    state.theme = 'high_contrast';
    render(<ThemeProbe />);
    await waitFor(() => expect(document.getElementById('reading-center-root')).toHaveAttribute('data-rc-theme', 'high_contrast'));
  });
});

function FullPageExerciseProbe() { useReadingExerciseLayout(); return <><h1>Focused exercise</h1><Link to="/reading-center/rrc">Leave exercise</Link></>; }
it.each([320, 1024])("removes the navigation during an exercise and restores it after leaving at %ipx", async (width) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  render(<MemoryRouter initialEntries={['/reading-center/rc-recall']}><Routes><Route element={<AppShell />}>
    <Route path="/reading-center/rc-recall" element={<FullPageExerciseProbe />} />
    <Route path="/reading-center/rrc" element={<h1>Back at the list</h1>} />
  </Route></Routes></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Focused exercise' })).toBeInTheDocument();
  expect(document.getElementById('reading-center-navigation')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Open Reading Center menu' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Leave exercise' }));
  expect(await screen.findByRole('heading', { name: 'Back at the list' })).toBeInTheDocument();
  if (width < 768) expect(screen.getByRole('button', { name: 'Open Reading Center menu' })).toBeInTheDocument();
  else expect(screen.getByRole('link', { name: 'RC Training' })).toBeInTheDocument();
});

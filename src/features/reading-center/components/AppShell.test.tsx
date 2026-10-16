import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, useAppTheme } from './AppShell';

const state = vi.hoisted(() => ({ allowed: true, theme: 'dark', admin: false }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: state.admin }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: state.allowed }) }));
vi.mock('../hooks/useReadingCenterData', () => ({
  usePreferences: () => ({ data: { theme: state.theme } }),
  useTags: () => ({ data: [] }), useDeleteTag: vi.fn(), useSaveTag: vi.fn(),
}));
vi.mock('./AddText', () => ({ AddTextScreen: () => <div>Add text dialog</div> }));

beforeEach(() => {
  state.allowed = true; state.theme = 'dark'; state.admin = false;
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
  it('keeps the three activity destinations beside the existing LR stage', () => {
    shell(true);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/reading-center');
    expect(screen.getByRole('link', { name: 'LR Recall' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Speed Reading' })).toHaveAttribute('href', '/reading-center/speed-reading');
    expect(screen.getByRole('link', { name: 'Tags' })).toHaveAttribute('href', '/reading-center/tags');
    expect(screen.getByRole('heading', { name: 'Existing LR collection' })).toBeInTheDocument();
  });
  it('does not send a legacy LR-only student into locked hub destinations', () => {
    state.allowed = false;
    shell(true);
    expect(screen.getByRole('link', { name: 'LR Recall' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Speed Reading' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Text' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reading Center home' })).toHaveAttribute('href', '/reading-center/rrc');
    expect(screen.getByRole('link', { name: 'LSAT U Home' })).toHaveAttribute('href', '/classroom');
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

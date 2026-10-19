import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell, navDestinationFor } from './AppShell';

const state = vi.hoisted(() => ({ allowed: true, pending: false, error: false, admin: false, signedIn: true, authReady: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: state.signedIn ? { id: 'student' } : null, authReady: state.authReady }) }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ is_admin: state.admin }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: state.allowed, isPending: state.pending, isError: state.error }) }));
vi.mock('../hooks/useReadingCenterData', () => ({
  usePreferences: () => ({ data: { theme: 'light' } }),
  useTags: () => ({ data: [{ name: 'Law', color: 1 }] }), useDeleteTag: () => ({ mutate: vi.fn() }), useSaveTag: () => ({ mutate: vi.fn() }),
}));
vi.mock('./AddText', () => ({ AddTextScreen: () => <div>Add text dialog</div> }));

const DESTINATIONS = [
  ['Dashboard', 'Dashboard page'], ['LR Training', 'LR Training page'], ['RC Training', 'RC Training page'],
  ['Speed Reading', 'Speed Reading page'], ['Tags', 'Tags page'], ['Reading Progress', 'Reading Progress page'],
] as const;

function Back() { const navigate = useNavigate(); return <button type="button" onClick={() => navigate(-1)}>history back</button>; }
function Forward() { const navigate = useNavigate(); return <button type="button" onClick={() => navigate(1)}>history forward</button>; }
function Fragment() {
  const navigate = useNavigate();
  return <>
    <h1>RC Training page</h1>
    <input aria-label="notes" />
    <button type="button" onClick={() => navigate({ hash: '#rc-recall-how' })}>open instructions</button>
  </>;
}
/** A page whose heading arrives after its data does, like a real loading state. */
function LatePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 120); return () => window.clearTimeout(t); }, []);
  return <>{ready ? <h1>Speed Reading page</h1> : <p role="status">Loading…</p>}<input aria-label="search" /></>;
}

function app(initial = '/reading-center/rrc') {
  return render(<MemoryRouter initialEntries={[initial]}>
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/reading-center" element={<h1>Dashboard page</h1>} />
        <Route path="/reading-center/rrc" element={<h1>LR Training page</h1>} />
        <Route path="/reading-center/rc-recall" element={<Fragment />} />
        <Route path="/reading-center/speed-reading" element={<LatePage />} />
        <Route path="/reading-center/profile" element={<h1>Reading Progress page</h1>} />
        <Route path="/reading-center/tags" element={<h1>Tags page</h1>} />
        <Route path="/reading-center/tags/:tag" element={<h1>A tag page</h1>} />
      </Route>
    </Routes>
    <Back /><Forward />
  </MemoryRouter>);
}
const scrolledTo = (y: number) => Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: y });
const link = (name: string) => screen.getByRole('link', { name });
const heading = (name: string) => screen.getByRole('heading', { name });

let scrollTo: ReturnType<typeof vi.fn>;
beforeEach(() => {
  state.allowed = true; state.pending = false; state.error = false; state.admin = false; state.signedIn = true; state.authReady = true;
  window.sessionStorage.clear();
  scrollTo = vi.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  scrolledTo(0);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
});
afterEach(() => vi.restoreAllMocks());

describe('opening a destination from the sidebar', () => {
  it('offers one RC Training destination for instructions and practice', () => {
    app('/reading-center/rc-recall');
    expect(screen.getAllByRole('link', { name: 'RC Training' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'RC Practice' })).not.toBeInTheDocument();
    expect(link('RC Training')).toHaveAttribute('aria-current', 'page');
  });
  it('keeps destination focus when the mobile drawer closes after navigation', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    app('/reading-center/rrc');
    fireEvent.click(screen.getByRole('button', { name: 'Open Reading Center menu' }));
    fireEvent.click(link('RC Training'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(heading('RC Training page')).toHaveFocus();
  });
  it.each([
    ['LR Training', 'RC Training', 'RC Training page'],
    ['RC Training', 'LR Training', 'LR Training page'],
  ])('from a scrolled %s to %s: starts at the top with the new heading focused', async (_from, to, expected) => {
    app(_from === 'LR Training' ? '/reading-center/rrc' : '/reading-center/rc-recall');
    scrolledTo(806);
    fireEvent.click(link(to));
    expect(heading(expected)).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(heading(expected)).toHaveFocus();
  });

  it('reaches every sidebar destination from every other with a focused heading and no animated scroll', () => {
    app('/reading-center');
    for (const [from] of DESTINATIONS) {
      for (const [to, page] of DESTINATIONS) {
        if (from === to) continue;
        fireEvent.click(link(from));
        scrollTo.mockClear();
        scrolledTo(500);
        fireEvent.click(link(to));
        const h = to === 'Speed Reading' ? null : heading(page);
        if (h) expect(h).toHaveFocus();
        expect(scrollTo.mock.calls.every(([arg]) => arg.behavior === 'auto' && arg.top === 0)).toBe(true);
      }
    }
  });

  it('keeps one shell between LR and RC, so the sidebar never remounts', () => {
    app('/reading-center/rrc');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    fireEvent.click(link('RC Training'));
    fireEvent.click(link('LR Training'));
    fireEvent.click(link('Speed Reading'));
    expect(screen.getByRole('navigation', { name: 'Main' })).toBe(nav);
  });
});

describe('Back and Forward', () => {
  it('Back restores the previous view and its scroll position, without moving focus', () => {
    app('/reading-center/rrc');
    scrolledTo(806);
    fireEvent.click(link('RC Training'));
    scrolledTo(0);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'history back' }));
    expect(heading('LR Training page')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 806, left: 0, behavior: 'auto' });
    expect(heading('LR Training page')).not.toHaveFocus();
  });

  it('Forward returns to the later view at the position it had', async () => {
    app('/reading-center/rrc');
    fireEvent.click(link('RC Training'));
    scrolledTo(300);
    // Let the scroll listener record the position, as it does while the student scrolls.
    fireEvent.scroll(window);
    await new Promise((resolve) => setTimeout(resolve, 60));
    fireEvent.click(screen.getByRole('button', { name: 'history back' }));
    scrolledTo(0);
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'history forward' }));
    expect(heading('RC Training page')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 300, left: 0, behavior: 'auto' });
  });
});

describe('what must not move the page or focus', () => {
  it('a hash-only change (an in-page anchor or disclosure) leaves scroll and focus to the page', () => {
    app('/reading-center/rc-recall');
    const notes = screen.getByLabelText('notes');
    notes.focus();
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'open instructions' }));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(notes).toHaveFocus();
  });

  it('the first render does not steal focus', () => {
    app('/reading-center/rrc');
    expect(heading('LR Training page')).not.toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('a heading that arrives after loading gets focus once', async () => {
    app('/reading-center/rrc');
    fireEvent.click(link('Speed Reading'));
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    await waitFor(() => expect(heading('Speed Reading page')).toHaveFocus());
  });

  it('a late data update does not pull focus away from what the student is doing', async () => {
    app('/reading-center/rrc');
    fireEvent.click(link('Speed Reading'));
    screen.getByLabelText('search').focus();
    await waitFor(() => expect(heading('Speed Reading page')).toBeInTheDocument());
    expect(screen.getByLabelText('search')).toHaveFocus();
    expect(heading('Speed Reading page')).not.toHaveFocus();
  });
});

describe('Tags', () => {
  it('keeps every main destination reachable, with geometry unchanged', () => {
    app('/reading-center/tags');
    for (const [name] of DESTINATIONS) expect(link(name)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Text' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create New Tag' })).toBeInTheDocument();
  });

  it('names where Back goes: the destination Tags was opened from', () => {
    app('/reading-center/profile');
    fireEvent.click(link('Tags'));
    const back = screen.getByRole('button', { name: 'Back to Reading Progress' });
    fireEvent.click(back);
    expect(heading('Reading Progress page')).toBeInTheDocument();
  });

  it('remembers the origin across a reload, and falls back to Speed Reading on a direct visit', () => {
    const first = app('/reading-center/rc-recall');
    fireEvent.click(link('Tags'));
    expect(window.sessionStorage.getItem('rc-tags-return')).toBe('/reading-center/rc-recall');
    expect(screen.getByRole('button', { name: 'Back to RC Training' })).toBeInTheDocument();
    // A reload keeps the session's record of where Tags was opened from.
    first.unmount();
    app('/reading-center/tags/Law');
    expect(screen.getByRole('button', { name: 'Back to RC Training' })).toBeInTheDocument();
    cleanup();
    window.sessionStorage.clear();
    app('/reading-center/tags/Law');
    expect(screen.getByRole('button', { name: 'Back to Speed Reading' })).toBeInTheDocument();
  });

  it('names a destination from any path, not just the top level', () => {
    expect(navDestinationFor('/reading-center')).toEqual({ to: '/reading-center', label: 'Dashboard' });
    expect(navDestinationFor('/reading-center/rc-recall#rc-recall-how')).toEqual({ to: '/reading-center/rc-recall', label: 'RC Training' });
    expect(navDestinationFor('/reading-center/rrc/attempt/9')).toEqual({ to: '/reading-center/rrc', label: 'LR Training' });
    expect(navDestinationFor('/somewhere/else')).toEqual({ to: '/reading-center/speed-reading', label: 'Speed Reading' });
  });
});

describe('access stays separate from the shared shell', () => {
  it('keeps destinations reachable when the signed-in access query fails', () => {
    state.allowed = false; state.error = true;
    app('/reading-center/tags');
    for (const [name] of DESTINATIONS) expect(link(name)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Text' })).not.toBeInTheDocument();
  });

  it.each([true, false])('does not expose activity links while signed out (auth ready: %s)', (ready) => {
    state.signedIn = false; state.authReady = ready; state.pending = true;
    app('/reading-center/rrc');
    for (const [name] of DESTINATIONS) expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Text' })).not.toBeInTheDocument();
  });
  it('a student with only the LR grant does not get hub destinations by sharing the shell', () => {
    state.allowed = false;
    app('/reading-center/rrc');
    expect(link('LR Training')).toBeInTheDocument();
    for (const name of ['Dashboard', 'RC Training', 'Speed Reading', 'Tags', 'Reading Progress']) expect(screen.queryByRole('link', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Text' })).not.toBeInTheDocument();
  });

  it('a student with neither grant sees no destinations, only the way home', () => {
    state.allowed = false;
    app('/reading-center/rc-recall');
    expect(screen.queryByRole('link', { name: 'LR Training' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'RC Training' })).not.toBeInTheDocument();
    expect(link('LSAT U Home')).toBeInTheDocument();
  });

  it('keeps the sidebar populated while access is still being checked, so the workspace is not replaced', () => {
    state.allowed = false; state.pending = true;
    app('/reading-center/rc-recall');
    expect(link('RC Training')).toBeInTheDocument();
    expect(link('LR Training')).toBeInTheDocument();
  });
});

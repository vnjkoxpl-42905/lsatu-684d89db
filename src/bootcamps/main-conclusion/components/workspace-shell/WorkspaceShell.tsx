import { Outlet, Link, useLocation } from 'react-router-dom';
import { LeftRail } from './LeftRail';
import { RightDrawer } from './RightDrawer';
import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { Command, ArrowLeft } from 'lucide-react';
import type { ReferenceId, NamedToolId } from '@/bootcamps/main-conclusion/types/source-slots';
import { CommandPalette } from '@/bootcamps/main-conclusion/components/command-palette/CommandPalette';
import { AiTutor } from '@/bootcamps/main-conclusion/components/ai-tutor/AiTutor';
import { Tooltip } from '@/bootcamps/main-conclusion/components/primitives/Tooltip';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export type DrawerPayload =
  | { mode: 'reference'; reference_id: ReferenceId }
  | { mode: 'named-tool'; named_tool_id: NamedToolId }
  | null;

interface DrawerCtx {
  payload: DrawerPayload;
  open: (p: DrawerPayload) => void;
  close: () => void;
}

const Ctx = createContext<DrawerCtx | null>(null);

export function useDrawer(): DrawerCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDrawer must be used within WorkspaceShell');
  return ctx;
}

export function WorkspaceShell(): JSX.Element {
  const location = useLocation();
  const [payload, setPayload] = useState<DrawerPayload>(null);
  const open = useCallback((p: DrawerPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [desktopRailOpen, setDesktopRailOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K (palette), Cmd+J / Ctrl+J (tutor).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (mod && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setTutorOpen((t) => !t);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Track scroll for top shadow/divider on main.
  useEffect(() => {
    const node = mainRef.current;
    if (!node) return;
    const onScroll = () => setScrolled(node.scrollTop > 4);
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);

  // Derive surfaceId from URL for the AI Tutor surface-aware suggestions.
  const surfaceId = deriveSurfaceId(typeof window !== 'undefined' ? window.location.pathname : '/');

  const { is_admin } = useUserPermissions();
  const isFullscreenDrillRun =
    location.pathname === '/bootcamp/intro-to-lr/drills/main-conclusion-lab/run' ||
    location.pathname === '/bootcamp/intro-to-lr/drills/first-sentence-vs-rebuttal-lab/run';

  if (isFullscreenDrillRun) {
    return (
      <Ctx.Provider value={{ payload, open, close }}>
        <a className="skip-link" href="#main">Skip to main content</a>
        <main id="main" className="min-h-screen bg-transparent">
          <Outlet />
        </main>
        <RightDrawer payload={payload} onClose={close} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        {tutorOpen ? <AiTutor surfaceId={surfaceId} onClose={() => setTutorOpen(false)} /> : null}
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={{ payload, open, close }}>
      <a className="skip-link" href="#main">Skip to main content</a>
      {/* Mobile back-to-mainhub pill (left rail is hidden on phone). */}
      <Link
        to="/classroom"
        aria-label="Back to the classroom"
        className={cn(
          'desktop:hidden tablet:hidden',
          'fixed top-3 left-3 z-30 inline-flex items-center gap-1.5',
          'rounded-[4px] px-3 py-1.5',
          'bg-[rgb(255_255_255/0.82)] border border-[rgb(26_26_26/0.10)]',
          'text-ink-soft text-label font-mc-mono uppercase tracking-wider',
          'shadow-[var(--soft-shadow)] backdrop-blur',
        )}
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        Classroom
      </Link>
      <div
        className={cn(
          'grid h-full phone:grid-cols-1 tablet:grid-cols-[220px_1fr]',
          'transition-[grid-template-columns] duration-220 ease-eased',
          desktopRailOpen ? 'desktop:grid-cols-[260px_1fr]' : 'desktop:grid-cols-[72px_1fr]',
        )}
      >
        <LeftRail
          collapsed={!desktopRailOpen}
          onExpand={() => setDesktopRailOpen(true)}
          onCollapse={() => setDesktopRailOpen(false)}
        />
        <main id="main" ref={mainRef} className="relative overflow-y-auto bg-transparent">
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none sticky top-0 -mb-px h-px z-10',
              'bg-gradient-to-r from-transparent via-[rgb(26_26_26/0.18)] to-transparent',
              'transition-opacity duration-220 ease-eased',
              scrolled ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Outlet />
        </main>
      </div>
      <RightDrawer payload={payload} onClose={close} />
      {is_admin ? (
        <FloatingActions
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenTutor={() => setTutorOpen(true)}
        />
      ) : null}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {tutorOpen ? <AiTutor surfaceId={surfaceId} onClose={() => setTutorOpen(false)} /> : null}
    </Ctx.Provider>
  );
}

function FloatingActions({
  onOpenPalette,
  onOpenTutor,
}: {
  onOpenPalette: () => void;
  onOpenTutor: () => void;
}) {
  const FAB_BASE = cn(
    'group/fab relative inline-flex h-12 w-12 items-center justify-center rounded-full',
    'transition-[transform,box-shadow,border-color] duration-180 ease-eased',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
    'hover:-translate-y-[2px] active:translate-y-[0.5px]',
  );

  return (
    <div className="print-hide fixed bottom-6 right-6 flex flex-col gap-2.5 z-30">
      {/* AI Tutor button removed — admins use the consolidated chat hub.
          ⌘J keyboard shortcut still toggles the in-lesson tutor. */}
      <Tooltip content="Command palette (⌘K)" side="left">
        <button
          onClick={onOpenPalette}
          aria-label="Open command palette"
          className={cn(
            FAB_BASE,
            'bg-[image:var(--grad-surface-elev)] text-ink-soft',
            'border border-[rgb(var(--border)/0.12)]',
            'shadow-[var(--shadow-2)]',
            'hover:text-ink hover:border-[color:var(--border-accent-soft)] hover:shadow-[var(--shadow-lift)]',
          )}
        >
          <Command className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

function deriveSurfaceId(pathname: string): string | null {
  // Strip the bootcamp base prefix so absolute and nested deployments both work.
  const stripped = pathname.replace(/^\/bootcamp\/(?:intro-to-lr|structure|structure-v2)/, '');
  if (stripped.startsWith('/lessons/')) {
    const n = stripped.split('/').pop();
    return n ? `MC-LSN-${n}` : null;
  }
  if (stripped.startsWith('/drills/')) {
    const n = stripped.split('/').pop();
    return n ? `MC-DRL-${n}` : null;
  }
  if (stripped.startsWith('/simulator/bank')) return 'MC-SIM-Q1';
  return null;
}

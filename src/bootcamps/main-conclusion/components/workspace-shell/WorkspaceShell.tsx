import { Outlet } from 'react-router-dom';
import { LeftRail } from './LeftRail';
import { RightDrawer } from './RightDrawer';
import { useState, createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { Sparkles, Command } from 'lucide-react';
import type { ReferenceId, NamedToolId } from '@/bootcamps/main-conclusion/types/source-slots';
import { CommandPalette } from '@/bootcamps/main-conclusion/components/command-palette/CommandPalette';
import { AiTutor } from '@/bootcamps/main-conclusion/components/ai-tutor/AiTutor';
import { Tooltip } from '@/bootcamps/main-conclusion/components/primitives/Tooltip';
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
  const [payload, setPayload] = useState<DrawerPayload>(null);
  const open = useCallback((p: DrawerPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
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

  return (
    <Ctx.Provider value={{ payload, open, close }}>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="grid h-full desktop:grid-cols-[260px_1fr] phone:grid-cols-1 tablet:grid-cols-[220px_1fr]">
        <LeftRail />
        <main id="main" ref={mainRef} className="relative overflow-y-auto">
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none sticky top-0 -mb-px h-px z-10',
              'bg-gradient-to-r from-transparent via-[color:var(--border-accent-soft)] to-transparent',
              'transition-opacity duration-220 ease-eased',
              scrolled ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Outlet />
        </main>
      </div>
      <RightDrawer payload={payload} onClose={close} />
      <FloatingActions
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenTutor={() => setTutorOpen(true)}
      />
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
      <Tooltip content="AI Tutor (⌘J)" side="left">
        <button
          onClick={onOpenTutor}
          aria-label="Open AI Tutor"
          className={cn(
            FAB_BASE,
            'mc-shine',
            'bg-[image:var(--grad-accent-strong)] text-mc-accent',
            'border border-[color:var(--border-accent-mid)]',
            'shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.08)]',
            'hover:border-[color:var(--border-accent-strong)] hover:shadow-[var(--glow-accent-strong),inset_0_1px_0_rgb(255_255_255/0.10)]',
          )}
        >
          <Sparkles className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        </button>
      </Tooltip>
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

import { Outlet } from 'react-router-dom';
import { LeftRail } from './LeftRail';
import { RightDrawer } from './RightDrawer';
import { useState, createContext, useContext, useCallback, useEffect } from 'react';
import type { ReferenceId, NamedToolId } from '@/bootcamps/main-conclusion/types/source-slots';
import { CommandPalette } from '@/bootcamps/main-conclusion/components/command-palette/CommandPalette';
import { AiTutor } from '@/bootcamps/main-conclusion/components/ai-tutor/AiTutor';
import { Tooltip } from '@/bootcamps/main-conclusion/components/primitives/Tooltip';

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

  // Derive surfaceId from URL for the AI Tutor surface-aware suggestions.
  const surfaceId = deriveSurfaceId(typeof window !== 'undefined' ? window.location.pathname : '/');

  return (
    <Ctx.Provider value={{ payload, open, close }}>
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="grid h-full desktop:grid-cols-[260px_1fr] phone:grid-cols-1 tablet:grid-cols-[220px_1fr]">
        <LeftRail />
        <main id="main" className="relative overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <RightDrawer payload={payload} onClose={close} />
      <FloatingActions onOpenPalette={() => setPaletteOpen(true)} onOpenTutor={() => setTutorOpen(true)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {tutorOpen ? <AiTutor surfaceId={surfaceId} onClose={() => setTutorOpen(false)} /> : null}
    </Ctx.Provider>
  );
}

function FloatingActions({ onOpenPalette, onOpenTutor }: { onOpenPalette: () => void; onOpenTutor: () => void }) {
  return (
    <div className="print-hide fixed bottom-5 right-5 flex flex-col gap-2 z-30">
      <Tooltip content="AI Tutor (⌘J)">
        <button
          onClick={onOpenTutor}
          aria-label="Open AI Tutor"
          className="h-11 w-11 rounded-full bg-[rgb(var(--accent)/0.18)] text-mc-accent border border-[rgb(var(--accent)/0.40)] hover:bg-[rgb(var(--accent)/0.28)] font-mc-mono text-sm shadow-[var(--shadow-3)]"
        >
          ?
        </button>
      </Tooltip>
      <Tooltip content="Command palette (⌘K)">
        <button
          onClick={onOpenPalette}
          aria-label="Open command palette"
          className="h-11 w-11 rounded-full bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)] hover:text-ink hover:border-[rgb(var(--accent)/0.30)] font-mc-mono text-sm shadow-[var(--shadow-3)]"
        >
          ⌘K
        </button>
      </Tooltip>
    </div>
  );
}

function deriveSurfaceId(pathname: string): string | null {
  // Strip the bootcamp base prefix so absolute and nested deployments both work.
  const stripped = pathname.replace(/^\/bootcamp\/structure-v2/, '');
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

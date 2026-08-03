import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  LayoutGrid,
  Library,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  PencilRuler,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OperatorChatProvider } from '@/components/teacher/ai-ta/OperatorChatProvider';

type Room = {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** NavLink `end`: only Today, so exactly one item is ever active. */
  end?: boolean;
};

/**
 * The six rooms, in the order the spec fixes them (D3). This list is the only
 * navigation in the teacher workspace: no `?ws=` switching, no second rail,
 * no per-surface tab bars pretending to be nav.
 *
 * `end` is set on Today alone. Every other room owns a path prefix, so its
 * child routes (library tabs, a student dossier, a thread) keep the parent
 * highlighted, and no two items can be active at once.
 */
const ROOMS: Room[] = [
  { to: '/teacher/today', label: 'Today', Icon: LayoutGrid, end: true },
  { to: '/teacher/students', label: 'Students', Icon: Users },
  { to: '/teacher/inbox', label: 'Inbox', Icon: MessageSquare },
  { to: '/teacher/library', label: 'Library', Icon: Library },
  { to: '/teacher/schedule', label: 'Schedule', Icon: CalendarDays },
  { to: '/teacher/insights', label: 'Insights', Icon: BarChart3 },
];

/** Rooms reachable from the header rather than the sidebar. */
const TOOL_TITLES: Record<string, string> = {
  '/teacher/whiteboard': 'Whiteboard',
  '/teacher/dev': 'Dev tools',
};

/**
 * The perspective floor from the Desk. Kept so the workspace ground reads as
 * the same room the Desk surfaces were designed for.
 */
const FLOOR_GRID_STYLE: React.CSSProperties = {
  transform: 'perspective(440px) rotateX(62deg)',
  transformOrigin: 'top center',
  backgroundImage:
    'linear-gradient(rgba(13,19,22,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(13,19,22,0.10) 1px, transparent 1px)',
  backgroundSize: '46px 46px',
  maskImage: 'linear-gradient(to top, black 30%, transparent 88%)',
  WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 88%)',
};

/**
 * Room title for the header. Matched by longest path prefix so a nested route
 * (`/teacher/library/guided-drills`) still titles as its room.
 */
function useRoomTitle(pathname: string): string {
  return useMemo(() => {
    const tool = Object.keys(TOOL_TITLES).find((path) => pathname.startsWith(path));
    if (tool) return TOOL_TITLES[tool];

    const room = [...ROOMS]
      .sort((a, b) => b.to.length - a.to.length)
      .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

    return room?.label ?? 'Teacher workspace';
  }, [pathname]);
}

/**
 * The teacher workspace shell: one sidebar that never unmounts, one header,
 * one accent. Every room renders into the `<Outlet/>`; nothing here remounts
 * when the room changes, so room-to-room navigation is real browser history.
 *
 * The AI panel (spec D6) is a Phase 3 build. Its slot and toggle exist now so
 * the layout is settled before the panel lands in it.
 */
export default function TeacherWorkspaceShell() {
  return (
    <OperatorChatProvider>
      <WorkspaceLayout />
    </OperatorChatProvider>
  );
}

function WorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const title = useRoomTitle(location.pathname);

  return (
    <div className="relative flex h-screen min-h-screen flex-col overflow-hidden bg-[#c3cace] text-[#11181c]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[220%] w-[320%] -translate-x-1/2" style={FLOOR_GRID_STYLE} />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black/10 px-5 py-3.5 sm:px-6">
          <h1 className="truncate font-display text-[22px] leading-none tracking-tight">{title}</h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/teacher/whiteboard')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 border px-2.5 text-[12px] font-medium transition',
                location.pathname.startsWith('/teacher/whiteboard')
                  ? 'border-black bg-black text-white'
                  : 'border-black/15 text-black/60 hover:border-black/40 hover:text-black',
              )}
            >
              <PencilRuler className="h-3.5 w-3.5" strokeWidth={1.6} />
              Whiteboard
            </button>

            <button
              type="button"
              onClick={() => setAiPanelOpen((open) => !open)}
              aria-expanded={aiPanelOpen}
              aria-controls="teacher-ai-panel"
              className={cn(
                'inline-flex h-8 items-center gap-1.5 border px-2.5 text-[12px] font-medium transition',
                aiPanelOpen
                  ? 'border-teacher-accent bg-teacher-accent text-teacher-accent-foreground hover:bg-teacher-accent-hover'
                  : 'border-teacher-accent/40 text-teacher-accent-strong hover:bg-teacher-accent/10',
              )}
            >
              {aiPanelOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" strokeWidth={1.6} />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5" strokeWidth={1.6} />
              )}
              Assistant
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[212px] shrink-0 border-r border-black/10 md:flex md:flex-col">
            <div className="px-5 pb-3 pt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
              Workspace
            </div>
            <nav className="flex flex-col px-3 pb-4" aria-label="Teacher workspace">
              {ROOMS.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2.5 border border-transparent px-2.5 py-2 text-[13px] transition',
                      isActive
                        ? 'border-black bg-black text-white'
                        : 'text-black/60 hover:border-black/15 hover:text-black',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </main>

          {aiPanelOpen ? (
            <aside
              id="teacher-ai-panel"
              className="hidden w-[320px] shrink-0 border-l border-black/10 bg-white/40 md:flex md:flex-col"
              aria-label="Assistant"
            >
              <div className="px-5 pb-3 pt-5 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
                Assistant
              </div>
              <p className="px-5 text-[13px] leading-relaxed text-black/55">
                The assistant moves in here, with whatever room you are in as its context. Nothing to use yet.
              </p>
            </aside>
          ) : null}
        </div>

        {/* Mobile: the sidebar becomes a bottom bar. Admin has to work on a phone. */}
        <nav
          className="flex shrink-0 items-stretch overflow-x-auto border-t border-black/10 bg-[#c3cace] pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
          aria-label="Teacher workspace"
        >
          {ROOMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-black' : 'text-black/45',
                )
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="max-w-full truncate px-1">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

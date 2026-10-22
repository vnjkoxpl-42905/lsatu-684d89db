import { useRef } from 'react';
import { classroomMotionKey, useClassroomMotion } from '@/hooks/useClassroomMotion';

import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Users,
  LayoutGrid,
  Library,
  MessageSquare,
  PencilRuler,
  Sparkles,
  BookOpenText,
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
 * The rooms in the teacher workspace. This list is the only top navigation in
 * the teacher workspace: no `?ws=` switching, no second rail,
 * no per-surface tab bars pretending to be nav.
 *
 * `end` is set on Today alone. Every other room owns a path prefix, so its
 * child routes (library tabs, a student dossier, a thread) keep the parent
 * highlighted, and no two items can be active at once.
 */
const ROOMS: Room[] = [
  { to: '/teacher/today', label: 'Today', Icon: LayoutGrid, end: true },
  { to: '/teacher/inbox', label: 'Inbox', Icon: MessageSquare },
  { to: '/teacher/payments', label: 'Payments', Icon: CreditCard },
  { to: '/teacher/students', label: 'Students', Icon: Users },
  { to: '/teacher/library', label: 'Library', Icon: Library },
  { to: '/teacher/tools', label: 'Reading Center', Icon: BookOpenText },
  { to: '/teacher/assistant', label: 'Teaching Assistant', Icon: Sparkles },
  { to: '/teacher/insights', label: 'Insights', Icon: BarChart3 },
];

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
 * The teacher workspace shell: one top rail that never unmounts, one header,
 * one accent. Every room renders into the `<Outlet/>`; nothing here remounts
 * when the room changes, so room-to-room navigation is real browser history.
 *
 * The rail sits in the header rather than down the side: the shell is entered
 * from the Classroom's own side rail, and a second vertical rail immediately
 * inside the first read as two competing navigations. Rooms across the top,
 * each room's own tabs (Library's bootcamps/drills/assignments/activities) in
 * the workspace below — one level of nav per axis.
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
  const content = useRef<HTMLElement>(null);
  useClassroomMotion(content, classroomMotionKey(location.pathname, location.search));

  return (
    // Fills the classroom stage it is mounted into rather than claiming the
    // viewport: the classroom rail sits beside it and owns the page height.
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#c3cace] text-[#11181c]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[220%] w-[320%] -translate-x-1/2" style={FLOOR_GRID_STYLE} />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-black/10 px-5 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3.5">
            <h1 className="truncate font-display text-[22px] leading-none tracking-tight">
              Teacher Workspace
            </h1>

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
              onClick={() => navigate('/teacher/assistant')}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 border px-2.5 text-[12px] font-medium transition',
                location.pathname.startsWith('/teacher/assistant')
                  ? 'border-teacher-accent bg-teacher-accent text-teacher-accent-foreground hover:bg-teacher-accent-hover'
                  : 'border-teacher-accent/40 text-teacher-accent-strong hover:bg-teacher-accent/10',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
              Assistant
            </button>
            </div>
          </div>

          {/* The room rail. Hidden below md, where the bottom bar takes over. */}
          <nav
            className="hidden items-stretch gap-1 overflow-x-auto md:flex"
            aria-label="Teacher workspace"
          >
            {ROOMS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    // Deliberately heavier than a room's own tab row below it,
                    // so two stacked horizontal strips can't read as the same
                    // level of navigation.
                    'inline-flex shrink-0 items-center gap-2 border-b-[3px] px-3.5 py-3 text-sm font-medium transition',
                    isActive
                      ? 'border-teacher-accent font-semibold text-black'
                      : 'border-transparent text-black/50 hover:text-black',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="flex min-h-0 flex-1">
          <main ref={content} className="classroom-motion-root classroom-motion-local flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <Outlet />
          </main>
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

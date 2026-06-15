import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Users,
  MessageSquare,
  CalendarDays,
  Library,
  PencilRuler,
  BarChart3,
  ArrowLeft,
  Shield,
  Archive,
  GraduationCap,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { BOOTCAMPS_DASHBOARD_ENABLED } from '@/components/teacher/bootcamps/topicRegistry';

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

/**
 * Primary teacher nav (verb/surface-first). See docs/adr/0001-teacher-workspace-ia.md
 * and src/pages/teacher/CONTEXT.md for why each surface lives where it does.
 */
const PRIMARY_NAV: NavItem[] = [
  { to: '/teacher', label: 'Command', Icon: Sparkles, end: true },
  { to: '/teacher/students', label: 'Students', Icon: Users },
  { to: '/teacher/conversations', label: 'Conversations', Icon: MessageSquare },
  { to: '/teacher/library', label: 'Library', Icon: Library },
  { to: '/teacher/activities', label: 'Activities', Icon: Zap },
  { to: '/teacher/whiteboard', label: 'Whiteboard', Icon: PencilRuler },
  { to: '/teacher/schedule', label: 'Schedule', Icon: CalendarDays },
  { to: '/teacher/insights', label: 'Insights', Icon: BarChart3 },
  { to: '/teacher/admin', label: 'Admin', Icon: Shield },
];

/**
 * References = Joshua's private inspiration shelf. Never assignable, not daily-ops,
 * so it sits below a divider rather than in the primary set.
 */
const SECONDARY_NAV: NavItem[] = [
  { to: '/teacher/reference-library', label: 'References', Icon: Archive },
  { to: '/teacher/tutor-corpus', label: 'Tutor corpus', Icon: GraduationCap },
];

// Insights surfaces bootcamp analytics; hidden if the dashboard is disabled.
const visiblePrimary = PRIMARY_NAV.filter((item) =>
  item.to === '/teacher/insights' ? BOOTCAMPS_DASHBOARD_ENABLED : true,
);

const MOBILE_NAV: NavItem[] = [...visiblePrimary, ...SECONDARY_NAV];

/**
 * Teacher Workspace shell. Premium operator hub for admins.
 * Assistant is the default surface.
 */
export default function TeacherShell() {
  const navigate = useNavigate();
  const { is_admin, loading } = useUserPermissions();

  useEffect(() => {
    if (!loading && !is_admin) navigate('/mainhub', { replace: true });
  }, [loading, is_admin, navigate]);

  if (loading || !is_admin) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <header className="border-b border-zinc-800/60 shrink-0 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/mainhub')}
            className="text-zinc-400 hover:text-zinc-100 inline-flex items-center text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Main Hub
          </button>
          <div className="h-5 w-px bg-zinc-800" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <h1 className="text-base font-semibold tracking-tight">Teacher Workspace</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto flex flex-col md:flex-row">
        {/* Desktop sidebar / mobile bottom-tab. */}
        <aside className="hidden md:flex md:w-[200px] shrink-0 border-r border-zinc-800/60 flex-col">
          <nav className="py-4 flex flex-col gap-0.5" aria-label="Teacher workspace">
            {visiblePrimary.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'mx-2 inline-flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-100 border border-amber-500/20'
                      : 'border border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
            <div className="my-2 mx-4 h-px bg-zinc-800/60" />
            {SECONDARY_NAV.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'mx-2 inline-flex items-center gap-2.5 px-3 py-2 text-[13px] rounded-lg transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-100 border border-amber-500/20'
                      : 'border border-transparent text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900/60',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar. Horizontally scrollable so all surfaces fit
            without overflow; admin must stay usable on mobile. */}
        <nav
          className="md:hidden shrink-0 border-t border-zinc-800/60 bg-zinc-950/95 backdrop-blur flex items-stretch overflow-x-auto pb-[max(0.25rem,env(safe-area-inset-bottom))]"
          aria-label="Teacher workspace"
        >
          {MOBILE_NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 min-w-[4.5rem] flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-amber-300' : 'text-zinc-500 hover:text-zinc-200',
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-full px-1">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

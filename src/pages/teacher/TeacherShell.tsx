import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  CalendarDays,
  PencilRuler,
  ClipboardList,
  Flame,
  UploadCloud,
  BookOpen,
  LineChart,
  ArrowLeft,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserPermissions } from '@/hooks/useUserPermissions';

const NAV: { to: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { to: '/teacher', label: 'Today', Icon: LayoutDashboard },
  { to: '/teacher/students', label: 'Students', Icon: Users },
  { to: '/teacher/ai-ta', label: 'AI Teaching Assistant', Icon: Sparkles },
  { to: '/teacher/weekly-plans', label: 'Weekly Plans', Icon: CalendarDays },
  { to: '/teacher/schedule', label: 'Schedule', Icon: CalendarDays },
  { to: '/teacher/smartboard', label: 'Smartboard', Icon: PencilRuler },
  { to: '/teacher/assignments', label: 'Assignments', Icon: ClipboardList },
  { to: '/teacher/bootcamps', label: 'Bootcamps', Icon: Flame },
  { to: '/teacher/uploads', label: 'Uploads', Icon: UploadCloud },
  { to: '/teacher/recaps', label: 'Recaps', Icon: BookOpen },
  { to: '/teacher/analytics-bridge', label: 'Analytics Bridge', Icon: LineChart },
];

/**
 * Teacher Workspace shell. Admin-only; the route guard in App.tsx
 * redirects non-admins. The shell is desktop-first by design — on
 * narrow screens the sidebar collapses to a horizontal tab strip so
 * tools remain reachable without pretending to be a full mobile app.
 */
export default function TeacherShell() {
  const navigate = useNavigate();
  const { is_admin, loading } = useUserPermissions();

  useEffect(() => {
    if (!loading && !is_admin) navigate('/foyer', { replace: true });
  }, [loading, is_admin, navigate]);

  if (loading || !is_admin) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/foyer')}
            className="text-zinc-400 hover:text-zinc-100 inline-flex items-center text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Foyer
          </button>
          <div className="h-5 w-px bg-zinc-800" />
          <Command className="h-5 w-5 text-zinc-400" />
          <h1 className="text-base font-semibold tracking-tight">Teacher Workspace</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto flex flex-col md:flex-row">
        <aside className="md:w-[220px] shrink-0 border-b md:border-b-0 md:border-r border-zinc-800">
          <nav
            className="md:py-3 flex md:flex-col gap-0.5 overflow-x-auto md:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Teacher workspace navigation"
          >
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/teacher'}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2.5 px-4 py-2 text-[13px] whitespace-nowrap shrink-0',
                    // Mobile: bottom border accent (horizontal nav).
                    // Desktop: left border accent (vertical nav).
                    'border-b-2 md:border-b-0 md:border-l-2 transition-colors',
                    isActive
                      ? 'border-amber-400 bg-zinc-900/60 text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

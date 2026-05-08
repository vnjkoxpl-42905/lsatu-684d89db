import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { ClipboardList, BookOpen, UploadCloud, Flame, PencilRuler, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUB: { to: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { to: '/teacher/library/assignments', label: 'Assignments', Icon: ClipboardList },
  { to: '/teacher/library/recaps', label: 'Recaps', Icon: BookOpen },
  { to: '/teacher/library/uploads', label: 'Uploads', Icon: UploadCloud },
  { to: '/teacher/library/bootcamps', label: 'Bootcamps', Icon: Flame },
  { to: '/teacher/library/smartboard', label: 'Smartboard', Icon: PencilRuler },
  { to: '/teacher/library/analytics', label: 'Analytics', Icon: LineChart },
];

export default function TeacherLibrary() {
  const { pathname } = useLocation();
  if (pathname === '/teacher/library' || pathname === '/teacher/library/') {
    return <Navigate to="/teacher/library/assignments" replace />;
  }
  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-950">
      <div className="shrink-0 border-b border-zinc-800/60 px-4 sm:px-6 py-2 overflow-x-auto">
        <nav className="flex items-center gap-1 min-w-max">
          {SUB.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-100 border border-transparent',
                )
              }
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

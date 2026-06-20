import React, { useState } from 'react';
import { ClipboardList, Flame, Sparkles, Target, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TeacherAssignmentsOverview = React.lazy(() => import('../TeacherAssignmentsOverview'));
const TeacherBootcamps = React.lazy(() => import('../TeacherBootcamps'));
const AdminGuidedDrills = React.lazy(() => import('@/pages/admin/GuidedDrills'));
const TeacherActivities = React.lazy(() => import('../TeacherActivities'));

type TabKey = 'assignments' | 'bootcamps' | 'guided-drills' | 'activities';

const TABS: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }>; href: string }[] = [
  { key: 'assignments', label: 'Assignments', Icon: ClipboardList, href: '/teacher/library/assignments' },
  { key: 'bootcamps', label: 'Bootcamps', Icon: Flame, href: '/teacher/library/bootcamps' },
  { key: 'guided-drills', label: 'Guided Drills', Icon: Target, href: '/teacher/library/guided-drills' },
  { key: 'activities', label: 'Activities', Icon: Sparkles, href: '/teacher/library/activities' },
];

/**
 * Embedded teacher library inside the Teacher Desk workspace.
 * Replaces the "coming soon" placeholder so assignments, bootcamps, guided
 * drills, and activities are all assignable directly from the desk.
 */
export function DeskLibrarySurface() {
  const [tab, setTab] = useState<TabKey>('assignments');
  const navigate = useNavigate();
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <section className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 px-2 pb-3">
        <nav className="flex flex-wrap items-center gap-1">
          {TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition',
                tab === key
                  ? 'bg-black text-white'
                  : 'text-black/55 hover:bg-black/5 hover:text-black',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          onClick={() => navigate(current.href)}
          className="inline-flex items-center gap-1.5 border border-black/15 px-2.5 py-1.5 text-[11px] font-semibold text-black/55 transition hover:border-black/40 hover:text-black"
        >
          Open full page <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-950 text-zinc-100">
        <React.Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading…</div>}>
          {tab === 'assignments' && <TeacherAssignmentsOverview />}
          {tab === 'bootcamps' && <TeacherBootcamps />}
          {tab === 'guided-drills' && <AdminGuidedDrills />}
          {tab === 'activities' && <TeacherActivities />}
        </React.Suspense>
      </div>
    </section>
  );
}

export default DeskLibrarySurface;

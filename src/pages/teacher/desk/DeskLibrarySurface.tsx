import { useNavigate, useParams } from 'react-router-dom';
import { ClipboardList, Flame, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeskLibraryView } from '@/hooks/useDeskLibraryView';
import { LibraryViewSwitcher } from '@/components/teacher/desk/library/LibraryViewSwitcher';
import { DeskLibraryAssignmentsSurface } from './library/DeskLibraryAssignmentsSurface';
import { DeskLibraryBootcampsSurface } from './library/DeskLibraryBootcampsSurface';
import { DeskLibraryGuidedDrillsSurface } from './library/DeskLibraryGuidedDrillsSurface';
import { DeskLibraryActivitiesSurface } from './library/DeskLibraryActivitiesSurface';

type TabKey = 'assignments' | 'bootcamps' | 'guided-drills' | 'activities';

const DEFAULT_TAB: TabKey = 'bootcamps';

const TABS: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'bootcamps', label: 'Bootcamps', Icon: Flame },
  { key: 'guided-drills', label: 'Guided Drills', Icon: Target },
  { key: 'assignments', label: 'Assignments', Icon: ClipboardList },
  { key: 'activities', label: 'Activities', Icon: Sparkles },
];

function isTab(value: string | undefined): value is TabKey {
  return value === 'assignments' || value === 'bootcamps' || value === 'guided-drills' || value === 'activities';
}

/**
 * Library. The tab is a real route segment (`/teacher/library/guided-drills`),
 * not a query param, so a tab is linkable, bookmarkable, and walks browser
 * history like every other room.
 */
export function DeskLibrarySurface() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const tab: TabKey = isTab(tabParam) ? tabParam : DEFAULT_TAB;
  const [view, setView] = useDeskLibraryView();

  const selectTab = (key: TabKey) => {
    navigate(`/teacher/library/${key}`);
  };

  return (
    <section className="flex h-full w-full flex-col">
      {/* Recessed onto a tinted band so it reads as a level below the room
          rail in the shell header, not a second copy of it. */}
      <nav className="flex shrink-0 flex-wrap items-center gap-1 border-b border-black/10 bg-black/[0.045] px-4 py-1.5">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition',
              tab === key
                ? 'border-b-2 border-teacher-accent font-semibold text-black'
                : 'border-b-2 border-transparent text-black/55 hover:text-black',
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
        <div className="ml-auto">
          <LibraryViewSwitcher value={view} onChange={setView} />
        </div>
      </nav>
      <div className="min-h-0 flex-1">
        {tab === 'assignments' && <DeskLibraryAssignmentsSurface view={view} />}
        {tab === 'bootcamps' && <DeskLibraryBootcampsSurface view={view} />}
        {tab === 'guided-drills' && <DeskLibraryGuidedDrillsSurface view={view} />}
        {tab === 'activities' && <DeskLibraryActivitiesSurface view={view} />}
      </div>
    </section>
  );
}

export default DeskLibrarySurface;

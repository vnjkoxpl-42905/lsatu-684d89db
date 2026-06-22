import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Flame, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeskLibraryView } from '@/hooks/useDeskLibraryView';
import { LibraryViewSwitcher } from '@/components/teacher/desk/library/LibraryViewSwitcher';
import { DeskLibraryAssignmentsSurface } from './library/DeskLibraryAssignmentsSurface';
import { DeskLibraryBootcampsSurface } from './library/DeskLibraryBootcampsSurface';
import { DeskLibraryGuidedDrillsSurface } from './library/DeskLibraryGuidedDrillsSurface';
import { DeskLibraryActivitiesSurface } from './library/DeskLibraryActivitiesSurface';

type TabKey = 'assignments' | 'bootcamps' | 'guided-drills' | 'activities';

const TABS: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'assignments', label: 'Assignments', Icon: ClipboardList },
  { key: 'bootcamps', label: 'Bootcamps', Icon: Flame },
  { key: 'guided-drills', label: 'Guided Drills', Icon: Target },
  { key: 'activities', label: 'Activities', Icon: Sparkles },
];

function isTab(value: string | null): value is TabKey {
  return value === 'assignments' || value === 'bootcamps' || value === 'guided-drills' || value === 'activities';
}

/**
 * Library inside the Teacher Desk. All four tabs are desk-native surfaces
 * (white/glass) — the legacy /teacher/library/* routes redirect here.
 */
export function DeskLibrarySurface() {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('tab');
  const [tab, setTab] = useState<TabKey>(isTab(fromUrl) ? fromUrl : 'assignments');
  const [view, setView] = useDeskLibraryView();

  useEffect(() => {
    if (isTab(fromUrl) && fromUrl !== tab) setTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  const selectTab = (key: TabKey) => {
    setTab(key);
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <section className="flex h-full w-full flex-col">
      <nav className="flex shrink-0 flex-wrap items-center gap-1 border-b border-black/10 px-2 pb-2">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition',
              tab === key
                ? 'border-b-2 border-amber-500 text-black'
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

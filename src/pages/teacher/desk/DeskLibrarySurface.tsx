import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookMarked, ClipboardList, Flame, NotebookPen, Sparkles, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeskLibraryView } from '@/hooks/useDeskLibraryView';
import { LibraryViewSwitcher } from '@/components/teacher/desk/library/LibraryViewSwitcher';
import {
  AssignBundleBar,
  AssignWorkSheet,
  assignItemKey,
  type AssignWorkSheetItem,
} from '@/components/teacher/library/AssignWorkSheet';
import type { AssignableItem } from '@/lib/assignWork';
import { DeskLibraryAssignmentsSurface } from './library/DeskLibraryAssignmentsSurface';
import { DeskLibraryBootcampsSurface } from './library/DeskLibraryBootcampsSurface';
import { DeskLibraryGuidedDrillsSurface } from './library/DeskLibraryGuidedDrillsSurface';
import { DeskLibraryHomeworkSurface } from './library/DeskLibraryHomeworkSurface';
import { DeskLibraryActivitiesSurface } from './library/DeskLibraryActivitiesSurface';
import { DeskLibraryReferencesSurface } from './library/DeskLibraryReferencesSurface';

type TabKey =
  | 'assignments'
  | 'bootcamps'
  | 'guided-drills'
  | 'homework'
  | 'activities'
  | 'references';

const DEFAULT_TAB: TabKey = 'bootcamps';

const TABS: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'bootcamps', label: 'Bootcamps', Icon: Flame },
  { key: 'guided-drills', label: 'Guided Drills', Icon: Target },
  { key: 'homework', label: 'Homework', Icon: NotebookPen },
  { key: 'assignments', label: 'Assignments', Icon: ClipboardList },
  { key: 'activities', label: 'Activities', Icon: Sparkles },
  { key: 'references', label: 'References', Icon: BookMarked },
];

const TAB_KEYS = new Set<string>(TABS.map((t) => t.key));

function isTab(value: string | undefined): value is TabKey {
  return !!value && TAB_KEYS.has(value);
}

/**
 * Library. The tab is a real route segment (`/teacher/library/guided-drills`),
 * not a query param, so a tab is linkable, bookmarkable, and walks browser
 * history like every other room.
 *
 * The assign bundle lives here rather than in a tab, because its whole purpose
 * (spec D4) is to survive a tab change: a drill picked under Guided Drills and a
 * homework set picked under Homework ship to the student as one assignment.
 */
export function DeskLibrarySurface() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const tab: TabKey = isTab(tabParam) ? tabParam : DEFAULT_TAB;
  const [view, setView] = useDeskLibraryView();

  const [bundle, setBundle] = useState<AssignWorkSheetItem[]>([]);
  // What the sheet is currently assigning: either a single item picked straight
  // from a card, or the bundle. Null when the sheet is closed.
  const [sheetItems, setSheetItems] = useState<AssignWorkSheetItem[] | null>(null);

  const selectTab = (key: TabKey) => {
    navigate(`/teacher/library/${key}`);
  };

  const addToBundle = useCallback((item: AssignWorkSheetItem) => {
    setBundle((prev) =>
      prev.some((p) => assignItemKey(p.item) === assignItemKey(item.item)) ? prev : [...prev, item],
    );
  }, []);

  const removeFromBundle = useCallback((item: AssignableItem) => {
    setBundle((prev) => prev.filter((p) => assignItemKey(p.item) !== assignItemKey(item)));
  }, []);

  const assignSingle = useCallback((item: AssignWorkSheetItem) => setSheetItems([item]), []);

  const tabProps = { view, onAssign: assignSingle, onBundle: addToBundle };

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
        {tab === 'guided-drills' && <DeskLibraryGuidedDrillsSurface {...tabProps} />}
        {tab === 'homework' && <DeskLibraryHomeworkSurface {...tabProps} />}
        {tab === 'activities' && <DeskLibraryActivitiesSurface {...tabProps} />}
        {tab === 'references' && <DeskLibraryReferencesSurface />}
      </div>

      <AssignBundleBar
        items={bundle}
        onRemove={removeFromBundle}
        onClear={() => setBundle([])}
        onOpen={() => setSheetItems(bundle)}
      />

      <AssignWorkSheet
        open={sheetItems !== null}
        items={sheetItems ?? []}
        onClose={() => setSheetItems(null)}
        onAssigned={() => {
          // Only the bundle is consumed by assigning it; a one-off assign from a
          // card should not empty a bundle the teacher is still building.
          if (sheetItems && sheetItems.length > 1) setBundle([]);
        }}
      />
    </section>
  );
}

export default DeskLibrarySurface;

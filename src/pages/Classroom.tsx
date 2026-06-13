import { useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ClassroomNavRail } from '@/components/classroom/ClassroomNavRail';
import {
  ClassroomLessonList,
  type ClassroomListItem,
  type ClassroomSectionId,
} from '@/components/classroom/ClassroomLessonList';
import { ClassroomReader } from '@/components/classroom/ClassroomReader';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { useStudentAssignments, useStudentTAAssignments } from '@/hooks/useStudentAssignments';
import { nextActionFor } from '@/lib/classroomItems';

type MobileView = 'list' | 'reader';

export default function Classroom() {
  const { data: items = [] } = useClassroomItems();
  const { assignments: homework } = useStudentAssignments();
  const { assignments: taAssignments } = useStudentTAAssignments();
  const [selectedSection, setSelectedSection] = useState<ClassroomSectionId>('curriculum');
  const [selectedItem, setSelectedItem] = useState<ClassroomListItem | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [navOpen, setNavOpen] = useState(false);

  const fallbackNext = useMemo(() => {
    const open = [
      ...homework.filter((a) => a.status !== 'completed').map((a) => ({
        title: a.set_title || 'Homework',
        description: `${a.question_qids?.length ?? 0} questions`,
        route: `/classroom/${encodeURIComponent(a.id)}`,
        sortKey: new Date(a.created_at).getTime(),
      })),
      ...taAssignments.filter((a) => a.status !== 'completed').map((a) => ({
        title: a.title || 'TA assignment',
        description: 'From Joshua',
        route: `/classroom/ta/${encodeURIComponent(a.id)}`,
        sortKey: new Date(a.assigned_at).getTime(),
      })),
    ].sort((a, b) => b.sortKey - a.sortKey);
    return open[0] ?? null;
  }, [homework, taAssignments]);

  const nextItem = nextActionFor(items);

  const selectSection = (section: ClassroomSectionId) => {
    setSelectedSection(section);
    setSelectedItem(null);
    setMobileView('list');
  };

  const selectItem = (item: ClassroomListItem) => {
    setSelectedItem(item);
    setMobileView('reader');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Open classroom menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Classroom navigation</SheetTitle>
                <SheetDescription>Choose a classroom section.</SheetDescription>
              </SheetHeader>
              <ClassroomNavRail
                selectedSection={selectedSection}
                onSelectSection={selectSection}
                onNavigate={() => setNavOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="text-sm font-semibold tracking-tight">Classroom</div>
          <div className="h-9 w-9" aria-hidden />
        </div>
      </header>

      <main className="lg:flex lg:h-screen lg:min-h-screen lg:overflow-hidden">
        <div className="hidden shrink-0 border-r border-border lg:block">
          <ClassroomNavRail selectedSection={selectedSection} onSelectSection={selectSection} />
        </div>

        <div
          className={
            mobileView === 'reader'
              ? 'hidden lg:block lg:w-[340px] lg:shrink-0 lg:border-r lg:border-border'
              : 'min-h-[calc(100vh-3.5rem)] lg:block lg:w-[340px] lg:shrink-0 lg:border-r lg:border-border'
          }
        >
          <ClassroomLessonList
            selectedSection={selectedSection}
            selectedItemId={selectedItem?.id ?? null}
            onSelectItem={selectItem}
          />
        </div>

        <div
          className={
            mobileView === 'reader'
              ? 'min-h-[calc(100vh-3.5rem)] flex-1 lg:block'
              : 'hidden flex-1 lg:block'
          }
        >
          <ClassroomReader
            item={selectedItem}
            nextItem={nextItem}
            fallbackNext={fallbackNext}
            onBack={() => setMobileView('list')}
          />
        </div>
      </main>
    </div>
  );
}

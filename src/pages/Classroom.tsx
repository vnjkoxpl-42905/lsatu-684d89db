import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { useAuth } from '@/contexts/AuthContext';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { useStudentAssignments, useStudentTAAssignments } from '@/hooks/useStudentAssignments';
import { nextActionFor } from '@/lib/classroomItems';
import { DoThisNextCard } from '@/components/classroom/DoThisNextCard';
import { ThisWeekSection } from '@/components/classroom/ThisWeekSection';
import { AssignedWorkSection } from '@/components/classroom/AssignedWorkSection';
import { BootcampsSection } from '@/components/classroom/BootcampsSection';
import { UploadWorkSection } from '@/components/classroom/UploadWorkSection';
import { RecapsSection } from '@/components/classroom/RecapsSection';
import { AnnouncementsSection } from '@/components/classroom/AnnouncementsSection';

/**
 * Notion-style private workspace for the signed-in student.
 *
 * Composition:
 *   1. Do This Next     - top-priority unlocked classroom_items row,
 *                         with fallback to the highest-priority assigned
 *                         homework when no classroom_items exist yet.
 *   2. This Week        - current published weekly_plan with day items.
 *   3. Assigned work    - homework_assignments + ta_assignments.
 *   4. Upload Work      - student-side intake into external_work_uploads.
 *   5. Session recaps   - classroom_items of type session_recap.
 *   6. From Joshua      - announcements + notes.
 *
 * Existing /classroom/:assignmentId and /classroom/ta/:assignmentId
 * keep working; this page links into them via AssignedWorkSection.
 */
export default function Classroom() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: items = [] } = useClassroomItems();
  const { assignments: hw } = useStudentAssignments();
  const { assignments: ta } = useStudentTAAssignments();

  const fallbackNext = useMemo(() => {
    const open = [
      ...hw.filter((a) => a.status !== 'completed').map((a) => ({
        title: a.set_title || 'Homework',
        description: `${a.question_qids?.length ?? 0} questions`,
        route: `/classroom/${encodeURIComponent(a.id)}`,
        sortKey: new Date(a.created_at).getTime(),
      })),
      ...ta.filter((a) => a.status !== 'completed').map((a) => ({
        title: a.title || 'TA assignment',
        description: 'From Joshua',
        route: `/classroom/ta/${encodeURIComponent(a.id)}`,
        sortKey: new Date(a.assigned_at).getTime(),
      })),
    ].sort((a, b) => b.sortKey - a.sortKey);
    return open[0] ?? null;
  }, [hw, ta]);

  const nextItem = nextActionFor(items);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/foyer')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Foyer
          </Button>
          <div className="flex items-center gap-2 text-foreground">
            <GraduationCap className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight">Classroom</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {user?.email ? 'Welcome back.' : 'Welcome.'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your classroom
          </h1>
        </div>

        {nextItem ? (
          <DoThisNextCard item={nextItem} />
        ) : fallbackNext ? (
          <div className="rounded-2xl border border-border bg-card/50 px-5 py-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                  Do this next
                </div>
                <h3 className="text-lg font-semibold leading-snug">
                  {fallbackNext.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {fallbackNext.description}
                </p>
              </div>
              <Button
                onClick={() => navigate(fallbackNext.route)}
                size="sm"
                className="shrink-0"
              >
                Open
              </Button>
            </div>
          </div>
        ) : (
          <DoThisNextCard item={null} />
        )}

        <BootcampsSection items={items} />

        <ThisWeekSection />

        <AssignedWorkSection />

        <UploadWorkSection />

        <RecapsSection items={items} />

        <AnnouncementsSection items={items} />

        <div className="pt-4 pb-8 text-center text-[11px] text-muted-foreground/70">
          Inbox stays in the messenger; this is your workspace.
        </div>
      </main>
    </div>
  );
}

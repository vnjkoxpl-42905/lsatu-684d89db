import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarDays, Plus, Send, Save, FolderOpen, X, Sparkles, Trash2, ClipboardList, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from 'lucide-react';
import { addDays, format, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentWeeklyPlans, useWeeklyPlanItems, type WeeklyPlan } from '@/hooks/useWeeklyPlan';
import { PrescribedWeekView } from '@/components/classroom/PrescribedWeek';
import { localDayISO } from '@/lib/localDate';
import { buildPrescribedWeek, isPersonalPlan } from '@/lib/weeklyPlanWeek';
import { moveWithinDay, replaceNeedsConfirm } from '@/lib/weeklyPlanBuilder';
import HubStudentList from '@/components/hub/HubStudentList';
import { notifyStudentOfClassroomItem } from '@/lib/classroomNotify';
import type { TodoAction } from '@/lib/todoActions';
import { loadCurriculumWeek } from '@/lib/curriculumSchedule';
import {
  newPublishJob,
  matchesPublishedBuilder,
  publishedTitle,
  stoppedPublishNote,
  unlinkedCurriculum,
  unlinkedCurriculumMessage,
  type PublishJob,
} from '@/lib/weeklyPlanPublish';
import { supabasePublishDeps, useWeeklyPlanPublisher } from '@/hooks/useWeeklyPlanPublisher';
import type { StudentLevel } from '@/lib/studentLevel';
import {
  parseScheduleTemplateText,
  type ScheduleTemplateItem as TemplateItem,
} from '@/lib/scheduleTemplateParser';

interface ItemDraft {
  day: string; // yyyy-MM-dd (local)
  title: string;
  estimatedMinutes?: number;
  /** ISO datetime — overrides day-end as due_at when set. */
  deadline?: string;
  /** Optional wiring: launches a real drill/homework when the student taps it. */
  action?: TodoAction;
  /**
   * Set when this item came from the curriculum and the drill is not yet
   * assigned. Publication waits until an existing assignment is linked.
   */
  curriculumDrillId?: string;
  /** Band to assign that drill at. Undefined uses the student's profile level. */
  curriculumLevel?: StudentLevel | null;
}

/** A launchable assignment the student already has, offered as a task link. */
interface LinkOption {
  value: string; // unique key for the <select>
  label: string;
  action: TodoAction;
}

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  items_json: TemplateItem[];
  created_at: string;
}

export default function TeacherWeeklyPlans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: plans = [], isLoading } = useStudentWeeklyPlans(studentId);

  const today = new Date();
  const defaultStart = startOfWeek(today, { weekStartsOn: 1 });
  const [weekStart, setWeekStart] = useState(format(defaultStart, 'yyyy-MM-dd'));
  const [title, setTitle] = useState('Weekly plan');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [pastedSchedule, setPastedSchedule] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);

  // Publishing ─────────────────────────────────────────────────────────
  // Every write is staged and acknowledged before the plan is marked
  // published (see weeklyPlanPublish). The student is notified only after
  // that, and only the builder the job came from is ever cleared.
  const publishDeps = useMemo(() => supabasePublishDeps(), []);
  const onPublished = useCallback(
    (job: PublishJob, { sameView, sameActor }: { sameView: boolean; sameActor: boolean }) => {
      qc.invalidateQueries({ queryKey: ['weekly-plans-admin', job.studentId] });
      qc.invalidateQueries({ queryKey: ['weekly-plan-items', job.studentId] });
      qc.invalidateQueries({ queryKey: ['current-weekly-plan'] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', job.studentId] });
      if (sameView && matchesPublishedBuilder({ title, weekStart, items }, job)) setItems([]);

      const planTitle = publishedTitle(job);
      // The account changed while the last write was in flight. That write
      // landed under the old account; sending a notification now would go out
      // under the new session with the old account's name on it.
      if (!sameActor) {
        toast.warning(
          `"${planTitle}" was published by the account that started it. The student was not notified because the signed-in account changed during publication.`,
        );
        return;
      }
      void notifyStudentOfClassroomItem({
        adminUserId: job.teacherId, studentId: job.studentId, notificationGroupId: job.planKey, notificationChannel: 'plan',
        title: 'Your plan is ready', description: 'Your assigned plan is available in My Work.',
        route: '/my-work/to-do?workGroup=' + encodeURIComponent(job.planKey), assignmentType: 'weekly_plan',
      }).then((notify) => {
        if (notify.inbox_ok && notify.email_ok && notify.bell_ok) toast.success('Plan published and student notified');
        else toast.warning('Plan published, but notification was incomplete', { description: notify.email_error ?? notify.inbox_error ?? notify.bell_error, action: notify.retryBell ? { label: 'Retry notification', onClick: () => void notify.retryBell!().then(() => toast.success('Bell notification delivered')).catch(() => toast.error('Notification failed. Try again.')) } : undefined });
      });
    },
    [qc, title, weekStart, items],
  );
  const publisher = useWeeklyPlanPublisher({
    currentTeacherId: user?.id ?? null,
    currentStudentId: studentId,
    deps: publishDeps,
    onPublished,
  });
  const stopped = publisher.stoppedFor(studentId);
  const publishing = publisher.busyFor(studentId);
  const unlinked = unlinkedCurriculum(items);

  // Templates ─────────────────────────────────────────────────────────
  const { data: templates = [], refetch: refetchTemplates } = useQuery<TemplateRow[]>({
    queryKey: ['schedule-templates'],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (c: string, o: { ascending: boolean }) => Promise<{ data: TemplateRow[] | null; error: { message: string } | null }>;
          };
        };
      })
        .from('schedule_templates')
        .select('id,title,description,items_json,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Launchable assignments this student already has, offered as task links so a
  // wired task both opens the surface and auto-completes when finished.
  const { data: linkOptions = [] } = useQuery<LinkOption[]>({
    queryKey: ['todo-link-options', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const opts: LinkOption[] = [];
      const { data: hw } = await supabase
        .from('homework_assignments')
        .select('id,set_title,status')
        .eq('student_id', studentId as string)
        .neq('status', 'completed');
      for (const h of hw ?? []) {
        opts.push({
          value: `hw:${h.id}`,
          label: `Homework: ${h.set_title ?? 'Untitled set'}`,
          action: { kind: 'homework', ref_id: h.id, route: `/drill?assignmentId=${h.id}` },
        });
      }
      const { data: gd } = await supabase
        .from('guided_drill_assignments')
        .select('id,status,guided_drills(title)')
        .eq('student_id', studentId as string)
        .neq('status', 'completed');
      for (const g of (gd ?? []) as unknown as { id: string; guided_drills: { title: string | null } | null }[]) {
        opts.push({
          value: `gd:${g.id}`,
          label: `Drill: ${g.guided_drills?.title ?? 'Guided drill'}`,
          action: { kind: 'drill', ref_id: g.id, route: `/guided/${g.id}` },
        });
      }
      return opts;
    },
  });

  const days = useMemo(() => {
    const start = parseISO(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const addItem = (day: Date) => {
    setItems((prev) => [
      ...prev,
      // No default estimate: a number here is shown to the student as the
      // time this task takes, so it has to be one Joshua actually chose.
      { day: format(day, 'yyyy-MM-dd'), title: '' },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const moveItem = (idx: number, direction: -1 | 1) =>
    setItems((prev) => moveWithinDay(prev, idx, direction));

  /**
   * Loading a stored or pasted schedule replaces the builder. When Joshua has
   * already laid out tasks, that replacement must be his decision, not a
   * side effect of a click in the library.
   */
  const confirmReplace = (incoming: number) =>
    !replaceNeedsConfirm(items.length) ||
    window.confirm(
      `Replace the ${items.length} task${items.length === 1 ? '' : 's'} in the builder with ${incoming} from this schedule?`,
    );

  /**
   * Populate the builder from where the student actually is in their
   * curriculum. Writes nothing: it fills the same draft rows Joshua would type
   * by hand, so he reviews and edits before the existing Publish runs.
   */
  const [filling, setFilling] = useState(false);
  const fillFromCurriculum = async () => {
    if (!studentId) return;
    setFilling(true);
    try {
      const week = await loadCurriculumWeek({ studentId, weekStart });
      if (week.slots.length === 0) {
        toast.info(
          week.emptyReason === 'curriculum-complete'
            ? 'This student has already been assigned everything on their track.'
            : 'No curriculum track for this student yet.',
        );
        return;
      }
      setItems((prev) => [
        ...prev,
        ...week.slots.map((slot) => ({
          day: slot.day,
          title: slot.title,
          estimatedMinutes: slot.estimatedMinutes ?? undefined,
          curriculumDrillId: slot.guidedDrillId,
          curriculumLevel: slot.level,
        })),
      ]);
      toast.success(
        `Added ${week.slots.length} drill${week.slots.length === 1 ? '' : 's'} from the curriculum.`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not read the curriculum');
    } finally {
      setFilling(false);
    }
  };

  const publish = async () => {
    if (!studentId || !user) return;
    if (items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    if (items.some((it) => !it.title.trim())) {
      toast.error('Every item needs a title');
      return;
    }
    if (publishing) return;
    if (stopped) {
      toast.error('Finish or set aside the stopped publish for this student first.');
      return;
    }
    // Publishing never assigns curriculum drills itself. Refuse before any
    // write until each suggestion is linked to a saved assignment.
    if (unlinked.length > 0) {
      toast.error(unlinkedCurriculumMessage(unlinked.length));
      return;
    }
    // The job snapshots this builder now. Later edits, or switching students,
    // cannot change what is being published.
    void runJob(
      newPublishJob({ teacherId: user.id, studentId, title, weekStart, drafts: items }),
    );
  };

  const runJob = async (job: PublishJob) => {
    const outcome = await publisher.run(job);
    if (outcome && !outcome.ok) {
      toast.error(`Publishing "${publishedTitle(outcome.job)}" stopped: ${outcome.message}`, {
        description: stoppedPublishNote(outcome),
      });
    }
  };

  const itemsToTemplateItems = (sourceItems: ItemDraft[]): TemplateItem[] => {
    const start = parseISO(weekStart);
    return sourceItems.map((it) => {
      const dayDate = parseISO(it.day);
      const offset = Math.round((startOfDay(dayDate).getTime() - startOfDay(start).getTime()) / (24 * 60 * 60 * 1000));
      let deadlineOffset: number | null = null;
      if (it.deadline) {
        const d = new Date(it.deadline).getTime();
        deadlineOffset = Math.round((d - startOfDay(start).getTime()) / (60 * 1000));
      }
      return {
        day_offset: offset,
        title: it.title,
        estimated_minutes: it.estimatedMinutes ?? null,
        deadline_offset_minutes: deadlineOffset,
      };
    });
  };

  const templateItemsToDrafts = (tplItems: TemplateItem[]): ItemDraft[] => {
    const start = parseISO(weekStart);
    return (tplItems ?? []).map((t) => {
      const day = addDays(start, t.day_offset ?? 0);
      let deadline: string | undefined;
      if (typeof t.deadline_offset_minutes === 'number') {
        const d = new Date(start.getTime() + t.deadline_offset_minutes * 60 * 1000);
        deadline = format(d, "yyyy-MM-dd'T'HH:mm");
      }
      return {
        day: format(day, 'yyyy-MM-dd'),
        title: t.title,
        estimatedMinutes: t.estimated_minutes ?? undefined,
        deadline,
      };
    });
  };

  const saveTemplate = async (tplItems: TemplateItem[], fallbackTitle: string) => {
    const cleanTitle = templateTitle.trim() || fallbackTitle.trim();
    if (!cleanTitle) {
      toast.error('Name the stored schedule first');
      return;
    }
    if (!user?.id) {
      toast.error('You must be signed in as an admin to save schedules');
      return;
    }
    if (tplItems.length === 0) {
      toast.error('Add or paste at least one schedule item');
      return;
    }

    setSavingTemplate(true);
    try {
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from('schedule_templates')
        .insert({
          created_by: user.id,
          title: cleanTitle,
          description: templateDescription.trim() || null,
          template_type: 'weekly',
          items_json: tplItems.filter((item) => item.title.trim()),
        });
      if (error) throw error;
      toast.success('Stored schedule saved');
      setTemplateTitle('');
      setTemplateDescription('');
      setPastedSchedule('');
      await refetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingTemplate(false);
    }
  };

  const saveBuilderAsTemplate = async () => {
    if (items.length === 0) {
      toast.error('Add some items first');
      return;
    }
    if (items.some((it) => !it.title.trim())) {
      toast.error('Every item needs a title before saving');
      return;
    }
    await saveTemplate(itemsToTemplateItems(items), title || 'Weekly plan template');
  };

  const savePastedSchedule = async () => {
    const parsed = parseScheduleTemplateText(pastedSchedule);
    await saveTemplate(parsed, 'Stored schedule');
  };

  const loadPastedSchedule = () => {
    const parsed = parseScheduleTemplateText(pastedSchedule);
    if (parsed.length === 0) {
      toast.error('No schedule items found. Use day headings like Monday, Tuesday, or inline labels like Monday: task.');
      return;
    }
    if (!confirmReplace(parsed.length)) return;
    setItems(templateItemsToDrafts(parsed));
    if (templateTitle.trim()) setTitle(templateTitle.trim());
    toast.success(`Loaded ${parsed.length} item${parsed.length === 1 ? '' : 's'} into the builder`);
  };

  const loadTemplate = (tpl: TemplateRow) => {
    if (!confirmReplace(tpl.items_json?.length ?? 0)) return;
    setItems(templateItemsToDrafts(tpl.items_json ?? []));
    if (tpl.title) setTitle(tpl.title);
    toast.success(`Loaded "${tpl.title}"`);
  };

  const deleteTemplate = async (tpl: TemplateRow) => {
    setDeletingTemplateId(tpl.id);
    try {
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      })
        .from('schedule_templates')
        .delete()
        .eq('id', tpl.id);
      if (error) throw error;
      toast.success(`Deleted "${tpl.title}"`);
      await refetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // Reset items when student changes so we never publish stale state to the
  // wrong student.
  useEffect(() => {
    setItems([]);
    setOpenPlanId(null);
  }, [studentId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <CalendarDays className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">Pick a student</span>
        </div>
        <HubStudentList
          selectedId={studentId}
          onSelect={(id) =>
            setSearchParams((p) => {
              const c = new URLSearchParams(p);
              c.set('student', id);
              return c;
            })
          }
        />
      </aside>

      <section className="p-6 space-y-5 overflow-y-auto">
        {!studentId ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-12 text-center text-sm text-zinc-500">
            Select a student to build or view their weekly plan.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">Build a plan</h2>
              <p className="text-sm text-zinc-400">
                Add items per day, then publish. Each item becomes a real
                classroom_items row visible in the student's Classroom and
                Schedule.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fillFromCurriculum}
                  disabled={filling || !studentId}
                >
                  {filling ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Fill from curriculum
                </Button>
                <span className="text-xs text-zinc-500">
                  Suggests drills from where this student left off, at their level.
                  Publishing does not assign them: assign each one through the usual
                  assignment workflow, then pick its saved assignment in the task's Link
                  menu.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Week starts</Label>
                <Input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/30">
              <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-zinc-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">Stored schedules</h3>
                    <p className="text-xs text-zinc-500">
                      Save premade weekly schedules, load one for a student, then publish it.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveBuilderAsTemplate}
                  disabled={savingTemplate || items.length === 0}
                >
                  {savingTemplate ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Store current plan
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Stored schedule name</Label>
                      <Input
                        value={templateTitle}
                        onChange={(e) => setTemplateTitle(e.target.value)}
                        placeholder="Example: RC maintenance week"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <Input
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Optional internal note"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Paste premade schedule</Label>
                    <Textarea
                      value={pastedSchedule}
                      onChange={(e) => setPastedSchedule(e.target.value)}
                      placeholder={`Monday:\n- Timed LR section (35 min)\n- Blind review misses (45 min)\n\nWednesday: RC passage set (30 min)`}
                      className="mt-1 min-h-[132px] resize-y text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadPastedSchedule}
                      disabled={!pastedSchedule.trim()}
                    >
                      <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                      Load paste into builder
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={savePastedSchedule}
                      disabled={savingTemplate || !pastedSchedule.trim()}
                    >
                      {savingTemplate ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Save pasted schedule
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-zinc-800 bg-zinc-950/60">
                  <div className="px-3 py-2 border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                    Library
                  </div>
                  {templates.length === 0 ? (
                    <div className="px-3 py-8 text-center text-xs text-zinc-500">
                      No stored schedules yet.
                    </div>
                  ) : (
                    <ul className="max-h-[260px] overflow-y-auto divide-y divide-zinc-800">
                      {templates.map((tpl) => (
                        <li key={tpl.id} className="px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => loadTemplate(tpl)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="text-sm text-zinc-100 truncate">{tpl.title}</div>
                              <div className="text-[11px] text-zinc-500">
                                {tpl.items_json?.length ?? 0} item{(tpl.items_json?.length ?? 0) === 1 ? '' : 's'}
                                {tpl.description ? ` · ${tpl.description}` : ''}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTemplate(tpl)}
                              disabled={deletingTemplateId === tpl.id}
                              className="p-1 rounded text-zinc-600 hover:text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                              aria-label={`Delete ${tpl.title}`}
                            >
                              {deletingTemplateId === tpl.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 min-h-[120px]"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                      <div>Assigned day</div>
                      <div className="text-zinc-300">{format(d, 'EEE M/d')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addItem(d)}
                      className="text-zinc-500 hover:text-zinc-100"
                      aria-label="Add item"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {items
                      .map((it, i) => ({ it, i }))
                      .filter(({ it }) => it.day === format(d, 'yyyy-MM-dd'))
                      .map(({ it, i }, position, dayItems) => (
                        <li key={i} className="rounded-md bg-zinc-950 border border-zinc-800 p-1.5 space-y-1">
                          {it.curriculumDrillId ? (
                            <div className="text-[10px] uppercase tracking-wider text-amber-400/80">
                              Suggested from curriculum
                              {it.action ? null : (
                                <span className="block normal-case tracking-normal text-amber-300">
                                  Not assigned yet. Link its saved assignment below.
                                </span>
                              )}
                            </div>
                          ) : null}
                          <Input
                            value={it.title}
                            onChange={(e) => updateItem(i, { title: e.target.value })}
                            placeholder="Task"
                            aria-label={`Task ${position + 1} title, ${format(d, 'EEEE')}`}
                            className="h-7 text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              value={it.estimatedMinutes ?? ''}
                              placeholder="?"
                              aria-label={`Task ${position + 1} estimated minutes`}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                // Blank or zero means no estimate; the student
                                // sees "No time estimate", not a made-up number.
                                updateItem(i, { estimatedMinutes: n > 0 ? n : undefined });
                              }}
                              className="h-6 text-xs w-16"
                            />
                            <span className="text-[10px] text-zinc-500">min</span>
                            <button
                              type="button"
                              onClick={() => moveItem(i, -1)}
                              disabled={position === 0}
                              className="ml-auto text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
                              aria-label={`Move task ${position + 1} earlier`}
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(i, 1)}
                              disabled={position === dayItems.length - 1}
                              className="text-zinc-500 hover:text-zinc-100 disabled:opacity-30"
                              aria-label={`Move task ${position + 1} later`}
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-[10px] text-zinc-500 hover:text-zinc-100"
                              aria-label={`Remove task ${position + 1}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                              Deadline (optional)
                            </div>
                            <Input
                              type="datetime-local"
                              value={it.deadline ?? ''}
                              onChange={(e) => updateItem(i, { deadline: e.target.value || undefined })}
                              className="h-6 text-[11px]"
                            />
                          </div>
                          <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                              Link (optional)
                            </div>
                            <select
                              value={it.action ? linkOptions.find((o) => o.action.ref_id === it.action?.ref_id)?.value ?? '' : ''}
                              onChange={(e) => {
                                const opt = linkOptions.find((o) => o.value === e.target.value);
                                updateItem(i, { action: opt?.action });
                              }}
                              className="h-6 w-full text-[11px] rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 px-1"
                            >
                              <option value="">No link (plain task)</option>
                              {linkOptions.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>

            {stopped ? (
              <section
                role="alert"
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 space-y-2"
              >
                <p>
                  Publishing "{publishedTitle(stopped.job)}" stopped: {stopped.message}
                </p>
                <p className="text-xs text-amber-200/80">
                  {stoppedPublishNote(stopped)} These saves are separate steps, not one
                  transaction. Trying again looks for what was already saved before writing again,
                  and it only runs while you are signed in as the account that started it. If this
                  page reloads, this retry is lost; anything saved stays in Existing plans. The
                  student is notified only once the week is confirmed published.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void runJob(stopped.job)} disabled={publishing}>
                    {publishing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    Try publishing again
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={publishing}
                    onClick={() => studentId && publisher.dismiss(studentId)}
                  >
                    Leave it as a draft
                  </Button>
                </div>
              </section>
            ) : null}

            {unlinked.length > 0 ? (
              <p role="status" className="text-xs text-amber-300 text-right">
                {unlinkedCurriculumMessage(unlinked.length)}
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button
                onClick={publish}
                disabled={publishing || !!stopped || items.length === 0 || unlinked.length > 0}
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish plan
                  </>
                )}
              </Button>
            </div>

            {/* AI drafting placeholder — truthful */}
            <section className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-3 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
              <div className="text-xs text-zinc-400 leading-relaxed">
                AI schedule drafting requires an LLM provider configuration. When
                Joshua wires that up, drafts will appear in the AI Teaching
                Assistant page and Joshua can review/edit before they publish
                here. Until then this builder is the source of truth.
              </div>
            </section>

            <section className="pt-4 space-y-2">
              <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                Existing plans
              </h3>
              {isLoading ? (
                <div className="text-sm text-zinc-500">Loading…</div>
              ) : plans.length === 0 ? (
                <div className="text-sm text-zinc-500 italic">None yet.</div>
              ) : (
                <ul className="space-y-1.5">
                  {plans.map((p) => (
                    <ExistingPlanRow
                      key={p.id}
                      plan={p}
                      studentId={studentId}
                      open={openPlanId === p.id}
                      onToggle={() => setOpenPlanId((cur) => (cur === p.id ? null : p.id))}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * One published (or draft) plan in the list. Expanding it shows the week the
 * student scans: same order, same stored status, same counts and estimates,
 * built by the same model.
 */
function ExistingPlanRow({
  plan,
  studentId,
  open,
  onToggle,
}: {
  plan: WeeklyPlan;
  studentId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const personal = isPersonalPlan(plan);
  // Scoped to the selected student; a plan that is not theirs is never read.
  const itemsQuery = useWeeklyPlanItems(open ? plan : null, studentId);
  const week = useMemo(
    () => (itemsQuery.data ? buildPrescribedWeek(plan, itemsQuery.data, new Date(), localDayISO()) : null),
    [itemsQuery.data, plan],
  );
  const panelId = `plan-items-${plan.id}`;

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 w-24">
          {personal ? 'student' : plan.status}
        </div>
        <div className="text-sm text-zinc-100 flex-1 truncate">
          {personal ? "Student's own to-do tasks" : plan.title}
        </div>
        <div className="text-[11px] text-zinc-500 shrink-0">
          {personal ? 'Ongoing' : `${plan.week_start} – ${plan.week_end}`}
        </div>
      </button>
      {open ? (
        <div id={panelId} className="border-t border-zinc-800 px-4 py-3">
          {itemsQuery.isLoading ? (
            <div className="text-sm text-zinc-500">Loading tasks…</div>
          ) : itemsQuery.isError ? (
            <div className="flex items-center gap-3 text-sm text-red-300" role="alert">
              Could not load this plan's tasks.
              <Button variant="outline" size="sm" onClick={() => void itemsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : personal ? (
            <div className="text-sm text-zinc-400">
              Tasks the student added for themselves. This is not a prescribed week, so it is not shown
              as one.
            </div>
          ) : week ? (
            <PrescribedWeekView week={week} audience="teacher" />
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

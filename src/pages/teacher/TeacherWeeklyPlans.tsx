import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarDays, Plus, Send, Save, FolderOpen, X, Sparkles } from 'lucide-react';
import { addDays, endOfDay, format, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentWeeklyPlans } from '@/hooks/useWeeklyPlan';
import HubStudentList from '@/components/hub/HubStudentList';
import { createClassroomItem, resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';

interface ItemDraft {
  day: string; // yyyy-MM-dd (local)
  title: string;
  estimatedMinutes?: number;
  /** ISO datetime — overrides day-end as due_at when set. */
  deadline?: string;
}

interface TemplateRow {
  id: string;
  title: string;
  description: string | null;
  items_json: TemplateItem[];
  created_at: string;
}

interface TemplateItem {
  day_offset: number;
  title: string;
  estimated_minutes?: number | null;
  instructions?: string | null;
  deadline_offset_minutes?: number | null;
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
  const [creating, setCreating] = useState(false);

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

  const days = useMemo(() => {
    const start = parseISO(weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekStart]);

  const addItem = (day: Date) => {
    setItems((prev) => [
      ...prev,
      { day: format(day, 'yyyy-MM-dd'), title: '', estimatedMinutes: 30 },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

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
    setCreating(true);
    try {
      const start = parseISO(weekStart);
      const end = addDays(start, 6);

      // 1) Create the weekly_plans row.
      const { data: plan, error: pErr } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: () => {
              single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
            };
          };
        };
      })
        .from('weekly_plans')
        .insert({
          student_id: studentId,
          created_by: user.id,
          title: title.trim() || 'Weekly plan',
          week_start: format(start, 'yyyy-MM-dd'),
          week_end: format(end, 'yyyy-MM-dd'),
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (pErr || !plan) throw pErr ?? new Error('Failed to create plan');
      const planId = plan.id;

      // 2) Insert weekly_plan_items first so each row has an id we can
      //    reference from a classroom_items row.
      const itemRows = items.map((it, idx) => {
        const dayDate = parseISO(it.day);
        const unlockAt = startOfDay(dayDate).toISOString();
        const dueAt = it.deadline ? new Date(it.deadline).toISOString() : endOfDay(dayDate).toISOString();
        return {
          weekly_plan_id: planId,
          student_id: studentId,
          day_date: it.day,
          title: it.title.trim(),
          estimated_minutes: it.estimatedMinutes ?? null,
          sort_order: idx,
          status: 'assigned',
          unlock_at: unlockAt,
          due_at: dueAt,
        };
      });

      const { data: insertedItems, error: iErr } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => {
            select: (s: string) => Promise<{ data: { id: string; day_date: string; title: string; unlock_at: string; due_at: string; estimated_minutes: number | null }[] | null; error: { message: string } | null }>;
          };
        };
      })
        .from('weekly_plan_items')
        .insert(itemRows)
        .select('id,day_date,title,unlock_at,due_at,estimated_minutes');
      if (iErr) throw iErr;
      if (!insertedItems) throw new Error('Failed to create plan items');

      // 3) For each weekly_plan_item, create a real classroom_items row
      //    visible to the student. Back-link via classroom_item_id.
      const failed: string[] = [];
      for (const wpi of insertedItems) {
        try {
          const ci = await createClassroomItem({
            studentId,
            createdBy: user.id,
            type: 'weekly_plan_task',
            title: wpi.title,
            description:
              (title.trim() ? `${title.trim()}` : 'Weekly plan') +
              (wpi.estimated_minutes ? ` · ~${wpi.estimated_minutes} min` : ''),
            unlockAt: wpi.unlock_at,
            dueAt: wpi.due_at,
            sourceTable: 'weekly_plan_items',
            sourceId: wpi.id,
            visibleToStudent: true,
            status: 'assigned',
            metadata: {
              weekly_plan_id: planId,
              day_date: wpi.day_date,
              estimated_minutes: wpi.estimated_minutes,
            },
          });
          // Back-link weekly_plan_item -> classroom_items.id
          await (supabase as unknown as {
            from: (t: string) => {
              update: (v: unknown) => {
                eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
              };
            };
          })
            .from('weekly_plan_items')
            .update({ classroom_item_id: ci.id })
            .eq('id', wpi.id);
        } catch (e) {
          console.error('[weekly-plan] classroom_items create failed', { wpi, error: e });
          failed.push(wpi.title);
        }
      }

      if (failed.length > 0) {
        toast.error(
          `Plan published but ${failed.length} item(s) did not become Classroom items: ${failed.join(', ')}`,
        );
      }

      // 4) One summary notification per published plan (not one per item —
      //    flooding the bell with seven entries on a weekly plan is bad UX).
      const notify = await notifyStudentOfClassroomItem({
        adminUserId: user.id,
        studentId,
        title: `Weekly plan: ${title.trim() || 'Weekly plan'}`,
        description: `${items.length} item${items.length === 1 ? '' : 's'} this week. Open Classroom to see them.`,
        route: '/classroom',
        assignmentType: 'weekly_plan',
      });

      qc.invalidateQueries({ queryKey: ['weekly-plans-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['current-weekly-plan'] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      setItems([]);

      const summary = summarizeNotifyResult(notify);
      if (notify.inbox_ok && notify.bell_ok && notify.email_ok) {
        toast.success(summary);
      } else {
        toast.warning(summary, {
          description: notify.email_error ?? notify.inbox_error ?? notify.bell_error,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to publish';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const saveAsTemplate = async () => {
    if (items.length === 0) {
      toast.error('Add some items first');
      return;
    }
    const tplTitle = window.prompt('Template title', title || 'Weekly plan template');
    if (!tplTitle) return;

    const start = parseISO(weekStart);
    const tplItems: TemplateItem[] = items.map((it) => {
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

    try {
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from('schedule_templates')
        .insert({
          created_by: user?.id,
          title: tplTitle,
          template_type: 'weekly',
          items_json: tplItems,
        });
      if (error) throw error;
      toast.success('Template saved');
      refetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const loadTemplate = (tpl: TemplateRow) => {
    const start = parseISO(weekStart);
    const next: ItemDraft[] = (tpl.items_json ?? []).map((t) => {
      const day = addDays(start, t.day_offset ?? 0);
      let deadline: string | undefined;
      if (typeof t.deadline_offset_minutes === 'number') {
        const d = new Date(start.getTime() + t.deadline_offset_minutes * 60 * 1000);
        // datetime-local format: yyyy-MM-ddTHH:mm
        deadline = format(d, "yyyy-MM-dd'T'HH:mm");
      }
      return {
        day: format(day, 'yyyy-MM-dd'),
        title: t.title,
        estimatedMinutes: t.estimated_minutes ?? undefined,
        deadline,
      };
    });
    setItems(next);
    if (tpl.title) setTitle(tpl.title);
    toast.success(`Loaded "${tpl.title}"`);
  };

  // Reset items when student changes so we never publish stale state to the
  // wrong student.
  useEffect(() => {
    setItems([]);
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

            {/* Templates row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={saveAsTemplate} disabled={items.length === 0}>
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save as template
              </Button>
              {templates.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[11px] text-zinc-500 uppercase tracking-wider">Templates:</span>
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => loadTemplate(tpl)}
                      className="text-[11px] px-2 py-1 rounded-full border border-zinc-800 bg-zinc-900/30 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900"
                    >
                      {tpl.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                      .map(({ it, i }) => (
                        <li key={i} className="rounded-md bg-zinc-950 border border-zinc-800 p-1.5 space-y-1">
                          <Input
                            value={it.title}
                            onChange={(e) => updateItem(i, { title: e.target.value })}
                            placeholder="Task"
                            className="h-7 text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={it.estimatedMinutes ?? 0}
                              onChange={(e) =>
                                updateItem(i, {
                                  estimatedMinutes: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="h-6 text-xs w-16"
                            />
                            <span className="text-[10px] text-zinc-500">min</span>
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-100"
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
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={publish} disabled={creating || items.length === 0}>
                {creating ? (
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
                    <li
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40"
                    >
                      <div className="text-[11px] uppercase tracking-wider text-zinc-500 w-24">
                        {p.status}
                      </div>
                      <div className="text-sm text-zinc-100 flex-1 truncate">{p.title}</div>
                      <div className="text-[11px] text-zinc-500 shrink-0">
                        {p.week_start} – {p.week_end}
                      </div>
                    </li>
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

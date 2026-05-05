import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, CalendarDays, Plus, Send } from 'lucide-react';
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentWeeklyPlans } from '@/hooks/useWeeklyPlan';
import HubStudentList from '@/components/hub/HubStudentList';

interface ItemDraft {
  day: string; // yyyy-MM-dd
  title: string;
  estimatedMinutes?: number;
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
      const { data: plan, error: pErr } = await (supabase as any)
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

      const rows = items.map((it, idx) => ({
        weekly_plan_id: plan.id,
        student_id: studentId,
        day_date: it.day,
        title: it.title.trim(),
        estimated_minutes: it.estimatedMinutes ?? null,
        sort_order: idx,
        status: 'assigned',
      }));
      const { error: iErr } = await (supabase as any)
        .from('weekly_plan_items')
        .insert(rows);
      if (iErr) throw iErr;

      qc.invalidateQueries({ queryKey: ['weekly-plans-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['current-weekly-plan'] });
      setItems([]);
      toast.success('Plan published');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to publish');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <CalendarDays className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
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
                Add items per day, then publish. The student sees the plan
                under "This Week" in Classroom.
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 min-h-[120px]"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                      {format(d, 'EEE M/d')}
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
                              Remove
                            </button>
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

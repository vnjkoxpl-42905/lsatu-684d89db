import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Loader2,
  BookOpen,
  Flame,
  StickyNote,
  Megaphone,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem, resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useStudentClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { cn } from '@/lib/utils';

interface Props {
  studentId: string;
  adminUserId: string;
  /** Optional — kept for callers that still want a Cancel/Done affordance. */
  onClose?: () => void;
  /** Fired with the freshly created classroom_items row after success. */
  onAssigned?: (item: ClassroomItem) => void;
}

interface HomeworkSetRow {
  id: string;
  title: string;
  question_qids: string[] | null;
  is_guided_set?: boolean | null;
  guided_set_type?: string | null;
  estimated_minutes?: number | null;
}

import { BOOTCAMPS } from '@/lib/bootcamps';

type IconCmp = React.ComponentType<{ className?: string }>;

interface TypeDef {
  value: ClassroomItem['type'];
  label: string;
  description: string;
  icon: IconCmp;
  /** Top-row primary action vs "More" row. */
  primary: boolean;
  submitLabel: string;
}

const TYPES: TypeDef[] = [
  { value: 'homework', label: 'Homework', description: 'Pick a homework set', icon: BookOpen, primary: true, submitLabel: 'Assign homework' },
  { value: 'bootcamp_module', label: 'Bootcamp', description: 'Open a bootcamp module', icon: Flame, primary: true, submitLabel: 'Assign bootcamp' },
  { value: 'note', label: 'Note', description: 'Quick note from Joshua', icon: StickyNote, primary: false, submitLabel: 'Send note' },
  { value: 'announcement', label: 'Announcement', description: 'Broadcast a message', icon: Megaphone, primary: false, submitLabel: 'Post announcement' },
  { value: 'session_recap', label: 'Recap', description: 'Recap a session', icon: FileText, primary: false, submitLabel: 'Post recap' },
];

const SCHEDULABLE_TYPES = new Set<ClassroomItem['type']>(['homework', 'drill', 'bootcamp_module']);

const TYPE_BY_VALUE = new Map(TYPES.map((t) => [t.value, t]));

export default function AssignmentBuilder({ studentId, adminUserId, onClose, onAssigned }: Props) {
  const qc = useQueryClient();
  const [type, setType] = useState<ClassroomItem['type']>('homework');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [homeworkSetId, setHomeworkSetId] = useState<string>('');
  const [bootcampId, setBootcampId] = useState<string>(BOOTCAMPS[0].id);
  const [homeworkSets, setHomeworkSets] = useState<HomeworkSetRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState<ClassroomItem[]>([]);

  const { data: existingItems = [] } = useStudentClassroomItems(studentId);

  // Reset session-scoped state when switching students.
  useEffect(() => {
    setRecent([]);
    setTitle('');
    setDescription('');
    setHomeworkSetId('');
    setUnlockAt('');
    setDueAt('');
  }, [studentId]);

  useEffect(() => {
    if (type !== 'homework') return;
    let cancelled = false;
    (async () => {
      // Guided-set columns aren't in the auto-generated Supabase types yet.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('homework_sets')
        .select('id,title,question_qids,is_guided_set,guided_set_type,estimated_minutes')
        .order('is_guided_set', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) setHomeworkSets((data ?? []) as HomeworkSetRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    if (type !== 'homework' || !homeworkSetId) return;
    const found = homeworkSets.find((h) => h.id === homeworkSetId);
    if (found) setTitle(found.title);
  }, [homeworkSetId, homeworkSets, type]);

  useEffect(() => {
    if (type !== 'bootcamp_module') return;
    const b = BOOTCAMPS.find((x) => x.id === bootcampId);
    if (b) {
      setTitle(b.title);
      setDescription((d) => d || b.description);
    }
  }, [type, bootcampId]);

  const duplicate = useMemo(() => {
    if (type === 'bootcamp_module') {
      return existingItems.some(
        (i) =>
          i.type === 'bootcamp_module' &&
          i.metadata_json?.bootcamp_id === bootcampId &&
          i.status !== 'archived' &&
          i.status !== 'completed',
      );
    }
    if (type === 'homework' && homeworkSetId) {
      return existingItems.some(
        (i) =>
          i.type === 'homework' &&
          i.metadata_json?.set_id === homeworkSetId &&
          i.status !== 'archived' &&
          i.status !== 'completed',
      );
    }
    return false;
  }, [type, bootcampId, homeworkSetId, existingItems]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setHomeworkSetId('');
    setUnlockAt('');
    setDueAt('');
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Title required');
      return;
    }
    if (duplicate) {
      toast.error(
        type === 'bootcamp_module'
          ? 'This bootcamp is already assigned'
          : 'This homework set is already assigned',
      );
      return;
    }
    setSubmitting(true);
    try {
      let sourceId: string | undefined;
      let sourceTable: string | undefined;
      let metadata: Record<string, unknown> = {};

      if (type === 'homework' && homeworkSetId) {
        const set = homeworkSets.find((h) => h.id === homeworkSetId);
        const { data: hw, error: hwErr } = await supabase
          .from('homework_assignments')
          .insert({
            set_id: homeworkSetId,
            student_id: studentId,
            assigned_by: adminUserId,
            set_title: set?.title ?? title,
            question_qids: set?.question_qids ?? [],
            status: 'assigned',
            class_id: studentId,
          })
          .select('id')
          .single();
        if (hwErr) throw hwErr;
        sourceId = hw?.id;
        sourceTable = 'homework_assignments';
        metadata = { set_id: homeworkSetId };
      } else if (type === 'bootcamp_module') {
        const b = BOOTCAMPS.find((x) => x.id === bootcampId);
        if (!b) throw new Error('Bootcamp not found');
        sourceTable = 'bootcamps';
        sourceId = b.route;
        metadata = { bootcamp_id: b.id };
      }

      const item = await createClassroomItem({
        studentId,
        createdBy: adminUserId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        sourceId,
        sourceTable,
        visibleToStudent: true,
        status: 'assigned',
        metadata,
      });

      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });

      // Notify after the item is created. Notify failure does NOT roll
      // back the assignment — assignment is the source of truth.
      const notify = await notifyStudentOfClassroomItem({
        adminUserId,
        studentId,
        title: title.trim(),
        description: description.trim() || undefined,
        route: resolveItemRoute(item) ?? `/classroom/item/${item.id}`,
      });

      const summary = summarizeNotifyResult(notify);
      if (notify.inbox_ok && notify.bell_ok && notify.email_ok) {
        toast.success(summary);
      } else {
        toast.warning(summary, {
          description:
            notify.email_error ?? notify.inbox_error ?? notify.bell_error,
        });
      }

      // Always: prepend the real DB item to the recent list, reset the
      // form, keep the builder open for the next assignment.
      setRecent((prev) => [item, ...prev]);
      resetForm();
      onAssigned?.(item);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const activeType = TYPE_BY_VALUE.get(type)!;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold tracking-tight">Assign work</h3>
        <p className="text-xs text-zinc-400 mt-0.5">
          Creates a classroom_items row, posts an inbox message, sends a bell
          notification, and emails the student.
        </p>
      </div>

      <div>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.filter((t) => t.primary).map((t) => (
            <TypeCard
              key={t.value}
              def={t}
              active={type === t.value}
              onClick={() => setType(t.value)}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TYPES.filter((t) => !t.primary).map((t) => (
            <TypeChip
              key={t.value}
              def={t}
              active={type === t.value}
              onClick={() => setType(t.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {type === 'homework' && (
          <div>
            <Label className="text-xs">Homework set (optional)</Label>
            <select
              value={homeworkSetId}
              onChange={(e) => setHomeworkSetId(e.target.value)}
              className="mt-1 w-full text-sm rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            >
              <option value="">— No specific set —</option>
              {(() => {
                const guided = homeworkSets.filter((h) => h.is_guided_set);
                const regular = homeworkSets.filter((h) => !h.is_guided_set);
                return (
                  <>
                    {guided.length > 0 && (
                      <optgroup label="Guided drill sets (with instruction card)">
                        {guided.map((h) => {
                          const meta = [
                            h.guided_set_type,
                            h.estimated_minutes != null ? `~${h.estimated_minutes} min` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ');
                          return (
                            <option key={h.id} value={h.id}>
                              {h.title}
                              {meta ? `  (${meta})` : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {regular.length > 0 && (
                      <optgroup label={guided.length > 0 ? 'Regular sets' : 'Sets'}>
                        {regular.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.title}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                );
              })()}
            </select>
          </div>
        )}

        {type === 'bootcamp_module' && (
          <div>
            <Label className="text-xs">Bootcamp</Label>
            <select
              value={bootcampId}
              onChange={(e) => setBootcampId(e.target.value)}
              className="mt-1 w-full text-sm rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            >
              {BOOTCAMPS.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label className="text-xs">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is this?"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">{type === 'note' ? 'Note' : 'Description'}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'note' ? 'Write a quick note.' : 'Optional context.'}
            rows={3}
            className="mt-1 text-sm"
          />
        </div>

        {SCHEDULABLE_TYPES.has(type) && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Unlocks</Label>
              <Input
                type="datetime-local"
                value={unlockAt}
                onChange={(e) => setUnlockAt(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Due</Label>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {duplicate && (
          <div className="text-[11px] text-amber-400">
            Already assigned to this student. Pick a different option or archive
            the existing item first.
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Done
          </Button>
        )}
        <Button size="sm" onClick={submit} disabled={submitting || duplicate}>
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {activeType.submitLabel}
        </Button>
      </div>

      {recent.length > 0 && (
        <section className="pt-2 space-y-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Recently assigned
            </h4>
            <span className="text-[10px] text-zinc-500">{recent.length} this session</span>
          </div>
          <ul className="space-y-1.5">
            {recent.map((it) => {
              const def = TYPE_BY_VALUE.get(it.type);
              const route = resolveItemRoute(it);
              const Icon = def?.icon ?? FileText;
              return (
                <li
                  key={it.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900/40"
                >
                  <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-zinc-100 truncate">{it.title}</div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {def?.label ?? it.type}
                    </div>
                  </div>
                  {route && (
                    <Link
                      to={route}
                      className="text-[11px] text-zinc-300 hover:text-zinc-100 inline-flex items-center gap-1"
                    >
                      Open
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function TypeCard({
  def,
  active,
  onClick,
}: {
  def: TypeDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = def.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border px-4 py-3 transition-colors',
        active
          ? 'border-amber-400 bg-zinc-900/80'
          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4', active ? 'text-amber-400' : 'text-zinc-400')} />
        <span className="text-sm font-medium text-zinc-100">{def.label}</span>
      </div>
      <div className="text-[11px] text-zinc-400 mt-1">{def.description}</div>
    </button>
  );
}

function TypeChip({
  def,
  active,
  onClick,
}: {
  def: TypeDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = def.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-colors',
        active
          ? 'border-amber-400 bg-zinc-900/80 text-zinc-100'
          : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
      )}
    >
      <Icon className="w-3 h-3" />
      {def.label}
    </button>
  );
}

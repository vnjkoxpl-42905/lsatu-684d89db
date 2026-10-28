import { newAssignmentDelivery } from '@/lib/assignmentDelivery';
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
import { createClassroomItem, getClassroomItem, resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult, type NotifyResult } from '@/lib/classroomNotify';
import { assignWork, type AssignableItem } from '@/lib/assignWork';
import { localDayISO } from '@/lib/localDate';
import { useStudentClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { AssignmentDateField } from '@/components/teacher/AssignmentDateField';
import { bootcampDays } from '@/lib/bootcampDays';
import { cn } from '@/lib/utils';
import { ConditionalAssignmentFields } from '@/components/teacher/ConditionalAssignmentFields';
import { conditionalTargetKey, DEFAULT_CONDITIONAL_TARGET, resolveConditionalAssignment, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { protectedConditionalTarget } from '@/bootcamps/conditionals/assignments';
import { hasCurrentConditionalRequirements } from '@/bootcamps/conditionals/courseRequirements';
import { ConditionalRequirementsSummary } from './ConditionalRequirementsSummary';

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
  const [unlockAt, setUnlockAt] = useState<Date | undefined>(undefined);
  const [dueAt, setDueAt] = useState<Date | undefined>(undefined);
  const [homeworkSetId, setHomeworkSetId] = useState<string>('');
  const [bootcampId, setBootcampId] = useState<string>(BOOTCAMPS[0].id);
  const [conditionalTarget, setConditionalTarget] = useState<ConditionalAssignmentTarget>(DEFAULT_CONDITIONAL_TARGET);
  const [conditionalTargetError, setConditionalTargetError] = useState<string | null>(null);
  // Item B — null = "all days" (default). Empty array = explicitly none
  // (UI guards against this). number[] = explicit subset.
  const [assignedDayIds, setAssignedDayIds] = useState<number[] | null>(null);
  const [daysExpanded, setDaysExpanded] = useState(false);
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
    setUnlockAt(undefined);
    setDueAt(undefined);
    setConditionalTarget(DEFAULT_CONDITIONAL_TARGET);
  }, [studentId]);

  useEffect(() => {
    if (type !== 'homework') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
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
    setAssignedDayIds(null);
    setDaysExpanded(false);
  }, [type, bootcampId]);

  useEffect(() => {
    if (type !== 'bootcamp_module' || bootcampId !== 'conditionals') return;
    let alive = true;
    setConditionalTargetError(null);
    resolveConditionalAssignment(conditionalTarget).then(target => {
      if (alive) { setTitle(target.title); setDescription(target.description); }
    }).catch(error => { if (alive) setConditionalTargetError(error instanceof Error ? error.message : 'The selected conditional work could not load.'); });
    return () => { alive = false; };
  }, [type, bootcampId, conditionalTarget]);

  const duplicate = useMemo(() => {
    if (type === 'bootcamp_module') {
      return existingItems.some(
        (i) =>
          i.type === 'bootcamp_module' &&
          i.metadata_json?.bootcamp_id === bootcampId &&
          (bootcampId !== 'conditionals' || (conditionalTarget.courseEdition
            ? protectedConditionalTarget(i)?.courseEdition === conditionalTarget.courseEdition && i.metadata_json?.conditional_target_key === conditionalTargetKey(conditionalTarget)
              && (conditionalTarget.scope === 'activity' || hasCurrentConditionalRequirements(conditionalTarget, i.metadata_json?.conditional_requirements))
            : (i.metadata_json?.conditional_target_key ?? 'course') === conditionalTargetKey(conditionalTarget))) &&
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
  }, [type, bootcampId, homeworkSetId, existingItems, conditionalTarget]);

  const conditionalRequirementsPreview = useMemo(() => {
    if (type !== 'bootcamp_module' || bootcampId !== 'conditionals' || !conditionalTarget.courseEdition) return [];
    let targetKey: string;
    try { targetKey = conditionalTargetKey(conditionalTarget); } catch { return []; }
    return existingItems.flatMap(item => {
      const target = protectedConditionalTarget(item);
      if (!target || conditionalTargetKey(target) !== targetKey) return [];
      return [item.metadata_json?.conditional_requirements];
    });
  }, [type, bootcampId, conditionalTarget, existingItems]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setHomeworkSetId('');
    setUnlockAt(undefined);
    setDueAt(undefined);
    setAssignedDayIds(null);
    setDaysExpanded(false);
    setConditionalTarget(DEFAULT_CONDITIONAL_TARGET);
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
      // Real work (homework, a bootcamp) goes through the one assign pipeline,
      // which owns the row, the classroom item, the notification, and the
      // cleanup if any of those fail. Only the free-form types (notes,
      // announcements) are still a bare classroom item, because they have no
      // assignment row behind them.
      const assignable: AssignableItem | null =
        type === 'homework' && homeworkSetId
          ? { kind: 'homework_set', setId: homeworkSetId }
          : type === 'bootcamp_module' && bootcampId
            ? { kind: 'bootcamp', topicId: bootcampId, ...(bootcampId === 'conditionals' ? { conditionalTarget } : {}) }
            : null;

      let item: ClassroomItem;
      let notify: NotifyResult | undefined;

      if (assignable) {
        const result = await assignWork({
          teacherId: adminUserId,
          studentIds: [studentId],
          item: assignable,
          scheduledForLocalDate: unlockAt ? localDayISO(unlockAt) : undefined,
          overrides: {
            title: title.trim(),
            description: description.trim() || undefined,
            dueAt: dueAt ? dueAt.toISOString() : null,
            metadata:
              assignedDayIds && assignedDayIds.length > 0
                ? { assigned_day_ids: [...assignedDayIds].sort((a, b) => a - b) }
                : undefined,
          },
        });

        const first = result.ok[0];
        if (!first?.classroomItemId) {
          throw new Error(result.failed[0]?.error ?? 'Failed to assign');
        }
        const created = await getClassroomItem(first.classroomItemId);
        if (!created) throw new Error('Assigned, but the item could not be read back');
        item = created;
        notify = first.notify;
      } else {
        const delivery = newAssignmentDelivery();
        item = await createClassroomItem({

          ...delivery,
          notificationPolicy: ['session_recap', 'smartboard_recap', 'announcement'].includes(type) ? 'message' : delivery.notificationPolicy,
          studentId,
          createdBy: adminUserId,
          type,
          title: title.trim(),
          description: description.trim() || undefined,
          unlockAt: unlockAt ? unlockAt.toISOString() : null,
          dueAt: dueAt ? dueAt.toISOString() : null,
          visibleToStudent: true,
          status: 'assigned',
          metadata: {},
        });

        notify = await notifyStudentOfClassroomItem({
          notificationGroupId: delivery.notificationGroupId!,
          notificationChannel: ['session_recap', 'smartboard_recap', 'announcement'].includes(type) ? 'message' : 'assignment',
          unlockAt: item.unlock_at,
          adminUserId,
          studentId,
          title: title.trim(),
          description: description.trim() || undefined,
          route: resolveItemRoute(item) ?? `/classroom/item/${item.id}`,
        });
      }

      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });

      const summary = notify ? summarizeNotifyResult(notify) : 'Assigned';
      if (notify && notify.bell_ok && (notify.optional_channels_skipped || (notify.inbox_ok && notify.email_ok))) {
        toast.success(summary);
      } else {
        toast.warning(summary, {
          description:
            notify?.email_error ?? notify?.inbox_error ?? notify?.bell_error,
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
            <Label className="text-xs">Homework set</Label>
            <select
              value={homeworkSetId}
              onChange={(e) => setHomeworkSetId(e.target.value)}
              className="mt-1 w-full text-sm rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            >
              <option value="" disabled>— Choose a homework set —</option>
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
            {!homeworkSetId && (
              <p className="mt-1 text-[11px] text-amber-400/80">
                Required for homework. Use Note or Announcement for general instructions.
              </p>
            )}
          </div>
        )}

        {type === 'bootcamp_module' && (
          <div className="space-y-3">
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

            {bootcampId === 'conditionals' ? <><ConditionalAssignmentFields value={conditionalTarget} onChange={setConditionalTarget} disabled={submitting} />
              <ConditionalRequirementsSummary target={conditionalTarget} existingSnapshots={conditionalRequirementsPreview}/>
              {conditionalTargetError && <p role="alert" className="text-sm text-destructive">{conditionalTargetError}</p>}</> : <DayPicker
              bootcampId={bootcampId}
              value={assignedDayIds}
              onChange={setAssignedDayIds}
              expanded={daysExpanded}
              onExpandedChange={setDaysExpanded}
            />}
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
          <div>
            <Label className="text-xs">Schedule</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <AssignmentDateField
                label="Unlocks"
                value={unlockAt}
                onChange={(d) => {
                  setUnlockAt(d);
                  if (dueAt && dueAt < d) setDueAt(undefined);
                }}
              />
              <AssignmentDateField
                label="Due"
                value={dueAt}
                minDate={unlockAt}
                onChange={setDueAt}
              />
              {(unlockAt || dueAt) && (
                <button
                  type="button"
                  onClick={() => {
                    setUnlockAt(undefined);
                    setDueAt(undefined);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
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
        <Button size="sm" onClick={submit} disabled={submitting || duplicate || (type === 'homework' && !homeworkSetId)}>
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

// Item B — multi-select for bootcamp days. `value === null` means "all
// days" (the default); the explicit array form turns on when the admin
// deselects anything. Hides cleanly when the bootcamp has no day registry.
function DayPicker({
  bootcampId,
  value,
  onChange,
  expanded,
  onExpandedChange,
}: {
  bootcampId: string;
  value: number[] | null;
  onChange: (v: number[] | null) => void;
  expanded: boolean;
  onExpandedChange: (v: boolean) => void;
}) {
  const days = bootcampDays(bootcampId);
  if (!days || days.length === 0) return null;
  const total = days.length;
  const allDayIds = days.map((d) => d.day);
  const selected = value ?? allDayIds;
  const selectedCount = selected.length;
  const isAll = value === null || value.length === total;

  const toggle = (dayId: number) => {
    const current = value ?? allDayIds;
    const next = current.includes(dayId)
      ? current.filter((d) => d !== dayId)
      : [...current, dayId];
    if (next.length === 0) {
      onChange([dayId]);
      return;
    }
    onChange(next.length === total ? null : next);
  };

  const setRange = (start: number, end: number) => {
    const range = allDayIds.filter((d) => d >= start && d <= end);
    onChange(range.length === total ? null : range);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-100">Assigned days</span>
          <span className="text-[11px] text-zinc-400">
            {isAll ? `All ${total} days` : `${selectedCount} of ${total} days`}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {expanded ? 'Hide' : 'Edit'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 px-3 py-2.5 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <PresetChip label="All" active={isAll} onClick={() => onChange(null)} />
            <PresetChip
              label={`Days 1–${Math.ceil(total / 2)}`}
              active={
                !isAll && selectedCount === Math.ceil(total / 2) &&
                selected.every((d) => d <= Math.ceil(total / 2))
              }
              onClick={() => setRange(1, Math.ceil(total / 2))}
            />
            <PresetChip
              label={`Days ${Math.ceil(total / 2) + 1}–${total}`}
              active={
                !isAll && selectedCount === total - Math.ceil(total / 2) &&
                selected.every((d) => d > Math.ceil(total / 2))
              }
              onClick={() => setRange(Math.ceil(total / 2) + 1, total)}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {days.map((d) => {
              const on = selected.includes(d.day);
              return (
                <button
                  type="button"
                  key={d.day}
                  onClick={() => toggle(d.day)}
                  className={cn(
                    'text-left rounded-md border px-2.5 py-1.5 transition-colors',
                    on
                      ? 'border-amber-400/70 bg-amber-400/10 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
                  )}
                >
                  <div className="text-[11px] font-medium">
                    Day {d.day} · {d.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{d.focus}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PresetChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[11px] px-2 py-1 rounded-full border transition-colors',
        active
          ? 'border-amber-400 bg-amber-400/10 text-zinc-100'
          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-100',
      )}
    >
      {label}
    </button>
  );
}

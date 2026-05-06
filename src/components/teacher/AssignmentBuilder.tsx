import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem } from '@/lib/classroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useStudentClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';

interface Props {
  studentId: string;
  adminUserId: string;
  onClose: () => void;
}

interface HomeworkSetRow {
  id: string;
  title: string;
  question_qids: string[] | null;
}

interface BootcampDef {
  id: string;
  title: string;
  description: string;
  route: string;
}

const BOOTCAMPS: BootcampDef[] = [
  { id: 'principle-flaw', title: 'Principle & Flaw', description: 'Two-week LR bootcamp', route: '/bootcamp/principle-flaw' },
  { id: 'intro-to-lr', title: 'Intro to LR', description: 'Foundational LR skills', route: '/bootcamp/intro-to-lr' },
  { id: 'causation-station', title: 'Causation Station', description: 'Causal reasoning patterns', route: '/bootcamp/causation-station' },
  { id: 'abstraction', title: 'Abstraction', description: 'Abstract relationships', route: '/bootcamp/abstraction' },
];

const TYPES: { value: ClassroomItem['type']; label: string }[] = [
  { value: 'homework', label: 'Homework set' },
  { value: 'bootcamp_module', label: 'Bootcamp' },
  { value: 'note', label: 'Note from Joshua' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'session_recap', label: 'Session recap' },
];

const SCHEDULABLE_TYPES = new Set<ClassroomItem['type']>(['homework', 'drill', 'bootcamp_module']);

export default function AssignmentBuilder({ studentId, adminUserId, onClose }: Props) {
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

  const { data: existingItems = [] } = useStudentClassroomItems(studentId);

  useEffect(() => {
    if (type !== 'homework') return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('homework_sets')
        .select('id,title,question_qids')
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
      if (!description) setDescription(b.description);
    }
  }, [type, bootcampId, description]);

  // Duplicate guards. We don't want to silently double-assign the same
  // homework set or bootcamp to the same student.
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

      // Notify after the item is created. Notify failure does not roll
      // back the assignment; it just changes the toast message and keeps
      // the builder open so the admin can react.
      const notify = await notifyStudentOfClassroomItem({
        adminUserId,
        studentId,
        title: title.trim(),
        description: description.trim() || undefined,
        route: resolveItemRoute(item) ?? `/classroom/item/${item.id}`,
      });

      if (notify.inbox_ok && notify.bell_ok) {
        toast.success(summarizeNotifyResult(notify));
        onClose();
      } else {
        toast.warning(summarizeNotifyResult(notify), {
          description: notify.inbox_error ?? notify.bell_error,
        });
        // Stay open so the admin sees the partial-failure state.
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to assign';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold">Assign work</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Creates a classroom_items row, posts an inbox message, and sends a
            bell notification.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ClassroomItem['type'])}
              className="mt-1 w-full text-sm rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {type === 'homework' && (
            <div>
              <Label className="text-xs">Homework set (optional)</Label>
              <select
                value={homeworkSetId}
                onChange={(e) => setHomeworkSetId(e.target.value)}
                className="mt-1 w-full text-sm rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
              >
                <option value="">— No specific set —</option>
                {homeworkSets.map((h) => (
                  <option key={h.id} value={h.id}>{h.title}</option>
                ))}
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
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context."
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

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting || duplicate}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

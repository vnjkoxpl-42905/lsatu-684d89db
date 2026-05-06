import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem } from '@/lib/classroomItems';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

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

const TYPES: { value: ClassroomItem['type']; label: string }[] = [
  { value: 'homework', label: 'Homework set' },
  { value: 'note', label: 'Note from Joshua' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'session_recap', label: 'Session recap' },
];

const SCHEDULABLE_TYPES = new Set<ClassroomItem['type']>(['homework', 'drill']);

export default function AssignmentBuilder({ studentId, adminUserId, onClose }: Props) {
  const qc = useQueryClient();
  const [type, setType] = useState<ClassroomItem['type']>('homework');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [homeworkSetId, setHomeworkSetId] = useState<string>('');
  const [homeworkSets, setHomeworkSets] = useState<HomeworkSetRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  // When picking a homework set, prefill title.
  useEffect(() => {
    if (type !== 'homework' || !homeworkSetId) return;
    const found = homeworkSets.find((h) => h.id === homeworkSetId);
    if (found) setTitle(found.title);
  }, [homeworkSetId, homeworkSets, type]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Title required');
      return;
    }
    setSubmitting(true);
    try {
      // For homework type with a homework set picked, we also create a
      // homework_assignments row so the existing /classroom/:id route
      // resolves to a real flow.
      let sourceId: string | undefined;
      let sourceTable: string | undefined;
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
      }
      await createClassroomItem({
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
      });
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      toast.success('Assigned');
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to assign');
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
            This appears immediately in the student's Classroom.
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
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Flame, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import { createClassroomItem, archiveClassroomItem, resolveItemRoute } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { useAuth } from '@/contexts/AuthContext';

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

export default function TeacherBootcamps() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const { data: items = [] } = useStudentClassroomItems(studentId);
  const [busy, setBusy] = useState<string | null>(null);

  const setStudentId = (id: string) =>
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });

  const isAssigned = (bootcampId: string) =>
    items.some(
      (i) =>
        i.type === 'bootcamp_module' &&
        i.metadata_json?.bootcamp_id === bootcampId &&
        i.status !== 'archived',
    );

  const findItem = (bootcampId: string) =>
    items.find(
      (i) =>
        i.type === 'bootcamp_module' &&
        i.metadata_json?.bootcamp_id === bootcampId &&
        i.status !== 'archived',
    );

  const toggle = async (b: BootcampDef, next: boolean) => {
    if (!studentId || !user) return;
    setBusy(b.id);
    try {
      if (next) {
        const item = await createClassroomItem({
          studentId,
          createdBy: user.id,
          type: 'bootcamp_module',
          title: b.title,
          description: b.description,
          sourceTable: 'bootcamps',
          sourceId: b.route,
          visibleToStudent: true,
          status: 'assigned',
          metadata: { bootcamp_id: b.id },
        });
        const notify = await notifyStudentOfClassroomItem({
          adminUserId: user.id,
          studentId,
          title: b.title,
          description: b.description,
          route: resolveItemRoute(item) ?? b.route,
        });
        toast.success(summarizeNotifyResult(notify));
      } else {
        const it = findItem(b.id);
        if (it) await archiveClassroomItem(it.id);
        toast.success('Bootcamp archived');
      }
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <Flame className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>

      <section className="p-6 space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight">Bootcamps</h2>
          <p className="text-sm text-zinc-400">
            Toggle which bootcamps appear in this student's Classroom. Toggling
            on creates a classroom_items row and notifies the student; toggling
            off archives the item (no notification).
          </p>
        </div>

        {!studentId ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            Select a student.
          </div>
        ) : (
          <ul className="space-y-2">
            {BOOTCAMPS.map((b) => {
              const assigned = isAssigned(b.id);
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-100">{b.title}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{b.description}</div>
                  </div>
                  {busy === b.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  ) : (
                    <Switch
                      checked={assigned}
                      onCheckedChange={(v) => toggle(b, v)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Flame, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import { createClassroomItem, archiveClassroomItem } from '@/lib/classroomItems';
import { useAuth } from '@/contexts/AuthContext';

interface BootcampDef {
  id: string;
  title: string;
  description: string;
  route: string;
}

const BOOTCAMPS: BootcampDef[] = [
  {
    id: 'principle-flaw',
    title: 'Principle & Flaw',
    description: 'Two-week LR bootcamp',
    route: '/bootcamp/principle-flaw',
  },
  {
    id: 'intro-to-lr',
    title: 'Intro to LR',
    description: 'Foundational LR skills',
    route: '/bootcamp/intro-to-lr',
  },
  {
    id: 'causation-station',
    title: 'Causation Station',
    description: 'Causal reasoning patterns',
    route: '/bootcamp/causation-station',
  },
  {
    id: 'abstraction',
    title: 'Abstraction',
    description: 'Abstract relationships',
    route: '/bootcamp/abstraction',
  },
];

export default function TeacherBootcamps() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);
  const { data: items = [] } = useStudentClassroomItems(studentId);
  const [busy, setBusy] = useState<string | null>(null);

  const isAssigned = (bootcampId: string) =>
    items.some(
      (i) => i.type === 'bootcamp_module' && i.metadata_json?.bootcamp_id === bootcampId,
    );

  const findItem = (bootcampId: string) =>
    items.find(
      (i) => i.type === 'bootcamp_module' && i.metadata_json?.bootcamp_id === bootcampId,
    );

  const toggle = async (b: BootcampDef, next: boolean) => {
    if (!studentId || !user) return;
    setBusy(b.id);
    try {
      if (next) {
        await createClassroomItem({
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
      } else {
        const it = findItem(b.id);
        if (it) await archiveClassroomItem(it.id);
      }
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      toast.success(next ? 'Bootcamp assigned' : 'Bootcamp archived');
    } catch (e: any) {
      toast.error(e?.message ?? 'Update failed');
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
            Toggle which bootcamps appear in this student's Classroom.
            Assignments create classroom_items rows so the student sees the
            bootcamp as part of their assigned path.
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

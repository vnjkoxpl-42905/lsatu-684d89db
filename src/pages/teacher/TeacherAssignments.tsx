import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import HubStudentList from '@/components/hub/HubStudentList';
import AssignmentBuilder from '@/components/teacher/AssignmentBuilder';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const [open, setOpen] = useState(false);

  const setStudentId = (id: string) => {
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });
    setOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <ClipboardList className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>

      <section className="p-6 space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Assignments</h2>
        <p className="text-sm text-zinc-400 max-w-xl">
          Pick a student in the left rail to open the assignment builder. Each
          assignment becomes a real classroom_items row, posts an inbox message,
          and triggers a bell notification.
        </p>
        {!studentId && (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            No student selected.
          </div>
        )}
        {studentId && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 px-4 py-3 text-sm text-zinc-100 inline-flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Open assignment builder
          </button>
        )}
        {studentId && open && user && (
          <AssignmentBuilder
            studentId={studentId}
            adminUserId={user.id}
            onClose={() => setOpen(false)}
          />
        )}
      </section>
    </div>
  );
}

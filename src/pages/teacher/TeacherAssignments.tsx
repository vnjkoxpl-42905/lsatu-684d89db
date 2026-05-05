import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import HubStudentList from '@/components/hub/HubStudentList';
import AssignmentBuilder from '@/components/teacher/AssignmentBuilder';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <ClipboardList className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList
          selectedId={studentId}
          onSelect={(id) => {
            setStudentId(id);
            setOpen(true);
          }}
        />
      </aside>

      <section className="p-6 space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Assignments</h2>
        <p className="text-sm text-zinc-400 max-w-xl">
          Pick a student in the left rail to open the assignment builder.
          Each assignment becomes a real classroom_items row visible in the
          student's Classroom.
        </p>
        {!studentId && (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            No student selected.
          </div>
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

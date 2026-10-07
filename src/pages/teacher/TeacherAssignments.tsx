import { useSearchParams } from 'react-router-dom';
import { ClipboardList, User } from 'lucide-react';
import HubStudentList from '@/components/hub/HubStudentList';
import AssignmentBuilder from '@/components/teacher/AssignmentBuilder';
import { useAuth } from '@/contexts/AuthContext';
import { useSelectedHubStudent } from '@/hooks/useHubStudents';

export default function TeacherAssignments() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentId = searchParams.get('student');
  const selected = useSelectedHubStudent(studentId);

  const setStudentId = (id: string) =>
    setSearchParams((p) => {
      const c = new URLSearchParams(p);
      c.set('student', id);
      return c;
    });

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

      <section className="p-6 max-w-2xl space-y-5">
        {!studentId ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">Assignments</h2>
            <p className="text-sm text-zinc-400">
              Pick a student from the left to start assigning work.
            </p>
            <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-12 text-center text-sm text-zinc-500">
              No student selected.
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Assigning to
                </div>
                <div className="text-base font-semibold text-zinc-100 truncate">
                  {selected?.display_name?.trim() || 'Student'}
                </div>
                {selected?.email && (
                  <div className="text-[11px] text-zinc-500 truncate">{selected.email}</div>
                )}
              </div>
            </header>

            {user && (
              <AssignmentBuilder studentId={studentId} adminUserId={user.id} />
            )}
          </>
        )}
      </section>
    </div>
  );
}

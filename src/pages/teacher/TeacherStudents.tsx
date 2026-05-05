import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import HubStudentList from '@/components/hub/HubStudentList';

export default function TeacherStudents() {
  const navigate = useNavigate();
  return (
    <div className="px-6 py-6 max-w-3xl space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-zinc-400">
          <Users className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Roster
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Students</h2>
        <p className="text-sm text-zinc-400">
          Open a student to see their stats, post a recap, or jump into their
          assignments.
        </p>
      </div>
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/40">
        <HubStudentList
          selectedId={null}
          onSelect={(id) => navigate(`/teacher/students/${id}`)}
        />
      </div>
    </div>
  );
}

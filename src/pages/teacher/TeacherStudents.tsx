import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import HubStudentList from '@/components/hub/HubStudentList';

export default function TeacherStudents() {
  const navigate = useNavigate();
  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-4 text-zinc-400">
        <Users className="w-4 h-4" />
        <span className="text-[11px] uppercase tracking-wider font-semibold">Roster</span>
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

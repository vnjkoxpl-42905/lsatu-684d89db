import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import HubStudentList from '@/components/hub/HubStudentList';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import RecapComposer from '@/components/teacher/RecapComposer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export default function TeacherRecaps() {
  const { user } = useAuth();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { data: items = [] } = useStudentClassroomItems(studentId);
  const recaps = items.filter((i) => i.type === 'session_recap' || i.type === 'smartboard_recap');

  const { data: name } = useQuery<string | null>({
    queryKey: ['teacher-recaps-name', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', studentId)
        .maybeSingle();
      return data?.display_name ?? null;
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] h-full">
      <aside className="border-r border-zinc-800 overflow-y-auto">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2 text-zinc-400">
          <BookOpen className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Pick a student
          </span>
        </div>
        <HubStudentList selectedId={studentId} onSelect={setStudentId} />
      </aside>
      <section className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Recaps {name ? `· ${name}` : ''}
          </h2>
          {studentId && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New recap
            </Button>
          )}
        </div>
        {!studentId ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            Select a student.
          </div>
        ) : recaps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
            No recaps yet.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {recaps.map((r) => (
              <li
                key={r.id}
                className="px-4 py-3 rounded-lg border border-zinc-800 bg-zinc-900/40"
              >
                <div className="text-sm font-medium text-zinc-100">{r.title}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {format(new Date(r.created_at), 'MMM d, yyyy')}
                </div>
                {r.content_markdown && (
                  <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap line-clamp-4">
                    {r.content_markdown}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {studentId && open && user && (
          <RecapComposer
            studentId={studentId}
            adminUserId={user.id}
            onClose={() => setOpen(false)}
          />
        )}
      </section>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Sparkles,
  ClipboardList,
  CalendarDays,
  BookOpen,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import { useStudentExternalUploadsForStudent } from '@/hooks/useExternalWorkUploads';
import { useStudentWeeklyPlans } from '@/hooks/useWeeklyPlan';
import { useAITADrafts } from '@/hooks/useAITADrafts';
import { format } from 'date-fns';
import RecapComposer from '@/components/teacher/RecapComposer';
import AssignmentBuilder from '@/components/teacher/AssignmentBuilder';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileLite {
  display_name: string | null;
  last_seen_at: string | null;
}

export default function TeacherStudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery<ProfileLite | null>({
    queryKey: ['teacher-student-profile', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name,last_seen_at')
        .eq('class_id', studentId as string)
        .maybeSingle();
      return (data as ProfileLite) ?? null;
    },
  });

  const { data: items = [] } = useStudentClassroomItems(studentId ?? null);
  const { data: uploads = [] } = useStudentExternalUploadsForStudent(studentId ?? null);
  const { data: plans = [] } = useStudentWeeklyPlans(studentId ?? null);
  const { data: drafts = [] } = useAITADrafts({ studentId: studentId ?? null });

  const counts = useMemo(() => ({
    items: items.length,
    uploads: uploads.length,
    drafts: drafts.filter((d) => d.status === 'draft').length,
    publishedPlans: plans.filter((p) => p.status === 'published').length,
  }), [items, uploads, drafts, plans]);

  const [showAssignBuilder, setShowAssignBuilder] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  if (!studentId) return null;

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher?ws=people')}
          className="text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Roster
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Student
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {profile?.display_name?.trim() || 'Student'}
        </h2>
        {profile?.last_seen_at && (
          <p className="text-xs text-zinc-500">
            Last seen {format(new Date(profile.last_seen_at), 'MMM d, h:mm a')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Classroom items" value={counts.items} Icon={ClipboardList} />
        <StatCard label="Uploads" value={counts.uploads} Icon={UploadCloud} />
        <StatCard label="Pending drafts" value={counts.drafts} Icon={Sparkles} />
        <StatCard label="Published plans" value={counts.publishedPlans} Icon={CalendarDays} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ActionRow
          Icon={ClipboardList}
          title="Assign drill or homework"
          description="Push an assignable item into the student's classroom."
          onClick={() => setShowAssignBuilder(true)}
        />
        <ActionRow
          Icon={BookOpen}
          title="Post a session recap"
          description="Write or paste a recap; appears in the student's Classroom."
          onClick={() => setShowRecap(true)}
        />
        <ActionRow
          Icon={CalendarDays}
          title="Open weekly plans"
          description="Build, publish, or archive plans for this student."
          onClick={() => navigate(`/teacher/weekly-plans?student=${studentId}`)}
        />
        <ActionRow
          Icon={Sparkles}
          title="Open in StudentHub"
          description="Snapshot, AI Assistant, Library, full notes."
          onClick={() => navigate(`/admin/ta?student=${studentId}`)}
        />
      </div>

      <section className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
          Recent classroom items
        </h3>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
            No classroom items yet for this student.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.slice(0, 6).map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40"
              >
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0 w-28">
                  {it.type.replace('_', ' ')}
                </div>
                <div className="min-w-0 flex-1 text-sm truncate text-zinc-100">
                  {it.title}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
                  {it.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAssignBuilder && user && (
        <AssignmentBuilder
          studentId={studentId}
          adminUserId={user.id}
          onClose={() => setShowAssignBuilder(false)}
        />
      )}
      {showRecap && user && (
        <RecapComposer
          studentId={studentId}
          adminUserId={user.id}
          onClose={() => setShowRecap(false)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-zinc-100 tabular-nums">{value}</div>
    </div>
  );
}

function ActionRow({
  Icon,
  title,
  description,
  onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-700 transition-colors px-4 py-3"
    >
      <Icon className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        <div className="text-xs text-zinc-400 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

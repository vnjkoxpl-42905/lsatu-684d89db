import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  Sparkles,
  UploadCloud,
  MessagesSquare,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHubStudents } from '@/hooks/useHubStudents';

// Counts are nullable on purpose: a query that failed has no count, and the
// tiles must say so rather than print a zero the data never supported.
interface DashboardStats {
  pendingDrafts: number | null;
  uploadsToReview: number | null;
}

function useDashboardStats(): DashboardStats {
  const { data } = useQuery<DashboardStats>({
    queryKey: ['teacher-today-stats'],
    queryFn: async () => {
      const [draftsRes, uploadsRes] = await Promise.all([
        supabase
          .from('ai_ta_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('external_work_uploads')
          .select('*', { count: 'exact', head: true })
          .in('processing_status', ['uploaded', 'needs_review']),
      ]);
      if (draftsRes.error) throw draftsRes.error;
      if (uploadsRes.error) throw uploadsRes.error;
      return {
        pendingDrafts: draftsRes.count ?? 0,
        uploadsToReview: uploadsRes.count ?? 0,
      };
    },
  });
  return data ?? { pendingDrafts: null, uploadsToReview: null };
}

export default function TeacherToday() {
  const navigate = useNavigate();
  const stats = useDashboardStats();
  const { rows: students = [], error: rosterError } = useHubStudents();

  // The roster failing is not an empty roster.
  const needsReplyCount = rosterError
    ? null
    : students.filter((s) => s.has_unread_from_student).length;
  const rosterCount = rosterError ? null : students.length;

  return (
    <div data-motion-group className="px-6 py-8 max-w-5xl space-y-8">
      <div data-motion-enter data-motion-group className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Teacher
        </div>
        <h2 data-motion-item className="text-2xl font-semibold tracking-tight">Today</h2>
        <p data-motion-item className="text-sm text-zinc-400">
          Quick view of what needs your attention before opening a student.
        </p>
      </div>

      <div data-motion-item className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="AI drafts pending"
          value={stats.pendingDrafts}
          Icon={Sparkles}
          onClick={() => navigate('/teacher/command')}
        />
        <StatTile
          label="Uploads to review"
          value={stats.uploadsToReview}
          Icon={UploadCloud}
          onClick={() => navigate('/teacher/uploads')}
        />
        <StatTile
          label="Students needing reply"
          value={needsReplyCount}
          Icon={MessagesSquare}
          onClick={() => navigate('/inbox')}
        />
        <StatTile
          label="Roster"
          value={rosterCount}
          Icon={ClipboardList}
          onClick={() => navigate('/teacher?ws=people')}
        />
      </div>

      <section data-motion-reveal className="space-y-3">
        <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
          Quick actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ActionRow
            Icon={CalendarDays}
            title="Build a weekly plan"
            description="Drag drills and homework into a 7-day plan and publish it."
            onClick={() => navigate('/teacher/weekly-plans')}
          />
          <ActionRow
            Icon={ClipboardList}
            title="Assign homework or drills"
            description="Pick a student and push assignable items into their classroom."
            onClick={() => navigate('/teacher/assignments')}
          />
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  Icon,
  onClick,
}: {
  label: string;
  value: number | null;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900 transition-colors px-4 py-3.5"
    >
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div
        className="mt-1 text-2xl font-semibold text-zinc-100 tabular-nums"
        title={value === null ? "Couldn't load" : undefined}
      >
        {value === null ? '—' : value}
      </div>
    </button>
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

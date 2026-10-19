import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Target,
  Clock,
  Flame,
  GraduationCap,
  MessagesSquare,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatRelativeShort } from '@/lib/time';
import { useSelectedHubStudent } from '@/hooks/useHubStudents';
import { useAuth } from '@/contexts/AuthContext';
import { useInbox } from '@/hooks/useInbox';

interface Props {
  studentId: string | null;
}

interface ProfileStats {
  overall_answered: number | null;
  overall_correct: number | null;
  streak_current: number | null;
  xp_total: number | null;
  last_practice_date: string | null;
}

/**
 * Right-panel "Snapshot" tab. Shows real, admin-readable metrics only:
 *   - Practice attempts + accuracy (from profiles aggregates)
 *   - Last seen / last practiced (from profiles)
 *   - Streak / XP (from profiles)
 *   - Wrong-answer count (count query)
 *   - Assignment counts (already in useHubStudents row)
 *   - Unread + Needs reply (from useInbox vs current user)
 *
 * Anything that cannot be backed by a real query is omitted, not faked.
 */
export default function HubSnapshot({ studentId }: Props) {
  const { user } = useAuth();
  const student = useSelectedHubStudent(studentId);
  const { conversations } = useInbox();

  const { data: profileStats } = useQuery<ProfileStats | null>({
    queryKey: ['hub-snapshot-profile', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('overall_answered, overall_correct, streak_current, xp_total, last_practice_date')
        .eq('class_id', studentId)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileStats) ?? null;
    },
  });

  const { data: wajCount } = useQuery<number>({
    queryKey: ['hub-snapshot-waj', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('wrong_answer_journal')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', studentId as string);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const conversationStats = useMemo(() => {
    if (!user || !studentId) return { unread: false, needsReply: false };
    const thread = conversations.find((c) =>
      c.participants.some((p) => p.user_id === studentId) &&
      c.participants.some((p) => p.user_id === user.id),
    );
    if (!thread) return { unread: false, needsReply: false };
    const needsReply = !!(thread.last_message && thread.last_message.sender_id !== user.id);
    return { unread: thread.unread, needsReply };
  }, [conversations, studentId, user]);

  if (!studentId) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Select a student to see their snapshot.
      </div>
    );
  }

  const answered = profileStats?.overall_answered ?? 0;
  const correct = profileStats?.overall_correct ?? 0;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 1000) / 10 : null;
  const lastPracticed = profileStats?.last_practice_date;
  const lastSeen = student?.last_seen_at ?? null;

  return (
    <div className="p-4 space-y-5">
      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Practice
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={Activity}
            label="Attempts"
            value={answered.toLocaleString()}
          />
          <Metric
            icon={Target}
            label="Accuracy"
            value={accuracy != null ? `${accuracy}%` : '—'}
          />
          <Metric
            icon={AlertCircle}
            label="To review"
            value={(wajCount ?? 0).toLocaleString()}
          />
          <Metric
            icon={Flame}
            label="Streak"
            value={profileStats?.streak_current?.toString() ?? '0'}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Activity
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={Clock}
            label="Last seen"
            value={lastSeen ? formatRelativeShort(lastSeen) : '—'}
          />
          <Metric
            icon={Activity}
            label="Last practice"
            value={lastPracticed ? formatRelativeShort(lastPracticed) : '—'}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Assignments
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric
            icon={GraduationCap}
            label="Assigned"
            value={(student?.assignments_assigned ?? 0).toString()}
          />
          <Metric
            icon={GraduationCap}
            label="Viewed"
            value={(student?.assignments_viewed ?? 0).toString()}
          />
          <Metric
            icon={GraduationCap}
            label="Completed"
            value={(student?.assignments_completed ?? 0).toString()}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Messaging
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={MessagesSquare}
            label="Unread"
            value={conversationStats.unread ? 'Yes' : 'No'}
            highlight={conversationStats.unread}
          />
          <Metric
            icon={MessagesSquare}
            label="Needs reply"
            value={conversationStats.needsReply ? 'Yes' : 'No'}
            highlight={conversationStats.needsReply}
          />
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-3 py-2.5 rounded-lg border border-border/40 bg-card/40">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={
          highlight
            ? 'mt-1 text-base font-semibold tabular-nums text-amber-400'
            : 'mt-1 text-base font-semibold tabular-nums text-foreground'
        }
      >
        {value}
      </div>
    </div>
  );
}

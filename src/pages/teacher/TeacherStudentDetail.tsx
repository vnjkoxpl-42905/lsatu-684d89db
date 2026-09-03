import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Activity,
  Sparkles,
  ClipboardList,
  CalendarDays,
  BookOpen,
  FileText,
  Loader2,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { listStudentSectionGrades } from '@/features/activity-centre/api/activitiesClient';
import { SectionRunHistory } from '@/features/activity-centre/components/SectionRunHistory';
import { useStudentClassroomItems } from '@/hooks/useClassroomItems';
import { useStudentExternalUploadsForStudent } from '@/hooks/useExternalWorkUploads';
import { useStudentWeeklyPlans } from '@/hooks/useWeeklyPlan';
import { useAITADrafts, type AITADraft } from '@/hooks/useAITADrafts';
import { useStudentSessions } from '@/hooks/useStudentSessions';
import { useStudentContext } from '@/hooks/useStudentContext';
import { useSynthesizeBundle } from '@/hooks/useSessionBundles';
import { isSessionBundle, type SessionBundle } from '@/lib/sessionBundle';
import SessionBundleReview from '@/components/teacher/SessionBundleReview';
import { format } from 'date-fns';
import { formatLastActiveLabel, isUserOnline } from '@/lib/presence';
import { toast } from 'sonner';
import RecapComposer from '@/components/teacher/RecapComposer';
import { BootcampLessonProgress } from '@/components/teacher/bootcamps/BootcampLessonProgress';
import AssignmentBuilder from '@/components/teacher/AssignmentBuilder';
import StudentWorkPanel from '@/components/teacher/StudentWorkPanel';
import { useAuth } from '@/contexts/AuthContext';

// Student dossier — tabbed shell (build-spec §8). Real tabs only: every tab
// queries a real table and renders an honest empty state. No mock/placeholder
// tabs. Sessions/Transcripts is the home of the post-session intelligence
// pipeline output (transcript + synthesized, per-part-approvable bundle).

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
  const { data: sessions = [] } = useStudentSessions(studentId ?? '');
  const { data: context = [] } = useStudentContext(studentId ?? '');
  const isOnline = isUserOnline(profile?.last_seen_at);
  const lastActiveLabel = formatLastActiveLabel(profile?.last_seen_at);
  const lastActiveAbsolute = profile?.last_seen_at
    ? format(new Date(profile.last_seen_at), 'MMM d, h:mm a')
    : null;

  const counts = useMemo(() => ({
    items: items.length,
    sessions: sessions.length,
    drafts: drafts.filter((d) => d.status === 'draft').length,
    publishedPlans: plans.filter((p) => p.status === 'published').length,
  }), [items, sessions, drafts, plans]);

  const [showAssignBuilder, setShowAssignBuilder] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  if (!studentId) return null;

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/students')}
          className="text-black/55 hover:text-black"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Roster
        </Button>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-black/45">Student</div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {profile?.display_name?.trim() || 'Student'}
          </h2>
          {isOnline && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online now
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-black/45">
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {isOnline ? 'Online on LSAT U' : 'Offline'}
          </span>
          <span>{lastActiveLabel}</span>
          {lastActiveAbsolute && <span>· {lastActiveAbsolute}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Classroom items" value={counts.items} Icon={ClipboardList} />
        <StatCard label="Sessions" value={counts.sessions} Icon={FileText} />
        <StatCard label="Pending drafts" value={counts.drafts} Icon={Sparkles} />
        <StatCard label="Published plans" value={counts.publishedPlans} Icon={CalendarDays} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-white/35 border border-black/12">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="work">Work &amp; analytics</TabsTrigger>
          <TabsTrigger value="sessions">Sessions / Transcripts</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ActionRow Icon={ClipboardList} title="Assign drill or homework"
              description="Push an assignable item into the student's classroom."
              onClick={() => setShowAssignBuilder(true)} />
            <ActionRow Icon={BookOpen} title="Post a session recap"
              description="Write or paste a recap; appears in the student's Classroom."
              onClick={() => setShowRecap(true)} />
            <ActionRow Icon={CalendarDays} title="Open weekly plans"
              description="Build, publish, or archive plans for this student."
              onClick={() => navigate(`/teacher/weekly-plans?student=${studentId}`)} />
            <ActionRow Icon={Sparkles} title="Open in StudentHub"
              description="Snapshot, AI Assistant, Library, full notes."
              onClick={() => navigate(`/admin/ta?student=${studentId}`)} />
          </div>
          <section className="space-y-2 pt-2">
            <SectionLabel>Most recent session</SectionLabel>
            {sessions.length === 0 ? (
              <EmptyState>No sessions logged yet.</EmptyState>
            ) : (
              <SessionRow session={sessions[0]} />
            )}
          </section>
        </TabsContent>

        {/* Sessions / Transcripts — pipeline output lives here */}
        {/* Everything they have sat, and when they were on. Read-only: the
            admin policy grants SELECT and nothing else. */}
        <TabsContent value="work" className="mt-4 space-y-8">
          <StudentWorkPanel classId={studentId} />
          {/*
            * Read, Recall, Colour, which no teacher surface has ever shown.
            *
            * A student finishes twenty-five minutes of recorded work, it is
            * transcribed and judged stimulus by stimulus, and until now Joshua
            * learned nothing about it unless he asked her. The admin SELECT
            * policy has been on the grades table since the day it was created.
            */}
          <StudentSectionRuns classId={studentId} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-4 space-y-3">
          {sessions.length === 0 ? (
            <EmptyState>
              No sessions logged yet. Ingested Gemini Notes appear here once matched to this student.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {sessions.map((s) => (
                <SessionWithBundle
                  key={s.id}
                  session={s}
                  studentClassId={studentId}
                  drafts={drafts}
                  transcript={context.find((c) => c.id === s.transcript_id) ?? null}
                />
              ))}
            </ul>
          )}
        </TabsContent>

        {/* Homework */}
        <TabsContent value="homework" className="mt-4 space-y-2">
          {(() => {
            const hw = items.filter((it) => it.type === 'homework' || it.type === 'drill');
            return hw.length === 0 ? (
              <EmptyState>No homework or drills assigned yet.</EmptyState>
            ) : (
              <ul className="space-y-1.5">
                {hw.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-black/12 bg-white/30">
                    <div className="text-[10px] uppercase tracking-wider text-black/45 shrink-0 w-24">{it.type}</div>
                    <div className="min-w-0 flex-1 text-sm truncate text-[#11181c]">{it.title}</div>
                    <span className="text-[10px] uppercase tracking-wider text-black/45 shrink-0">{it.status.replace('_', ' ')}</span>
                  </li>
                ))}
              </ul>
            );
          })()}
          {/* Bootcamp lessons the student has actually opened. Renders nothing
              when there is no stored progress, so it never adds an empty block. */}
          <BootcampLessonProgress studentClassId={studentId} />
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes" className="mt-4 space-y-2">
          {(() => {
            const notes = context.filter((c) => c.context_type === 'note' || c.context_type === 'external_score');
            return notes.length === 0 ? (
              <EmptyState>No notes recorded yet.</EmptyState>
            ) : (
              <ul className="space-y-1.5">
                {notes.map((n) => (
                  <li key={n.id} className="px-4 py-2.5 rounded-lg border border-black/12 bg-white/30">
                    <p className="text-sm font-medium text-[#11181c]">{n.title}</p>
                    {n.content_text && (
                      <p className="mt-1 text-xs text-black/55 line-clamp-3 whitespace-pre-wrap">{n.content_text}</p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-black/35">
                      {format(new Date(n.created_at), 'MMM d, yyyy')}
                    </p>
                  </li>
                ))}
              </ul>
            );
          })()}
        </TabsContent>
      </Tabs>

      {showAssignBuilder && user && (
        <AssignmentBuilder studentId={studentId} adminUserId={user.id} onClose={() => setShowAssignBuilder(false)} />
      )}
      {showRecap && user && (
        <RecapComposer studentId={studentId} adminUserId={user.id} onClose={() => setShowRecap(false)} />
      )}
    </div>
  );
}

function SessionWithBundle({
  session,
  studentClassId,
  drafts,
  transcript,
}: {
  session: { id: string; scheduled_at: string; status: string; duration_minutes: number | null; source: string | null; transcript_id: string | null };
  studentClassId: string;
  drafts: AITADraft[];
  transcript: { content_text: string | null; file_path: string | null } | null;
}) {
  const synth = useSynthesizeBundle();
  const [showTranscript, setShowTranscript] = useState(false);

  const bundleDraft = useMemo(
    () =>
      drafts.find(
        (d) =>
          d.draft_type === 'classroom_update_bundle' &&
          isSessionBundle(d.draft_json) &&
          (d.draft_json as SessionBundle).source?.session_id === session.id,
      ) ?? null,
    [drafts, session.id],
  );

  async function build() {
    try {
      await synth.mutateAsync({ sessionId: session.id, studentClassId, regenerate: false });
      toast.success('Bundle synthesized. Review the parts below.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Synthesis failed');
    }
  }

  return (
    <li className="rounded-lg border border-black/12 bg-white/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#11181c]">
            {format(new Date(session.scheduled_at), 'MMM d, yyyy · h:mm a')}
          </p>
          <p className="text-xs text-black/45">
            {session.status}
            {session.duration_minutes ? ` · ${session.duration_minutes} min` : ''}
            {session.source ? ` · ${session.source.replace('_', ' ')}` : ''}
          </p>
        </div>
        {!bundleDraft && session.transcript_id && (
          <button
            onClick={build}
            disabled={synth.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-teacher-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-teacher-accent-hover disabled:opacity-50"
          >
            {synth.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Build bundle
          </button>
        )}
      </div>

      {transcript && (
        <div>
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="text-xs text-black/55 hover:text-black/80 underline underline-offset-2"
          >
            {showTranscript ? 'Hide transcript' : 'View transcript (admin only)'}
          </button>
          {showTranscript && (
            <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-black/12 bg-transparent p-3 text-xs text-black/60 whitespace-pre-wrap">
              {transcript.content_text
                ? transcript.content_text
                : transcript.file_path
                  ? 'Transcript is stored in the bucket (too large to inline). Open it from storage.'
                  : 'No transcript content.'}
            </pre>
          )}
        </div>
      )}

      {bundleDraft && (
        <div className="border-t border-black/12 pt-3">
          <SessionBundleReview draft={bundleDraft} />
        </div>
      )}
    </li>
  );
}

/**
 * A student's section runs, and what she keeps dropping across all of them.
 *
 * Read-only, like everything else on this tab. The interesting half is the
 * second one: any single Report Card says which Details went missing in one
 * sitting, and only the pile of them says which KIND she drops when it comes
 * up. That is the thing worth raising in a session.
 */
function StudentSectionRuns({ classId }: { classId?: string }) {
  const { data: grades = [], isLoading } = useQuery({
    queryKey: ["teacher-student-section-grades", classId],
    enabled: !!classId,
    queryFn: () => listStudentSectionGrades(classId as string),
  });

  if (isLoading) return null;
  return (
    <SectionRunHistory
      grades={grades}
      emptyMessage="No Read, Recall, Colour sections run yet."
    />
  );
}

function SessionRow({ session }: { session: { scheduled_at: string; status: string; source: string | null } }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-black/12 bg-white/30">
      <FileText className="w-4 h-4 text-black/45 shrink-0" />
      <div className="min-w-0 flex-1 text-sm text-[#11181c]">
        {format(new Date(session.scheduled_at), 'MMM d, yyyy · h:mm a')}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-black/45 shrink-0">{session.status}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] uppercase tracking-wider text-black/45 font-semibold">{children}</h3>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-black/12 px-4 py-6 text-center text-sm text-black/45">
      {children}
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-black/12 bg-white/30 px-4 py-3">
      <div className="flex items-center gap-2 text-black/45">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold text-[#11181c] tabular-nums">{value}</div>
    </div>
  );
}

function ActionRow({ Icon, title, description, onClick }: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left flex items-start gap-3 rounded-xl border border-black/12 bg-white/30 hover:bg-white/50 hover:border-black/30 transition-colors px-4 py-3"
    >
      <Icon className="w-4 h-4 text-black/45 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#11181c]">{title}</div>
        <div className="text-xs text-black/55 mt-0.5">{description}</div>
      </div>
    </button>
  );
}

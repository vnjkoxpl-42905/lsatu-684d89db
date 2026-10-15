import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAITADrafts, type AITADraft } from '@/hooks/useAITADrafts';
import { useStudentSessions } from '@/hooks/useStudentSessions';
import { useStudentContext } from '@/hooks/useStudentContext';
import { useSynthesizeBundle } from '@/hooks/useSessionBundles';
import { isSessionBundle, type SessionBundle } from '@/lib/sessionBundle';
import SessionBundleReview from '@/components/teacher/SessionBundleReview';

/**
 * Sessions / transcripts + the post-session bundle pipeline for one student.
 *
 * Lifted verbatim out of `TeacherStudentDetail` so the pipeline UI survives
 * that page's deletion in Phase 4. This is the only place a session bundle can
 * be synthesized and reviewed — do not drop it when absorbing surfaces.
 */
export default function SessionBundleList({ studentId }: { studentId: string }) {
  const { data: sessions = [] } = useStudentSessions(studentId);
  const { data: drafts = [] } = useAITADrafts({ studentId });
  const { data: context = [] } = useStudentContext(studentId);

  if (sessions.length === 0) {
    return (
      <div className="border border-dashed border-black/12 px-4 py-6 text-center text-sm text-black/45">
        No sessions logged yet. Ingested Gemini Notes appear here once matched to this student.
      </div>
    );
  }

  return (
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
  );
}

function SessionWithBundle({
  session,
  studentClassId,
  drafts,
  transcript,
}: {
  session: {
    id: string;
    scheduled_at: string;
    status: string;
    duration_minutes: number | null;
    source: string | null;
    transcript_id: string | null;
  };
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
    <li className="space-y-3 border border-black/12 bg-white/30 p-4">
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
            className="inline-flex items-center gap-1.5 bg-teacher-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-teacher-accent-hover disabled:opacity-50"
          >
            {synth.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            Build bundle
          </button>
        )}
      </div>

      {transcript && (
        <div>
          <button
            onClick={() => setShowTranscript((s) => !s)}
            className="text-xs text-black/55 underline underline-offset-2 hover:text-black/80"
          >
            {showTranscript ? 'Hide transcript' : 'View transcript (admin only)'}
          </button>
          {showTranscript && (
            <pre className="mt-2 max-h-72 overflow-auto border border-black/12 bg-transparent p-3 text-xs whitespace-pre-wrap text-black/60">
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

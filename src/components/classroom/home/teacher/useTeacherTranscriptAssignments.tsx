import { useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskBoardAdditions } from "./TeacherTasks";

type Preview = {
  id: string;
  session_id: string;
  student_id: string;
  snapshot: {
    pt: number;
    section: number;
    excerpt: string;
    student_name: string;
    catalog: { title: string; description: string | null; question_qids: string[] } | null;
  };
  receipt: { approved_at: string; assignment: { assignment_id: string; already_assigned: boolean } } | null;
};

async function request(action: string, preview?: Preview, section?: number) {
  const { data, error } = await supabase.functions.invoke("teacher-post-session-sync", {
    body: { action, sessionId: preview?.session_id, previewId: preview?.id, section },
  });
  if (error) throw error;
  return data;
}

function AssignmentPreview({ preview, reload }: { preview: Preview; reload: () => Promise<unknown> }) {
  const { snapshot } = preview;
  const sectionId = useId();
  const [section, setSection] = useState(snapshot.section);
  const change = useMutation({
    mutationFn: (action: string) => request(action, preview, section),
    onSettled: reload,
  });
  const [showPreview, setShowPreview] = useState(false);
  return (
    <li className="home-desk-manual-row">
      <b>{snapshot.student_name} · {snapshot.catalog?.title ?? `PT ${snapshot.pt}, section ${snapshot.section}`}</b>
      <div className="teacher-board-actions">
        <button type="button" aria-expanded={showPreview} onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? "Hide preview" : "Review assignment"}
        </button>
      </div>
      {showPreview && <>
        <p>PT {snapshot.pt}, section {snapshot.section}</p>
        {snapshot.catalog ? <>
          {snapshot.catalog.description && <p>{snapshot.catalog.description}</p>}
          <details><summary>{snapshot.catalog.question_qids.length} questions</summary>
            <ol>{snapshot.catalog.question_qids.map((qid) => <li key={qid}>{qid}</li>)}</ol>
          </details>
          <p>No notification will be sent.</p>
        </> : <p>A unique matching homework set is needed before this can be assigned.</p>}
        <details><summary>Transcript excerpt</summary><p>{snapshot.excerpt}</p></details>
        <div className="teacher-board-actions">
          <label htmlFor={sectionId}>Section</label>
          <select id={sectionId} value={section} disabled={change.isPending}
            onChange={(event) => setSection(Number(event.target.value))}>
            {[1, 2, 3, 4].map((number) => <option key={number} value={number}>{number}</option>)}
          </select>
          {section !== snapshot.section && <button type="button" disabled={change.isPending}
            onClick={() => change.mutate("correct_transcript")}>Update preview</button>}
          {snapshot.catalog && <button type="button" className="home-desk-primary"
            disabled={change.isPending || section !== snapshot.section} onClick={() => change.mutate("accept_transcript")}>
            Accept &amp; assign
          </button>}
          <button type="button" disabled={change.isPending} onClick={() => change.mutate("refresh_transcript")}>
            Refresh preview
          </button>
        </div>
      </>}
      {change.isError && <p role="alert">Could not confirm this request. Refresh the preview before approving again.</p>}
    </li>
  );
}

export function useTeacherTranscriptAssignments(actorId: string | undefined): TaskBoardAdditions | undefined {
  const client = useQueryClient();
  const queryKey = ["teacher-home:transcript-assignments", actorId];
  const query = useQuery<Preview[]>({
    queryKey,
    enabled: Boolean(actorId),
    queryFn: async () => (await request("transcript_assignments")).actions,
    refetchInterval: 60_000,
  });
  if (!actorId) return undefined;
  const pending = query.data?.filter((row) => !row.receipt) ?? [];
  const completed = query.data?.filter((row) => row.receipt) ?? [];
  return {
    pendingCount: pending.length,
    loading: query.isPending,
    pending: <>
      {query.isError && <p role="alert">Could not load transcript assignments.{" "}
        <button type="button" onClick={() => void query.refetch()}>Try again</button>
      </p>}
      {pending.map((preview) => <AssignmentPreview key={preview.id} preview={preview}
        reload={() => client.invalidateQueries({ queryKey })} />)}
    </>,
    completed: completed.map(({ id, snapshot, student_id, receipt }) => ({
      id,
      title: snapshot.catalog?.title ?? `PT ${snapshot.pt}, section ${snapshot.section}`,
      studentId: student_id,
      studentName: snapshot.student_name,
      content: <p>{receipt!.assignment.already_assigned ? "Existing assignment confirmed" : "Assignment confirmed"}{" "}
        <a href={`/classroom/${receipt!.assignment.assignment_id}`}>Open assignment</a>
      </p>,
    })),
    planning: null,
  };
}

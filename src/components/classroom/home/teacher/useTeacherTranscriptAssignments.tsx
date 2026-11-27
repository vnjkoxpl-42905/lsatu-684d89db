import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskBoardAdditions } from "./TeacherTasks";

const timingOptions = {
  "35": "35 minutes",
  "52.5": "52 minutes 30 seconds (+50%)",
  "70": "70 minutes (+100%)",
  unlimited: "Untimed",
} as const;

type TimingMode = keyof typeof timingOptions;
type SavedChoice = { pt: number; section: number; timing: TimingMode };
type CatalogSection = { preptest: number; section: number; kind?: "lr" | "rc" };
type AssignmentBoard = { actions: Preview[]; sections?: CatalogSection[] };

type Preview = {
  id: string;
  session_id: string;
  student_id: string;
  snapshot: {
    pt: number | null;
    section: number | null;
    timing_mode?: TimingMode;
    excerpt: string;
    student_name: string;
    catalog: { title: string; kind?: "lr" | "rc"; question_qids: string[] } | null;
  };
  receipt: { approved_at: string; assignment: { assignment_id: string; already_assigned: boolean; route?: string } } | null;
};

async function request(action: string, preview?: Preview, choice?: SavedChoice) {
  const { data, error } = await supabase.functions.invoke("teacher-post-session-sync", {
    body: { action, sessionId: preview?.session_id, previewId: preview?.id, ...choice },
  });
  if (error) throw error;
  return data;
}

function AssignmentPreview({ preview, sections, reload }: {
  preview: Preview;
  sections: CatalogSection[] | undefined;
  reload: () => Promise<unknown>;
}) {
  const { snapshot } = preview;
  const id = useId();
  const savedTiming = snapshot.timing_mode ?? "35";
  const [pt, setPt] = useState(String(snapshot.pt ?? ""));
  const [section, setSection] = useState(snapshot.section ?? 0);
  const [timing, setTiming] = useState<TimingMode>(savedTiming);
  const [open, setOpen] = useState(false);
  const preptest = Number(pt);
  const changed = preptest !== snapshot.pt || section !== snapshot.section || timing !== savedTiming;
  const sectionOptions: CatalogSection[] = sections
    ? sections.filter((entry) => entry.preptest === preptest)
    : [1, 2, 3, 4].map((number) => ({ preptest, section: number }));
  const sectionIsAvailable = sectionOptions.some((entry) => entry.section === section);
  const valid = Number.isInteger(preptest) && preptest >= 1 && preptest <= 999 && sectionIsAvailable;
  const change = useMutation({
    mutationFn: ({ action, choice }: { action: string; choice?: SavedChoice }) => request(action, preview, choice),
    onSettled: reload,
  });

  useEffect(() => {
    setPt(String(snapshot.pt ?? ""));
    setSection(snapshot.section ?? 0);
    setTiming(savedTiming);
  }, [preview.id, snapshot.pt, snapshot.section, savedTiming]);

  const title = snapshot.catalog?.title ??
    (snapshot.pt && snapshot.section ? `PT ${snapshot.pt}, Section ${snapshot.section}` : "Choose a section");
  return (
    <li className="home-desk-manual-row">
      <b>{snapshot.student_name} Â· {title}</b>
      {snapshot.catalog && <small>{timingOptions[savedTiming]}</small>}
      <div className="teacher-board-actions">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? "Hide preview" : "Review assignment"}
        </button>
      </div>
      {open && <div id={id}>
        <div className="teacher-transcript-fields">
          <div>
            <label htmlFor={`${id}-pt`}>PrepTest</label>
            {sections ? (
              <select id={`${id}-pt`} value={pt} disabled={change.isPending} onChange={(event) => {
                setPt(event.target.value);
                setSection(0);
              }}>
                <option value="">Choose</option>
                {[...new Set(sections.map((entry) => entry.preptest))].map((number) => (
                  <option key={number} value={number}>PT {number}</option>
                ))}
              </select>
            ) : (
              <input id={`${id}-pt`} type="number" min={1} max={999} inputMode="numeric" value={pt}
                disabled={change.isPending} onChange={(event) => { setPt(event.target.value); setSection(0); }} />
            )}
          </div>
          <div>
            <label htmlFor={`${id}-section`}>Section</label>
            <select id={`${id}-section`} value={sectionIsAvailable ? section : 0} disabled={change.isPending || !sectionOptions.length}
              onChange={(event) => setSection(Number(event.target.value))}>
              <option value={0}>Choose</option>
              {sectionOptions.map(({ section: number, kind }) => (
                <option key={number} value={number}>
                  {kind ? `Section ${number} (${kind.toUpperCase()})` : number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-timing`}>Timing</label>
            <select id={`${id}-timing`} value={timing} disabled={change.isPending}
              onChange={(event) => setTiming(event.target.value as TimingMode)}>
              {(["unlimited", "35", "52.5", "70"] as const).map((mode) => <option key={mode} value={mode}>{timingOptions[mode]}</option>)}
            </select>
          </div>
        </div>
        {!changed && snapshot.catalog && (
          <p>{snapshot.catalog.kind === "rc" ? "Reading Comprehension" : "Logical Reasoning"}{" | "}{snapshot.catalog.question_qids.length} questions Â· {timingOptions[savedTiming]} Â· No notification</p>
        )}
        {!changed && !snapshot.catalog && valid && <p>This section is unavailable. Choose another one.</p>}
        <details><summary>Transcript excerpt</summary><p>{snapshot.excerpt}</p></details>
        <div className="teacher-board-actions">
          {changed ? (
            <button type="button" className="home-desk-primary" disabled={!valid || change.isPending}
              onClick={() => change.mutate({ action: "correct_transcript", choice: { pt: preptest, section, timing } })}>
              Update preview
            </button>
          ) : snapshot.catalog ? (
            <button type="button" className="home-desk-primary" disabled={change.isPending}
              onClick={() => change.mutate({ action: "accept_transcript" })}>
              Accept &amp; assign
            </button>
          ) : null}
          <button type="button" disabled={change.isPending} onClick={() => change.mutate({ action: "refresh_transcript" })}>
            Refresh preview
          </button>
        </div>
      </div>}
      {change.isError && <p role="alert">Could not confirm this request. Refresh the preview before approving again.</p>}
    </li>
  );
}

export function useTeacherTranscriptAssignments(actorId: string | undefined): TaskBoardAdditions | undefined {
  const client = useQueryClient();
  const queryKey = ["teacher-home:transcript-assignments", actorId];
  const query = useQuery<AssignmentBoard>({
    queryKey,
    enabled: Boolean(actorId),
    queryFn: () => request("transcript_assignments"),
    refetchInterval: 60_000,
  });
  if (!actorId) return undefined;
  const pending = query.data?.actions.filter((row) => !row.receipt) ?? [];
  const completed = query.data?.actions.filter((row) => row.receipt) ?? [];
  return {
    pendingCount: pending.length,
    loading: query.isPending,
    pending: <>
      {query.isError && <p role="alert">Could not load transcript assignments.{" "}
        <button type="button" onClick={() => void query.refetch()}>Try again</button>
      </p>}
      {pending.map((preview) => <AssignmentPreview key={preview.session_id} preview={preview} sections={query.data?.sections}
        reload={() => client.invalidateQueries({ queryKey })} />)}
    </>,
    completed: completed.map(({ id, snapshot, student_id, receipt }) => ({
      id,
      title: snapshot.catalog?.title ?? `PT ${snapshot.pt}, section ${snapshot.section}`,
      studentId: student_id,
      studentName: snapshot.student_name,
      content: <p>{receipt!.assignment.already_assigned ? "Existing assignment confirmed" : "Assignment confirmed"}{" "}
        <a href={receipt!.assignment.route ?? `/classroom/${receipt!.assignment.assignment_id}`}>Open assignment</a>
      </p>,
    })),
    planning: null,
  };
}

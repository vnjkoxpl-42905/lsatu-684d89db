import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskBoardAdditions } from "@/components/classroom/home/teacher/TeacherTasks";

interface Preview {
  id: string;
  title: string;
  section: number;
  notification: string;
}

interface TranscriptConflict {
  id: string;
  prior_excerpt: string;
  revised_excerpts: { excerpt: string; pt: number; section: number; state: "pin" | "pending" }[];
}

interface FixtureAction {
  id: string;
  excerpt: string;
  student_name: string;
  student_id: string;
  available_sections: number[];
  pt: number;
  section: number;
  state: "pin" | "pending" | "done";
  preview: Preview | null;
  conflict?: TranscriptConflict | null;
  receipt: { assignment_id: string; notified: boolean } | null;
}

interface AssignmentReadback { id: string; set_title: string; question_count: number; notification_count: number }

const endpoint = "http://127.0.0.1:8796";

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(endpoint + path, body && {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Fixture request failed");
  return response.json();
}

function FixtureRow({ action, refresh }: { action: FixtureAction; refresh: () => Promise<void> }) {
  const [readback, setReadback] = useState<AssignmentReadback | null>(null);
  const [section, setSection] = useState(action.section);
  useEffect(() => setSection(action.section), [action.section, action.preview?.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const save = async (operation: "preview" | "execute" | "dismiss" | "resolve", payload: object) => {
    setBusy(true);
    setError(false);
    try {
      await request(`/actions/${action.id}/${operation}`, payload);
      await refresh();
    } catch {
      await refresh().catch(() => {});
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  if (action.conflict) {
    const conflict = action.conflict;
    return (
      <section className="teacher-transcript-fixture-row" aria-label="Transcript change needs review">
        <h4>Transcript change needs review</h4>
        <p>Execution is paused. Choose how to handle the revised transcript.</p>
        <p>Earlier transcript</p>
        <blockquote>{conflict.prior_excerpt}</blockquote>
        <p>Current choice · PT {action.pt}, section {action.section}</p>
        <div className="teacher-board-actions">
          <button type="button" disabled={busy}
            onClick={() => void save("resolve", { conflictId: conflict.id, choice: "keep" })}>Keep my choice</button>
        </div>
        {!conflict.revised_excerpts.length && <p>The revised transcript has no clear replacement for this item.</p>}
        {conflict.revised_excerpts.map((candidate, index) => (
          <div key={candidate.excerpt}>
            <p>Revised transcript</p>
            <blockquote>{candidate.excerpt}</blockquote>
            <div className="teacher-board-actions">
              <button type="button" disabled={busy} onClick={() => void save("resolve", {
                conflictId: conflict.id, choice: "revised", revisedIndex: index,
              })}>{candidate.state === "pin" ? "Use revised tentative idea" : `Use revised section ${candidate.section}`}</button>
            </div>
          </div>
        ))}
        {error && <p role="alert">Could not confirm the decision. Refresh fixture state before trying again.</p>}
      </section>
    );
  }
  return (
    <form className="teacher-transcript-fixture-row" onSubmit={(event) => {
      event.preventDefault();
      if (!busy && action.available_sections.includes(section)) void save("preview", { section });
    }}>
      <h4>{action.state === "pin" ? "Next-session planning" : action.preview?.title ?? `PT ${action.pt}, section ${action.section}`}</h4>
      {action.state === "pin" && <p>Assign PT {action.pt}, section {action.section} next session?</p>}
      {action.state === "done" && <p>{action.student_name}</p>}
      {action.state === "pending" && action.preview && (
        <p>{action.student_name} · {action.preview.notification}</p>
      )}
      <details><summary>Transcript excerpt</summary><p>{action.excerpt}</p></details>
      {action.state === "done" ? (
        <div>
          <p role="status">Done · {action.receipt?.notified ? "Notification recorded" : "Notification pending"}</p>
          {action.receipt && <button type="button" onClick={() => {
            setError(false);
            void request<AssignmentReadback>(`/assignments/${action.receipt!.assignment_id}`)
              .then(setReadback).catch(() => setError(true));
          }}>Read back assignment</button>}
          {readback && <p role="status">{readback.set_title} · {readback.question_count} questions · {readback.notification_count} in-app notification</p>}
        </div>
      ) : (
        <div className="teacher-board-actions">
          <details><summary>{action.state === "pin" ? "Choose a section" : "Change assignment"}</summary>
          <label>Section <select disabled={busy || !action.available_sections.length} value={section} onChange={(event) => setSection(Number(event.target.value))}>
            {!action.available_sections.includes(section) && <option value={section} disabled>Choose a section</option>}
            {action.available_sections.map((value) => <option key={value}>{value}</option>)}
          </select></label>
          <button disabled={busy || !action.available_sections.includes(section)}>{action.state === "pin" ? "Prepare assignment" : "Update preview"}</button>
          </details>
          {action.state === "pending" && action.preview && (
            <button type="button" disabled={busy || section !== action.preview.section || !action.available_sections.includes(section)}
              onClick={() => void save("execute", { revision: action.preview!.id })}>Accept &amp; assign</button>
          )}
          <button type="button" disabled={busy} onClick={() => void save("dismiss", {})}>Dismiss</button>
        </div>
      )}
      {error && <p role="alert">Could not confirm the request. Refresh fixture state before trying again.</p>}
    </form>
  );
}

export function useTeacherTranscriptFixture(enabled: boolean): TaskBoardAdditions | undefined {
  const [revising, setRevising] = useState(false);
  const [actions, setActions] = useState<FixtureAction[] | null>(null);
  const [error, setError] = useState(false);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      const data = await request<{ actions: FixtureAction[] }>("/actions");
      if (requestVersion === version.current) {
        setActions(data.actions);
        setError(false);
      }
    } catch (error) {
      if (requestVersion !== version.current) return;
      setError(true);
      throw error;
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    void refresh().catch(() => {});
    return () => { version.current++; };
  }, [enabled, refresh]);

  if (!enabled) return undefined;
  const pending = actions?.filter((action) => action.state === "pending") ?? [];
  const done = actions?.filter((action) => action.state === "done") ?? [];
  const pins = actions?.filter((action) => action.state === "pin" && !action.conflict) ?? [];
  const review = actions?.filter((action) => action.state === "pin" && action.conflict) ?? [];
  const row = (action: FixtureAction) => <FixtureRow key={action.id} action={action} refresh={refresh} />;

  return {
    pendingCount: pending.length,
    loading: !actions && !error,
    pending: (
      <>
        {error && <p role="alert">The local transcript fixture is unavailable.</p>}
        {!actions && !error && <p role="status">Loading transcript actions…</p>}
        {pending.map(row)}
      </>
    ),
    completed: done.map((action) => ({
      id: action.id,
      title: action.preview?.title ?? `PT ${action.pt}, section ${action.section}`,
      studentId: action.student_id,
      studentName: action.student_name,
      content: row(action),
    })),
    planning: (
      <section className="teacher-transcript-fixture" aria-labelledby="fixture-planning">
        <h3 id="fixture-planning">Next-session planning</h3>
        <details><summary>Test controls</summary>
        <button type="button" onClick={() => void refresh().catch(() => {})}>Refresh fixture state</button>
        <div className="teacher-board-actions">
          {(["tentative", "section"] as const).map((variant) => (
            <button key={variant} type="button" disabled={revising} onClick={() => {
              setRevising(true);
              void request("/transcript/revise", { variant })
                .then(refresh).catch(() => setError(true)).finally(() => setRevising(false));
            }}>{variant === "tentative" ? "Load tentative revision" : "Load section revision"}</button>
          ))}
        </div>
        </details>
        {review.map(row)}
        {pins.map(row)}
      </section>
    ),
  };
}

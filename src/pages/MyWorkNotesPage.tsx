import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ClassroomRecapsView } from "@/components/classroom/ClassroomRouteViews";
import { createPage, listPages, updateMyNotePage, type JournalPage } from "@/lib/journalService";
import { noteBodyToText, textToNoteBody } from "@/components/my-work/studentNoteText";
import "./myWorkNotes.css";

function updatedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function StudentNotesSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const queryKey = ["my-work", "student-notes", user?.id] as const;
  const query = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: listPages,
    staleTime: 60_000,
  });
  const notes = useMemo(() => (query.data ?? [])
    .filter((page) => page.type === "doc" && page.user_id === user?.id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [query.data, user?.id]);
  const selected = notes.find((page) => page.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    if (selectedId === "new") {
      setTitle("");
      setBody("");
    } else if (selected) {
      setTitle(selected.title === "Untitled" ? "" : selected.title);
      setBody(noteBodyToText(selected.body));
    }
  }, [selectedId, selected?.id]);

  const choose = (id: string | null) => {
    setSaveError(null);
    setSaved(false);
    const next = new URLSearchParams(params);
    if (id) next.set("note", id);
    else next.delete("note");
    setParams(next);
  };

  const save = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const nextTitle = title.trim() || "Untitled note";
      const nextBody = textToNoteBody(body);
      let page: JournalPage;
      if (selectedId === "new") {
        page = await createPage({ title: nextTitle, body: nextBody, properties: { origin: "my_work_note" } });
      } else {
        page = await updateMyNotePage(selectedId, nextTitle, nextBody);
      }
      await queryClient.invalidateQueries({ queryKey });
      if (selectedId === "new") choose(page.id);
      setSaved(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your note could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="my-work-student-notes" aria-labelledby="my-notes-heading">
      <div className="my-work-notes-heading">
        <div><h2 id="my-notes-heading">My notes</h2><p>Notes you write for yourself. Joshua's notes and session recaps are below.</p></div>
        <button type="button" className="classroom-button" onClick={() => choose("new")}>New note</button>
      </div>
      {query.isLoading ? <p role="status" className="student-destination-message">Loading your notes…</p> : null}
      {query.isError ? <div role="alert" className="student-destination-message"><p>Your notes could not be loaded.</p><button type="button" className="classroom-button" onClick={() => void query.refetch()}>Try again</button></div> : null}
      {!query.isLoading && !query.isError ? (
        <div className="my-work-notes-workspace">
          <div className="my-work-notes-list">
            {notes.length === 0 ? <p>You have not written a note yet.</p> : <ul>{notes.map((note) => (
              <li key={note.id}><button type="button" className={selectedId === note.id ? "my-work-note-selected" : ""} onClick={() => choose(note.id)} aria-current={selectedId === note.id ? "true" : undefined}>
                <strong>{note.title}</strong><span>{updatedDate(note.updated_at)}</span>
              </button></li>
            ))}</ul>}
          </div>
          {selectedId ? (
            <div className="my-work-notes-editor" aria-label={selectedId === "new" ? "New note" : "Edit note"}>
              {selectedId !== "new" && !selected ? <p>This note is unavailable in your account.</p> : <>
                <label>Title<input type="text" value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} placeholder="Untitled note" maxLength={200} /></label>
                <label>Note<textarea value={body} onChange={(event) => { setBody(event.target.value); setSaved(false); }} placeholder="Write what you want to remember…" rows={10} /></label>
                {saveError ? <p role="alert" className="my-work-note-error">{saveError}</p> : null}
                {saved ? <p role="status" className="my-work-note-saved">Saved to your account.</p> : null}
                <div className="my-work-notes-actions"><button type="button" className="classroom-button classroom-button-primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save note"}</button><button type="button" className="classroom-button" onClick={() => choose(null)}>Close</button></div>
              </>}
            </div>
          ) : <div className="my-work-notes-prompt">Choose a note to read or write a new one.</div>}
        </div>
      ) : null}
    </section>
  );
}

export default function MyWorkNotesPage() {
  return <div className="my-work-notes-page"><StudentNotesSection /><section className="my-work-teacher-notes" aria-label="Notes and recaps from Joshua"><h2>From Joshua</h2><ClassroomRecapsView /></section></div>;
}

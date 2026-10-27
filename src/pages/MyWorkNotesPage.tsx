import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TeachingNotesArchive } from "@/components/my-work/TeachingNotesArchive";
import { createPage, listPages, updateMyNotePage, type JournalPage } from "@/lib/journalService";
import { noteBodyToText, textToNoteBody } from "@/components/my-work/studentNoteText";
import "./myWorkNotes.css";

type Draft = { title: string; body: string; baseline: string | null };
const draftKey = (user: string, note: string) => `my-work-note-draft:${encodeURIComponent(user)}:${encodeURIComponent(note)}`;
function updatedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function StudentNotesSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("note");
  const [draft, setDraft] = useState<Draft>({ title: "", body: "", baseline: null });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState<JournalPage | null>(null);
  const loaded = useRef<string | null>(null);
  const queryKey = ["my-work", "student-notes", user?.id] as const;
  const query = useQuery({ queryKey, enabled: !!user, queryFn: listPages, staleTime: 60_000 });
  const notes = useMemo(() => (query.data ?? []).filter((page) => page.type === "doc" && page.user_id === user?.id)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [query.data, user?.id]);
  const selected = notes.find((page) => page.id === selectedId);
  const removeDraft = (id: string) => {
    if (!user) return;
    try { sessionStorage.removeItem(draftKey(user.id, id)); } catch { setStorageError(true); }
  };
  useEffect(() => {
    if (!user || !selectedId) { loaded.current = null; setDirty(false); return; }
    const identity = draftKey(user.id, selectedId);
    if (loaded.current === identity || (selectedId !== "new" && !selected)) return;
    loaded.current = identity;
    let recovered: Draft | null = null;
    try {
      const raw = sessionStorage.getItem(identity);
      if (raw) {
        const value = JSON.parse(raw);
        if (typeof value.title === "string" && typeof value.body === "string" && (value.baseline === null || typeof value.baseline === "string")) recovered = value;
      }
    } catch { setStorageError(true); }
    setDraft(recovered ?? { title: selected?.title === "Untitled" ? "" : selected?.title ?? "", body: selected ? noteBodyToText(selected.body) : "", baseline: selected?.updated_at ?? null });
    setDirty(!!recovered);
    setSaved(false); setSaveError(null); setConflict(null);
  }, [user?.id, selectedId, selected]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (field: "title" | "body", value: string) => {
    const next = { ...draft, [field]: value };
    setDraft(next); setDirty(true); setSaved(false); setConflict(null);
    if (user && selectedId) {
      try { sessionStorage.setItem(draftKey(user.id, selectedId), JSON.stringify(next)); setStorageError(false); }
      catch { setStorageError(true); }
    }
  };
  const navigate = (id: string | null, archive = false) => {
    if (saving || (dirty && !window.confirm("Leave this note? Your unsaved draft will stay in this browser tab when storage is available."))) return;
    const next = new URLSearchParams(params);
    if (archive) { next.delete("view"); next.delete("note"); }
    else { next.set("view", "mine"); if (id) next.set("note", id); else next.delete("note"); }
    setParams(next); setDirty(false); setSaved(false); setSaveError(null);
  };
  const save = async (overwriteVersion?: string) => {
    if (!selectedId || saving || !user) return;
    setSaving(true); setSaveError(null); setSaved(false);
    try {
      if (selectedId !== "new") {
        const current = (await listPages()).find((page) => page.id === selectedId && page.user_id === user.id && page.type === "doc");
        if (!current) throw new Error("This note is unavailable in your account.");
        if (current.updated_at !== (overwriteVersion ?? draft.baseline)) { setConflict(current); return; }
      }
      const nextTitle = draft.title.trim() || "Untitled note";
      const nextBody = textToNoteBody(draft.body);
      const page = selectedId === "new"
        ? await createPage({ title: nextTitle, body: nextBody, properties: { origin: "my_work_note" } })
        : await updateMyNotePage(selectedId, nextTitle, nextBody, overwriteVersion ?? draft.baseline ?? undefined);
      queryClient.setQueryData<JournalPage[]>(queryKey, (old = []) => [page, ...old.filter((item) => item.id !== page.id)]);
      removeDraft(selectedId);
      setDraft({ title: page.title, body: noteBodyToText(page.body), baseline: page.updated_at });
      setDirty(false); setConflict(null); setSaved(true);
      if (selectedId === "new") {
        loaded.current = draftKey(user.id, page.id);
        const next = new URLSearchParams(params); next.set("view", "mine"); next.set("note", page.id); setParams(next, { replace: true });
      }
      void queryClient.invalidateQueries({ queryKey });
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Your note could not be saved."); }
    finally { setSaving(false); }
  };
  const useServerVersion = () => {
    if (!conflict || !selectedId || !window.confirm("Replace this unsaved draft with the saved account version?")) return;
    setDraft({ title: conflict.title, body: noteBodyToText(conflict.body), baseline: conflict.updated_at });
    removeDraft(selectedId); setConflict(null); setDirty(false); setSaved(false);
  };
  return <section className="my-work-student-notes" aria-labelledby="my-notes-heading">
    <button type="button" className="classroom-button" disabled={saving} onClick={() => navigate(null, true)}>Back to teaching notes</button>
    <div className="my-work-notes-heading"><div><h2 id="my-notes-heading">My notes</h2><p>Your personal notebook.</p></div><button type="button" className="classroom-button" disabled={saving} onClick={() => navigate("new")}>New note</button></div>
    {storageError && <p role="alert">This browser cannot recover your draft after leaving. Save your note before leaving.</p>}
    {query.isLoading && <p role="status">Loading your notes…</p>}
    {query.isError && <div role="alert"><p>Your notes could not be loaded.</p><button type="button" onClick={() => void query.refetch()}>Try again</button></div>}
    {!query.isLoading && !query.isError && <div className="my-work-notes-workspace"><div className="my-work-notes-list">
      {notes.length === 0 ? <p>You have not written a note yet.</p> : <ul>{notes.map((note) => <li key={note.id}><button type="button" disabled={saving} className={selectedId === note.id ? "my-work-note-selected" : ""} onClick={() => navigate(note.id)} aria-current={selectedId === note.id ? "true" : undefined}><strong>{note.title}</strong><span>{updatedDate(note.updated_at)}</span></button></li>)}</ul>}
    </div>{selectedId ? <div className="my-work-notes-editor" aria-label={selectedId === "new" ? "New note" : "Edit note"}>
      {selectedId !== "new" && !selected ? <p>This note is unavailable in your account.</p> : <>
        <label>Title<input disabled={saving} type="text" value={draft.title} onChange={(event) => change("title", event.target.value)} placeholder="Untitled note" maxLength={200} /></label>
        <label>Note<textarea disabled={saving} value={draft.body} onChange={(event) => change("body", event.target.value)} placeholder="Write what you want to remember…" rows={10} /></label>
        {dirty && <p role="status">Unsaved draft. Save to keep it in your account.</p>}
        {saveError && <p role="alert" className="my-work-note-error">{saveError}</p>}
        {saved && <p role="status" className="my-work-note-saved">Saved to your account.</p>}
        {conflict && <div role="alert"><p>A newer account version exists. Your draft has been kept. Choose which version to keep.</p><button type="button" disabled={saving} onClick={useServerVersion}>Use account version</button><button type="button" disabled={saving} onClick={() => void save(conflict.updated_at)}>Replace account version with my draft</button></div>}
        <div className="my-work-notes-actions"><button type="button" className="classroom-button classroom-button-primary" disabled={saving || !!conflict} onClick={() => void save()}>{saving ? "Saving…" : "Save note"}</button><button type="button" className="classroom-button" disabled={saving} onClick={() => navigate(null)}>Close</button></div>
      </>}
    </div> : <div className="my-work-notes-prompt">Choose a note to read or write a new one.</div>}</div>}
  </section>;
}

export default function MyWorkNotesPage() {
  const [params, setParams] = useSearchParams();
  const personal = params.get("view") === "mine" || params.has("note");
  return <div className="my-work-notes-page">{personal ? <StudentNotesSection /> : <TeachingNotesArchive onOpenPersonalNotes={() => { const next = new URLSearchParams(params); next.set("view", "mine"); setParams(next); }} />}</div>;
}

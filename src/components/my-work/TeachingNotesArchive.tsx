import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { isNoteUnread } from '@/components/classroom/classroomData';
import { notesDetailRoute, validateNotesReturnTo } from '@/lib/myWorkNotesNavigation';
import { archiveShown, filterTeachingNotes, nearestArchiveNote, orderedTeachingNotes, teachingNoteText } from './teachingNotesArchiveData';

const kinds: Partial<Record<ClassroomItem['type'], string>> = { note: 'Note', session_recap: 'Session recap', announcement: 'Announcement', smartboard_recap: 'Whiteboard recap' };
function dateLabel(value: string, monthOnly = false) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, monthOnly ? { month: 'long', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export function TeachingNotesArchive({ onOpenPersonalNotes }: { onOpenPersonalNotes?: () => void }) {
  const query = useClassroomItems();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const unreadOnly = params.get('filter') === 'unread';
  const shown = archiveShown(params.get('shown'));
  const notes = useMemo(() => orderedTeachingNotes(query.data ?? []), [query.data]);
  const text = useMemo(() => new Map(notes.map((note) => [note.id, teachingNoteText(note)])), [notes]);
  const filtered = useMemo(() => filterTeachingNotes(notes, text, search, unreadOnly), [notes, text, search, unreadOnly]);
  const visible = filtered.slice(0, shown);
  const unreadCount = notes.filter(isNoteUnread).length;
  const archivePath = validateNotesReturnTo(`/my-work/notes?${params.toString()}`);
  const storageKey = `my-work-notes-anchor:${user?.id ?? 'anonymous'}:${archivePath}`;
  const cards = useRef(new Map<string, HTMLAnchorElement>());
  const restored = useRef('');
  useEffect(() => {
    if (query.isLoading || query.error || restored.current === storageKey) return;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const anchor = JSON.parse(stored) as { id: string; ids: string[] };
      const targetId = nearestArchiveNote(anchor.ids, anchor.id, visible.map((note) => note.id));
      const target = targetId && cards.current.get(targetId);
      if (target) { target.focus({ preventScroll: true }); target.scrollIntoView?.({ block: 'center' }); }
      else document.getElementById('notes-archive-heading')?.focus();
      sessionStorage.removeItem(storageKey);
      restored.current = storageKey;
    } catch { /* Storage is optional; the archive remains navigable. */ }
  }, [query.isLoading, query.error, storageKey, visible]);
  function update(key: 'q' | 'filter' | 'shown', value: string, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, key === 'q' ? value.slice(0, 500) : value); else next.delete(key);
    if (key !== 'shown') next.delete('shown');
    setParams(next, { replace });
  }
  function remember(id: string) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ id, ids: filtered.map((note) => note.id) })); } catch { /* Browser storage may be unavailable. */ }
  }
  function card(note: ClassroomItem, featured = false) {
    return <Link key={note.id} to={notesDetailRoute(note.id, archivePath)} onClick={() => remember(note.id)} ref={(node) => { if (node) cards.current.set(note.id, node); else cards.current.delete(note.id); }} className={`teaching-note-card${featured ? ' teaching-note-lead' : ''}`}>
      <span className="teaching-note-document" aria-hidden="true"><FileText size={featured ? 30 : 22} /></span>
      <span className="teaching-note-card-content"><span className="teaching-note-meta">{featured ? 'Most recent · ' : ''}{kinds[note.type] ?? 'Note'}{isNoteUnread(note) ? <span className="teaching-note-unread">Unread</span> : null}</span>
      <strong className="teaching-note-title">{note.title}</strong><time dateTime={note.created_at}>{dateLabel(note.created_at)}</time>
      {text.get(note.id) ? <span className="teaching-note-excerpt">{text.get(note.id)}</span> : null}
      <span className="teaching-note-read">Read note <ArrowRight size={16} aria-hidden="true" /></span></span>
    </Link>;
  }
  const groups = visible.reduce<Array<{ key: string; label: string; notes: ClassroomItem[] }>>((result, note) => {
    const key = note.created_at.slice(0, 7);
    const last = result[result.length - 1];
    if (last?.key === key) last.notes.push(note); else result.push({ key, label: dateLabel(note.created_at, true), notes: [note] });
    return result;
  }, []);
  const leadId = !search && !unreadOnly ? visible[0]?.id : undefined;
  const personalPath = `${archivePath}${archivePath.includes('?') ? '&' : '?'}view=mine`;
  return <section className="teaching-notes-home" aria-labelledby="teaching-notes-heading">
    <div className="teaching-notes-intro">
      <div><h2 id="teaching-notes-heading">Notes &amp; recaps</h2><p>Session notes, explanations and recaps. Find what you need and return to it as you practise.</p></div>
      {onOpenPersonalNotes ? <button type="button" className="classroom-button teaching-notes-personal-link" onClick={onOpenPersonalNotes}>Personal notes</button> : <Link className="classroom-button teaching-notes-personal-link" to={personalPath}>Personal notes</Link>}
    </div>
    {query.isLoading && !query.data ? <p role="status" className="teaching-notes-state">Loading your notes…</p> : query.error ? <div role="alert" className="teaching-notes-state"><p>Your notes could not be loaded. Try again to see the complete archive.</p><button type="button" className="classroom-button" onClick={() => void query.refetch()}>Try again</button></div> : !notes.length ? <div className="teaching-notes-empty"><BookOpen size={28} aria-hidden="true" /><h3>Your notes will live here.</h3><p>Notes and recaps shared after your sessions will be easy to find here.</p></div> : <div className="teaching-notes-archive">
      <div className="teaching-notes-archive-heading"><h3 id="notes-archive-heading" tabIndex={-1}>Browse your notes</h3><span role="status">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'}{search || unreadOnly ? ' found' : ''}</span></div>
      <div className="teaching-notes-controls"><label className="teaching-notes-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search notes</span><input type="search" value={search} placeholder="Search titles and notes…" onChange={(event) => update('q', event.target.value, true)} /></label><div className="teaching-notes-filters" role="group" aria-label="Filter notes"><button type="button" aria-label="All" aria-pressed={!unreadOnly} onClick={() => update('filter', '')}>All <span className="teaching-notes-filter-count" aria-hidden="true">{notes.length}</span></button><button type="button" aria-label="Unread" aria-pressed={unreadOnly} onClick={() => update('filter', 'unread')}>Unread <span className="teaching-notes-filter-count" aria-hidden="true">{unreadCount}</span></button></div></div>
      {!filtered.length ? <div className="teaching-notes-no-results"><p>No notes match these filters.</p><button className="classroom-button" type="button" onClick={() => { const next = new URLSearchParams(params); ['q', 'filter', 'shown'].forEach((key) => next.delete(key)); setParams(next); }}>Clear filters</button></div> : groups.map((group) => <section key={group.key} aria-label={notes.length > 12 ? group.label : 'All notes'}>{notes.length > 12 ? <h4 className="teaching-notes-month">{group.label}</h4> : null}<div className="teaching-notes-grid">{group.notes.map((note) => card(note, note.id === leadId))}</div></section>)}
      {visible.length < filtered.length ? <button className="classroom-button teaching-notes-load" type="button" onClick={() => update('shown', String(shown + 12))}>Load more notes <span>({filtered.length - visible.length} remaining)</span></button> : null}
    </div>}
  </section>;
}

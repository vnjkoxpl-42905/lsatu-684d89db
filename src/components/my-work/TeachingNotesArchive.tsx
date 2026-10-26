import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { isNoteUnread } from '@/components/classroom/classroomData';
import { notesDetailRoute, validateNotesReturnTo } from '@/lib/myWorkNotesNavigation';
import { archiveShown, filterTeachingNotes, nearestArchiveNote, orderedTeachingNotes, teachingNoteText } from './teachingNotesArchive';

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
    return <Link key={note.id} to={notesDetailRoute(note.id, archivePath)} onClick={() => remember(note.id)} ref={(node) => { if (!featured) { if (node) cards.current.set(note.id, node); else cards.current.delete(note.id); } }} className={featured ? 'teaching-note-featured' : 'teaching-note-card'}>
      <span className="teaching-note-document" aria-hidden="true"><FileText size={featured ? 30 : 22} /><i /><i /><i /></span>
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
  return <section className="teaching-notes-home" aria-label="Notes">
    <div className="teaching-notes-intro"><div><p className="teaching-notes-eyebrow">Your reference shelf</p><h2>Keep the useful things close.</h2><p>Session notes, explanations and recaps. Find what you need and return to it as you practise.</p></div>{onOpenPersonalNotes ? <button type="button" className="classroom-button" onClick={onOpenPersonalNotes}>Personal notes</button> : <Link className="classroom-button" to={`${archivePath}${archivePath.includes('?') ? '&' : '?'}view=mine`}>Personal notes</Link>}</div>
    {query.isLoading && !query.data ? <p role="status" className="teaching-notes-state">Loading your notes…</p> : null}
    {query.error ? <div role="alert" className="teaching-notes-state"><p>Your notes could not be loaded. Try again to see the complete archive.</p><button type="button" className="classroom-button" onClick={() => void query.refetch()}>Try again</button></div> : null}
    {!query.isLoading && !query.error ? <>
      <div className="teaching-notes-shelf">{notes[0] ? card(notes[0], true) : <div className="teaching-notes-empty"><BookOpen size={28} aria-hidden="true" /><h3>Your notes will live here.</h3><p>Notes and recaps shared after your sessions will be easy to find here.</p></div>}<aside className="teaching-notes-side"><div className="teaching-notes-totals"><button type="button" onClick={() => update('filter', '')}><strong>{notes.length}</strong><span>All notes <ArrowRight size={14} /></span></button><button type="button" onClick={() => update('filter', 'unread')}><strong>{unreadCount}</strong><span>Unread <ArrowRight size={14} /></span></button></div><Link className="teaching-notes-assigned" to="/my-work/to-do"><span>Ready to practise?</span><strong>Assigned work <ArrowRight size={17} aria-hidden="true" /></strong><span>Open your tasks and continue where you left off.</span></Link></aside></div>
      <div className="teaching-notes-archive"><div className="teaching-notes-archive-heading"><h3 id="notes-archive-heading" tabIndex={-1}>Browse your notes</h3><span role="status">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'}{search || unreadOnly ? ' found' : ''}</span></div><div className="teaching-notes-controls"><label className="teaching-notes-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search notes</span><input type="search" value={search} placeholder="Search titles and notes…" onChange={(event) => update('q', event.target.value, true)} /></label><div className="teaching-notes-filters" aria-label="Filter notes"><button type="button" aria-pressed={!unreadOnly} onClick={() => update('filter', '')}>All</button><button type="button" aria-pressed={unreadOnly} onClick={() => update('filter', 'unread')}>Unread</button></div></div>
      {!filtered.length ? <div className="teaching-notes-no-results"><p>{notes.length ? 'No notes match these filters.' : 'Your archive is ready for your first note.'}</p>{search || unreadOnly ? <button className="classroom-button" type="button" onClick={() => { const next = new URLSearchParams(params); ['q', 'filter', 'shown'].forEach((key) => next.delete(key)); setParams(next); }}>Clear filters</button> : null}</div> : groups.map((group) => <section key={group.key} aria-label={notes.length > 12 ? group.label : 'All notes'}>{notes.length > 12 ? <h4 className="teaching-notes-month">{group.label}</h4> : null}<div className="teaching-notes-grid">{group.notes.map((note) => card(note))}</div></section>)}
      {visible.length < filtered.length ? <button className="classroom-button teaching-notes-load" type="button" onClick={() => update('shown', String(shown + 12))}>Load more notes <span>({filtered.length - visible.length} remaining)</span></button> : null}</div>
    </> : null}
  </section>;
}

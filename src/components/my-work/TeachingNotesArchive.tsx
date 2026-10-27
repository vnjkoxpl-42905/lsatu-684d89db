import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigationType, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, FileText, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotesSelectMotion } from '@/hooks/useNotesSelectMotion';
import { useNotesArchiveScroll } from '@/hooks/useNotesArchiveScroll';
import { useAuth } from '@/contexts/AuthContext';
import { useClassroomItems, type ClassroomItem } from '@/hooks/useClassroomItems';
import { isNoteUnread } from '@/components/classroom/classroomData';
import { archiveNoteType, TEACHING_NOTE_TYPES, notesDetailRoute, validateNotesReturnTo } from '@/lib/myWorkNotesNavigation';
import { archiveShown, filterTeachingNotes, nearestArchiveNote, orderedTeachingNotes, teachingNoteText } from './teachingNotesArchiveData';
import { teachingNoteDate } from './teachingNoteDates';

const typeLabels = { note: 'Notes', session_recap: 'Session recaps', announcement: 'Announcements', smartboard_recap: 'Whiteboard recaps' };
const kinds: Partial<Record<ClassroomItem['type'], string>> = { note: 'Note', session_recap: 'Session recap', announcement: 'Announcement', smartboard_recap: 'Whiteboard recap' };
function dateLabel(value: string, monthOnly = false) {
  const date = teachingNoteDate(value);
  return monthOnly ? date.month : date.label;
}

export function TeachingNotesArchive({ onOpenPersonalNotes }: { onOpenPersonalNotes?: () => void }) {
  const query = useClassroomItems();
  const typeLabelId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const recoverTypeFocus = useRef(false);
  const [selectModality, setSelectModality] = useState<'keyboard' | 'pointer'>('keyboard');
  const [selectOpen, setSelectOpen] = useState(false);
  const selectMotionRef = useNotesSelectMotion(selectOpen, selectModality);
  const returnToNote = useNotesArchiveScroll();
  const navigationType = useNavigationType();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const unreadOnly = params.get('filter') === 'unread';
  const shown = archiveShown(params.get('shown'));
  const selectedType = archiveNoteType(params.get('type'));
  const notes = useMemo(() => orderedTeachingNotes(query.data ?? []), [query.data]);
  const text = useMemo(() => new Map(notes.map((note) => [note.id, teachingNoteText(note)])), [notes]);
  const filtered = useMemo(() => filterTeachingNotes(notes, text, search, unreadOnly, selectedType), [notes, text, search, unreadOnly, selectedType]);
  const visible = filtered.slice(0, shown);
  const availableTypes = TEACHING_NOTE_TYPES.filter((type) => notes.some((note) => note.type === type));
  const showTypes = availableTypes.length > 1 || !!selectedType;
  useEffect(() => {
    if (!showTypes && recoverTypeFocus.current) {
      recoverTypeFocus.current = false;
      searchRef.current?.focus();
    }
  }, [showTypes]);
  const hasMultipleMonths = new Set(filtered.map((note) => teachingNoteDate(note.created_at).key)).size > 1;
  const scopeNotes = useMemo(() => filterTeachingNotes(notes, text, search, false, selectedType), [notes, text, search, selectedType]);
  const unreadCount = scopeNotes.filter(isNoteUnread).length;
  const archivePath = validateNotesReturnTo(`/my-work/notes?${params.toString()}`);
  const storageKey = `my-work-notes-anchor:${user?.id ?? 'anonymous'}:${archivePath}`;
  const cards = useRef(new Map<string, HTMLAnchorElement>());
  const restored = useRef('');
  useEffect(() => {
    if (query.isLoading || query.error || restored.current === storageKey) return;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const anchor = JSON.parse(stored) as { id: string; ids: string[]; pointer?: boolean };
      const targetId = nearestArchiveNote(anchor.ids, anchor.id, visible.map((note) => note.id));
      const target = targetId && cards.current.get(targetId);
      if (target) { target.focus({ preventScroll: true }); returnToNote(target, anchor.pointer === true && navigationType !== 'POP'); }
      else document.getElementById('notes-archive-heading')?.focus();
      sessionStorage.removeItem(storageKey);
      restored.current = storageKey;
    } catch { /* Storage is optional; the archive remains navigable. */ }
  }, [query.isLoading, query.error, storageKey, visible, returnToNote, navigationType]);
  function update(key: 'q' | 'filter' | 'shown' | 'type', value: string, replace = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, key === 'q' ? value.slice(0, 500) : value); else next.delete(key);
    if (key !== 'shown') next.delete('shown');
    setParams(next, { replace });
  }
  function changeType(value: string) {
    const focus = document.activeElement;
    recoverTypeFocus.current = value === 'all-types' && availableTypes.length <= 1 && !!focus?.closest('.notes-select-trigger, .notes-select-content');
    update('type', value === 'all-types' ? '' : value);
  }
  function remember(id: string, pointer: boolean) {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ id, ids: filtered.map((note) => note.id), pointer })); } catch { /* Browser storage may be unavailable. */ }
  }
  function card(note: ClassroomItem, featured = false) {
    const body = text.get(note.id) ?? '';
    const description = note.description?.trim();
    const excerpt = description || (body.startsWith(note.title) && (!body[note.title.length] || /[\s.:;!?]/.test(body[note.title.length])) ? body.slice(note.title.length).replace(/^[\s.:;!?]+/, '') : body);
    return <Link key={note.id} data-motion-item data-motion-id={`teaching-note:${note.id}`} aria-label={`Read ${note.title}. ${kinds[note.type] ?? 'Note'}. ${dateLabel(note.created_at)}. ${isNoteUnread(note) ? 'Unread' : 'Read'}.`} to={notesDetailRoute(note.id, archivePath)} onClick={(event) => remember(note.id, event.detail > 0)} ref={(node) => { if (node) cards.current.set(note.id, node); else cards.current.delete(note.id); }} data-read-state={isNoteUnread(note) ? 'unread' : 'read'} className={`teaching-note-card${featured ? ' teaching-note-lead' : ''}`}>
      <span className="teaching-note-document" aria-hidden="true"><FileText size={featured ? 30 : 22} /></span>
      <span className="teaching-note-card-content"><span className="teaching-note-meta">{featured ? 'Most recent · ' : ''}{kinds[note.type] ?? 'Note'}{isNoteUnread(note) ? <span className="teaching-note-unread">Unread</span> : null}</span>
      <strong className="teaching-note-title">{note.title}</strong><time dateTime={note.created_at} title="Date shared"><span className="teaching-note-date-label">Shared </span>{dateLabel(note.created_at)}</time>
      {excerpt ? <span className="teaching-note-excerpt">{excerpt}</span> : null}
      <span className="teaching-note-read">Read note <ArrowRight size={16} aria-hidden="true" /></span></span>
    </Link>;
  }
  const groups = visible.reduce<Array<{ key: string; label: string; notes: ClassroomItem[] }>>((result, note) => {
    const key = teachingNoteDate(note.created_at).key;
    const last = result[result.length - 1];
    if (last?.key === key) last.notes.push(note); else result.push({ key, label: dateLabel(note.created_at, true), notes: [note] });
    return result;
  }, []);
  const leadId = !search && !unreadOnly && !selectedType ? visible[0]?.id : undefined;
  const personalPath = `${archivePath}${archivePath.includes('?') ? '&' : '?'}view=mine`;
  return <section className="teaching-notes-home teaching-notes-organized" aria-labelledby="notes-archive-heading">
    <div className="teaching-notes-archive teaching-notes-organized-paper">
      <div className="teaching-notes-intro">
        <div><h2 id="notes-archive-heading" tabIndex={-1}>Teaching notes</h2><p>Notes and recaps to return to as you practise.</p></div>
        {onOpenPersonalNotes ? <button type="button" className="classroom-button teaching-notes-personal-link" onClick={onOpenPersonalNotes}>Personal notes</button> : <Link className="classroom-button teaching-notes-personal-link" to={personalPath}>Personal notes</Link>}
      </div>
    {query.isLoading && !query.data ? <p role="status" className="teaching-notes-state">Loading your notes…</p> : query.error ? <div role="alert" className="teaching-notes-state"><p>Your notes could not be loaded. Try again to see the complete archive.</p><button type="button" className="classroom-button" onClick={() => void query.refetch()}>Try again</button></div> : !notes.length ? <div className="teaching-notes-empty"><BookOpen size={28} aria-hidden="true" /><h3>Your notes will live here.</h3><p>Notes and recaps shared after your sessions will be easy to find here.</p></div> : <>
      <div className="teaching-notes-archive-heading"><span role="status">{filtered.length} {filtered.length === 1 ? 'note' : 'notes'}{search || unreadOnly || selectedType ? ' found' : ''}</span></div>
      <div className="teaching-notes-controls"><label className="teaching-notes-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search notes</span><input ref={searchRef} type="search" value={search} placeholder="Search titles and notes…" onChange={(event) => update('q', event.target.value, true)} /></label><div className="teaching-notes-filters" role="group" aria-label="Filter notes"><button type="button" aria-label="All" aria-pressed={!unreadOnly} onClick={() => update('filter', '')}>All <span className="teaching-notes-filter-count" aria-hidden="true">{scopeNotes.length}</span></button><button type="button" aria-label="Unread" aria-pressed={unreadOnly} onClick={() => update('filter', 'unread')}>Unread <span className="teaching-notes-filter-count" aria-hidden="true">{unreadCount}</span></button></div>{showTypes ? <div className="teaching-notes-type"><span className="teaching-notes-type-label" id={typeLabelId}>Type</span><Select open={selectOpen} onOpenChange={setSelectOpen} value={selectedType || 'all-types'} onValueChange={changeType}><SelectTrigger className="notes-select-trigger" aria-labelledby={typeLabelId} onPointerDown={() => setSelectModality('pointer')} onKeyDown={() => setSelectModality('keyboard')}><SelectValue /></SelectTrigger><SelectContent ref={selectMotionRef} className="notes-select-content" data-input-modality={selectModality}><SelectItem className="notes-select-option" value="all-types">All types</SelectItem>{TEACHING_NOTE_TYPES.filter((type) => availableTypes.includes(type) || type === selectedType).map((type) => <SelectItem className="notes-select-option" key={type} value={type}>{typeLabels[type]}</SelectItem>)}</SelectContent></Select></div> : null}</div>
      {!filtered.length ? <div className="teaching-notes-no-results"><p>No notes match these filters.</p><button className="classroom-button" type="button" onClick={() => { const next = new URLSearchParams(params); ['q', 'filter', 'type', 'shown'].forEach((key) => next.delete(key)); setParams(next); }}>Clear filters</button></div> : groups.map((group) => <section key={group.key} aria-label={hasMultipleMonths ? group.label : 'All notes'}>{hasMultipleMonths ? <h3 className="teaching-notes-month">{group.label}</h3> : null}<div className="teaching-notes-grid" data-motion-list>{group.notes.map((note) => card(note, note.id === leadId))}</div></section>)}
      {visible.length < filtered.length ? <button className="classroom-button teaching-notes-load" type="button" onClick={() => update('shown', String(shown + 12))}>Load more notes <span>({filtered.length - visible.length} remaining)</span></button> : null}
    </>}
    </div>
  </section>;
}

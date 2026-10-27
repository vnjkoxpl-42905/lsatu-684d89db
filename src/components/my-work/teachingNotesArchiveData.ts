import DOMPurify from 'dompurify';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { classroomNotes, isNoteUnread } from '@/components/classroom/classroomData';
import type { TeachingNoteType } from '@/lib/myWorkNotesNavigation';

/** Parse only inert, sanitized content. No authored resources enter the live document. */
export function htmlToArchiveText(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'script', 'img', 'iframe', 'video', 'audio', 'source', 'link', 'object', 'embed', 'svg', 'math'],
    FORBID_ATTR: ['src', 'srcset', 'href', 'style'],
  });
  template.content.querySelectorAll('p,div,br,li,h1,h2,h3,h4,tr').forEach((node) => node.append(' '));
  return (template.content.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function teachingNoteText(item: Pick<ClassroomItem, 'content_html' | 'content_markdown' | 'description'>): string {
  return item.content_html ? htmlToArchiveText(item.content_html) : (item.content_markdown || item.description || '').replace(/\s+/g, ' ').trim();
}

export function orderedTeachingNotes(items: ClassroomItem[]) {
  return classroomNotes(items).sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id));
}

export function archiveShown(value: string | null) {
  return value && /^\d+$/.test(value) ? Math.max(12, Math.min(10000, Number(value))) : 12;
}

export function filterTeachingNotes(notes: ClassroomItem[], text: Map<string, string>, query: string, unreadOnly: boolean, type: TeachingNoteType | '' = '') {
  const term = query.trim().toLocaleLowerCase();
  return notes.filter((note) => (!type || note.type === type) && (!unreadOnly || isNoteUnread(note)) && (!term || `${note.title} ${text.get(note.id) ?? ''}`.toLocaleLowerCase().includes(term)));
}

export function nearestArchiveNote(previousIds: string[], openedId: string, currentIds: string[]) {
  if (currentIds.includes(openedId)) return openedId;
  const index = previousIds.indexOf(openedId);
  for (let distance = 1; distance <= previousIds.length; distance++) {
    const next = previousIds[index + distance];
    const before = previousIds[index - distance];
    if (next && currentIds.includes(next)) return next;
    if (before && currentIds.includes(before)) return before;
  }
  return currentIds[0];
}

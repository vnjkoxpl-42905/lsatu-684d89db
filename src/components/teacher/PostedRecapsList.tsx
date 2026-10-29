import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import ClassroomMarkdown from '@/components/classroom/ClassroomMarkdown';
import { TEACHER_MARKDOWN_CLASS } from '@/components/teacher/teacherMarkdown';
import {
  useStudentClassroomItems,
  type ClassroomItem,
} from '@/hooks/useClassroomItems';

/**
 * What has already been posted to a student's Notes and recaps, read the way
 * the student reads it.
 *
 * The dossier could post a recap and could not show one. The only screen that
 * listed them, `TeacherRecaps`, had no route and was deleted 2026-09-09, so
 * once a recap went out the only way to check it was to be the student. That
 * matters more
 * than it sounds: the body is markdown, the classroom renders it as markdown,
 * and until now neither side of the app showed it rendered.
 */

/** The types that land under Notes and recaps on the student's side. */
const POSTED_TYPES = new Set<ClassroomItem['type']>([
  'session_recap',
  'smartboard_recap',
  'note',
  'announcement',
]);

const TYPE_LABELS: Record<string, string> = {
  session_recap: 'Session recap',
  smartboard_recap: 'Board',
  note: 'Note',
  announcement: 'Announcement',
};

/**
 * The words an authored HTML note renders, for a plain-text preview.
 *
 * Tags come off through a detached element rather than a regex because a note
 * may carry its own <style>, and any style or script subtree is dropped first so
 * CSS text never leaks into the preview. Same reasoning as noteExcerpt on the
 * student side; kept separate because that one lives inside the classroom.
 */
function htmlExcerpt(html: string | null, description: string | null) {
  const source = description || html || '';
  if (!source) return '';
  let text = source;
  if (/[<>]/.test(source)) {
    const holder = document.createElement('div');
    holder.innerHTML = source;
    holder.querySelectorAll('style, script').forEach((node) => node.remove());
    text = holder.textContent ?? '';
  }
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length === 0) return '';
  return words.length <= 60 ? words.join(' ') : `${words.slice(0, 60).join(' ')}\u2026`;
}

export function PostedRecapRow({ recap }: { recap: ClassroomItem }) {
  const [open, setOpen] = useState(false);
  const body = recap.content_markdown ?? '';
  // Most of what is already posted is authored HTML, not markdown, so without
  // this a row was a title and a date and nothing else — exactly the "which one
  // is this" problem the section exists to solve. Verified against a real
  // student on 2026-09-09: four posted notes, every one of them content_html.
  const excerpt = body ? '' : htmlExcerpt(recap.content_html, recap.description);
  const kind = TYPE_LABELS[recap.type] ?? recap.type.replace(/_/g, ' ');

  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="text-sm font-medium text-zinc-100">{recap.title}</div>
      <div className="mt-0.5 text-[11px] text-zinc-500">
        {kind} · {format(new Date(recap.created_at), 'MMM d, yyyy')}
        {recap.visible_to_student ? '' : ' · hidden from the student'}
      </div>
      {body && (
        <div className={open ? 'mt-2' : 'mt-2 line-clamp-4'}>
          <ClassroomMarkdown className={TEACHER_MARKDOWN_CLASS}>
            {body}
          </ClassroomMarkdown>
        </div>
      )}
      {!body && excerpt && (
        <p className={`mt-2 text-sm text-zinc-400 ${open ? '' : 'line-clamp-3'}`}>
          {excerpt}
        </p>
      )}
      {(body || excerpt) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-[11px] text-zinc-400 underline underline-offset-2 hover:text-zinc-100"
          aria-expanded={open}
        >
          {open ? 'Show less' : 'Read the whole thing'}
        </button>
      )}
    </li>
  );
}

export default function PostedRecapsList({ studentId }: { studentId: string | null }) {
  const { data: items = [], isLoading, error } = useStudentClassroomItems(studentId);
  const posted = items.filter((i) => POSTED_TYPES.has(i.type));

  if (!studentId) return null;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-[12px] text-zinc-500">
        Could not load what has been posted.
      </div>
    );
  }
  if (posted.length === 0) {
    return (
      <div className="text-[12px] text-zinc-500">
        Nothing posted yet. "Post a session recap" above puts one in their
        Classroom.
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {posted.map((recap) => (
        <PostedRecapRow key={recap.id} recap={recap} />
      ))}
    </ul>
  );
}

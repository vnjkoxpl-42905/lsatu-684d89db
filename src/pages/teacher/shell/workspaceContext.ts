/**
 * What the workspace is currently pointed at (spec §4 "focused student", D6).
 *
 * Derived from the URL rather than pushed up from each surface. A surface that
 * has to announce "I am showing student X" is the `?student=` bug class the
 * spec calls out: someone forgets to announce, or announces and never clears,
 * and the assistant offers to draft a reply to whoever was open twenty minutes
 * ago. The router already knows, so it is the single source.
 */

export type TeacherRoom =
  | 'today'
  | 'students'
  | 'inbox'
  | 'library'
  | 'schedule'
  | 'insights'
  | 'whiteboard'
  | 'dev'
  | 'unknown';

export interface WorkspaceContext {
  room: TeacherRoom;
  /** Set while a student dossier is open. */
  focusedStudentId?: string;
  /** Set while an Inbox thread is open, in `platform:<id>` / `email:<id>` form. */
  threadId?: string;
}

const ROOMS: TeacherRoom[] = [
  'today',
  'students',
  'inbox',
  'library',
  'schedule',
  'insights',
  'whiteboard',
  'dev',
];

/** A UUID-ish path segment. Guards against reading `new` or `all` as a student id. */
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function workspaceContextFromPath(pathname: string): WorkspaceContext {
  const segments = pathname.split('/').filter(Boolean);
  // ['teacher', <room>, ...rest]
  if (segments[0] !== 'teacher') return { room: 'unknown' };

  const raw = segments[1];
  const room = (ROOMS as string[]).includes(raw) ? (raw as TeacherRoom) : raw ? 'unknown' : 'today';

  const context: WorkspaceContext = { room };

  if (room === 'students' && segments[2] && ID_RE.test(segments[2])) {
    context.focusedStudentId = segments[2];
  }

  if (room === 'inbox' && segments[2]) {
    // The Inbox mounts on a splat, so the thread key can itself contain a
    // slash-free colon form; take everything after the room.
    const key = segments.slice(2).join('/');
    if (key.startsWith('platform:') || key.startsWith('email:')) context.threadId = key;
  }

  return context;
}

export interface QuickAction {
  id: string;
  label: string;
  /** The message dropped into the composer when the action is used. */
  prompt: string;
}

/**
 * What the assistant offers, given where you are. Actions name the student
 * where one is focused, because "Draft a reply to Lexi" is a different offer
 * from "Draft a reply" and only one of them is worth a click.
 */
export function quickActionsFor(
  context: WorkspaceContext,
  studentName?: string | null,
): QuickAction[] {
  const who = studentName?.trim();

  if (context.focusedStudentId && who) {
    return [
      { id: 'next-work', label: `Suggest next work for ${who}`, prompt: `What should ${who} work on next, and why? Use their recent sessions and assignments.` },
      { id: 'draft-reply', label: `Draft a reply to ${who}`, prompt: `Draft a reply to ${who} in my voice.` },
      { id: 'recap', label: `Recap ${who}'s last session`, prompt: `Summarise ${who}'s most recent session: what we covered, what they struggled with, what to do next.` },
    ];
  }

  switch (context.room) {
    case 'inbox':
      return context.threadId
        ? [
            { id: 'summarize-thread', label: 'Summarize this thread', prompt: 'Summarise the thread I have open and tell me what it is asking for.' },
            { id: 'draft-thread-reply', label: 'Draft a reply', prompt: 'Draft a reply to the thread I have open, in my voice.' },
          ]
        : [
            { id: 'triage', label: 'What needs a reply first?', prompt: 'Look at my inbox and tell me which messages actually need a reply, most urgent first.' },
          ];
    case 'today':
      return [
        { id: 'plan-day', label: 'What should I do first?', prompt: 'Look at my queue and tell me what to do first today, and why.' },
        { id: 'prep', label: 'Prep my next session', prompt: 'Prep me for my next session: who, what we did last time, what to cover.' },
      ];
    case 'students':
      return [{ id: 'who-needs-work', label: 'Who needs work assigned?', prompt: 'Which of my students has run out of assigned work?' }];
    case 'library':
      return [{ id: 'find-drill', label: 'Find a drill for a student', prompt: 'Help me pick a guided drill for a student. Ask me who, then recommend one.' }];
    case 'schedule':
      return [{ id: 'week', label: 'How does my week look?', prompt: 'Walk me through my teaching week and flag anything tight.' }];
    case 'insights':
      return [{ id: 'weak-topics', label: 'Where are students struggling?', prompt: 'Across my students, which topics are the weakest right now?' }];
    default:
      return [];
  }
}

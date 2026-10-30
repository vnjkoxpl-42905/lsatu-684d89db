import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useAssignedTodoFeed } from '@/hooks/useAssignedTodoFeed';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { unreadNoteCount } from '@/components/classroom/classroomData';
import { READING_CENTER_SOURCE } from '@/lib/readingCenterAccess';

/** Count shown on a My Work tab: unread notes, work still to do, or finished work. Hidden until it can be trusted. */
export function MyWorkTabCount({ path, readingCenterAssigned }: { path: string; readingCenterAssigned: boolean }) {
  const permissions = useUserPermissions();
  const feed = useAssignedTodoFeed();
  const notes = useClassroomItems();
  const generalAccess = permissions.is_admin || permissions.has_classroom_access;
  let count: number | null = null;
  let label = '';
  if (path === '/my-work/notes') {
    if (!notes.isLoading && !notes.isError && generalAccess) { count = unreadNoteCount(notes.data ?? []); label = 'unread'; }
  } else if (!feed.loading && !feed.failed) {
    const mine = feed.rows.filter((row) => row.sourceTable === READING_CENTER_SOURCE ? readingCenterAssigned : generalAccess);
    const done = path === '/my-work/completed';
    count = mine.filter((row) => (row.status === 'completed') === done).length;
    label = done ? 'completed' : 'to do';
  }
  if (count === null) return null;
  return <span className="student-destination-tab-count"><span aria-hidden="true">{count}</span><span className="sr-only"> {count} {label}</span></span>;
}

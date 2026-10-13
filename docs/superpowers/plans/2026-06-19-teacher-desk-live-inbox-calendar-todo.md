# Teacher Desk Live Inbox + Calendar To-Do Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a live Teacher Desk to-do rail that continuously pulls actionable student Gmail threads and Google Calendar sessions, expands rows in-place, opens the source surface, and clears rows when the source is no longer actionable.

**Architecture:** Keep Gmail and Google Calendar as source-truth systems. The desk queue is a derived client-side queue from existing Gmail edge-function APIs, mirrored `schedule_events`, current LSAT U desk tasks, and a small local dismissal table for manual clears. A new `useTeacherTodoQueue` hook owns polling and normalization; `DeskTodoRail` renders expandable/clickable rows with per-source actions.

**Tech Stack:** React 18, TypeScript, TanStack Query, Supabase Edge Functions, Supabase Postgres/RLS, existing Gmail connector (`supabase/functions/gmail`), existing Google Calendar sync/write functions (`gcal-sync-pull`, `gcal-event-write`), Vitest, Playwright smoke testing.

---

## Product Rules

- Email source: Gmail inbox via the existing admin Gmail integration.
- Email inclusion rule: show Gmail inbox threads where the latest message is from someone other than Joshua/admin, regardless of whether the sender is already an LSAT U platform student.
- Email clear rule: clear when the latest Gmail thread message is from Joshua/admin. This works whether Joshua replies in Gmail or through the LSAT U Gmail-send UI because both create a sent Gmail message on the same thread.
- Email click behavior: expand the row in the to-do rail to show the student email verbatim, plus a reply composer. Also provide a source-open action that opens the Gmail thread in the existing Gmail workspace.
- Calendar source: Google Calendar mirrored into `schedule_events`. LSAT U-created events must continue writing to Google Calendar through `gcal-event-write`; Google-created events must keep syncing down through `gcal-sync-pull`.
- Calendar clear rule: clear automatically once `end_at <= now`, or if the event is cancelled/deleted.
- Calendar click behavior: expand the row in the to-do rail to show event details. Also open the Teacher Schedule area for the event/student context.
- Background polling: run while Teacher Desk is open. Use TanStack Query refetch intervals and invoke Google Calendar sync on an interval while visible.
- Priority order: student emails waiting for reply first, current/next calendar session second, then existing reviews/uploads/drafts/assignment suggestions.
- Manual clear: every to-do row gets a small dismiss button. Dismissals hide a row locally without mutating Gmail or Google Calendar source state.

## File Structure

- Create `supabase/migrations/<timestamp>_teacher_todo_dismissals.sql`
  - Stores manual dismissals keyed by `source_kind` and `source_id`.
- Create `src/pages/teacher/desk/useTeacherTodoQueue.ts`
  - Pulls Gmail threads, Gmail thread bodies on expansion, schedule events, existing LSAT U task inputs, and dismissals.
  - Normalizes them into one `TeacherTodoItem[]`.
- Create `src/pages/teacher/desk/teacherTodoTypes.ts`
  - Shared queue item types for email, calendar, and existing desk tasks.
- Create `src/pages/teacher/desk/teacherTodoDismissals.ts`
  - Query/mutation helpers for manual dismissals.
- Create `src/pages/teacher/desk/scheduleEvents.ts`
  - Query helpers for `schedule_events` and invoking `gcal-sync-pull`.
- Modify `src/pages/teacher/desk/deskTasks.ts`
  - Keep existing reply/review/assign conversion but add conversion from legacy `DeskTask` into `TeacherTodoItem`.
- Modify `src/pages/teacher/desk/DeskTodoRail.tsx`
  - Render expandable rows, source icons, small dismiss button, Gmail reply form, event details, and source-open actions.
- Modify `src/pages/teacher/desk/TeacherDeskPreview.tsx`
  - Replace ad hoc `todoTasks` composition with `useTeacherTodoQueue`.
- Modify `src/features/admin-inbox/gmail/api/types.ts`
  - Ensure `GmailThreadSummary` exposes latest sender/from, thread id, subject, snippet, unread, labels, and internalDate.
- Modify `src/features/admin-inbox/gmail/hooks/useGmailSend.ts`
  - Invalidate the Teacher Desk queue after Gmail send.
- Modify `src/features/admin-inbox/gmail/hooks/useGmailUrlState.ts`
  - Preserve support for opening a Gmail thread via `/inbox?pane=gmail&t=<threadId>` or the existing equivalent query shape.
- Tests:
  - `src/pages/teacher/desk/useTeacherTodoQueue.test.tsx`
  - `src/pages/teacher/desk/DeskTodoRail.test.tsx`
  - `src/pages/teacher/desk/TeacherDeskPreview.test.tsx`
  - Existing Gmail hook tests if present; otherwise add focused tests around query invalidation.

---

## Task 1: Manual Dismissal Persistence

**Files:**
- Create: `supabase/migrations/<timestamp>_teacher_todo_dismissals.sql`
- Create: `src/pages/teacher/desk/teacherTodoDismissals.ts`

- [ ] **Step 1: Add dismissal table migration**

Create a migration with this SQL:

```sql
CREATE TABLE public.teacher_todo_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_kind text NOT NULL,
  source_id text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, source_kind, source_id)
);

CREATE INDEX idx_teacher_todo_dismissals_admin
ON public.teacher_todo_dismissals(admin_user_id, source_kind, source_id);

CREATE INDEX idx_teacher_todo_dismissals_expiry
ON public.teacher_todo_dismissals(expires_at)
WHERE expires_at IS NOT NULL;

ALTER TABLE public.teacher_todo_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own todo dismissals"
ON public.teacher_todo_dismissals
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());
```

- [ ] **Step 2: Add dismissal helpers**

Create `src/pages/teacher/desk/teacherTodoDismissals.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherTodoDismissal {
  source_kind: string;
  source_id: string;
  dismissed_at: string;
  expires_at: string | null;
}

export const teacherTodoDismissalsQueryKey = (adminId: string | undefined) =>
  ['teacher-todo-dismissals', adminId] as const;

export function useTeacherTodoDismissals() {
  const { user } = useAuth();
  return useQuery<TeacherTodoDismissal[]>({
    queryKey: teacherTodoDismissalsQueryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_todo_dismissals')
        .select('source_kind,source_id,dismissed_at,expires_at')
        .eq('admin_user_id', user!.id)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      if (error) throw error;
      return (data ?? []) as TeacherTodoDismissal[];
    },
  });
}

export function useDismissTeacherTodo() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { sourceKind: string; sourceId: string; expiresAt?: string | null }) => {
      if (!user?.id) throw new Error('Sign in required');
      const { error } = await supabase.from('teacher_todo_dismissals').upsert(
        {
          admin_user_id: user.id,
          source_kind: input.sourceKind,
          source_id: input.sourceId,
          expires_at: input.expiresAt ?? null,
          dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'admin_user_id,source_kind,source_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherTodoDismissalsQueryKey(user?.id) });
      qc.invalidateQueries({ queryKey: ['teacher-todo-queue'] });
    },
  });
}
```

- [ ] **Step 3: Test expectations**

Add tests after implementation using mocked Supabase:

```ts
expect(upsertMock).toHaveBeenCalledWith(
  expect.objectContaining({
    source_kind: 'gmail',
    source_id: 'thread-1',
  }),
  { onConflict: 'admin_user_id,source_kind,source_id' },
);
```

---

## Task 2: Shared To-Do Queue Types

**Files:**
- Create: `src/pages/teacher/desk/teacherTodoTypes.ts`
- Modify: `src/pages/teacher/desk/deskTasks.ts`

- [ ] **Step 1: Create normalized queue types**

```ts
export type TeacherTodoSourceKind = 'gmail' | 'calendar' | 'desk-task';

export type TeacherTodoPriorityBand = 'email' | 'calendar' | 'work';

export interface TeacherTodoBase {
  id: string;
  sourceKind: TeacherTodoSourceKind;
  sourceId: string;
  priorityBand: TeacherTodoPriorityBand;
  label: 'Email' | 'Calendar' | 'Reply' | 'Review' | 'Assign' | 'Schedule';
  subject: string;
  title: string;
  preview: string;
  timing: string;
  sortScore: number;
  openPath?: string;
  dismissExpiresAt?: string | null;
}

export interface GmailTodoItem extends TeacherTodoBase {
  sourceKind: 'gmail';
  label: 'Email';
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  subjectLine: string;
  snippet: string;
  internalDate: number;
}

export interface CalendarTodoItem extends TeacherTodoBase {
  sourceKind: 'calendar';
  label: 'Calendar';
  eventId: string;
  startAt: string;
  endAt: string;
  location: string | null;
  htmlLink: string | null;
  description: string | null;
}

export interface DeskTaskTodoItem extends TeacherTodoBase {
  sourceKind: 'desk-task';
  deskTaskId: string;
  deskSourceKind: string;
}

export type TeacherTodoItem = GmailTodoItem | CalendarTodoItem | DeskTaskTodoItem;
```

- [ ] **Step 2: Add legacy desk task adapter**

Add this export to `deskTasks.ts`:

```ts
import type { DeskTaskTodoItem } from './teacherTodoTypes';

export function deskTaskToTodoItem(task: DeskTask): DeskTaskTodoItem {
  return {
    id: `desk-task:${task.id}`,
    sourceKind: 'desk-task',
    sourceId: task.id,
    deskTaskId: task.id,
    deskSourceKind: task.sourceKind,
    priorityBand: 'work',
    label: task.verb,
    subject: task.subject,
    title: task.title,
    preview: task.reason,
    timing: task.timing,
    sortScore: 1_000 + task.priority,
    openPath: task.openPath,
    dismissExpiresAt: null,
  };
}
```

---

## Task 3: Gmail Inbox To-Do Source

**Files:**
- Create: `src/pages/teacher/desk/useGmailTodoSource.ts`
- Modify: `src/features/admin-inbox/gmail/hooks/useGmailSend.ts`
- Test: `src/pages/teacher/desk/useGmailTodoSource.test.tsx`

- [ ] **Step 1: Add Gmail source hook**

```ts
import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGmailProfile, useGmailThreads } from '@/features/admin-inbox/gmail/hooks';
import { parseAddress } from '@/features/admin-inbox/gmail/api';
import type { GmailThreadSummary } from '@/features/admin-inbox/gmail/api';
import type { GmailTodoItem } from './teacherTodoTypes';

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function latestSenderIsAdmin(thread: GmailThreadSummary, adminEmail: string | null) {
  if (!adminEmail) return false;
  const parsed = parseAddress(thread.from || '');
  return normalizedEmail(parsed.email) === normalizedEmail(adminEmail);
}

function gmailTiming(internalDate: string | number | undefined) {
  const ms = Number(internalDate ?? 0);
  if (!Number.isFinite(ms) || ms <= 0) return 'Email';
  const diff = Date.now() - ms;
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m waiting`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h waiting`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function gmailThreadToTodo(thread: GmailThreadSummary, adminEmail: string | null): GmailTodoItem | null {
  if (latestSenderIsAdmin(thread, adminEmail)) return null;
  const parsed = parseAddress(thread.from || '');
  const internalDate = Number(thread.internalDate ?? 0);
  return {
    id: `gmail:${thread.id}`,
    sourceKind: 'gmail',
    sourceId: thread.id,
    threadId: thread.id,
    priorityBand: 'email',
    label: 'Email',
    subject: parsed.name || parsed.email || 'Email sender',
    title: thread.subject || '(no subject)',
    preview: thread.snippet || 'Student email is waiting for a reply.',
    timing: gmailTiming(thread.internalDate),
    sortScore: 3_000 + Math.max(0, internalDate / 1_000_000_000),
    from: thread.from,
    fromName: parsed.name,
    fromEmail: parsed.email,
    subjectLine: thread.subject || '',
    snippet: thread.snippet || '',
    internalDate,
    openPath: `/inbox?pane=gmail&t=${encodeURIComponent(thread.id)}`,
    dismissExpiresAt: null,
  };
}

export function useGmailTodoSource() {
  const profileQuery = useGmailProfile();
  const threadsQuery = useGmailThreads({
    labelIds: ['INBOX'],
    q: 'in:inbox newer_than:30d',
    maxResults: 25,
  });
  const qc = useQueryClient();

  const items = useMemo(() => {
    const adminEmail = profileQuery.data?.emailAddress ?? null;
    return (threadsQuery.data?.threads ?? [])
      .map((thread) => gmailThreadToTodo(thread, adminEmail))
      .filter((item): item is GmailTodoItem => Boolean(item));
  }, [profileQuery.data?.emailAddress, threadsQuery.data?.threads]);

  return {
    items,
    isLoading: profileQuery.isLoading || threadsQuery.isLoading,
    error: profileQuery.error ?? threadsQuery.error,
    refresh: () => qc.invalidateQueries({ queryKey: ['gmail', 'threads'] }),
  };
}
```

- [ ] **Step 2: Invalidate desk queue after Gmail send**

In `useGmailSend.ts`, add this invalidation:

```ts
qc.invalidateQueries({ queryKey: ['teacher-todo-queue'] });
```

Place it next to the existing Gmail invalidations inside `onSuccess`.

- [ ] **Step 3: Add tests**

Test that:

```ts
expect(gmailThreadToTodo(studentThread, 'joshua@example.com')).toMatchObject({
  sourceKind: 'gmail',
  label: 'Email',
  threadId: 'thread-1',
});
expect(gmailThreadToTodo(adminLatestThread, 'joshua@example.com')).toBeNull();
```

---

## Task 4: Google Calendar To-Do Source

**Files:**
- Create: `src/pages/teacher/desk/scheduleEvents.ts`
- Create: `src/pages/teacher/desk/useCalendarTodoSource.ts`
- Test: `src/pages/teacher/desk/useCalendarTodoSource.test.tsx`

- [ ] **Step 1: Create schedule event helpers**

```ts
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleEventRow {
  id: string;
  google_event_id: string | null;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  status: string;
  html_link: string | null;
  source: string;
  deleted_at: string | null;
}

export const scheduleEventsQueryKey = ['schedule_events'] as const;

export function useUpcomingScheduleEvents() {
  return useQuery<ScheduleEventRow[]>({
    queryKey: scheduleEventsQueryKey,
    refetchInterval: () => (document.visibilityState === 'visible' ? 60_000 : false),
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const now = new Date().toISOString();
      const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .gt('end_at', now)
        .lte('start_at', horizon)
        .order('start_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as ScheduleEventRow[];
    },
  });
}

export function useGoogleCalendarBackgroundSync(enabled = true) {
  const qc = useQueryClient();
  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gcal-sync-pull', { body: {} });
      if (error) throw error;
      if ((data as { ok?: boolean; error?: string } | null)?.ok === false) {
        throw new Error((data as { error?: string }).error ?? 'Calendar sync failed');
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: scheduleEventsQueryKey }),
  });

  useEffect(() => {
    if (!enabled) return;
    if (document.visibilityState !== 'visible') return;
    sync.mutate();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') sync.mutate();
    }, 120_000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return sync;
}
```

- [ ] **Step 2: Create calendar source hook**

```ts
import { useMemo } from 'react';
import { format } from 'date-fns';
import { useUpcomingScheduleEvents, useGoogleCalendarBackgroundSync, type ScheduleEventRow } from './scheduleEvents';
import type { CalendarTodoItem } from './teacherTodoTypes';

function calendarTiming(startAt: string) {
  const start = new Date(startAt);
  const now = new Date();
  const sameDay = format(start, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  if (sameDay) return format(start, 'h:mm a');
  return format(start, 'MMM d, h:mm a');
}

export function scheduleEventToTodo(event: ScheduleEventRow): CalendarTodoItem {
  const start = Date.parse(event.start_at);
  return {
    id: `calendar:${event.id}`,
    sourceKind: 'calendar',
    sourceId: event.id,
    eventId: event.id,
    priorityBand: 'calendar',
    label: 'Calendar',
    subject: event.title,
    title: event.title,
    preview: event.description || event.location || 'Upcoming calendar session.',
    timing: calendarTiming(event.start_at),
    sortScore: 2_000 + Math.max(0, 2_000_000_000 - start / 1_000_000),
    startAt: event.start_at,
    endAt: event.end_at,
    location: event.location,
    htmlLink: event.html_link,
    description: event.description,
    openPath: `/teacher/schedule?event=${encodeURIComponent(event.id)}`,
    dismissExpiresAt: event.end_at,
  };
}

export function useCalendarTodoSource() {
  useGoogleCalendarBackgroundSync(true);
  const query = useUpcomingScheduleEvents();
  const items = useMemo(
    () => (query.data ?? []).map(scheduleEventToTodo),
    [query.data],
  );
  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
```

- [ ] **Step 3: Add tests**

Use a fixed system time:

```ts
vi.setSystemTime(new Date('2026-06-19T12:00:00Z'));

expect(scheduleEventToTodo(event)).toMatchObject({
  sourceKind: 'calendar',
  label: 'Calendar',
  openPath: '/teacher/schedule?event=event-1',
});
```

---

## Task 5: Combined Queue Hook

**Files:**
- Create: `src/pages/teacher/desk/useTeacherTodoQueue.ts`
- Modify: `src/pages/teacher/desk/TeacherDeskPreview.tsx`
- Test: `src/pages/teacher/desk/useTeacherTodoQueue.test.tsx`

- [ ] **Step 1: Build queue hook**

```ts
import { useMemo } from 'react';
import type { DeskTask } from './deskTasks';
import { deskTaskToTodoItem } from './deskTasks';
import { useGmailTodoSource } from './useGmailTodoSource';
import { useCalendarTodoSource } from './useCalendarTodoSource';
import { useTeacherTodoDismissals } from './teacherTodoDismissals';
import type { TeacherTodoItem } from './teacherTodoTypes';

function dismissalKey(sourceKind: string, sourceId: string) {
  return `${sourceKind}:${sourceId}`;
}

export function filterDismissed(items: TeacherTodoItem[], dismissals: Array<{ source_kind: string; source_id: string }>) {
  const hidden = new Set(dismissals.map((d) => dismissalKey(d.source_kind, d.source_id)));
  return items.filter((item) => !hidden.has(dismissalKey(item.sourceKind, item.sourceId)));
}

export function sortTeacherTodos(items: TeacherTodoItem[]) {
  return [...items].sort((a, b) => b.sortScore - a.sortScore);
}

export function useTeacherTodoQueue(legacyTasks: DeskTask[]) {
  const gmail = useGmailTodoSource();
  const calendar = useCalendarTodoSource();
  const dismissals = useTeacherTodoDismissals();

  const items = useMemo(() => {
    const legacy = legacyTasks.map(deskTaskToTodoItem);
    return sortTeacherTodos(filterDismissed(
      [...gmail.items, ...calendar.items, ...legacy],
      dismissals.data ?? [],
    ));
  }, [calendar.items, dismissals.data, gmail.items, legacyTasks]);

  return {
    items,
    loading: gmail.isLoading || calendar.isLoading || dismissals.isLoading,
    error: gmail.error ?? calendar.error ?? dismissals.error,
  };
}
```

- [ ] **Step 2: Wire TeacherDeskPreview**

Keep the existing logic that builds reply/review/upload/assign tasks, but pass only those legacy tasks into `useTeacherTodoQueue`:

```ts
const legacyTasks = useMemo<DeskTask[]>(() => {
  return sortTasks([...replyTasks, ...draftTasks, ...uploadTasks, ...assignTasks]);
}, [replyTasks, draftTasks, uploadTasks, assignTasks]);

const todoQueue = useTeacherTodoQueue(legacyTasks);

<DeskTodoRail
  items={todoQueue.items}
  loading={isLoading || todoQueue.loading}
  onOpen={(path) => navigate(path)}
/>
```

- [ ] **Step 3: Preserve zero-assignment rule**

Keep assignment suggestions filtered like this:

```ts
student.assignments_total > 0 &&
student.assignments_completed / Math.max(1, student.assignments_total) >= 0.8
```

Do not reintroduce `student.assignments_total === 0`.

---

## Task 6: Expandable To-Do Rail UI

**Files:**
- Modify: `src/pages/teacher/desk/DeskTodoRail.tsx`
- Test: `src/pages/teacher/desk/DeskTodoRail.test.tsx`

- [ ] **Step 1: Replace `tasks` prop with normalized `items` prop**

```ts
import type { TeacherTodoItem } from './teacherTodoTypes';

export function DeskTodoRail({
  items,
  loading,
  onOpen,
}: {
  items: TeacherTodoItem[];
  loading: boolean;
  onOpen: (path: string) => void;
}) {
  // implementation in following steps
}
```

- [ ] **Step 2: Add row expansion state**

```ts
const [expandedId, setExpandedId] = useState<string | null>(null);
const expanded = expandedId === item.id;
```

- [ ] **Step 3: Add dismiss button**

```tsx
const dismiss = useDismissTeacherTodo();

<button
  type="button"
  aria-label={`Dismiss ${item.title}`}
  onClick={(event) => {
    event.stopPropagation();
    dismiss.mutate({
      sourceKind: item.sourceKind,
      sourceId: item.sourceId,
      expiresAt: item.dismissExpiresAt ?? null,
    });
  }}
  className="inline-flex h-6 w-6 items-center justify-center text-black/35 hover:text-black"
>
  <X className="h-3.5 w-3.5" strokeWidth={1.6} />
</button>
```

- [ ] **Step 4: Render Gmail expansion**

When `item.sourceKind === 'gmail'`, render:

```tsx
<GmailTodoExpansion
  item={item}
  onOpen={() => onOpen(item.openPath ?? `/inbox?pane=gmail&t=${item.threadId}`)}
/>
```

The expansion component uses `useGmailThread(item.threadId, { markRead: false })` and shows the latest non-admin message text verbatim:

```tsx
<pre className="whitespace-pre-wrap text-xs leading-5 text-black/70">
  {latestMessage?.text || latestMessage?.snippet || item.snippet}
</pre>
```

It also renders a reply textarea and sends via `useGmailSend`:

```ts
send.mutate({
  to: item.fromEmail,
  subject: item.subjectLine,
  text: replyText,
  threadId: item.threadId,
  inReplyTo: latestMessage?.messageIdHeader,
  references: latestMessage?.references || latestMessage?.messageIdHeader,
});
```

On success, clear `replyText`, collapse the row, and invalidate:

```ts
qc.invalidateQueries({ queryKey: ['teacher-todo-queue'] });
qc.invalidateQueries({ queryKey: ['gmail', 'threads'] });
```

- [ ] **Step 5: Render calendar expansion**

When `item.sourceKind === 'calendar'`, render:

```tsx
<div className="mt-2 space-y-2 border-t border-black/10 pt-2 text-xs text-black/62">
  <div>{format(parseISO(item.startAt), 'EEE, MMM d · h:mm a')} - {format(parseISO(item.endAt), 'h:mm a')}</div>
  {item.location ? <div>{item.location}</div> : null}
  {item.description ? <div className="whitespace-pre-wrap">{item.description}</div> : null}
  <button type="button" onClick={() => onOpen(item.openPath ?? '/teacher/schedule')}>
    Open schedule
  </button>
</div>
```

- [ ] **Step 6: Render existing desk-task expansion**

For `desk-task`, keep the existing behavior: button opens `item.openPath`.

- [ ] **Step 7: Tests**

Write tests that assert:

```ts
expect(screen.getByText('Email')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /expand/i }));
expect(screen.getByText('verbatim student email body')).toBeInTheDocument();
fireEvent.click(screen.getByRole('button', { name: /Dismiss/ }));
expect(dismissMock).toHaveBeenCalledWith(expect.objectContaining({ sourceKind: 'gmail' }));
```

---

## Task 7: Teacher Schedule Opening From Event

**Files:**
- Modify: `src/pages/teacher/TeacherSchedule.tsx`
- Modify: `src/pages/teacher/desk/useCalendarTodoSource.ts`
- Test: `src/pages/teacher/TeacherSchedule.test.tsx` if present, otherwise add focused test.

- [ ] **Step 1: Accept `event` query param**

In `TeacherSchedule.tsx`, read:

```ts
const eventId = searchParams.get('event');
```

When `eventId` is present and `eventsQuery.data` includes a matching event, set the schedule anchor and selected event:

```ts
useEffect(() => {
  if (!eventId || !eventsQuery.data) return;
  const event = eventsQuery.data.find((row) => row.id === eventId || row.google_event_id === eventId);
  if (!event) return;
  setAnchor(startOfDay(parseISO(event.start_at)));
  setSelectedEventId(event.id);
}, [eventId, eventsQuery.data]);
```

If the page currently only has modal editing for events, add `selectedEventId` state and display the event detail card in the schedule area.

- [ ] **Step 2: Keep event path stable**

The queue item path remains:

```ts
openPath: `/teacher/schedule?event=${encodeURIComponent(event.id)}`
```

---

## Task 8: Gmail Workspace Deep Link

**Files:**
- Modify: `src/pages/Inbox.tsx`
- Modify: `src/features/admin-inbox/gmail/hooks/useGmailUrlState.ts` only if needed.

- [ ] **Step 1: Confirm pane parameter**

If `/inbox` already switches to Gmail by query param, keep that existing parameter. If it does not, add support for:

```ts
const pane = searchParams.get('pane');
const defaultSurface = pane === 'gmail' ? 'gmail' : 'messages';
```

- [ ] **Step 2: Preserve thread parameter**

Do not rename `t`; `useGmailUrlState` already reads:

```ts
threadId: searchParams.get("t")
```

The to-do open path should be:

```ts
/inbox?pane=gmail&t=<threadId>
```

---

## Task 9: Validation

**Files:**
- No new source files beyond previous tasks.

- [ ] **Step 1: Run focused tests**

```bash
npm run test -- \
  src/pages/teacher/desk/useTeacherTodoQueue.test.tsx \
  src/pages/teacher/desk/useGmailTodoSource.test.tsx \
  src/pages/teacher/desk/useCalendarTodoSource.test.tsx \
  src/pages/teacher/desk/DeskTodoRail.test.tsx \
  src/pages/teacher/desk/TeacherDeskPreview.test.tsx
```

Expected: all pass.

- [ ] **Step 2: Run targeted ESLint**

```bash
npx eslint \
  src/pages/teacher/desk/useTeacherTodoQueue.ts \
  src/pages/teacher/desk/useGmailTodoSource.ts \
  src/pages/teacher/desk/useCalendarTodoSource.ts \
  src/pages/teacher/desk/DeskTodoRail.tsx \
  src/pages/teacher/desk/TeacherDeskPreview.tsx \
  src/pages/teacher/desk/teacherTodoTypes.ts \
  src/pages/teacher/desk/teacherTodoDismissals.ts \
  src/pages/teacher/desk/scheduleEvents.ts
```

Expected: no errors.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: exits 0.

- [ ] **Step 4: Run production build**

```bash
NODE_OPTIONS=--max-old-space-size=6144 npm run build
```

Expected: exits 0. Existing Tailwind arbitrary-class, `/noise.png`, and chunk-size warnings may remain.

- [ ] **Step 5: Playwright smoke**

Run against `http://127.0.0.1:8080/teacher` with authenticated admin state:

```py
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:8080/teacher", wait_until="networkidle")
    todo = page.locator("aside").filter(has_text="To-do").last
    expect(todo).to_be_visible()
    expect(todo).not_to_contain_text("No active assignment")
    # With seeded Gmail/calendar fixtures or live connector data:
    # expect(todo).to_contain_text("Email")
    # expect(todo).to_contain_text("Calendar")
    browser.close()
```

---

## Self-Review

- Spec coverage:
  - Gmail inbox source: Task 3.
  - Any inbox sender, platform or not: Task 3 does not require roster matching.
  - Clear after reply in Gmail or LSAT U Gmail send: Task 3 latest-sender rule plus `useGmailSend` invalidation.
  - Expand email verbatim: Task 6 uses `useGmailThread(markRead:false)` and message text.
  - Google Calendar source and bidirectional LSAT U schedule: Task 4 uses `schedule_events`, existing sync/write functions; Task 7 deep-links Teacher Schedule.
  - Calendar clears after event end: Task 4 query filters `end_at > now`.
  - Background polling: Tasks 3 and 4 use refetch intervals/background sync.
  - Priority order: Task 5 sort scores.
  - Manual dismiss button: Tasks 1 and 6.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: queue item names are defined in `teacherTodoTypes.ts`; hooks consume those exact names.


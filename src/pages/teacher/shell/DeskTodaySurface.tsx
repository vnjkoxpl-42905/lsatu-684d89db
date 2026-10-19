import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isSameDay, parseISO } from 'date-fns';
import { DeskChatPanel, type DeskChatInsert } from '../desk/DeskChatPanel';
import { DeskTodoRail } from '../desk/DeskTodoRail';
import { useDeskTaskQueue } from '../desk/useDeskTaskQueue';
import type { CalendarTodoItem } from '../desk/teacherTodoTypes';
import { SignupQueue } from '@/components/teacher/SignupQueue';
import { PaymentsPanel } from '@/components/teacher/PaymentsPanel';

/**
 * A to-do `openPath` may still be written in the old inbox form
 * (`/inbox?pane=gmail&t=…`). Fold it onto the Inbox room, dropping only `pane`
 * so the thread and every other param survive. This is the one place that
 * knows about the legacy shape; no surface reads `?ws=` any more.
 */
export function teacherRoomPathForSource(path: string) {
  if (!path.startsWith('/inbox')) return path;
  const url = new URL(path, 'http://lsatu.local');
  const next = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (key === 'pane') return;
    next.set(key, value);
  });
  const query = next.toString();
  return `/teacher/inbox${query ? `?${query}` : ''}`;
}

/**
 * Today: the work queue, not a chat window (spec 5.1). The queue is the main
 * column; today's sessions and the counts sit above it.
 *
 * Every number here is counted off the queue that is rendered directly below
 * it, so a count can never claim work the list does not show. While the
 * sources are still loading the counts are withheld rather than shown as zero.
 */
export default function DeskTodaySurface() {
  const navigate = useNavigate();
  const [chatInsert, setChatInsert] = useState<DeskChatInsert | null>(null);
  const { localPreview, todoQueue, isLoading } = useDeskTaskQueue();

  const items = todoQueue.items;

  const todaySessions = useMemo(
    () =>
      items.filter(
        (item): item is CalendarTodoItem =>
          item.sourceKind === 'calendar' && isSameDay(parseISO(item.startAt), new Date()),
      ),
    [items],
  );

  const counts = useMemo(
    () => ({
      email: items.filter((item) => item.priorityBand === 'email').length,
      calendar: items.filter((item) => item.priorityBand === 'calendar').length,
      work: items.filter((item) => item.priorityBand === 'work').length,
    }),
    [items],
  );

  // A plain stack, not a flex-1 column: the queue sizes to its own content and
  // `main` does the scrolling. Letting the sections flex-shrink collapsed the
  // list and painted its cards over the section below it.
  return (
    <div className="flex flex-col gap-6 px-5 py-6 sm:px-6">
      <section aria-label="Today overview">
        <h2 className="font-display text-2xl">Today</h2>
        <p className="mt-1 text-sm text-black/55">Messages, sessions, payments, and student work needing your attention.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { to: '/teacher/students', label: 'Open student list' },
            { to: '/teacher/inbox', label: 'Open inbox' },
            { to: '/teacher/payments', label: 'All payments' },
          ].map(({ to, label }) => (
            <Link key={to} to={to} className="border border-black/20 bg-white/30 px-3 py-2 text-[13px] hover:bg-white/60">{label}</Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="border border-black/12 bg-white/25 px-4 py-3.5">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">
            Today&rsquo;s sessions
          </div>
          {isLoading ? (
            <p className="text-[13px] text-black/45">Loading</p>
          ) : todaySessions.length === 0 ? (
            <p className="text-[13px] text-black/45">Nothing on the calendar for today.</p>
          ) : (
            <ul className="space-y-1.5">
              {todaySessions.map((session) => (
                <li key={session.id} className="flex items-baseline gap-3 text-[13px]">
                  <span className="w-[72px] shrink-0 tabular-nums text-black/50">
                    {format(parseISO(session.startAt), 'h:mm a')}
                  </span>
                  <span className="truncate">{session.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-black/12 bg-white/25 px-4 py-3.5">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Waiting</div>
          <dl className="space-y-1.5 text-[13px]">
            {[
              { label: 'Email', value: counts.email },
              { label: 'Calendar', value: counts.calendar },
              { label: 'Student work', value: counts.work },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-black/50">{label}</dt>
                <dd className="tabular-nums">{isLoading ? '—' : value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="md:col-span-2 xl:col-span-1">
          <PaymentsPanel summary />
        </div>
      </section>

      {todoQueue.error && <p role="alert" className="text-sm text-red-900">Some sources could not load. The overview may be incomplete.</p>}

      <section>
        <DeskTodoRail
          items={items}
          loading={isLoading}
          onOpen={(path) => navigate(teacherRoomPathForSource(path))}
          onInsertInChat={(text) => setChatInsert({ id: Date.now(), text })}
        />
      </section>

      <SignupQueue />

      <section aria-label="Assign student work" className="border border-black/12 bg-white/25 px-4 py-3.5">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/50">Assign student work</h2>
        <p className="mt-2 text-[13px] text-black/55">Choose specific content, then select the student to assign it to.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { path: 'guided-drills', label: 'Guided drills' },
            { path: 'homework', label: 'Homework' },
            { path: 'activities', label: 'Activities' },
            { path: 'bootcamps', label: 'Bootcamps' },
          ].map(({ path, label }) => (
            <Link key={path} to={`/teacher/library/${path}`} className="border border-black/15 px-3 py-2 text-[13px] hover:bg-white/50">{label}</Link>
          ))}
        </div>
      </section>

      {/* Interim home for the assistant. It moves into the shell's AI panel in
          Phase 3; until then Today keeps the composer so the queue's
          "draft this" action still has somewhere to land. */}
      <section className="flex h-[520px] shrink-0 flex-col border-t border-black/10 pt-5">
        <DeskChatPanel
          localPreview={localPreview}
          insert={chatInsert}
          onInsertConsumed={() => setChatInsert(null)}
        />
      </section>
    </div>
  );
}

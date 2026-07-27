import * as React from "react";
import { useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import {
  buildWorkRows,
  classroomNotes,
  isDayZeroWelcome,
  sanitizeClassroomHtml,
} from "@/components/classroom/classroomData";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useInbox, useConversationMessages } from "@/hooks/useInbox";
import {
  useStudentAssignments,
  useStudentTAAssignments,
} from "@/hooks/useStudentAssignments";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { useStudentBooking } from "@/hooks/useStudentBooking";
import { useCurrentWeeklyPlan } from "@/hooks/useWeeklyPlan";
import { MIN_SAMPLE } from "@/lib/mainhubAnalytics";
import {
  nextActionFor,
  resolveItemRoute,
} from "@/lib/classroomItems";
import { localDayISO } from "@/lib/localDate";

const SEEDED_WELCOME =
  "Welcome to your classroom. This is where your next step, session notes, and assigned work will stay organized.";

function useRetainedValue<T>(value: T, canReplace: boolean) {
  const ref = React.useRef(value);
  if (canReplace) ref.current = value;
  return ref.current;
}

function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", options ?? {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function testDateMeta(testDate: string | null) {
  if (!testDate || testDate < localDayISO()) return "Classroom";
  const [year, month, day] = testDate.split("-").map(Number);
  const localTestDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(
    0,
    Math.round((localTestDate.getTime() - today.getTime()) / 86_400_000),
  );
  if (days === 0) return "Test day";
  return `${days} day${days === 1 ? "" : "s"} to test`;
}

function ClassroomSkeleton() {
  return (
    <div className="classroom-skeleton-stack" aria-label="Loading">
      <span className="classroom-skeleton" />
      <span className="classroom-skeleton" />
      <span className="classroom-skeleton" />
    </div>
  );
}

function InlineError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="classroom-inline-error">
      <p>{message}</p>
      <button type="button" className="classroom-button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

function DataSection({
  title,
  meta,
  loading,
  error,
  empty,
  retry,
  children,
}: {
  title: string;
  meta?: string;
  loading: boolean;
  error: boolean;
  empty: boolean;
  retry: () => void;
  children: React.ReactNode;
}) {
  if (!loading && !error && empty) return null;
  return (
    <section className="classroom-content-section">
      <div className="classroom-section-header">
        <h2>{title}</h2>
        {meta ? <span className="classroom-section-meta">{meta}</span> : null}
      </div>
      {loading && empty ? <ClassroomSkeleton /> : null}
      {error ? (
        <InlineError message={`Could not load ${title.toLowerCase()}.`} retry={retry} />
      ) : null}
      {!empty ? children : null}
    </section>
  );
}

function LeaderRow({
  title,
  status,
  strong,
  onClick,
}: {
  title: string;
  status: string;
  strong?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="classroom-leader-row">
      <p>{title}</p>
      <div className="classroom-dotted-leader" />
      <span
        className={`classroom-row-status${strong ? " classroom-row-status-strong" : ""}`}
      >
        {status}
      </span>
      <button
        type="button"
        className="classroom-covering-link"
        onClick={onClick}
        aria-label={`${title}, ${status}`}
      />
    </div>
  );
}

export default function Classroom() {
  const navigate = useNavigate();
  const { displayName, testDate, openSection } = useClassroomLayout();
  const itemsQuery = useClassroomItems();
  const homeworkQuery = useStudentAssignments();
  const taQuery = useStudentTAAssignments();
  const inbox = useInbox();
  const bookingQuery = useStudentBooking();
  const analyticsQuery = useStudentAnalytics();
  const weeklyPlanQuery = useCurrentWeeklyPlan();
  const [messageExpanded, setMessageExpanded] = React.useState(false);
  const messageSucceededRef = React.useRef(false);

  const retainedItems = useRetainedValue(
    itemsQuery.data ?? [],
    !itemsQuery.error,
  );
  const retainedHomework = useRetainedValue(
    homeworkQuery.assignments,
    !homeworkQuery.error,
  );
  const retainedTa = useRetainedValue(
    taQuery.assignments,
    !taQuery.error,
  );

  const adminConversation = React.useMemo(
    () =>
      inbox.conversations.find((conversation) =>
        conversation.participants.some((participant) => participant.is_admin),
      ) ?? null,
    [inbox.conversations],
  );
  const thread = useConversationMessages(adminConversation?.id ?? null);
  const threadLoadSeenRef = React.useRef<string | null>(null);
  if (adminConversation && thread.loading) {
    threadLoadSeenRef.current = adminConversation.id;
  }
  const threadResolved =
    !adminConversation ||
    (threadLoadSeenRef.current === adminConversation.id && !thread.loading);
  const adminIds = React.useMemo(
    () =>
      new Set(
        adminConversation?.participants
          .filter((participant) => participant.is_admin)
          .map((participant) => participant.user_id) ?? [],
      ),
    [adminConversation],
  );
  const latestAdminMessage = React.useMemo(
    () =>
      [...thread.messages]
        .filter((message) => adminIds.has(message.sender_id))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        )[0] ?? null,
    [adminIds, thread.messages],
  );

  const welcomeItem =
    retainedItems.find((item) => isDayZeroWelcome(item)) ?? null;
  const messageLoading =
    inbox.loading ||
    !threadResolved ||
    itemsQuery.isLoading;
  const messageError = !!inbox.error || !!thread.error || !!itemsQuery.error;
  if (!messageLoading && !messageError) {
    messageSucceededRef.current = true;
  }
  const fallbackWelcomeHtml = welcomeItem?.content_html
    ? sanitizeClassroomHtml(welcomeItem.content_html)
    : "";
  const fallbackWelcomeText =
    welcomeItem?.description ||
    welcomeItem?.content_markdown ||
    SEEDED_WELCOME;
  const rawMessageText = latestAdminMessage?.body ?? fallbackWelcomeText;
  // Notes are generated with a trailing "View in your Classroom: /some/route"
  // line. Showing a bare path reads like plumbing, so lift it out of the body
  // and render it as a plain-language link instead.
  const messageLink = React.useMemo(() => {
    const match = rawMessageText.match(
      /^\s*View in your Classroom:\s*(\/\S+)\s*$/m,
    );
    if (!match) return null;
    const subject = rawMessageText.match(/^\s*New assignment:\s*(.+?)\s*$/m);
    return {
      route: match[1],
      label: subject ? `Open ${subject[1]}` : "Open it in your Classroom",
    };
  }, [rawMessageText]);
  const messageText = messageLink
    ? rawMessageText
        .replace(/^\s*View in your Classroom:\s*\/\S+\s*$/m, "")
        .trimEnd()
    : rawMessageText;
  const messageDate =
    latestAdminMessage?.created_at ??
    welcomeItem?.created_at ??
    new Date().toISOString();
  const messageAuthor =
    adminConversation?.participants.find(
      (participant) => participant.user_id === latestAdminMessage?.sender_id,
    )?.display_name || "Joshua";
  const messageIsLong = messageText.length > 420;

  const futureSessions = React.useMemo(
    () =>
      (bookingQuery.data?.redemptions ?? [])
        .filter(
          (redemption) =>
            new Date(redemption.start_at).getTime() > Date.now() &&
            !["cancelled", "canceled"].includes(redemption.status.toLowerCase()),
        )
        .sort(
          (a, b) =>
            new Date(a.start_at).getTime() -
            new Date(b.start_at).getTime(),
        ),
    [bookingQuery.data?.redemptions],
  );
  const nextSession = futureSessions[0] ?? null;

  const allWork = React.useMemo(
    () => buildWorkRows(retainedItems, retainedHomework, retainedTa),
    [retainedHomework, retainedItems, retainedTa],
  );
  const nextItem = nextActionFor(retainedItems);
  const openWork = React.useMemo(() => {
    const rows = allWork.filter(
      (row) => !["completed", "archived"].includes(row.status),
    );
    if (!nextItem) return rows;
    return [...rows].sort((a, b) => {
      if (a.classroomItem?.id === nextItem.id) return -1;
      if (b.classroomItem?.id === nextItem.id) return 1;
      return 0;
    });
  }, [allWork, nextItem]);

  const notes = React.useMemo(
    () => classroomNotes(retainedItems),
    [retainedItems],
  );
  const analytics = analyticsQuery.analytics;
  const practicedTypes = analytics?.hasData ? analytics.byType : [];
  const wrongAnswers =
    analytics?.byType.reduce(
      (total, row) => total + row.firstAttempts - row.firstCorrect,
      0,
    ) ?? 0;
  const weeklyItems = weeklyPlanQuery.data?.items ?? [];
  const bootcampItems = retainedItems.filter(
    (item) =>
      item.type === "bootcamp_module" &&
      !["completed", "archived"].includes(item.status),
  );

  const messageRetry = () => {
    void inbox.refresh();
    void thread.refresh();
    void itemsQuery.refetch();
  };
  const workRetry = () => {
    void itemsQuery.refetch();
    void homeworkQuery.refresh();
    void taQuery.refresh();
  };

  return (
    <>
      <div className="classroom-dateline">
        <time>
          {formatDate(new Date(), {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
        <span>|</span>
        <span>{testDateMeta(testDate)}</span>
      </div>
      <h1 className="classroom-title">Welcome back, {displayName}</h1>

      {messageLoading && !messageSucceededRef.current ? (
        <div className="classroom-message">
          <ClassroomSkeleton />
        </div>
      ) : null}
      {messageError ? (
        <div className="classroom-message">
          <InlineError
            message="Could not load your latest message."
            retry={messageRetry}
          />
        </div>
      ) : null}
      {(!messageLoading && !messageError) ||
      (messageSucceededRef.current && (messageLoading || messageError)) ? (
        <article className="classroom-message">
          <header>
            <div className="classroom-avatar">
              {messageAuthor.charAt(0).toUpperCase()}
            </div>
            <strong>{messageAuthor}</strong>
            <time>{formatDate(messageDate).toUpperCase()}</time>
          </header>
          {latestAdminMessage || !fallbackWelcomeHtml ? (
            <>
              <p
                className={`classroom-message-body${messageIsLong && !messageExpanded ? " classroom-message-clamped" : ""}`}
              >
                {messageText}
              </p>
              {messageLink && !(messageIsLong && !messageExpanded) ? (
                <a
                  className="classroom-message-link"
                  href={messageLink.route}
                  onClick={(event) => {
                    event.preventDefault();
                    navigate(messageLink.route);
                  }}
                >
                  {messageLink.label}
                </a>
              ) : null}
            </>
          ) : (
            <div
              className="classroom-prose"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(fallbackWelcomeHtml),
              }}
            />
          )}
          <div className="classroom-actions">
            {messageIsLong && !messageExpanded ? (
              <button
                type="button"
                className="classroom-button classroom-button-primary"
                onClick={() => setMessageExpanded(true)}
              >
                Read it
              </button>
            ) : null}
            <button
              type="button"
              className="classroom-button"
              onClick={() =>
                navigate(
                  adminConversation
                    ? `/inbox/${encodeURIComponent(adminConversation.id)}`
                    : "/inbox",
                )
              }
            >
              Reply
            </button>
          </div>
        </article>
      ) : null}

      <DataSection
        title="Next session"
        meta={nextSession ? "Scheduled" : undefined}
        loading={bookingQuery.isLoading}
        error={!!bookingQuery.error}
        empty={!nextSession}
        retry={() => void bookingQuery.refetch()}
      >
        {nextSession ? (
          <LeaderRow
            title={formatDate(nextSession.start_at, {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "numeric",
              minute: "2-digit",
            })}
            status="View booking"
            strong
            onClick={() => navigate("/booking")}
          />
        ) : null}
      </DataSection>

      <DataSection
        title="Up next"
        meta={openWork.length ? `${openWork.length} item${openWork.length === 1 ? "" : "s"}` : undefined}
        loading={
          itemsQuery.isLoading || homeworkQuery.loading || taQuery.loading
        }
        error={!!itemsQuery.error || !!homeworkQuery.error || !!taQuery.error}
        empty={openWork.length === 0}
        retry={workRetry}
      >
        {openWork.slice(0, 4).map((row, index) => (
          <LeaderRow
            key={row.key}
            title={row.title}
            status={row.status.replace(/_/g, " ")}
            strong={index === 0}
            onClick={() => {
              if (row.classroomItem) {
                const route = resolveItemRoute(row.classroomItem);
                if (route) {
                  navigate(route);
                  return;
                }
              }
              navigate(row.route);
            }}
          />
        ))}
      </DataSection>

      <DataSection
        title="Notes and recaps"
        meta={notes.length ? `${notes.length} posted` : undefined}
        loading={itemsQuery.isLoading}
        error={!!itemsQuery.error}
        empty={notes.length === 0}
        retry={() => void itemsQuery.refetch()}
      >
        {notes.slice(0, 3).map((item) => (
          <LeaderRow
            key={item.id}
            title={item.title}
            status={formatDate(item.created_at).toUpperCase()}
            onClick={() =>
              navigate(`/classroom/item/${encodeURIComponent(item.id)}`)
            }
          />
        ))}
        {notes.length > 3 ? (
          <div className="classroom-actions">
            <button
              type="button"
              className="classroom-button"
              onClick={() => openSection("notes")}
            >
              View all
            </button>
          </div>
        ) : null}
      </DataSection>

      <DataSection
        title="What you have practised"
        meta={
          analytics?.hasData
            ? `${analytics.totalAttempts} attempts`
            : undefined
        }
        loading={analyticsQuery.loading}
        error={!!analyticsQuery.error}
        empty={!analytics?.hasData}
        retry={analyticsQuery.refetch}
      >
        {practicedTypes.slice(0, 4).map((row) => (
          <LeaderRow
            key={row.key}
            title={row.label}
            status={
              row.reliable && row.firstAccuracy !== null
                ? `${Math.round(row.firstAccuracy)}% | ${row.firstAttempts}`
                : `${row.firstAttempts} attempt${row.firstAttempts === 1 ? "" : "s"} | sample under ${MIN_SAMPLE}`
            }
            onClick={() => navigate("/analytics")}
          />
        ))}
      </DataSection>

      <DataSection
        title="Wrong answers waiting"
        meta={wrongAnswers ? `${wrongAnswers} questions` : undefined}
        loading={analyticsQuery.loading}
        error={!!analyticsQuery.error}
        empty={!analytics?.hasData || wrongAnswers === 0}
        retry={analyticsQuery.refetch}
      >
        <LeaderRow
          title="Review questions you missed"
          status={`${wrongAnswers} waiting`}
          strong
          onClick={() => navigate("/journal")}
        />
      </DataSection>

      <DataSection
        title="This week"
        meta={weeklyPlanQuery.data?.plan?.title ?? undefined}
        loading={weeklyPlanQuery.isLoading}
        error={!!weeklyPlanQuery.error}
        empty={weeklyItems.length === 0}
        retry={() => void weeklyPlanQuery.refetch()}
      >
        {weeklyItems.map((item) => (
          <LeaderRow
            key={item.id}
            title={item.title}
            status={formatDate(`${item.day_date}T12:00:00`).toUpperCase()}
            onClick={() => {
              if (item.classroom_item_id) {
                navigate(
                  `/classroom/item/${encodeURIComponent(item.classroom_item_id)}`,
                );
              }
            }}
          />
        ))}
      </DataSection>

      <DataSection
        title="Bootcamp"
        meta={bootcampItems.length ? `${bootcampItems.length} active` : undefined}
        loading={itemsQuery.isLoading}
        error={!!itemsQuery.error}
        empty={bootcampItems.length === 0}
        retry={() => void itemsQuery.refetch()}
      >
        {bootcampItems.map((item) => (
          <LeaderRow
            key={item.id}
            title={item.title}
            status={item.status.replace(/_/g, " ")}
            onClick={() => {
              const route = resolveItemRoute(item);
              if (route) navigate(route);
            }}
          />
        ))}
      </DataSection>
    </>
  );
}

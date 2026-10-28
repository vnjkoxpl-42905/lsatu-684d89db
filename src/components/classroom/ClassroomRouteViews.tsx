import * as React from "react";
import { Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import { validateNotesReturnTo } from "@/lib/myWorkNotesNavigation";
import { htmlToArchiveText } from "@/components/my-work/teachingNotesArchiveData";
import { toast } from "sonner";
import { useClassroomItems, type ClassroomItem } from "@/hooks/useClassroomItems";
import {
  markTAAssignmentCompleted,
  markTAAssignmentViewed,
  useStudentAssignment,
  useStudentTAAssignment,
} from "@/hooks/useStudentAssignments";
import StructuredTAAssignmentWorkspace from "@/components/classroom/StructuredTAAssignmentWorkspace";
import { hasStructuredWorkspace } from "@/components/classroom/structured-assignment-model";
import { useStudentExternalUploads } from "@/hooks/useExternalWorkUploads";
import { useHomeworkSet } from "@/hooks/useHomeworkSets";
import { singleSectionOf } from "@/lib/drillRunSpec";
import { sectionDirectionsRoute } from "@/lib/sectionDirections";
import { useQueryClient } from "@tanstack/react-query";
import { isSelfContainedItem, resolveItemRoute } from "@/lib/classroomItems";
import { launchDrill } from "@/lib/drillLaunch";
import { useAuth } from "@/contexts/AuthContext";
import { markNoteRead } from "@/lib/markNoteRead";
import { rcAssignmentHtml } from "@/lib/rcAssignmentLinks";
import {
  groupNotes,
  NOTE_TYPES,
  sanitizeClassroomHtml,
} from "@/components/classroom/classroomData";
import ClassroomMarkdown from "@/components/classroom/ClassroomMarkdown";
import {
  StageIndexHint,
  StageIndexList,
  shortDate,
} from "@/components/classroom/StageIndexList";

function formatClassroomDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

/**
 * Row and heading labels for note types. The raw enum leaked into the UI, so a
 * student read "note" and "smartboard recap".
 *
 * `smartboard_recap` is a dead type as far as students are concerned: Joshua
 * confirmed 2026-09-09 that boards are not attached to accounts, so no student
 * ever sees this label. It stays because the teacher side can still write the
 * type and an unmapped value would fall through to the raw enum. Do not spend
 * effort wording it.
 */
const NOTE_KIND_LABELS: Record<string, string> = {
  note: "Note",
  session_recap: "Session recap",
  smartboard_recap: "Board from your session",
  announcement: "Announcement",
};

function noteKind(type: string) {
  return NOTE_KIND_LABELS[type] ?? type.replace(/_/g, " ");
}

/**
 * Markdown reduced to the words it renders, for a plain-text excerpt.
 *
 * The excerpt is the only place a recap body is shown without going through
 * ClassroomMarkdown, so the syntax has to come off here instead. Without this
 * the featured note on the landing surface opened with `## What we worked on`
 * or `- [ ] Redo PT 141 S2` — the exact leak the reading view was just fixed
 * for. Structural markers are dropped; the words they wrapped are kept.
 */
function stripMarkdown(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^[ \t]*(?:[-*+]|\d+\.)[ \t]+(?:\[[ xX]\][ \t]+)?/gm, "")
    .replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, " ")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(?<![\w*])([*_])(?!\s)(.+?)(?<!\s)\1(?![\w*])/g, "$2");
}

/**
 * First ~55 words of a note, for the landing preview.
 *
 * Notes are authored HTML and may carry their own <style>, so the tags are
 * reduced through the shared sanitized, inert archive extractor so preview
 * extraction never inserts authored markup into a live document element.
 */
function noteExcerpt(item: {
  description: string | null;
  content_markdown?: string | null;
  content_html: string | null;
}) {
  const source = item.description || item.content_markdown || item.content_html || "";
  if (!source) return "";
  let text = source;
  if (/[<>]/.test(source)) {
    text = htmlToArchiveText(source);
  } else {
    text = stripMarkdown(text);
  }
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length === 0) return "";
  return words.length <= 55 ? words.join(" ") : `${words.slice(0, 55).join(" ")}…`;
}

/** Below this, a flat list is easier to scan than a grouped one. */
const MONTH_GROUP_THRESHOLD = 12;

/**
 * Read notes bucketed by the month they were written, newest month first.
 * Input is already sorted newest-first by groupNotes, so insertion order is
 * the display order and no second sort is needed.
 */
function groupNotesByMonth<T extends { created_at: string }>(notes: T[]) {
  const buckets = new Map<string, { key: string; label: string; notes: T[] }>();
  for (const note of notes) {
    const date = new Date(note.created_at);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: new Intl.DateTimeFormat("en-CA", {
          month: "long",
          year: "numeric",
        }).format(date),
        notes: [],
      };
      buckets.set(key, bucket);
    }
    bucket.notes.push(note);
  }
  return [...buckets.values()];
}

function DetailLoading() {
  return (
    <div className="classroom-skeleton-stack" aria-label="Loading">
      <span className="classroom-skeleton" />
      <span className="classroom-skeleton" />
      <span className="classroom-skeleton" />
    </div>
  );
}

function DetailError({
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

function DetailHeading({
  date,
  kind,
  title,
}: {
  date: string;
  kind: string;
  title: string;
}) {
  return (
    <>
      <div className="classroom-dateline">
        <time>{formatClassroomDate(date)}</time>
        <span>|</span>
        <span>{kind}</span>
      </div>
      <h1 className="classroom-title">{title}</h1>
    </>
  );
}

export function ClassroomItemView() {
  const { itemId } = useParams<{ itemId: string }>();
  const location = useLocation();
  const notesReturnTo = validateNotesReturnTo(new URLSearchParams(location.search).get("returnTo"));
  const navigate = useNavigate();
  const query = useClassroomItems();
  const item = React.useMemo(
    () => (query.data ?? []).find((candidate) => candidate.id === itemId) ?? null,
    [itemId, query.data],
  );

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const readAttempts = React.useRef(new Set<string>());

  // Reconcile the originating account even when a quick Back unmounts this view.
  React.useEffect(() => {
    const viewerId = user?.id;
    if (!item || !viewerId || item.student_id !== viewerId || !NOTE_TYPES.has(item.type)) return;
    const attemptKey = `${viewerId}:${item.id}`;
    if (readAttempts.current.has(attemptKey)) return;
    readAttempts.current.add(attemptKey);
    void markNoteRead(item, viewerId)
      .then((readItem) => {
        if (!readItem) return;
        const readAt = readItem.metadata_json?.read_at;
        if (typeof readAt === 'string' && readAt) queryClient.setQueryData<ClassroomItem[]>(['classroom-items', viewerId], (rows) => rows?.map((row) => row.id === readItem.id ? { ...row, metadata_json: { ...row.metadata_json, read_at: readAt } } : row));
        void queryClient.invalidateQueries({ queryKey: ['classroom-items', viewerId] });
        void queryClient.invalidateQueries({ queryKey: ['notifications', viewerId] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', viewerId] });
      })
      .catch((error) => {
        readAttempts.current.delete(attemptKey);
        console.warn('Could not confirm note read state', error);
      });
  }, [item, queryClient, user?.id]);

  React.useEffect(() => {
    if (!item) return;
    // An item that IS its own page must not be redirected off itself. A
    // homework part from a session bundle now resolves to this very route, so
    // without this guard the effect would replace the page with the page.
    if (isSelfContainedItem(item)) return;
    if (
      item.type === "drill" ||
      item.type === "homework" ||
      item.type === "activity" ||
      item.type === "bootcamp_module" ||
      item.type === "weekly_plan_task" ||
      item.type === "practice_test"
    ) {
      const route = resolveItemRoute(item);
      if (route) navigate(route, { replace: true });
    }
  }, [item, navigate]);

  const assignmentContext = !!item && ["homework", "drill", "activity", "practice_test", "bootcamp_module", "weekly_plan_task"].includes(item.type);
  const safeHtml = React.useMemo(() => {
    const html = item?.content_html ?? "";
    return sanitizeClassroomHtml(assignmentContext ? rcAssignmentHtml(html, window.location.origin) : html);
  }, [item?.content_html, assignmentContext]);

  if (query.isLoading && !query.data) return <DetailLoading />;
  if (query.error) {
    return (
      <DetailError
        message="Could not load this classroom item."
        retry={() => void query.refetch()}
      />
    );
  }
  if (!item) {
    return (
      <>
        <DetailHeading
          date={new Date().toISOString()}
          kind="Classroom"
          title="This item is no longer available"
        />
        <button
          type="button"
          className="classroom-button"
          onClick={() => navigate("/classroom")}
        >
          Back to your room
        </button>
      </>
    );
  }

  if (
    NOTE_TYPES.has(item.type) &&
    item.content_html?.includes('<meta name="lsatu-interactive-lesson"')
  ) {
    return (
      <div className="w-full">
        <button
          type="button"
          className="classroom-button mb-4"
          onClick={() => navigate(notesReturnTo)}
        >
          Back to notes
        </button>
        <iframe
          title={`${item.title} interactive lesson`}
          srcDoc={item.content_html}
          sandbox="allow-scripts allow-forms"
          className="block w-full min-h-[calc(100dvh-7rem)] border-0"
        />
      </div>
    );
  }

  return (
    <>
      {/* `item.type.replace(/_/g," ")` printed the raw column value, so students
          read "note" and "smartboard recap". NOTE_KIND_LABELS gives each type a
          name a student would actually use. */}
      <DetailHeading
        date={item.created_at}
        kind={noteKind(item.type)}
        title={item.title}
      />
      {/* Authored content, not an empty state. It was inheriting
          .classroom-empty-copy, which is the class for "there is nothing here". */}
      {item.description ? (
        <p className="classroom-note-standfirst">{item.description}</p>
      ) : null}
      {/* Rendered, not printed. This was `<p>{item.content_markdown}</p>`, and
          the bodies arriving here are real markdown: the AI TA bundle writes
          `- [ ] `, `**n. prompt**` and `_Answer:_` out of `body_markdown`. With
          no `white-space` on `.classroom-prose p`, a recap reached the student
          as one run-on line with its own syntax showing. */}
      <ClassroomMarkdown assignmentContext={assignmentContext}>{item.content_markdown}</ClassroomMarkdown>
      {safeHtml ? (
        <article
          className="classroom-prose"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : null}
      {/* A note used to end in silence. This is the highest-intent moment on
          the surface: the student has just read something their coach wrote
          about them. "Ask" is the affordance CONTEXT.md already defines,
          labelled that way and never with the coach's name. The back link
          exists because the reading column was otherwise navigable only by
          browser back. */}
      {NOTE_TYPES.has(item.type) ? (
        <div className="classroom-detail-actions">
          <button
            type="button"
            className="classroom-button classroom-button-primary"
            onClick={() =>
              navigate(`/inbox?about=${encodeURIComponent(item.title)}`)
            }
          >
            Ask
          </button>
          <button
            type="button"
            className="classroom-button"
            onClick={() => navigate(notesReturnTo)}
          >
            Back to notes
          </button>
        </div>
      ) : null}
    </>
  );
}

/**
 * The newest note, opened far enough to be worth landing on.
 *
 * The stage used to render a dateline, an <h1> and a one-line count into a
 * 720px column and stop, so the widest region of the page carried the least
 * information and read as a page that had failed to load. Principle 2 asks the
 * product to compute the next step rather than present a menu; the next step
 * here is almost always the note that just arrived.
 *
 * Deliberately not a card. The stage has no card around it, and a bordered box
 * holding the only content on the page would be a container for its own sake.
 */
function FeaturedNote({
  note,
  unread,
}: {
  note: ReturnType<typeof groupNotes>["unread"][number];
  unread: boolean;
}) {
  const navigate = useNavigate();
  const excerpt = React.useMemo(() => noteExcerpt(note), [note]);
  const open = () => navigate(`/classroom/item/${encodeURIComponent(note.id)}`);

  return (
    <section className="classroom-featured-note" aria-labelledby="featured-note-title">
      <p className="classroom-featured-note-meta">
        {unread ? "Newest, unread" : "Most recent"}
        <span aria-hidden="true"> · </span>
        {noteKind(note.type)}
        <span aria-hidden="true"> · </span>
        <time dateTime={note.created_at}>{formatClassroomDate(note.created_at)}</time>
      </p>
      <h2 className="classroom-featured-note-title" id="featured-note-title">
        {note.title}
      </h2>
      {excerpt ? <p className="classroom-featured-note-excerpt">{excerpt}</p> : null}
      <button
        type="button"
        className="classroom-button classroom-button-primary"
        onClick={open}
      >
        Read it
      </button>
    </section>
  );
}

export function ClassroomRecapsView() {
  const query = useClassroomItems();
  const { unread, read } = groupNotes(query.data ?? []);
  const total = unread.length + read.length;
  // Unread first, because the reason to open this page is almost always
  // something that just arrived. Falls back to the newest read note so the
  // stage still says something once the student is caught up.
  const featured = unread[0] ?? read[0] ?? null;

  // The page promises two categories and the feed carries four types, none of
  // which the row showed. A session recap, an announcement and a board from a
  // session were indistinguishable until opened.
  const row = (note: (typeof unread)[number], isUnread: boolean) => ({
    key: note.id,
    title: note.title,
    meta: `${noteKind(note.type)} · ${shortDate(note.created_at)}`,
    route: `/classroom/item/${encodeURIComponent(note.id)}`,
    unread: isUnread,
  });

  return (
    <>
      {/* No dateline on an index. It printed `new Date()`, so it stamped the
          page with the day the student happened to visit while sitting in the
          slot that, on a note, holds the day Joshua wrote it. It was the one
          number on the page that did not trace to stored data. */}
      <h1 className="classroom-title">Notes and recaps</h1>
      {query.isLoading && !query.data ? <DetailLoading /> : null}
      {query.error ? (
        <DetailError
          message="Could not load your notes and recaps."
          retry={() => void query.refetch()}
        />
      ) : null}
      {/* The zero case is a state, not an absence. Without a branch here the
          page rendered a heading and stopped, which is the surface a brand new
          student is most likely to open first. It claims nothing that is not
          true: it says where recaps come from and stops.

          This used to say the wording was shared with RecapsSection "so the
          two places cannot drift". RecapsSection had no importers, and neither
          did pages/ClassroomRecaps or pages/ClassroomItem: all three predated
          this shell and nothing routed to them. Deleted 2026-09-09. The copy
          has one home, which is here. */}
      {!query.isLoading && !query.error && total === 0 ? (
        <p className="classroom-empty-copy">
          Notes and recaps from your sessions with Joshua will show up here.
        </p>
      ) : null}
      {!query.isLoading && !query.error && total > 0 ? (
        <>
          <p className="classroom-surface-lede">
            What Joshua writes for you after a session, plus anything he sends
            between them.
          </p>
          {featured ? (
            <FeaturedNote note={featured} unread={unread.length > 0} />
          ) : null}
          <StageIndexHint>
            {unread.length > 0
              ? `${unread.length} unread of ${total}.`
              : `All ${total} read.`}
          </StageIndexHint>
          {unread.length > 0 ? (
            <StageIndexList
              label="Unread notes and recaps"
              heading="Unread"
              items={unread.map((note) => row(note, true))}
            />
          ) : null}
          {/* Read notes group by month once the list is long enough that a flat
              run stops being scannable. At ~25 sessions a week this is measured
              in hundreds within a year, and Flagged and Wrong answers both got a
              filter while this list got nothing. Grouping beats a search box for
              a chronological archive: a student looks for "the one after the
              February session", not for a word. Below the threshold a flat list
              is clearer, so the headings stay out of the way. */}
          {read.length > MONTH_GROUP_THRESHOLD
            ? groupNotesByMonth(read).map((group) => (
                <StageIndexList
                  key={group.key}
                  label={`Notes and recaps from ${group.label}`}
                  heading={group.label}
                  items={group.notes.map((note) => row(note, false))}
                />
              ))
            : read.length > 0 ? (
              <StageIndexList
                label="Notes and recaps you have read"
                heading={unread.length > 0 ? "Read" : undefined}
                items={read.map((note) => row(note, false))}
              />
            ) : null}
        </>
      ) : null}
    </>
  );
}

export function ClassroomUploadsView() {
  const query = useStudentExternalUploads();
  const uploads = query.data ?? [];

  return (
    <>
      {/* Index route: no dateline, same reason as Notes and recaps. */}
      <h1 className="classroom-title">Your uploads</h1>
      {query.isLoading && !query.data ? <DetailLoading /> : null}
      {query.error ? (
        <DetailError
          message="Could not load your uploads."
          retry={() => void query.refetch()}
        />
      ) : null}
      {!query.error && uploads.length > 0 ? (
        <section className="classroom-content-section">
          {uploads.map((upload) => (
            <div className="classroom-leader-row" key={upload.id}>
              <p>{upload.file_name}</p>
              <div className="classroom-dotted-leader" />
              <span className="classroom-row-status">
                {upload.processing_status.replace(/_/g, " ")}
              </span>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function ClassroomAssignmentView() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const assignmentQuery = useStudentAssignment(assignmentId);
  const setQuery = useHomeworkSet(assignmentQuery.assignment?.set_id ?? undefined);
  const assignment = assignmentQuery.assignment;

  const start = () => {
    if (!assignment) return;
    const guidedSetId =
      setQuery.set?.id && setQuery.set.is_guided_set ? setQuery.set.id : undefined;
    const query = launchDrill({
      kind: "assignment",
      assignmentId: assignment.id,
      guidedSetId,
      options: { returnTo: "/classroom" },
    });
    navigate(`/drill?${query}`);
  };

  if (assignmentQuery.loading && !assignment) return <DetailLoading />;
  if (assignmentQuery.error) {
    return (
      <DetailError
        message="Could not load this assignment."
        retry={() => void assignmentQuery.refresh()}
      />
    );
  }
  if (!assignment) {
    return (
      <>
        <DetailHeading
          date={new Date().toISOString()}
          kind="Assignment"
          title="Assignment not found"
        />
      </>
    );
  }

  // One PrepTest section is sat from its directions page, not from here. The
  // emailed link and the inbox message still point at /classroom/:id, so this
  // is where they land before being sent on.
  if (assignment.status !== "completed" && singleSectionOf(assignment.question_qids)) {
    return <Navigate to={sectionDirectionsRoute(assignment.id)} replace />;
  }

  const estimatedMinutes =
    setQuery.set?.estimated_minutes ??
    Math.max(1, Math.ceil(assignment.question_qids.length * 2));

  return (
    <>
      <DetailHeading
        date={assignment.created_at}
        kind="Assignment"
        title={assignment.set_title}
      />
      {assignment.set_description ? (
        <div className="classroom-callout">{assignment.set_description}</div>
      ) : null}
      <div className="classroom-note-meta">
        {assignment.question_qids.length} question
        {assignment.question_qids.length === 1 ? "" : "s"} | about{" "}
        {estimatedMinutes} minutes | {assignment.status.replace(/_/g, " ")}
      </div>
      {setQuery.error ? (
        <DetailError
          message="Some assignment details could not be loaded."
          retry={() => void setQuery.refresh()}
        />
      ) : null}
      <div className="classroom-detail-actions">
        <button
          type="button"
          className="classroom-button classroom-button-primary"
          disabled={setQuery.loading}
          onClick={start}
        >
          {assignment.status === "completed"
            ? "Review"
            : assignment.status === "in_progress"
              ? "Continue"
              : setQuery.set?.start_button_label || "Start"}
        </button>
      </div>
    </>
  );
}

export function ClassroomTAAssignmentView() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const query = useStudentTAAssignment(assignmentId);
  const assignment = query.assignment;
  const structured = assignment ? hasStructuredWorkspace(assignment) : false;
  const [completing, setCompleting] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const viewedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!assignment || assignment.status !== "assigned") return;
    if (viewedRef.current === assignment.id) return;
    viewedRef.current = assignment.id;
    void markTAAssignmentViewed(assignment.id).then((result) => {
      if (result.ok) void query.refresh();
    });
  }, [assignment, query]);

  const safeHtml = React.useMemo(
    () => sanitizeClassroomHtml(rcAssignmentHtml(assignment?.content_html ?? "", window.location.origin)),
    [assignment?.content_html],
  );

  const download = async () => {
    if (!assignment) return;
    setDownloading(true);
    try {
      const { downloadAssignmentPdf } = await import("@/lib/taPdf");
      await downloadAssignmentPdf({
        title: assignment.title,
        contentHtml: safeHtml,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  const complete = async () => {
    if (!assignment) return;
    setCompleting(true);
    const result = await markTAAssignmentCompleted(assignment.id);
    if (result.ok) {
      toast.success("Marked complete");
      await query.refresh();
    } else {
      toast.error(result.error ?? "Could not mark this complete");
    }
    setCompleting(false);
  };

  if (query.loading && !assignment) return <DetailLoading />;
  if (query.error) {
    return (
      <DetailError
        message="Could not load this assignment."
        retry={() => void query.refresh()}
      />
    );
  }
  if (!assignment) {
    return (
      <DetailHeading
        date={new Date().toISOString()}
        kind="Assignment"
        title="Assignment not found"
      />
    );
  }

  return (
    <>
      <DetailHeading
        date={assignment.assigned_at}
        kind="Assignment"
        title={assignment.title}
      />
      <div className="classroom-note-meta">
        {assignment.status.replace(/_/g, " ")}
      </div>
      {safeHtml ? (
        <article
          className="classroom-prose"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : null}
      {structured ? (
        <StructuredTAAssignmentWorkspace
          assignment={assignment}
          refresh={query.refresh}
        />
      ) : null}
      <div className="classroom-detail-actions">
        <button
          type="button"
          className="classroom-button"
          disabled={downloading}
          onClick={() => void download()}
        >
          {downloading ? "Preparing PDF" : "Download PDF"}
        </button>
        {!structured && assignment.status !== "completed" ? (
          <button
            type="button"
            className="classroom-button classroom-button-primary"
            disabled={completing}
            onClick={() => void complete()}
          >
            {completing ? "Saving" : "Mark complete"}
          </button>
        ) : null}
      </div>
    </>
  );
}

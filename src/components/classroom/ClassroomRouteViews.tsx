import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useClassroomItems } from "@/hooks/useClassroomItems";
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
import { useQueryClient } from "@tanstack/react-query";
import { resolveItemRoute } from "@/lib/classroomItems";
import { markNoteRead } from "@/lib/markNoteRead";
import {
  groupNotes,
  NOTE_TYPES,
  sanitizeClassroomHtml,
} from "@/components/classroom/classroomData";
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
  const navigate = useNavigate();
  const query = useClassroomItems();
  const item = React.useMemo(
    () => (query.data ?? []).find((candidate) => candidate.id === itemId) ?? null,
    [itemId, query.data],
  );

  const queryClient = useQueryClient();

  // Opening a note marks it read and clears the bell entry that pointed at it.
  // Deliberately not gated on status: the status update is guarded on
  // 'assigned' inside markNoteRead so it is a no-op on a second visit, while
  // the notification clear still has to run, because a note can be read on one
  // device and leave its bell entry standing on another.
  React.useEffect(() => {
    if (!item || !NOTE_TYPES.has(item.type)) return;
    let cancelled = false;
    void markNoteRead(item)
      .then(() => {
        if (!cancelled) void queryClient.invalidateQueries({ queryKey: ["classroom-items"] });
      })
      .catch(() => {
        // Read state is a convenience. A failure here must never block the note.
      });
    return () => {
      cancelled = true;
    };
  }, [item, queryClient]);

  React.useEffect(() => {
    if (!item) return;
    if (
      item.type === "drill" ||
      item.type === "homework" ||
      item.type === "activity" ||
      item.type === "bootcamp_module" ||
      item.type === "weekly_plan_task"
    ) {
      const route = resolveItemRoute(item);
      if (route) navigate(route, { replace: true });
    }
  }, [item, navigate]);

  const safeHtml = React.useMemo(
    () => sanitizeClassroomHtml(item?.content_html ?? ""),
    [item?.content_html],
  );

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

  return (
    <>
      <DetailHeading
        date={item.created_at}
        kind={item.type.replace(/_/g, " ")}
        title={item.title}
      />
      {item.description ? (
        <p className="classroom-empty-copy">{item.description}</p>
      ) : null}
      {item.content_markdown ? (
        <article className="classroom-prose">
          <p>{item.content_markdown}</p>
        </article>
      ) : null}
      {safeHtml ? (
        <article
          className="classroom-prose"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : null}
    </>
  );
}

export function ClassroomRecapsView() {
  const query = useClassroomItems();
  const { unread, read } = groupNotes(query.data ?? []);
  const total = unread.length + read.length;

  const row = (note: (typeof unread)[number], isUnread: boolean) => ({
    key: note.id,
    title: note.title,
    meta: shortDate(note.created_at),
    route: `/classroom/item/${encodeURIComponent(note.id)}`,
    unread: isUnread,
  });

  return (
    <>
      <DetailHeading
        date={new Date().toISOString()}
        kind="Classroom"
        title="Notes and recaps"
      />
      {query.isLoading && !query.data ? <DetailLoading /> : null}
      {query.error ? (
        <DetailError
          message="Could not load your notes and recaps."
          retry={() => void query.refetch()}
        />
      ) : null}
      {!query.isLoading && !query.error && total > 0 ? (
        <>
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
          {read.length > 0 ? (
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
      <DetailHeading
        date={new Date().toISOString()}
        kind="Classroom"
        title="Your uploads"
      />
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
    const params = new URLSearchParams({
      mode: "type-drill",
      qids: assignment.question_qids.join(","),
      assignmentId: assignment.id,
    });
    if (setQuery.set?.id && setQuery.set.is_guided_set) {
      params.set("guidedSetId", setQuery.set.id);
    }
    navigate(`/drill?${params.toString()}`);
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
    () => sanitizeClassroomHtml(assignment?.content_html ?? ""),
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

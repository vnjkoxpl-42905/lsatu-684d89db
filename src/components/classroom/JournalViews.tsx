import * as React from "react";
import { Pencil } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  journalEntriesQueryKey,
  useJournalEntries,
} from "@/hooks/useJournalEntries";
import { supabase } from "@/integrations/supabase/client";
import {
  StageIndexHint,
  StageIndexList,
  shortDate,
} from "@/components/classroom/StageIndexList";
import { startJoshuaConversation } from "@/lib/joshuaThread";
import {
  questionBank,
  type LRQuestion,
} from "@/lib/questionLoader";
import {
  upsertNote,
  type AnnotationStroke,
} from "@/lib/wajNotesService";
import type { WrongAnswerSmartRow } from "@/lib/journalService";
import type { JournalDraft } from "@/components/journal/entry/ReviewForm";
import {
  createJournalAutosaveQueue,
  mergeJournalDraft,
  type JournalSavePayload,
} from "@/components/classroom/journalAutosave";
import { JournalQuestionView } from "@/components/classroom/JournalQuestionView";
import { JournalReviewPanel } from "@/components/classroom/JournalReviewPanel";
import { ReviewTabs } from "@/components/classroom/ReviewTabs";
import { ReviewReturnLink, reviewReturnTo } from "@/components/review/ReviewReturnLink";

const EMPTY_DRAFT: JournalDraft = {
  self_rating: null,
  date_taken: "",
  question_summary: "",
  wrong_answer: "",
  wrong_reasoning: "",
  correct_reasoning: "",
  lesson: "",
  other_notes: "",
  student_note: "",
  trap_pattern: "",
};

function isoDate(value: string | null | undefined) {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function seedDraft(row: WrongAnswerSmartRow): JournalDraft {
  const n = row.note;
  return {
    self_rating:
      n?.self_rating ?? (row.status === "right" ? "correct" : "wrong"),
    date_taken: isoDate(n?.date_taken) || isoDate(row.first_missed),
    question_summary: n?.question_summary ?? "",
    wrong_answer: n?.wrong_answer ?? row.last_chosen ?? "",
    wrong_reasoning: n?.wrong_reasoning ?? n?.root_cause ?? "",
    correct_reasoning: n?.correct_reasoning ?? "",
    lesson: n?.lesson ?? "",
    // The free note now has its own box, so Other Notes no longer borrows it.
    other_notes: n?.other_notes ?? "",
    student_note: n?.student_note ?? "",
    trap_pattern: n?.trap_pattern ?? "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

/**
 * On an entry the dateline chip names the section the entry belongs to, which
 * is what "Wrong answers" is for. On the index the h1 already IS the section,
 * so the chip has to name the rail group instead or the surface prints its own
 * name twice. `/flagged` and `/classroom/recaps` already follow that rule.
 */
function DetailHeading({
  date,
  kind = "Wrong answers",
  title,
}: {
  date: string;
  kind?: string;
  title: string;
}) {
  return (
    <>
      <div className="classroom-dateline">
        <time>{formatDate(date)}</time>
        <span>|</span>
        <span>{kind}</span>
      </div>
      <h2 className="classroom-title">{title}</h2>
    </>
  );
}

function AskComposer({
  label,
  onDone,
}: {
  label: string;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    const comment = text.trim();
    if (!comment || !user) return;
    setSending(true);
    try {
      const conversationId = await startJoshuaConversation();
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: `${comment}\n\n(About ${label})`,
      });
      if (error) throw error;
      toast.success("Sent");
      setText("");
      onDone();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send that",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="classroom-ask">
      <label htmlFor="classroom-journal-ask-body">
        What is confusing you about this one?
      </label>
      <textarea
        id="classroom-journal-ask-body"
        className="classroom-textarea"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Say as much as you can. The question gets attached automatically."
      />
      <div className="classroom-detail-actions">
        <button
          type="button"
          className="classroom-button classroom-button-primary"
          disabled={sending || !text.trim()}
          onClick={() => void send()}
        >
          {sending ? "Sending" : "Send"}
        </button>
        <button
          type="button"
          className="classroom-button"
          disabled={sending}
          onClick={() => {
            setText("");
            onDone();
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="classroom-skeleton-stack" aria-label="Loading">
      <span className="classroom-skeleton" />
      <span className="classroom-skeleton" />
      <span className="classroom-skeleton" />
    </div>
  );
}

export function JournalIndexView() {
  const query = useJournalEntries();
  const rows = query.data ?? [];

  return (
    <>
      <ReviewTabs />
      <DetailHeading
        date={new Date().toISOString()}
        kind="Review"
        title="Wrong answers"
      />
      {query.isLoading && !query.data ? <LoadingState /> : null}
      {query.error ? (
        <div className="classroom-inline-error">
          <p>Could not load your wrong answers.</p>
          <button
            type="button"
            className="classroom-button"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </div>
      ) : null}
      {!query.isLoading && !query.error && rows.length === 0 ? (
        <p className="classroom-empty-copy">
          You have no wrong answers yet. Questions you miss while drilling will
          wait for you here.
        </p>
      ) : null}
      {!query.isLoading && !query.error && rows.length > 0 ? (
        <>
          <StageIndexHint>Choose an entry from the list.</StageIndexHint>
          <StageIndexList
            label="Wrong answers"
            items={rows.map((row) => ({
              key: row.qid,
              title: row.note?.title?.trim() || row.label,
              meta: shortDate(row.first_missed, row.qtype),
              route: `/journal/${encodeURIComponent(row.qid)}`,
            }))}
          />
        </>
      ) : null}
    </>
  );
}

export function JournalEntryView() {
  const { qid } = useParams<{ qid: string }>();
  const location = useLocation();
  const reviewNav = reviewReturnTo(location.search) ? <ReviewReturnLink /> : <ReviewTabs />;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useJournalEntries();
  const permissions = useUserPermissions();
  const { isLoading: bankLoading, error: bankError } = useQuestionBank();
  const [draft, setDraft] = React.useState<JournalDraft>(EMPTY_DRAFT);
  const [annotations, setAnnotations] = React.useState<AnnotationStroke[]>([]);
  const [annotateActive, setAnnotateActive] = React.useState(false);
  const [askOpen, setAskOpen] = React.useState(false);
  const latestDraftRef = React.useRef(draft);
  const annotationsRef = React.useRef(annotations);

  const row = React.useMemo(
    () => (query.data ?? []).find((candidate) => candidate.qid === qid) ?? null,
    [qid, query.data],
  );
  const question: LRQuestion | undefined =
    qid && !bankLoading ? questionBank.getQuestion(qid) : undefined;

  const autosaveRef = React.useRef<ReturnType<
    typeof createJournalAutosaveQueue
  > | null>(null);
  if (!autosaveRef.current) {
    autosaveRef.current = createJournalAutosaveQueue(
      async (payload: JournalSavePayload) => {
        try {
          await upsertNote({
            class_id: payload.classId,
            qid: payload.qid,
            self_rating: payload.draft.self_rating,
            date_taken: payload.draft.date_taken || null,
            question_summary: payload.draft.question_summary || null,
            wrong_answer: payload.draft.wrong_answer || null,
            wrong_reasoning: payload.draft.wrong_reasoning || null,
            correct_reasoning: payload.draft.correct_reasoning || null,
            lesson: payload.draft.lesson || null,
            other_notes: payload.draft.other_notes || null,
            student_note: payload.draft.student_note || null,
            trap_pattern: payload.draft.trap_pattern || null,
            annotations: payload.annotations,
          });
          await queryClient.invalidateQueries({
            queryKey: journalEntriesQueryKey(payload.classId),
          });
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Could not save that",
          );
        }
      },
      800,
    );
  }

  React.useEffect(() => {
    const nextDraft = row ? seedDraft(row) : EMPTY_DRAFT;
    const nextAnnotations = row?.note?.annotations ?? [];
    latestDraftRef.current = nextDraft;
    annotationsRef.current = nextAnnotations;
    setDraft(nextDraft);
    setAnnotations(nextAnnotations);
    setAnnotateActive(false);
    setAskOpen(false);

    return () => {
      void autosaveRef.current?.flush();
    };
    // Re-seed only when the selected journal row changes. Query invalidation
    // must not overwrite an in-progress draft with the refetched note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid, row?.id]);

  const scheduleSave = (
    nextDraft: JournalDraft,
    nextAnnotations: AnnotationStroke[],
  ) => {
    if (!qid || !query.classId || !row) return;
    autosaveRef.current?.schedule({
      classId: query.classId,
      qid,
      draft: nextDraft,
      annotations: nextAnnotations,
    });
  };

  const patch = (partial: Partial<JournalDraft>) => {
    const next = mergeJournalDraft(latestDraftRef.current, partial);
    latestDraftRef.current = next;
    setDraft(next);
    scheduleSave(next, annotationsRef.current);
  };

  const changeAnnotations = (next: AnnotationStroke[]) => {
    annotationsRef.current = next;
    setAnnotations(next);
    scheduleSave(latestDraftRef.current, next);
  };

  if (query.isLoading && !query.data) {
    return (
      <main className="classroom-stage classroom-journal-stage">
        <div className="classroom-journal-stage-inner">
          {reviewNav}
          <LoadingState />
        </div>
      </main>
    );
  }

  if (query.error) {
    return (
      <main className="classroom-stage classroom-journal-stage">
        <div className="classroom-journal-stage-inner">
          {reviewNav}
          <div className="classroom-inline-error">
            <p>Could not load your wrong answers.</p>
            <button
              type="button"
              className="classroom-button"
              onClick={() => void query.refetch()}
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <main className="classroom-stage classroom-journal-stage">
        <div className="classroom-journal-stage-inner">
          {reviewNav}
          <DetailHeading
            date={new Date().toISOString()}
            title="This entry is not in your wrong answers"
          />
          <button
            type="button"
            className="classroom-button"
            onClick={() => navigate("/journal")}
          >
            Back to Wrong answers
          </button>
        </div>
      </main>
    );
  }

  const questionUnavailable = bankError || (!bankLoading && !question);

  return (
    <>
      <main className="classroom-stage classroom-journal-stage">
        <div className="classroom-journal-stage-inner">
          {reviewNav}
          <div className="classroom-journal-entry-heading">
            <div>
              <DetailHeading date={row.first_missed} title={row.label} />
              <p className="classroom-note-meta">
                {row.qtype} | difficulty {row.level}
              </p>
            </div>
            <button
              type="button"
              className={`classroom-button classroom-annotate-button${
                annotateActive ? " classroom-annotate-button-active" : ""
              }`}
              aria-pressed={annotateActive}
              onClick={() => setAnnotateActive((active) => !active)}
            >
              <Pencil size={15} />
              {annotateActive ? "Annotating" : "Annotate"}
            </button>
          </div>

          {bankLoading ? (
            <LoadingState />
          ) : questionUnavailable ? (
            <div className="classroom-inline-error">
              <p>
                The question bank did not load, so this question cannot be
                shown here.
              </p>
              <button
                type="button"
                className="classroom-button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : question ? (
            <JournalQuestionView
              question={question}
              chosenAnswer={draft.wrong_answer || null}
              questionSummary={draft.question_summary}
              wrongReasoning={draft.wrong_reasoning}
              correctReasoning={draft.correct_reasoning}
              annotateActive={annotateActive}
              annotations={annotations}
              onAnnotationsChange={changeAnnotations}
              onChooseWrong={(key) => patch({ wrong_answer: key })}
            />
          ) : null}
        </div>
      </main>

      <aside className="classroom-aside">
        <div className="classroom-aside-inner">
          <h2>Review</h2>
          {question ? (
            <JournalReviewPanel
              draft={draft}
              correctAnswer={question.correctAnswer}
              answerKeys={Object.keys(question.answerChoices)}
              onPatch={patch}
            />
          ) : (
            <p className="classroom-empty-copy">
              Your review will appear when the question loads.
            </p>
          )}

          {permissions.has_chat_access && !askOpen ? (
            <button
              type="button"
              className="classroom-button"
              onClick={() => setAskOpen(true)}
            >
              Ask
            </button>
          ) : null}
          {permissions.has_chat_access && askOpen ? (
            <AskComposer label={row.label} onDone={() => setAskOpen(false)} />
          ) : null}
        </div>
      </aside>
    </>
  );
}

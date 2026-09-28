/**
 * The Flagged surface, rendered inside the Classroom frame.
 *
 * A flag is a come-back-to-this marker raised mid-question. This is where the
 * student comes back to it: read the question without the answer, write down
 * why it was flagged, ask about it, practise it, or clear it.
 */
import * as React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";
import { supabase } from "@/integrations/supabase/client";
import { startJoshuaConversation } from "@/lib/joshuaThread";
import { useFlagged, useInvalidateFlagged } from "@/hooks/useFlagged";
import {
  flagLabel,
  restoreFlag,
  unflag,
  updateFlagNote,
  type FlaggedQuestionRow,
} from "@/lib/flaggedService";
import { ClassroomQuestionPane } from "@/components/classroom/ClassroomQuestionPane";
import {
  StageIndexHint,
  StageIndexList,
  shortDate,
} from "@/components/classroom/StageIndexList";
import { ReviewTabs } from "@/components/classroom/ReviewTabs";
import { ReviewReturnLink, reviewReturnTo } from "@/components/review/ReviewReturnLink";

function formatClassroomDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
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
      <h2 className="classroom-title">{title}</h2>
    </>
  );
}

/**
 * The Ask composer.
 *
 * Purpose-built rather than reusing MessageComposer: that component carries an
 * emoji picker, a Drive attachment picker and a slash-command template palette,
 * none of which belong in a reading column. This is the same three-field insert
 * every other sender in the app performs, plus the get-or-create RPC so a
 * student with no thread yet can still ask.
 */
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
      <label htmlFor="classroom-ask-body">
        What is confusing you about this one?
      </label>
      <textarea
        id="classroom-ask-body"
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

/** The note on a flag, editable after the fact. */
function FlagNote({ row }: { row: FlaggedQuestionRow }) {
  const invalidate = useInvalidateFlagged();
  const [value, setValue] = React.useState(row.note ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setValue(row.note ?? "");
  }, [row.id, row.note]);

  const dirty = value.trim() !== (row.note ?? "").trim();

  const save = async () => {
    setSaving(true);
    try {
      await updateFlagNote(row.id, value);
      await invalidate();
      toast.success("Note saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save that note",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="classroom-flag-note">
      <label htmlFor="classroom-flag-note-body">Why you flagged it</label>
      <textarea
        id="classroom-flag-note-body"
        className="classroom-textarea"
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add what you were thinking when you flagged this."
      />
      {dirty ? (
        <div className="classroom-detail-actions">
          <button
            type="button"
            className="classroom-button"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving" : "Save note"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FlaggedIndexView() {
  const query = useFlagged();
  const rows = query.data ?? [];

  return (
    <>
      <ReviewTabs />
      <DetailHeading
        date={new Date().toISOString()}
        kind="Review"
        title="Flagged"
      />
      {query.isLoading && !query.data ? (
        <div className="classroom-skeleton-stack" aria-label="Loading">
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
        </div>
      ) : null}
      {query.error ? (
        <div className="classroom-inline-error">
          <p>Could not load your flagged questions.</p>
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
          Nothing flagged yet. Flag a question while you are drilling when you
          want to come back to it, and it will wait for you here.
        </p>
      ) : null}
      {!query.isLoading && !query.error && rows.length > 0 ? (
        <>
          <StageIndexHint>Choose a flagged question from the list.</StageIndexHint>
          <StageIndexList
            label="Flagged questions"
            items={rows.map((row) => ({
              key: row.id,
              title: flagLabel(row),
              meta: shortDate(row.flagged_at, row.qtype),
              route: `/flagged/${encodeURIComponent(row.qid)}`,
            }))}
          />
        </>
      ) : null}
    </>
  );
}

export function FlaggedQuestionView() {
  const { qid } = useParams<{ qid: string }>();
  const location = useLocation();
  const queueReturnTo = reviewReturnTo(location.search);
  const reviewNav = queueReturnTo ? <ReviewReturnLink /> : <ReviewTabs />;
  const navigate = useNavigate();
  const query = useFlagged();
  const invalidate = useInvalidateFlagged();
  const permissions = useUserPermissions();
  const { isLoading: bankLoading, error: bankError } = useQuestionBank();
  const [askOpen, setAskOpen] = React.useState(false);

  // A different question means a fresh, closed composer.
  React.useEffect(() => {
    setAskOpen(false);
  }, [qid]);

  const row = React.useMemo(
    () => (query.data ?? []).find((candidate) => candidate.qid === qid) ?? null,
    [qid, query.data],
  );

  const question = qid && !bankLoading ? questionBank.getQuestion(qid) : undefined;

  const practise = () => {
    if (!question) return;
    navigate(`/drill?returnTo=${encodeURIComponent(queueReturnTo ?? "/flagged")}`, {
      state: {
        mode: "type-drill",
        config: {
          qtypes: [question.qtype],
          difficulties: [question.difficulty],
          pts: [question.pt],
          count: 1,
          selectedQids: [question.qid],
        },
      },
    });
  };

  const remove = async () => {
    if (!row) return;
    // The undo lives on the toast, not in this component's state: unflagging
    // navigates away and unmounts the view, which would take the undo with it.
    const { id, ...payload } = row;
    try {
      await unflag(id);
      await invalidate();
      navigate(queueReturnTo ?? "/flagged", { replace: true });
      toast("Unflagged", {
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              try {
                await restoreFlag(payload);
                await invalidate();
                navigate(`/flagged/${encodeURIComponent(payload.qid)}${queueReturnTo ? `?returnTo=${encodeURIComponent(queueReturnTo)}` : ""}`);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not put that back",
                );
              }
            })();
          },
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not unflag that",
      );
    }
  };

  if (query.isLoading && !query.data) {
    return (
      <>
        {reviewNav}
        <div className="classroom-skeleton-stack" aria-label="Loading">
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
        </div>
      </>
    );
  }

  if (query.error) {
    return (
      <>
        {reviewNav}
        <div className="classroom-inline-error">
          <p>Could not load your flagged questions.</p>
          <button
            type="button"
            className="classroom-button"
            onClick={() => void query.refetch()}
          >
            Try again
          </button>
        </div>
      </>
    );
  }

  if (!row) {
    return (
      <>
        {reviewNav}
        <DetailHeading
          date={new Date().toISOString()}
          kind="Review"
          title="This question is no longer flagged"
        />
      </>
    );
  }

  const label = flagLabel(row);

  return (
    <>
      {reviewNav}
      <DetailHeading
        date={row.flagged_at ?? new Date().toISOString()}
        kind="Flagged"
        title={label}
      />
      {/* The flag row carries its own qtype and level, recorded when the flag
          was raised. Prefer them: the bank returns "Unknown" for some qids. */}
      {row.qtype && row.qtype.toLowerCase() !== "unknown" ? (
        <div className="classroom-note-meta">
          {row.qtype} | difficulty {row.level}
        </div>
      ) : null}

      {bankLoading ? (
        <div className="classroom-skeleton-stack" aria-label="Loading the question">
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
        </div>
      ) : bankError || !question ? (
        <div className="classroom-inline-error">
          <p>
            The question bank did not load, so this question cannot be shown
            here.
          </p>
          <button
            type="button"
            className="classroom-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      ) : (
        <ClassroomQuestionPane question={question} />
      )}

      <FlagNote row={row} />

      <div className="classroom-detail-actions">
        <button
          type="button"
          className="classroom-button classroom-button-primary"
          disabled={!question}
          onClick={practise}
        >
          Practice
        </button>
        {permissions.has_chat_access && !askOpen ? (
          <button
            type="button"
            className="classroom-button"
            onClick={() => setAskOpen(true)}
          >
            Ask
          </button>
        ) : null}
        <button type="button" className="classroom-button" onClick={() => void remove()}>
          Unflag
        </button>
      </div>

      {permissions.has_chat_access && askOpen ? (
        <AskComposer label={label} onDone={() => setAskOpen(false)} />
      ) : null}
    </>
  );
}

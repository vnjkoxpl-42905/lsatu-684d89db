import * as React from "react";
import { toast } from "sonner";
import { sanitizeClassroomHtml } from "./classroomData";
import {
  saveTAAssignmentResponses,
  submitTAAssignmentResponses,
  type StudentTAAssignment,
} from "@/hooks/useStudentAssignments";
import "./structured-assignment.css";

interface Props {
  assignment: StudentTAAssignment;
  refresh: () => Promise<void>;
}

interface LocalDraft {
  responses: Record<string, string>;
  savedAt: string;
}

const draftKey = (assignmentId: string) =>
  `lsatu:passage-map-draft:${assignmentId}`;

function readLocalDraft(assignment: StudentTAAssignment): LocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(assignment.id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDraft;
    if (!parsed?.responses || typeof parsed.savedAt !== "string") return null;

    const remoteSavedAt = assignment.response_saved_at
      ? new Date(assignment.response_saved_at).getTime()
      : 0;
    if (new Date(parsed.savedAt).getTime() <= remoteSavedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalDraft(
  assignmentId: string,
  responses: Record<string, string>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      draftKey(assignmentId),
      JSON.stringify({ responses, savedAt: new Date().toISOString() }),
    );
  } catch {
    // Server saving remains available when browser storage is unavailable.
  }
}

function clearLocalDraft(assignmentId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(assignmentId));
  } catch {
    // Nothing else to clean up.
  }
}

export default function StructuredTAAssignmentWorkspace({ assignment, refresh }: Props) {
  const schema = assignment.response_schema ?? { version: 1 as const, sections: [] };
  const recoveredDraft = React.useMemo(
    () => readLocalDraft(assignment),
    [assignment],
  );
  const [responses, setResponses] = React.useState<Record<string, string>>(
    recoveredDraft?.responses ?? assignment.response_data ?? {},
  );
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [dirty, setDirty] = React.useState(Boolean(recoveredDraft));
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(
    assignment.response_saved_at ?? null,
  );
  const [showRecoveredDraft, setShowRecoveredDraft] = React.useState(
    Boolean(recoveredDraft),
  );
  const activeSaveRef = React.useRef(false);
  const latestResponsesRef = React.useRef(responses);

  React.useEffect(() => {
    const draft = readLocalDraft(assignment);
    setResponses(draft?.responses ?? assignment.response_data ?? {});
    setDirty(Boolean(draft));
    setSaveError(null);
    setLastSavedAt(assignment.response_saved_at ?? null);
    setShowRecoveredDraft(Boolean(draft));
    latestResponsesRef.current = draft?.responses ?? assignment.response_data ?? {};
    // Only reset the editor when the student opens a different assignment.
    // Refreshing this assignment must never replace text they are typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment.id]);

  const completed = assignment.status === "completed";
  const requiredFields = schema.sections.flatMap((section) =>
    section.fields.filter((field) => field.required),
  );
  const missingRequired = requiredFields.filter(
    (field) => !responses[field.id]?.trim(),
  );

  const update = (id: string, value: string) => {
    setResponses((current) => {
      const next = { ...current, [id]: value };
      writeLocalDraft(assignment.id, next);
      latestResponsesRef.current = next;
      return next;
    });
    setDirty(true);
    setSaveError(null);
    setConfirming(false);
  };

  const save = React.useCallback(async (
    nextResponses: Record<string, string>,
    options: { announce?: boolean; refreshAfter?: boolean } = {},
  ) => {
    if (activeSaveRef.current || assignment.status === "completed") return false;
    activeSaveRef.current = true;
    setSaving(true);
    try {
      const result = await saveTAAssignmentResponses(assignment.id, nextResponses);
      if (result.ok) {
        setSaveError(null);
        setLastSavedAt(result.savedAt ?? new Date().toISOString());
        const noNewChanges =
          JSON.stringify(latestResponsesRef.current)
          === JSON.stringify(nextResponses);
        if (noNewChanges) {
          clearLocalDraft(assignment.id);
          setDirty(false);
          setShowRecoveredDraft(false);
        }
        if (options.announce) toast.success("Progress saved");
        if (options.refreshAfter) await refresh();
        return true;
      }

      const message = result.error ?? "Could not save your progress";
      setSaveError(message);
      if (options.announce) toast.error(message);
      return false;
    } finally {
      activeSaveRef.current = false;
      setSaving(false);
    }
  }, [assignment.id, assignment.status, refresh]);

  React.useEffect(() => {
    if (!dirty || completed || saving || submitting) return;
    const timeout = window.setTimeout(() => {
      void save(responses);
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [completed, dirty, responses, save, saving, submitting]);

  const submit = async () => {
    if (missingRequired.length > 0) {
      toast.error(`Complete ${missingRequired.length} required field${missingRequired.length === 1 ? "" : "s"} first`);
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setSubmitting(true);
    const result = await submitTAAssignmentResponses(assignment.id, responses);
    if (result.ok) {
      clearLocalDraft(assignment.id);
      setDirty(false);
      setSaveError(null);
      setShowRecoveredDraft(false);
      toast.success("Homework submitted. Your answer key is now available.");
      await refresh();
    } else {
      const message = result.error ?? "Could not submit your homework";
      setSaveError(message);
      toast.error(message);
    }
    setSubmitting(false);
    setConfirming(false);
  };

  const safeAnswerKey = React.useMemo(
    () => sanitizeClassroomHtml(assignment.answer_key_html ?? ""),
    [assignment.answer_key_html],
  );

  return (
    <section className="classroom-workspace" aria-labelledby="assignment-workspace-title">
      <div className="classroom-workspace-heading">
        <div>
          <div className="classroom-eyebrow">Your work</div>
          <h2 id="assignment-workspace-title">Complete the passage maps</h2>
        </div>
        <div className="classroom-save-state" aria-live="polite">
          {completed
            ? "Submitted"
            : saving
              ? "Saving..."
              : dirty
                ? "Unsaved changes"
                : lastSavedAt
              ? `Saved ${new Date(lastSavedAt).toLocaleString()}`
              : "Not saved yet"}
        </div>
      </div>
      {showRecoveredDraft ? (
        <div className="classroom-draft-notice" role="status">
          We recovered work saved on this device.
        </div>
      ) : null}
      {saveError ? (
        <div className="classroom-save-error" role="alert">
          <strong>Your work is still on this page.</strong>
          <span>{saveError}</span>
        </div>
      ) : null}

      <div className="classroom-workspace-sections">
        {schema.sections.map((section, sectionIndex) => (
          <section className="classroom-workspace-section" key={section.id}>
            <div className="classroom-workspace-section-number">
              {String(sectionIndex + 1).padStart(2, "0")}
            </div>
            <div className="classroom-workspace-section-body">
              <h3>{section.title}</h3>
              {section.instructions ? <p>{section.instructions}</p> : null}
              <div className="classroom-workspace-fields">
                {section.fields.map((field) => (
                  <label className="classroom-workspace-field" key={field.id}>
                    <span>
                      {field.label}
                      {field.required ? <small>Required</small> : null}
                    </span>
                    {field.kind === "short" ? (
                      <input
                        name={field.id}
                        value={responses[field.id] ?? ""}
                        onChange={(event) => update(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        disabled={completed}
                        autoComplete="off"
                      />
                    ) : (
                      <textarea
                        name={field.id}
                        value={responses[field.id] ?? ""}
                        onChange={(event) => update(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows ?? 4}
                        disabled={completed}
                        spellCheck
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      {!completed ? (
        <div className="classroom-workspace-actions">
          <button
            type="button"
            className="classroom-button"
            disabled={saving || submitting}
            onClick={() =>
              void save(responses, { announce: true, refreshAfter: true })
            }
          >
            {saving ? "Saving" : "Save progress"}
          </button>
          <button
            type="button"
            className="classroom-button classroom-button-primary"
            disabled={saving || submitting}
            onClick={() => void submit()}
          >
            {submitting
              ? "Submitting"
              : confirming
                ? "Confirm submission"
                : "Submit and open answer key"}
          </button>
          {confirming ? (
            <p className="classroom-submit-warning">
              Submit only when you are finished. Your responses lock after submission.
            </p>
          ) : null}
        </div>
      ) : null}

      <section className={`classroom-answer-key ${completed ? "is-open" : ""}`}>
        <div className="classroom-eyebrow">Answer key</div>
        {completed ? (
          safeAnswerKey ? (
            <article
              className="classroom-prose"
              dangerouslySetInnerHTML={{ __html: safeAnswerKey }}
            />
          ) : (
            <p>No answer key was attached.</p>
          )
        ) : (
          <p>The answer key is attached. It opens after you submit your homework.</p>
        )}
      </section>
    </section>
  );
}

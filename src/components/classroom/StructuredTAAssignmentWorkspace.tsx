import * as React from "react";
import DOMPurify from "dompurify";
import { toast } from "sonner";
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

export default function StructuredTAAssignmentWorkspace({ assignment, refresh }: Props) {
  const schema = assignment.response_schema ?? { version: 1 as const, sections: [] };
  const [responses, setResponses] = React.useState<Record<string, string>>(
    assignment.response_data ?? {},
  );
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    setResponses(assignment.response_data ?? {});
  }, [assignment.id, assignment.response_data]);

  const completed = assignment.status === "completed";
  const requiredFields = schema.sections.flatMap((section) =>
    section.fields.filter((field) => field.required),
  );
  const missingRequired = requiredFields.filter(
    (field) => !responses[field.id]?.trim(),
  );

  const update = (id: string, value: string) => {
    setResponses((current) => ({ ...current, [id]: value }));
    setConfirming(false);
  };

  const save = async () => {
    setSaving(true);
    const result = await saveTAAssignmentResponses(assignment.id, responses);
    if (result.ok) {
      toast.success("Progress saved");
      await refresh();
    } else {
      toast.error(result.error ?? "Could not save your progress");
    }
    setSaving(false);
  };

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
      toast.success("Homework submitted. Your answer key is now available.");
      await refresh();
    } else {
      toast.error(result.error ?? "Could not submit your homework");
    }
    setSubmitting(false);
    setConfirming(false);
  };

  const safeAnswerKey = React.useMemo(
    () => DOMPurify.sanitize(assignment.answer_key_html ?? ""),
    [assignment.answer_key_html],
  );

  return (
    <section className="classroom-workspace" aria-labelledby="assignment-workspace-title">
      <div className="classroom-workspace-heading">
        <div>
          <div className="classroom-eyebrow">Your work</div>
          <h2 id="assignment-workspace-title">Complete the passage maps</h2>
        </div>
        <div className="classroom-save-state">
          {completed
            ? "Submitted"
            : assignment.response_saved_at
              ? `Saved ${new Date(assignment.response_saved_at).toLocaleString()}`
              : "Not saved yet"}
        </div>
      </div>

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
                        value={responses[field.id] ?? ""}
                        onChange={(event) => update(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        disabled={completed}
                      />
                    ) : (
                      <textarea
                        value={responses[field.id] ?? ""}
                        onChange={(event) => update(field.id, event.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows ?? 4}
                        disabled={completed}
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
            onClick={() => void save()}
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

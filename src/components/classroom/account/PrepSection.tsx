import * as React from "react";
import { Loader2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import { StepField, answerSummary } from "@/components/classroom/onboarding/stepFields";
import {
  STEP_LABELS,
  visibleSteps,
  testDateColumnValue,
  type OnboardingAnswers,
  type OnboardingStepId,
} from "@/lib/onboarding";

/**
 * "Your prep" on the Account page: the answers from the orientation card, laid
 * out so they can be changed later. A test date moves, a target changes, a
 * study week stops matching reality; the card only asks once, so this is where
 * that gets corrected. Same inputs as the card, one row at a time, saved on
 * Save rather than on every keystroke.
 */

export function PrepSectionView({
  answers,
  loading,
  onSave,
  onStartOver,
}: {
  answers: OnboardingAnswers;
  loading: boolean;
  onSave: (next: OnboardingAnswers) => Promise<boolean>;
  /** Wipes the answers so the setup card runs again from the first question. */
  onStartOver?: () => Promise<boolean>;
}) {
  const [editing, setEditing] = React.useState<OnboardingStepId | null>(null);
  const [draft, setDraft] = React.useState<OnboardingAnswers>(answers);
  const [saving, setSaving] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  const startOver = async () => {
    if (!onStartOver) return;
    if (!window.confirm(
      "Start your setup again?\n\nYour answers are cleared and the setup card " +
      "runs from the first question. Your work and your account stay exactly as " +
      "they are.",
    )) return;
    setResetting(true);
    try {
      await onStartOver();
    } finally {
      setResetting(false);
    }
  };

  const startEdit = (step: OnboardingStepId) => {
    setDraft(answers);
    setEditing(step);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (await onSave(draft)) setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="classroom-account-card">
        <header className="classroom-account-card-head">
          <h2>Your prep</h2>
        </header>
        <div className="classroom-skeleton-stack">
          <span className="classroom-skeleton" />
          <span className="classroom-skeleton" />
        </div>
      </section>
    );
  }

  return (
    <section className="classroom-account-card">
      <header className="classroom-account-card-head">
        <h2>Your prep</h2>
      </header>
      <p className="classroom-account-card-note">
        What you told us when you set up your classroom. Change any of it whenever
        it stops being true.
      </p>

      {visibleSteps(answers).map((step) => {
        const summary = answerSummary(step, answers);
        const open = editing === step;
        return (
          <div key={step} className="classroom-account-prep-row">
            <div className="classroom-account-prep-head">
              <div className="classroom-account-pref-copy">
                <span>{STEP_LABELS[step]}</span>
                <small
                  className={summary ? undefined : "classroom-account-prep-empty"}
                >
                  {summary ?? "Not answered yet"}
                </small>
              </div>
              {open ? null : (
                <button
                  type="button"
                  className="classroom-account-icon-button"
                  onClick={() => startEdit(step)}
                  aria-label={`Edit ${STEP_LABELS[step].toLowerCase()}`}
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>

            {open ? (
              <div className="classroom-account-prep-edit">
                <StepField step={step} answers={draft} onChange={setDraft} autoFocus />
                <div className="classroom-account-prep-actions">
                  <button
                    type="button"
                    className="classroom-account-primary-button"
                    onClick={() => void save()}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 size={13} className="classroom-spin" aria-hidden="true" />
                    ) : null}
                    Save
                  </button>
                  <button
                    type="button"
                    className="classroom-account-ghost-button"
                    onClick={() => setEditing(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Editing a row at a time covers a date that moved. Answering the whole
          thing again is a different need - the first pass was rushed, or the
          plan changed underneath it - and there was no way to do it. */}
      {onStartOver ? (
        <div className="classroom-account-prep-reset">
          <button
            type="button"
            className="classroom-account-ghost-button"
            onClick={() => void startOver()}
            disabled={resetting}
          >
            {resetting ? (
              <Loader2 size={13} className="classroom-spin" aria-hidden="true" />
            ) : (
              <RotateCcw size={13} aria-hidden="true" />
            )}
            Start my setup again
          </button>
          <small>
            Clears these answers and runs the setup card from the first question.
            Your work and your account are untouched.
          </small>
        </div>
      ) : null}
    </section>
  );
}

export default function PrepSection() {
  const { user } = useAuth();
  const { setTestDate } = useClassroomLayout();
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding")
        .eq("class_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setAnswers((data?.onboarding as OnboardingAnswers) ?? {});
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = React.useCallback(
    async (next: OnboardingAnswers): Promise<boolean> => {
      if (!user) return false;
      const row: Record<string, unknown> = {
        class_id: user.id,
        onboarding: next as unknown as Json,
      };
      // Same two-home rule as the card: the date also owns a real column, which
      // is what the classroom counts down from.
      if ("test_date" in next) row.test_date = testDateColumnValue(next.test_date);

      const { error } = await supabase
        .from("profiles")
        .upsert(row as never, { onConflict: "class_id" });
      if (error) {
        console.error("[prep] save failed", error);
        toast.error("Could not save that change. Please try again.");
        return false;
      }
      setAnswers(next);
      if ("test_date" in next) setTestDate(testDateColumnValue(next.test_date));
      toast.success("Saved");
      return true;
    },
    [setTestDate, user],
  );

  // Clearing the completion stamp is what makes the card come back: Classroom
  // draws it whenever onboarding_completed_at is null. The notified stamp goes
  // too, so the finished intake mails Joshua the new answers rather than being
  // silently swallowed as a duplicate.
  const startOver = React.useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from("profiles")
      .update({
        onboarding: null,
        onboarding_completed_at: null,
        onboarding_notified_at: null,
      } as never)
      .eq("class_id", user.id);
    if (error) {
      console.error("[prep] start over failed", error);
      toast.error("Could not reset your setup. Please try again.");
      return false;
    }
    setAnswers({});
    toast.success("Your setup is ready to run again");
    // The card is drawn by Classroom, which read the old stamp on mount.
    window.location.assign("/classroom");
    return true;
  }, [user]);

  return (
    <PrepSectionView
      answers={answers}
      loading={loading}
      onSave={save}
      onStartOver={startOver}
    />
  );
}

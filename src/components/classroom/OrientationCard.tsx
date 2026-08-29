import * as React from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import { StepField } from "@/components/classroom/onboarding/stepFields";
import {
  NAME_STEP_COPY,
  REQUIRED_STEPS,
  STEP_COPY,
  STEP_ORDER,
  isStepAnswered,
  testDateColumnValue,
  type OnboardingAnswers,
  type OnboardingStepId,
} from "@/lib/onboarding";

/**
 * The orientation card: the classroom's own setup walkthrough, and the only
 * place the intake runs.
 *
 * Signing up does not redirect anyone into a separate flow. A new student lands
 * in the classroom, finds this card sitting at the top of Home, and has to open
 * it and click through it. Every Continue writes that step's answer to their
 * profile, so a card left half-finished resumes on the next visit. Finishing
 * sets profiles.onboarding_completed_at and the card is gone for good.
 */

/** The name step runs first, then the shared intake order. */
type CardStep = "name" | OnboardingStepId;

export const ORIENTATION_STEPS: CardStep[] = ["name", ...STEP_ORDER];

export interface OrientationSavePatch {
  name?: string;
  answers?: OnboardingAnswers;
  /** Set on the last step: writes the one-time completion gate. */
  complete?: boolean;
}

/** How many steps the student has already answered, for the collapsed summary. */
export function answeredCount(name: string, answers: OnboardingAnswers): number {
  const intake = STEP_ORDER.filter((step) => isStepAnswered(step, answers)).length;
  return (name.trim() ? 1 : 0) + intake;
}

/** The first step still owed, so an interrupted card reopens in the right place. */
export function firstUnansweredStep(name: string, answers: OnboardingAnswers): number {
  if (!name.trim()) return 0;
  const index = STEP_ORDER.findIndex(
    (step) => REQUIRED_STEPS[step] && !isStepAnswered(step, answers),
  );
  return index === -1 ? ORIENTATION_STEPS.length - 1 : index + 1;
}

/**
 * Presentational half: owns the step cursor and the in-progress answers, and
 * hands each completed step back through `onSave`. Split out so the whole
 * walkthrough can be driven in a test without an authenticated session.
 */
export function OrientationCardView({
  initialName,
  initialAnswers,
  onSave,
}: {
  initialName: string;
  initialAnswers: OnboardingAnswers;
  onSave: (patch: OrientationSavePatch) => Promise<boolean>;
}) {
  // Incomplete setup is the first job on Home. Open it immediately instead of
  // making a new student discover and expand a collapsed invitation.
  const [open, setOpen] = React.useState(true);
  const [finished, setFinished] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(() =>
    firstUnansweredStep(initialName, initialAnswers),
  );
  const [name, setName] = React.useState(initialName);
  const [answers, setAnswers] = React.useState<OnboardingAnswers>(initialAnswers);

  const total = ORIENTATION_STEPS.length;
  const step = ORIENTATION_STEPS[stepIndex];
  const isLastStep = stepIndex === total - 1;
  const done = answeredCount(name, answers);

  const canContinue = (): boolean => {
    if (step === "name") return !!name.trim();
    if (!REQUIRED_STEPS[step]) return true;
    return isStepAnswered(step, answers);
  };

  const goNext = async () => {
    setSaving(true);
    try {
      if (step === "name") {
        if (!(await onSave({ name: name.trim() }))) return;
        setStepIndex(1);
        return;
      }
      const nextAnswers = answers;
      if (!(await onSave({ answers: nextAnswers, complete: isLastStep }))) return;
      setAnswers(nextAnswers);
      if (isLastStep) {
        setFinished(true);
        return;
      }
      setStepIndex((index) => index + 1);
    } finally {
      setSaving(false);
    }
  };

  if (finished) {
    return (
      <section className="classroom-orientation" aria-label="Set up your classroom">
        <div className="classroom-orientation-done">
          <span className="classroom-orientation-done-mark" aria-hidden="true">
            <Check size={16} />
          </span>
          <div>
            <h2>You're set up</h2>
            <p>
              Joshua has what he needs to build your plan. Your to-do list is right
              below.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!open) {
    return (
      <section className="classroom-orientation" aria-label="Set up your classroom">
        <div className="classroom-orientation-intro">
          <div className="classroom-orientation-intro-text">
            <span className="classroom-orientation-eyebrow">Start here</span>
            <h2>Set up your classroom</h2>
            <p>
              {total} quick questions about you, your target, and your week. Joshua
              builds your plan from these answers, so they're worth two minutes.
            </p>
          </div>
          <div className="classroom-orientation-intro-action">
            {done ? (
              <span className="classroom-orientation-tally">
                {done} of {total} answered
              </span>
            ) : null}
            <button
              type="button"
              className="classroom-button classroom-button-primary"
              onClick={() => {
                setStepIndex(firstUnansweredStep(name, answers));
                setOpen(true);
              }}
            >
              {done ? "Pick up where you left off" : "Start setup"}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="classroom-orientation" aria-label="Set up your classroom">
      <header className="classroom-orientation-header">
        <h2>Set up your classroom</h2>
        <span className="classroom-orientation-tally">
          Step {stepIndex + 1} of {total}
        </span>
      </header>

      <div
        className="classroom-orientation-progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={stepIndex + 1}
      >
        <span style={{ width: `${((stepIndex + 1) / total) * 100}%` }} />
      </div>

      <div className="classroom-orientation-step">
        <h3>{step === "name" ? NAME_STEP_COPY.title : STEP_COPY[step].title}</h3>
        {(step === "name" ? NAME_STEP_COPY.subtitle : STEP_COPY[step].subtitle) ? (
          <p className="classroom-orientation-sub">
            {step === "name" ? NAME_STEP_COPY.subtitle : STEP_COPY[step].subtitle}
          </p>
        ) : null}

        {step === "name" ? (
          <input
            className="classroom-orientation-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            maxLength={50}
            aria-label="Your name"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && canContinue() && !saving) void goNext();
            }}
          />
        ) : (
          <StepField
            key={step}
            step={step}
            answers={answers}
            onChange={setAnswers}
            autoFocus
          />
        )}
      </div>

      <div className="classroom-orientation-nav">
        {stepIndex > 0 ? (
          <button
            type="button"
            className="classroom-orientation-back"
            disabled={saving}
            onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          >
            <ArrowLeft size={14} /> Go back
          </button>
        ) : null}
        <span className="classroom-orientation-nav-spacer" />
        <button
          type="button"
          className="classroom-button classroom-button-primary"
          disabled={saving || !canContinue()}
          onClick={() => void goNext()}
        >
          {isLastStep ? "Finish" : "Continue"}
          <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

/**
 * Live half: reads the profile once, then writes each step as it is answered.
 * Renders nothing at all once onboarding_completed_at is set.
 */
export default function OrientationCard() {
  const { user } = useAuth();
  const { setDisplayName, setTestDate } = useClassroomLayout();
  const [loaded, setLoaded] = React.useState(false);
  const [completed, setCompleted] = React.useState(true);
  const [name, setName] = React.useState("");
  const [answers, setAnswers] = React.useState<OnboardingAnswers>({});

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, onboarding, onboarding_completed_at")
        .eq("class_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // A failed read must not plant a card on top of an onboarded student's
      // home, so anything other than a clean "not completed" stays hidden.
      if (error) {
        setLoaded(true);
        return;
      }
      setName(data?.display_name ?? "");
      setAnswers((data?.onboarding as OnboardingAnswers) ?? {});
      setCompleted(!!data?.onboarding_completed_at);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = React.useCallback(
    async (patch: OrientationSavePatch): Promise<boolean> => {
      if (!user) return false;
      const row: Record<string, unknown> = { class_id: user.id };

      if (patch.name !== undefined) row.display_name = patch.name;
      if (patch.answers) {
        row.onboarding = patch.answers as unknown as Json;
        // The test date also owns a real column: the classroom dateline counts
        // down from it, so the blob alone would leave the countdown blind.
        if ("test_date" in patch.answers) {
          row.test_date = testDateColumnValue(patch.answers.test_date);
        }
      }
      if (patch.complete) row.onboarding_completed_at = new Date().toISOString();

      const { error } = await supabase
        .from("profiles")
        .upsert(row as never, { onConflict: "class_id" });
      if (error) {
        console.error("[orientation] save failed", error);
        toast.error("Something went wrong saving your answer. Please try again.");
        return false;
      }

      // Reflect the two fields the surrounding classroom already renders, so
      // the greeting and the countdown update without a reload.
      if (patch.name !== undefined) {
        setDisplayName(patch.name);
        void supabase.auth.updateUser({ data: { display_name: patch.name } });
      }
      if (patch.answers && "test_date" in patch.answers) {
        setTestDate(testDateColumnValue(patch.answers.test_date));
      }

      // Finishing the intake mails Joshua the answers. Deliberately not awaited
      // and never surfaced: the student's card is done either way, and the
      // function stamps the profile so a closed tab is picked up by the sweep
      // instead of double-sending.
      if (patch.complete) {
        void supabase.functions
          .invoke("onboarding-intake-notify", { body: {} })
          .catch((error) => console.error("[orientation] intake notify failed", error));
      }
      return true;
    },
    [setDisplayName, setTestDate, user],
  );

  if (!loaded || completed) return null;

  return (
    <OrientationCardView initialName={name} initialAnswers={answers} onSave={save} />
  );
}

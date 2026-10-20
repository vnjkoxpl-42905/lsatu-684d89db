import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useClassroomLayout } from "@/components/classroom/shell/classroomLayoutContext";
import { StepField } from "@/components/classroom/onboarding/stepFields";
import {
  NAME_STEP_COPY,
  REQUIRED_STEPS,
  STEP_COPY,
  STEP_ORDER,
  visibleSteps,
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

/** The steps this student walks, which is the full list minus anything their
 *  own answers make irrelevant (today: the score step, for someone who has not
 *  sat the test). */
export function cardSteps(answers: OnboardingAnswers): CardStep[] {
  return ["name", ...visibleSteps(answers)];
}

export interface OrientationSavePatch {
  name?: string;
  answers?: OnboardingAnswers;
  /** Set on the last step: writes the one-time completion gate. */
  complete?: boolean;
}

/** How many steps the student has already answered, for the collapsed summary. */
export function answeredCount(name: string, answers: OnboardingAnswers): number {
  const intake = visibleSteps(answers).filter((step) => isStepAnswered(step, answers)).length;
  return (name.trim() ? 1 : 0) + intake;
}

/** The first step still owed, so an interrupted card reopens in the right place. */
export function firstUnansweredStep(name: string, answers: OnboardingAnswers): number {
  if (!name.trim()) return 0;
  const steps = visibleSteps(answers);
  const index = steps.findIndex(
    (step) => REQUIRED_STEPS[step] && !isStepAnswered(step, answers),
  );
  return index === -1 ? steps.length : index + 1;
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
  onDone,
  startCollapsed = false,
}: {
  initialName: string;
  initialAnswers: OnboardingAnswers;
  onSave: (patch: OrientationSavePatch) => Promise<boolean>;
  /** Opens on the invitation rather than the first question. The full-stage
   *  intake starts here so a new student chooses to begin. */
  startCollapsed?: boolean;
  /** Rendered as the way out of the done panel. Omitted inline on Home, where
   *  the card simply disappears on the next load. */
  onDone?: () => void;
}) {
  // Incomplete setup is the first job on Home. Open it immediately instead of
  // making a new student discover and expand a collapsed invitation.
  const [open, setOpen] = React.useState(!startCollapsed);
  const [finished, setFinished] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(() =>
    firstUnansweredStep(initialName, initialAnswers),
  );
  const [name, setName] = React.useState(initialName);
  const [answers, setAnswers] = React.useState<OnboardingAnswers>(initialAnswers);

  // Recomputed from the live answers: saying "not yet" to the LSAT question
  // removes the score step from the walk on the spot, counter included.
  const steps = cardSteps(answers);
  const total = steps.length;
  const step = steps[Math.min(stepIndex, total - 1)];
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
              Joshua has what he needs to build your plan. The next move is a
              session: that is where the plan gets made and where the rest of
              the classroom opens up.
            </p>
            {/* Booking leads. Finishing the intake is the moment a student is
                most willing to book, and sending them into a classroom whose
                doors are still locked wastes it. No arrow on the link: it is a
                destination, not a step in a flow. */}
            <div className="classroom-orientation-done-actions">
              {/* The offer hub, not the single-session page: a student who
                  just finished the intake should see all three ways in (one
                  session, 5 hours, 10 hours) and pick, rather than being
                  committed to the cheapest one by the only link on the page. */}
              <Link className="classroom-orientation-continue" to="/booking">
                Book a session
              </Link>
              {onDone ? (
                <button
                  type="button"
                  className="classroom-orientation-continue-quiet"
                  onClick={onDone}
                >
                  Back to home
                </button>
              ) : null}
            </div>
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
 *
 * Exposed as a hook because the intake owns the whole stage while it is
 * unfinished — Classroom has to know whether to draw the home at all, and that
 * decision cannot live inside a card that renders itself.
 */
export function useOrientation() {
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

  return { loaded, completed, setCompleted, name, answers, save };
}

/** The inline card, for any surface that wants it as one block among many. */
export default function OrientationCard() {
  const { loaded, completed, name, answers, save } = useOrientation();
  if (!loaded || completed) return null;
  return (
    <OrientationCardView initialName={name} initialAnswers={answers} onSave={save} />
  );
}

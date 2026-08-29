import * as React from "react";
import { Check, Clock3, Search, X } from "lucide-react";
import {
  DAYS,
  DEFAULT_STUDY_TIME,
  LAST_SCORE_EXTRAS,
  LIFE_STAGES,
  SCORE_BANDS,
  STUDY_TIME_OPTIONS,
  TARGET_SCORE_EXTRAS,
  UNDECIDED_TEST_DATE,
  type DayKey,
  type LastScoreValue,
  type LifeStage,
  type OnboardingAnswers,
  type OnboardingStepId,
  type StudyTimeValue,
  type TargetScoreValue,
} from "@/lib/onboarding";

/**
 * The intake inputs, owned in one place.
 *
 * Two surfaces render them: the orientation card, where a new student answers
 * them one step at a time, and the Account page, where they can change an
 * answer later. Keeping the controls here is what stops those two from drifting
 * into different versions of the same question.
 */

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`classroom-orientation-chip${
        selected ? " classroom-orientation-chip-on" : ""
      }`}
    >
      {children}
    </button>
  );
}

function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | undefined,
) {
  return options.find((option) => option.value === value)?.label ?? null;
}

/** How an answered step reads back on the Account page. Null means unanswered. */
export function answerSummary(
  step: OnboardingStepId,
  answers: OnboardingAnswers,
): string | null {
  switch (step) {
    case "taken_lsat":
      if (typeof answers.has_taken_lsat !== "boolean") return null;
      return answers.has_taken_lsat ? "Yes" : "Not yet";
    case "last_score":
      return labelFor([...SCORE_BANDS, ...LAST_SCORE_EXTRAS], answers.last_score_band);
    case "experience":
      return answers.experience_text?.trim() || null;
    case "schools":
      return answers.schools?.length ? answers.schools.join(", ") : null;
    case "target_score":
      return labelFor([...SCORE_BANDS, ...TARGET_SCORE_EXTRAS], answers.target_score_band);
    case "test_date": {
      if (!answers.test_date) return null;
      if (answers.test_date === UNDECIDED_TEST_DATE) return "No date picked yet";
      const [year, month, day] = answers.test_date.split("-").map(Number);
      return new Intl.DateTimeFormat("en-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(year, month - 1, day));
    }
    case "life_stage":
      return LIFE_STAGES.find((o) => o.value === answers.life_stage)?.title ?? null;
    case "study_time": {
      if (!answers.study_time) return null;
      const days = DAYS.filter((d) => answers.study_time![d.key as DayKey] !== "none");
      if (!days.length) return "No study time set";
      return `${days.length} day${days.length === 1 ? "" : "s"} a week`;
    }
    default:
      return null;
  }
}

/**
 * One step's input. Emits the whole next answers object so a caller can save it
 * verbatim without knowing which field the step writes.
 */
export function StepField({
  step,
  answers,
  onChange,
  autoFocus,
}: {
  step: OnboardingStepId;
  answers: OnboardingAnswers;
  onChange: (next: OnboardingAnswers) => void;
  autoFocus?: boolean;
}) {
  const [schoolInput, setSchoolInput] = React.useState("");

  const set = <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K],
  ) => onChange({ ...answers, [key]: value });

  const addSchool = () => {
    const value = schoolInput.trim();
    if (!value) return;
    const current = answers.schools ?? [];
    if (current.length >= 5 || current.includes(value)) {
      setSchoolInput("");
      return;
    }
    set("schools", [...current, value]);
    setSchoolInput("");
  };

  if (step === "taken_lsat") {
    return (
      <div className="classroom-orientation-chips">
        <Chip
          selected={answers.has_taken_lsat === true}
          onClick={() => set("has_taken_lsat", true)}
        >
          Yes, I have taken it
        </Chip>
        <Chip
          selected={answers.has_taken_lsat === false}
          // Answering no drops the score they never got. Leaving a stale band
          // behind would put a score in Joshua's intake for someone who has
          // never sat the test.
          onClick={() => onChange({ ...answers, has_taken_lsat: false, last_score_band: undefined })}
        >
          Not yet
        </Chip>
      </div>
    );
  }

  if (step === "last_score") {
    return (
      <div className="classroom-orientation-chips">
        {[...SCORE_BANDS, ...LAST_SCORE_EXTRAS].map((option) => (
          <Chip
            key={option.value}
            selected={answers.last_score_band === option.value}
            onClick={() => set("last_score_band", option.value as LastScoreValue)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    );
  }

  if (step === "experience") {
    return (
      <textarea
        className="classroom-orientation-input classroom-orientation-textarea"
        value={answers.experience_text ?? ""}
        onChange={(event) => set("experience_text", event.target.value)}
        placeholder="Reading Comp timing is my problem, and Necessary Assumption questions still trip me up."
        rows={4}
        autoFocus={autoFocus}
        aria-label="How your LSAT experience has been"
      />
    );
  }

  if (step === "schools") {
    return (
      <>
        <div className="classroom-orientation-search">
          <Search size={15} aria-hidden="true" />
          <input
            className="classroom-orientation-input"
            value={schoolInput}
            onChange={(event) => setSchoolInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addSchool();
              }
            }}
            placeholder="Type a school, press Enter"
            aria-label="Add a school"
            autoFocus={autoFocus}
            disabled={(answers.schools ?? []).length >= 5}
          />
        </div>
        <p className="classroom-orientation-hint">Add up to 5 schools.</p>
        <div className="classroom-orientation-list">
          {(answers.schools ?? []).map((school, index) => (
            <div key={school} className="classroom-orientation-list-row">
              <span className="classroom-orientation-list-index">{index + 1}</span>
              <span className="classroom-orientation-list-label">{school}</span>
              <button
                type="button"
                onClick={() =>
                  set(
                    "schools",
                    (answers.schools ?? []).filter((entry) => entry !== school),
                  )
                }
                aria-label={`Remove ${school}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (step === "target_score") {
    return (
      <div className="classroom-orientation-chips">
        {[...SCORE_BANDS, ...TARGET_SCORE_EXTRAS].map((option) => (
          <Chip
            key={option.value}
            selected={answers.target_score_band === option.value}
            onClick={() => set("target_score_band", option.value as TargetScoreValue)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    );
  }

  if (step === "test_date") {
    return (
      <>
        <input
          type="date"
          className="classroom-orientation-input classroom-orientation-date"
          value={
            answers.test_date && answers.test_date !== UNDECIDED_TEST_DATE
              ? answers.test_date
              : ""
          }
          onChange={(event) => set("test_date", event.target.value || undefined)}
          autoFocus={autoFocus}
          aria-label="Your test date"
        />
        <div className="classroom-orientation-chips">
          <Chip
            selected={answers.test_date === UNDECIDED_TEST_DATE}
            onClick={() => set("test_date", UNDECIDED_TEST_DATE)}
          >
            I haven't picked a date yet
          </Chip>
        </div>
      </>
    );
  }

  if (step === "life_stage") {
    return (
      <div className="classroom-orientation-cards">
        {LIFE_STAGES.map((option) => {
          const selected = answers.life_stage === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => set("life_stage", option.value as LifeStage)}
              className={`classroom-orientation-choice${
                selected ? " classroom-orientation-choice-on" : ""
              }`}
            >
              <span className="classroom-orientation-choice-title">{option.title}</span>
              <span className="classroom-orientation-choice-desc">{option.desc}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="classroom-availability">
      <div className="classroom-availability-note">
        <Clock3 size={17} aria-hidden="true" />
        <div>
          <strong>Make this honest, not ambitious.</strong>
          <span>Days you leave blank will be treated as unavailable. You can change this later.</span>
        </div>
      </div>

      <div className="classroom-orientation-week" aria-label="Weekly LSAT availability">
        {DAYS.map((day) => {
          const current = answers.study_time?.[day.key as DayKey];
          const currentLabel = current
            ? STUDY_TIME_OPTIONS.find((option) => option.value === current)?.label
            : "Not set";
          return (
            <section
              key={day.key}
              className={`classroom-orientation-day${
                current && current !== "none" ? " classroom-orientation-day-on" : ""
              }`}
            >
              <div className="classroom-orientation-day-head">
                <span className="classroom-orientation-day-label">{day.label}</span>
                <span className="classroom-orientation-day-value">{currentLabel}</span>
              </div>
              <div className="classroom-orientation-day-meter" aria-hidden="true">
                <span data-level={current ?? "unset"} />
              </div>
              <div className="classroom-orientation-day-options">
                {STUDY_TIME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={current === option.value}
                    aria-label={`${day.label}: ${option.label}`}
                    onClick={() =>
                      set("study_time", {
                        ...DEFAULT_STUDY_TIME,
                        ...(answers.study_time ?? {}),
                        [day.key]: option.value as StudyTimeValue,
                      })
                    }
                    className={`classroom-orientation-slot${
                      current === option.value ? " classroom-orientation-slot-on" : ""
                    }`}
                  >
                    {current === option.value ? <Check size={12} aria-hidden="true" /> : null}
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {answers.study_time ? (
        <p className="classroom-availability-summary" aria-live="polite">
          <strong>
            {DAYS.filter((day) => answers.study_time?.[day.key] !== "none").length}
          </strong>{" "}
          study days in your week
        </p>
      ) : (
        <p className="classroom-availability-summary classroom-availability-summary-empty">
          Choose the time you can protect on at least one day, or mark a day as no time.
        </p>
      )}
    </div>
  );
}

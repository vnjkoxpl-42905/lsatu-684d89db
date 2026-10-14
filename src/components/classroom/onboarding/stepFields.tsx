import * as React from "react";
import { Check, Clock3, Plus, Search, X } from "lucide-react";
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
import {
  registrationClosed,
  upcomingAdministrations,
} from "@/data/lsatAdministrations";
import { searchLawSchools } from "@/data/lawSchools";

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

  const addSchool = (name?: string) => {
    const value = (name ?? schoolInput).trim();
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
    const chosen = answers.schools ?? [];
    const full = chosen.length >= 5;
    // Suggestions come from the real list, but the field never refuses a name
    // it does not know: a school missing from our data must not cost a student
    // their answer.
    const suggestions = full
      ? []
      : searchLawSchools(schoolInput).filter((school) => !chosen.includes(school.name));
    const typedIsNew =
      suggestions.length === 0 &&
      schoolInput.trim().length > 2 &&
      !chosen.includes(schoolInput.trim());

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
                // Enter takes the top suggestion when there is one, so the
                // common case never needs the mouse.
                addSchool(suggestions[0]?.name);
              }
            }}
            placeholder="Start typing a law school"
            aria-label="Search law schools"
            autoFocus={autoFocus}
            disabled={full}
          />
          {/* Clicking a suggestion and pressing Enter both add, but neither is
              visible: a student who typed a name and stopped needs a button to
              press. It takes the top match, or their own words when the list
              has nothing. */}
          <button
            type="button"
            className="classroom-orientation-add"
            onClick={() => addSchool(suggestions[0]?.name)}
            disabled={full || schoolInput.trim().length < 2}
            aria-label="Add this school"
          >
            <Plus size={14} aria-hidden="true" />
            Add
          </button>
        </div>

        {suggestions.length > 0 || typedIsNew ? (
          <ul className="classroom-orientation-suggestions" aria-label="Matching law schools">
            {suggestions.map((school) => (
              <li key={school.name}>
                <button type="button" onClick={() => addSchool(school.name)}>
                  <span className="classroom-orientation-suggestion-name">{school.name}</span>
                  <span className="classroom-orientation-suggestion-region">{school.region}</span>
                  <Plus size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
            {typedIsNew ? (
              <li>
                <button type="button" onClick={() => addSchool()}>
                  <span className="classroom-orientation-suggestion-name">
                    Add "{schoolInput.trim()}"
                  </span>
                  <Plus size={14} aria-hidden="true" />
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}

        <p className="classroom-orientation-hint">
          {full ? "That's five. Remove one to add another." : "Add up to 5 schools."}
        </p>
        <div className="classroom-orientation-list">
          {chosen.map((school, index) => (
            <div key={school} className="classroom-orientation-list-row">
              <span className="classroom-orientation-list-index">{index + 1}</span>
              <span className="classroom-orientation-list-label">{school}</span>
              <button
                type="button"
                onClick={() =>
                  set(
                    "schools",
                    chosen.filter((entry) => entry !== school),
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
    // Real LSAC sittings, not a free date field: a student typing 2026-11-15
    // was picking a day the LSAT is not given, and the countdown then paced
    // their week to a date that does not exist.
    const sittings = upcomingAdministrations();
    return (
      <>
        <div className="classroom-orientation-chips">
          {sittings.map((sitting) => (
            <Chip
              key={sitting.date}
              selected={answers.test_date === sitting.date}
              onClick={() => set("test_date", sitting.date)}
            >
              {sitting.label}
              <small className="classroom-orientation-chip-note">
                {sitting.window}
                {registrationClosed(sitting) ? " · registration closed" : ""}
              </small>
            </Chip>
          ))}
          <Chip
            selected={answers.test_date === UNDECIDED_TEST_DATE}
            onClick={() => set("test_date", UNDECIDED_TEST_DATE)}
          >
            I haven't picked a date yet
          </Chip>
        </div>
        {/* A student who already sat down with a date outside the published
            calendar keeps it rather than being silently re-asked. */}
        {answers.test_date &&
        answers.test_date !== UNDECIDED_TEST_DATE &&
        !sittings.some((sitting) => sitting.date === answers.test_date) ? (
          <p className="classroom-orientation-hint">
            Currently set to {answers.test_date}. Pick a sitting above to change it.
          </p>
        ) : null}
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

      {/* The week reads as a bar chart the student builds by clicking: each
          day is a column of four segments, tallest at the top, and the filled
          height is the time they can protect. The control and the picture are
          the same object, so the shape of an honest week is visible while they
          are still deciding it. */}
      <div className="classroom-orientation-week" aria-label="Weekly LSAT availability">
        {/* The scale, so a height means something. Without it the columns were
            four anonymous blocks and the student had to guess the units. */}
        <div className="classroom-orientation-scale" aria-hidden="true">
          {[...STUDY_TIME_OPTIONS].reverse().map((option) => (
            <span key={option.value}>{option.label}</span>
          ))}
        </div>
        {DAYS.map((day) => {
          const current = answers.study_time?.[day.key as DayKey];
          const level = STUDY_TIME_OPTIONS.findIndex((option) => option.value === current);
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
              <div className="classroom-orientation-bar">
                {[...STUDY_TIME_OPTIONS].reverse().map((option) => {
                  const index = STUDY_TIME_OPTIONS.findIndex((o) => o.value === option.value);
                  // Everything up to the chosen level is filled, so the column
                  // reads as one bar rather than four separate switches.
                  const filled = level > 0 && index > 0 && index <= level;
                  const chosen = current === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={chosen}
                      aria-label={`${day.label}: ${option.label}`}
                      title={`${day.label}: ${option.label}`}
                      onClick={() =>
                        set("study_time", {
                          ...DEFAULT_STUDY_TIME,
                          ...(answers.study_time ?? {}),
                          [day.key]: option.value as StudyTimeValue,
                        })
                      }
                      className={[
                        "classroom-orientation-segment",
                        option.value === "none" ? "classroom-orientation-segment-off" : "",
                        filled ? "classroom-orientation-segment-filled" : "",
                        chosen ? "classroom-orientation-segment-on" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {option.value === "none" && chosen ? (
                        <Check size={11} aria-hidden="true" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="classroom-orientation-day-head">
                <span className="classroom-orientation-day-label">{day.label}</span>
                <span className="classroom-orientation-day-value">{currentLabel}</span>
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

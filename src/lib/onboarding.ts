// Shared onboarding constants + types. See ONBOARDING-SPEC.md.
//
// The onboarding intake is a one-time flow (gate: profiles.onboarding_completed_at)
// whose answers persist to profiles.onboarding (jsonb). Steps 1 and 4 share one
// score-band enum; steps 2 and 3 are optional; step 6 is defaulted.

// ── Score bands (shared by "last LSAT" and "target" steps) ──────────────────
export const SCORE_BANDS = [
  { value: 'lte_150', label: '150 & below' },
  { value: '151_155', label: '151–155' },
  { value: '156_160', label: '156–160' },
  { value: '161_165', label: '161–165' },
  { value: '166_170', label: '166–170' },
  { value: '171_175', label: '171–175' },
  { value: '176_180', label: '176–180' },
] as const;

export type ScoreBand = (typeof SCORE_BANDS)[number]['value'];

// Per-field extras appended after the shared bands.
export const LAST_SCORE_EXTRAS = [
  { value: 'not_taken', label: "I haven't taken the LSAT yet" },
  { value: 'not_sure', label: "I'm not sure" },
] as const;

export const TARGET_SCORE_EXTRAS = [
  { value: 'not_sure', label: "I'm not sure yet" },
] as const;

export type LastScoreValue = ScoreBand | 'not_taken' | 'not_sure';
export type TargetScoreValue = ScoreBand | 'not_sure';

// ── Life stage (step 5) ─────────────────────────────────────────────────────
export const LIFE_STAGES = [
  { value: 'undergraduate', title: 'Undergraduate', desc: "Currently pursuing a bachelor's degree" },
  { value: 'graduate', title: 'Graduate', desc: 'Pursuing or completed a graduate degree' },
  { value: 'working', title: 'Working', desc: 'Currently employed full or part-time' },
  { value: 'other', title: 'All Other Cases', desc: 'None of the above apply to me' },
] as const;

export type LifeStage = (typeof LIFE_STAGES)[number]['value'];

// ── Study time per day (step 6) ─────────────────────────────────────────────
export const STUDY_TIME_OPTIONS = [
  { value: 'none', label: 'No time' },
  { value: 'lt_1', label: '< 1 hr' },
  { value: '1_2', label: '1–2 hrs' },
  { value: '3_plus', label: '3+ hrs' },
] as const;

export type StudyTimeValue = (typeof STUDY_TIME_OPTIONS)[number]['value'];

export const DAYS = [
  { key: 'sun', label: 'Sun' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
] as const;

export type DayKey = (typeof DAYS)[number]['key'];

export const DEFAULT_STUDY_TIME: Record<DayKey, StudyTimeValue> = {
  sun: '1_2', mon: '1_2', tue: '1_2', wed: '1_2', thu: '1_2', fri: '1_2', sat: '1_2',
};

// ── The stored answer shape (profiles.onboarding) ───────────────────────────
export interface OnboardingAnswers {
  last_score_band?: LastScoreValue;
  experience_text?: string;
  schools?: string[];
  target_score_band?: TargetScoreValue;
  life_stage?: LifeStage;
  study_time?: Record<DayKey, StudyTimeValue>;
}

// The six intake steps (name is step 0, handled before these). Order is locked
// to the approved reference. `key` maps to the step index used for resume.
export type OnboardingStepId =
  | 'last_score'
  | 'experience'
  | 'schools'
  | 'target_score'
  | 'life_stage'
  | 'study_time';

// Which answer field each step fills. Used to compute the first unanswered step
// on resume. Steps whose field is optional never block resume-completion.
export const STEP_ORDER: OnboardingStepId[] = [
  'last_score',
  'experience',
  'schools',
  'target_score',
  'life_stage',
  'study_time',
];

// Required steps gate the "first unanswered step" on resume. Optional steps
// (experience, schools) are skippable within the flow without blocking.
export const REQUIRED_STEPS: Record<OnboardingStepId, boolean> = {
  last_score: true,
  experience: false,
  schools: false,
  target_score: true,
  life_stage: true,
  study_time: true, // defaulted, so effectively always satisfiable
};

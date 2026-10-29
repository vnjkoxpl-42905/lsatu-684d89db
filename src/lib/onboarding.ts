// Shared onboarding constants + types. See ONBOARDING-SPEC.md.
//
// The onboarding intake is a one-time flow (gate: profiles.onboarding_completed_at)
// whose answers persist to profiles.onboarding (jsonb). Two steps share one
// score-band enum; experience and schools are optional; study time is defaulted.
//
// The intake runs inside the classroom's orientation card (OrientationCard),
// never as a redirect: a new signup lands in the classroom and has to open the
// card and click through it. Each Continue writes that step's answer, so a
// half-finished card resumes where it left off.

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
// "Haven't taken it" is no longer an option here: the taken_lsat step asks that
// first and skips this step entirely, so the question is never put to someone it
// does not apply to. The stored value survives for students who answered it
// under the old flow.
export const LAST_SCORE_EXTRAS = [
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
  sun: 'none', mon: 'none', tue: 'none', wed: 'none', thu: 'none', fri: 'none', sat: 'none',
};

// ── Test date (asked right after the target score) ──────────────────────────
// Stored twice on purpose: the ISO date lands in the real `profiles.test_date`
// column (the classroom dateline counts down from it), and a copy lives in the
// answers blob so "have they answered this step?" stays a single read. A
// student who has not registered yet picks UNDECIDED_TEST_DATE, which answers
// the step while leaving the column null — no invented date.
export const UNDECIDED_TEST_DATE = 'undecided';

export type TestDateValue = string; // 'YYYY-MM-DD' | typeof UNDECIDED_TEST_DATE

/** The value written to profiles.test_date: a real date, or null when undecided. */
export function testDateColumnValue(value: TestDateValue | undefined): string | null {
  if (!value || value === UNDECIDED_TEST_DATE) return null;
  return value;
}

// ── The stored answer shape (profiles.onboarding) ───────────────────────────
export interface OnboardingAnswers {
  has_taken_lsat?: boolean;
  last_score_band?: LastScoreValue;
  experience_text?: string;
  schools?: string[];
  target_score_band?: TargetScoreValue;
  test_date?: TestDateValue;
  life_stage?: LifeStage;
  study_time?: Record<DayKey, StudyTimeValue>;
}

// The intake steps (name is step 0, handled before these). Order is locked to
// the approved reference, with the test date slotted in after the target score
// so the three "where are you headed" questions sit together.
export type OnboardingStepId =
  | 'taken_lsat'
  | 'last_score'
  | 'experience'
  | 'schools'
  | 'target_score'
  | 'test_date'
  | 'life_stage'
  | 'study_time';

// Which answer field each step fills. Used to compute the first unanswered step
// on resume. Steps whose field is optional never block resume-completion.
export const STEP_ORDER: OnboardingStepId[] = [
  'taken_lsat',
  'last_score',
  'experience',
  'schools',
  'target_score',
  'test_date',
  'life_stage',
  'study_time',
];

// Required steps gate the "first unanswered step" on resume. Optional steps
// (experience, schools) are skippable within the flow without blocking.
export const REQUIRED_STEPS: Record<OnboardingStepId, boolean> = {
  taken_lsat: true,
  last_score: true,
  experience: false,
  schools: false,
  target_score: true,
  test_date: true, // answerable as "no date yet", so never a dead end
  life_stage: true,
  study_time: true, // defaulted, so effectively always satisfiable
};

// ── Copy ────────────────────────────────────────────────────────────────────
// One home for every headline the intake shows, so the card and any future
// surface cannot drift into two versions of the same question.
export const NAME_STEP_COPY = {
  title: 'What should we call you?',
  subtitle: 'This is the name your classroom and Joshua will use.',
};

export const STEP_COPY: Record<OnboardingStepId, { title: string; subtitle?: string }> = {
  taken_lsat: {
    title: 'Have you taken the LSAT?',
    subtitle: 'An official, scored test. Practice tests do not count here.',
  },
  last_score: {
    title: 'What did you get on your last LSAT?',
    subtitle: 'This sets your starting point.',
  },
  experience: {
    title: 'How has your LSAT experience been so far?',
    subtitle:
      'Share what has felt easy and what has felt hard so we can personalize your plan.',
  },
  schools: {
    title: 'What schools are you interested in?',
    subtitle: "We'll build your experience with LSAT U around getting into these schools.",
  },
  target_score: {
    title: 'What score are you aiming for?',
    subtitle: 'This helps us set the right pace for your prep.',
  },
  test_date: {
    title: 'When are you taking the LSAT?',
    subtitle: 'Your classroom counts down from this and paces your week around it.',
  },
  life_stage: {
    title: 'Which best describes you?',
  },
  study_time: {
    title: 'Build your study week',
    subtitle:
      'Show Joshua when LSAT prep can realistically fit. Start with the days you have, then choose the time you can protect on each one.',
  },
};

// Short row labels for the Account page, where the answers are listed rather
// than asked. The full questions live in STEP_COPY and stay the card's voice.
export const STEP_LABELS: Record<OnboardingStepId, string> = {
  taken_lsat: 'Taken the LSAT',
  last_score: 'Last LSAT score',
  experience: 'How it has gone so far',
  schools: 'Target schools',
  target_score: 'Target score',
  test_date: 'Test date',
  life_stage: 'Where you are at',
  study_time: 'Weekly study time',
};

/**
 * The steps this student is actually asked, in order. Answering "no" to
 * taken_lsat drops the score step rather than showing it with an escape hatch,
 * which also keeps the "Step N of M" counter honest.
 */
export function visibleSteps(a: OnboardingAnswers): OnboardingStepId[] {
  return STEP_ORDER.filter((step) => step !== 'last_score' || a.has_taken_lsat !== false);
}

/** Whether a given step's answer is present. Drives resume and the Continue gate. */
export function isStepAnswered(step: OnboardingStepId, a: OnboardingAnswers): boolean {
  switch (step) {
    case 'taken_lsat':
      return typeof a.has_taken_lsat === 'boolean';
    case 'last_score':
      return !!a.last_score_band;
    case 'experience':
      return !!a.experience_text?.trim();
    case 'schools':
      return !!a.schools && a.schools.length > 0;
    case 'target_score':
      return !!a.target_score_band;
    case 'test_date':
      return !!a.test_date;
    case 'life_stage':
      return !!a.life_stage;
    case 'study_time':
      return !!a.study_time;
    default:
      return false;
  }
}

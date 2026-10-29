// Renders one student's finished intake as the Markdown file Joshua receives by
// email and files into their student folder. Kept dependency-free so both the
// edge function and the app's test suite can run it.
//
// Labels are duplicated from src/lib/onboarding.ts on purpose: an edge function
// cannot import from src, and a stored answer whose label later changes should
// still render as the words the student actually saw.

const SCORE_LABELS: Record<string, string> = {
  lte_150: '150 & below',
  '151_155': '151-155',
  '156_160': '156-160',
  '161_165': '161-165',
  '166_170': '166-170',
  '171_175': '171-175',
  '176_180': '176-180',
  not_taken: "Has not taken the LSAT yet",
  not_sure: 'Not sure',
};

const LIFE_STAGE_LABELS: Record<string, string> = {
  undergraduate: 'Undergraduate',
  graduate: 'Graduate',
  working: 'Working',
  other: 'Other',
};

const STUDY_TIME_LABELS: Record<string, string> = {
  none: 'No time',
  lt_1: 'under 1 hr',
  '1_2': '1-2 hrs',
  '3_plus': '3+ hrs',
};

const DAY_LABELS: [string, string][] = [
  ['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'],
  ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun'],
];

export interface OnboardingProfile {
  class_id: string;
  display_name: string | null;
  email: string | null;
  onboarding: Record<string, unknown> | null;
  onboarding_completed_at: string | null;
}

/** A filename-safe slug for the student folder, e.g. "Sofia Minassian" -> "sofia-minassian". */
export function studentSlug(name: string | null, email: string | null): string {
  const base = (name || (email || '').split('@')[0] || 'unknown').trim().toLowerCase();
  const slug = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

function label(map: Record<string, string>, value: unknown): string {
  if (typeof value !== 'string' || value === '') return 'Not answered';
  return map[value] ?? value;
}

function studyTimeLines(studyTime: unknown): string[] {
  if (!studyTime || typeof studyTime !== 'object') return ['- Not answered'];
  const record = studyTime as Record<string, string>;
  const lines = DAY_LABELS
    // Days with no time are the answer too, but the list reads better when the
    // days they can actually study lead. Empty weeks still say so explicitly.
    .filter(([key]) => record[key] && record[key] !== 'none')
    .map(([key, day]) => `- ${day}: ${STUDY_TIME_LABELS[record[key]] ?? record[key]}`);
  return lines.length > 0 ? lines : ['- No study time set on any day'];
}

export function buildOnboardingMarkdown(profile: OnboardingProfile): string {
  const answers = (profile.onboarding ?? {}) as Record<string, unknown>;
  const name = profile.display_name || 'Unknown';
  const completed = profile.onboarding_completed_at
    ? profile.onboarding_completed_at.slice(0, 10)
    : 'unknown';

  const schools = Array.isArray(answers.schools) && answers.schools.length > 0
    ? (answers.schools as string[]).map((s) => `- ${s}`).join('\n')
    : '- Not answered';

  const experience = typeof answers.experience_text === 'string' && answers.experience_text.trim()
    ? answers.experience_text.trim()
    : 'Not answered';

  const testDate = typeof answers.test_date === 'string' && answers.test_date !== 'undecided'
    ? answers.test_date
    : 'No date registered yet';

  // Someone who has not sat the test is never asked for a score, so the intake
  // has to say that rather than reporting the answer as missing.
  const lastScore = answers.has_taken_lsat === false
    ? 'Has not taken the LSAT yet'
    : label(SCORE_LABELS, answers.last_score_band);

  return [
    '---',
    `student: ${name}`,
    `email: ${profile.email ?? 'unknown'}`,
    `class_id: ${profile.class_id}`,
    `completed: ${completed}`,
    'source: lsatprep.study onboarding intake',
    '---',
    '',
    `# Onboarding intake - ${name}`,
    '',
    '## Where they are',
    `- Last LSAT: ${lastScore}`,
    `- Target score: ${label(SCORE_LABELS, answers.target_score_band)}`,
    `- Test date: ${testDate}`,
    `- Life stage: ${label(LIFE_STAGE_LABELS, answers.life_stage)}`,
    '',
    '## Schools',
    schools,
    '',
    '## Study time',
    ...studyTimeLines(answers.study_time),
    '',
    '## In their words',
    experience,
    '',
  ].join('\n');
}

import { isReleasedAnswer, orderedDistinctAnswers, type GradedQuestionAnswer } from "./firstAnswerProgress";

export const RATING_BASELINE = 1500;
export const MIN_RATED_ANSWERS = 10;
const DIFFICULTY_STEP = 100;

export interface RatingTrack {
  rating: number;
  count: number;
}
export interface RatingQuestion {
  difficulty: number | null | undefined;
  skill?: string;
}
export interface RatingProfile {
  overall: RatingTrack;
  LR: RatingTrack;
  RC: RatingTrack;
  bySkill: ReadonlyMap<string, RatingTrack>;
  eligibleCount: number;
  calibration: { count: number; expectedCorrect: number; actualCorrect: number };
}

export function questionRating(difficulty: number | null | undefined) {
  return typeof difficulty === "number" && Number.isFinite(difficulty) && difficulty >= 1 && difficulty <= 5
    ? RATING_BASELINE + (difficulty - 3) * DIFFICULTY_STEP
    : null;
}

export function expectedPracticeAccuracy(rating: number, itemRating: number) {
  return 1 / (1 + 10 ** ((itemRating - rating) / 400));
}

function advance(track: RatingTrack, item: number, correct: boolean) {
  const expected = expectedPracticeAccuracy(track.rating, item);
  // Early evidence moves the estimate faster. The floor lets sustained
  // improvement register even after a long history of practice.
  const step = 12 + 20 / (1 + track.count / 20);
  return {
    rating: Math.min(2300, Math.max(700, track.rating + step * (Number(correct) - expected))),
    count: track.count + 1,
  };
}

export function replayPracticeRating(
  answers: GradedQuestionAnswer[],
  getQuestion: (answer: GradedQuestionAnswer) => RatingQuestion | undefined,
): RatingProfile {
  const initial = { rating: RATING_BASELINE, count: 0 };
  let overall = initial;
  const areas = { LR: initial, RC: initial };
  const bySkill = new Map<string, RatingTrack>();
  const seen = new Set<string>();
  let eligibleCount = 0;
  const calibration = { count: 0, expectedCorrect: 0, actualCorrect: 0 };

  for (const answer of orderedDistinctAnswers(answers)) {
    if (seen.has(answer.questionKey)) continue;
    seen.add(answer.questionKey);
    if (!isReleasedAnswer(answer)) continue;
    eligibleCount++;
    const question = getQuestion(answer);
    const item = questionRating(question?.difficulty);
    if (item === null) continue;
    const areaTrack = areas[answer.area];
    if (areaTrack.count >= MIN_RATED_ANSWERS) {
      calibration.count++;
      calibration.expectedCorrect += expectedPracticeAccuracy(areaTrack.rating, item);
      calibration.actualCorrect += Number(answer.correct);
    }
    overall = advance(overall, item, answer.correct);
    areas[answer.area] = advance(areas[answer.area], item, answer.correct);
    if (question?.skill && question.skill !== "Unknown") {
      const key = `${answer.area}:${question.skill}`;
      bySkill.set(key, advance(bySkill.get(key) ?? initial, item, answer.correct));
    }
  }
  return { overall, ...areas, bySkill, eligibleCount, calibration };
}

/** A comfortable challenge is useful for drills without requiring every pick to target 70%. */
export function ratingDifficultyFit(profile: RatingProfile, difficulty: number, qtype: string) {
  const item = questionRating(difficulty);
  if (profile.LR.count < MIN_RATED_ANSWERS || item === null) return null;
  const skill = profile.bySkill.get(`LR:${qtype}`);
  const weight = skill ? skill.count / (skill.count + 12) : 0;
  const rating = profile.LR.rating * (1 - weight) + (skill?.rating ?? 0) * weight;
  return 1 - Math.abs(expectedPracticeAccuracy(rating, item) - 0.7);
}

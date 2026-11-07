import type { TopicAccuracy } from '@/lib/firstAnswerDetails';
import type { PrototypeModel } from '@/components/analytics/prototype/model';
import { launchDrill } from '@/lib/drillLaunch';

/** A type needs this many first answers before it is sorted at all (same floor as Progress). */
export const MIN_TYPE_ANSWERS = 3;
/** First-answer accuracy at or above this is called a strength. */
export const STRENGTH_AT = 75;
/** First-answer accuracy below this is called a weakness. */
export const WEAKNESS_BELOW = 60;

export interface TypeResult {
  topic: string;
  correct: number;
  denominator: number;
  /** Whole percent of first answers correct. */
  percent: number;
}

export interface TypeEarly {
  topic: string;
  correct: number;
  denominator: number;
}

export interface StrengthsWeaknesses {
  /** Best first, only types with enough answers. */
  strengths: TypeResult[];
  /** Weakest first, only types with enough answers. */
  weaknesses: TypeResult[];
  /** Enough answers, neither a strength nor a weakness yet. */
  steady: TypeResult[];
  /** Too few answers to sort. Never ranked, so a lucky 1 of 1 is not a "strength". */
  building: TypeEarly[];
  /** The one type to practise next: the weakest real weakness, or null. */
  recommended: TypeResult | null;
  /** True when an LR source is missing, so no sorting is shown at all. */
  withheld: boolean;
  /** First answers counted across all LR types (for the "so far" line). */
  totalAnswers: number;
}

export const EMPTY_STRENGTHS: StrengthsWeaknesses = {
  strengths: [],
  weaknesses: [],
  steady: [],
  building: [],
  recommended: null,
  withheld: false,
  totalAnswers: 0,
};

const missesOf = (row: { correct: number; denominator: number }) => row.denominator - row.correct;

/**
 * Sort LR question types by the student's own first answers. Pure: the same rows
 * always give the same lists. "Unclassified" is never a strength or a weakness
 * because it is not a type a student can practise.
 */
export function classifyTypes(topics: TopicAccuracy[], withheld = false): StrengthsWeaknesses {
  if (withheld) return { ...EMPTY_STRENGTHS, withheld: true };
  const usable = topics.filter((row) => row.topic !== 'Unclassified' && row.denominator > 0);
  const totalAnswers = usable.reduce((sum, row) => sum + row.denominator, 0);
  const building: TypeEarly[] = [];
  const sorted: TypeResult[] = [];
  for (const row of usable) {
    if (row.denominator < MIN_TYPE_ANSWERS) {
      building.push({ topic: row.topic, correct: row.correct, denominator: row.denominator });
    } else {
      sorted.push({
        topic: row.topic,
        correct: row.correct,
        denominator: row.denominator,
        percent: Math.round((100 * row.correct) / row.denominator),
      });
    }
  }
  const strengths = sorted
    .filter((row) => row.percent >= STRENGTH_AT)
    .sort((a, b) => b.percent - a.percent || b.denominator - a.denominator || a.topic.localeCompare(b.topic));
  const weaknesses = sorted
    .filter((row) => row.percent < WEAKNESS_BELOW)
    .sort((a, b) => a.percent - b.percent || missesOf(b) - missesOf(a) || a.topic.localeCompare(b.topic));
  const steady = sorted
    .filter((row) => row.percent >= WEAKNESS_BELOW && row.percent < STRENGTH_AT)
    .sort((a, b) => b.percent - a.percent || a.topic.localeCompare(b.topic));
  building.sort((a, b) => b.denominator - a.denominator || a.topic.localeCompare(b.topic));
  return {
    strengths,
    weaknesses,
    steady,
    building,
    recommended: weaknesses[0] ?? null,
    withheld: false,
    totalAnswers,
  };
}

/** How many questions the "practise this type" button asks for. */
export const PRACTICE_COUNT = 6;

/**
 * A short drill on one question type. Easier questions only (levels 1 to 3) so a
 * type she is still learning does not open on the hardest questions; Smart Drill
 * is the adaptive route and keeps tuning from her answers.
 */
export function practiceTypePath(topic: string, returnTo: string): string {
  return `/drill?${launchDrill({
    kind: 'filter',
    count: PRACTICE_COUNT,
    qtypes: [topic],
    difficulties: [1, 2, 3],
    options: { label: topic, returnTo },
  })}`;
}

/** The Progress page's own evidence view for one type: the exact questions behind a number. */
export function typeEvidencePath(topic: string): string {
  return `/review/progress?mode=types&progressType=${encodeURIComponent(topic)}`;
}

/** The Progress model already withholds topic percentages when any LR source is missing. */
export function summarizeModel(model: PrototypeModel): StrengthsWeaknesses {
  return classifyTypes(model.topics, model.areaPartial.LR || model.areaUnavailable.LR);
}

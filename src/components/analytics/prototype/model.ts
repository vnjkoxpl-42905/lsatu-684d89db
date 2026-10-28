import { firstAnswerDetails, type HistoryAnswer, type TopicAccuracy } from '@/lib/firstAnswerDetails';
import { orderedDistinctAnswers, projectFirstAnswerProgress, type FirstAnswerProgress, type GradedQuestionAnswer, type ProgressArea, type ProgressCoverage, type ProgressWindow } from '@/lib/firstAnswerProgress';

export interface PrototypeModel {
  progress: FirstAnswerProgress;
  history: HistoryAnswer[];
  allAnswers: GradedQuestionAnswer[];
  topics: TopicAccuracy[];
  untypedFirstAnswers: number;
  areaUnavailable: { LR: boolean; RC: boolean };
  areaPartial: { LR: boolean; RC: boolean };
  asOf: string;
  window: ProgressWindow;
}

// Presentation whitelist mirrors questionLoader's canonical allTypes. Saved labels
// and question identities stay untouched; this adapter does no topic migration.
const knownTopics = new Set([
  'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
  'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
  'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
  'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox',
]);

export function topicLabel(topic?: string): string {
  return knownTopics.has(topic ?? '') ? topic! : 'Unclassified';
}

export function buildPrototypeModel(answers: GradedQuestionAnswer[], coverage: ProgressCoverage, window: ProgressWindow, asOf: string): PrototypeModel {
  const progress = projectFirstAnswerProgress({ answers, coverage, window, asOf });
  const details = firstAnswerDetails(answers, window, asOf);
  const areaUnavailable = {
    LR: !coverage.includedSources.some((source) => source === 'lr_attempts' || source === 'lr_section_history'),
    RC: !coverage.includedSources.includes('rc_attempts'),
  };
  const missing = new Set(coverage.missingSources.map((item) => item.source));
  const areaPartial = {
    LR: missing.has('lr_attempts') || missing.has('lr_section_history') || missing.has('practice_test_runs'),
    RC: missing.has('rc_attempts') || missing.has('rc_sessions') || missing.has('practice_test_runs'),
  };
  const topics = details.topics.filter((row) => knownTopics.has(row.topic));
  const unclassified = details.history.filter((row) => row.isFirst && row.area === 'LR' && !knownTopics.has(row.topic ?? ''));
  if (unclassified.length) topics.push({
    topic: 'Unclassified', correct: unclassified.filter((row) => row.correct).length,
    denominator: unclassified.length,
    percent: unclassified.length < 3 ? null : Math.round(100 * unclassified.filter((row) => row.correct).length / unclassified.length),
    evidenceAttemptIds: unclassified.map((row) => row.attemptId),
  });
  // Withhold affected percentages in the data itself, so no visual accidentally
  // renders a partial-source percentage or derives a recommendation from it.
  for (const area of ['LR', 'RC'] as const) {
    if (areaUnavailable[area] || areaPartial[area]) progress[area].percent = null;
  }
  if (areaUnavailable.LR || areaPartial.LR) topics.forEach((row) => { row.percent = null; });
  topics.sort((a, b) => b.denominator - a.denominator || a.topic.localeCompare(b.topic));
  const allAnswers = orderedDistinctAnswers(answers).filter((answer) => Date.parse(answer.gradedAt) <= Date.parse(asOf));
  return { progress, history: details.history, allAnswers, topics, untypedFirstAnswers: unclassified.length, areaUnavailable, areaPartial, asOf, window };
}

export interface PracticeBucket {
  id: string;
  start: string;
  end: string;
  answers: HistoryAnswer[];
  correct: number;
  missed: number;
}

/** Partition the same first-answer window as the summary; repeats never enter. */
export function buildPracticeBuckets(model: PrototypeModel, area: ProgressArea): PracticeBucket[] {
  if (model.areaUnavailable[area] || model.areaPartial[area]) return [];
  const answers = model.history.filter((answer) => answer.area === area && answer.isFirst).reverse();
  const end = Date.parse(model.asOf);
  const start = model.window === 'all' ? (answers.length ? Date.parse(answers[0].gradedAt) : end) : end - model.window * 86_400_000;
  const span = end - start;
  const count = Math.max(1, Math.min(6, Math.ceil(span / 86_400_000)));
  const buckets: PracticeBucket[] = Array.from({ length: count }, (_, index) => {
    const bucketStart = start + span * index / count;
    const bucketEnd = index === count - 1 ? end : start + span * (index + 1) / count;
    return { id: `${area}:${bucketStart}:${bucketEnd}`, start: new Date(bucketStart).toISOString(), end: new Date(bucketEnd).toISOString(), answers: [], correct: 0, missed: 0 };
  });
  for (const answer of answers) {
    const at = Date.parse(answer.gradedAt);
    // History already applies the inclusive projection window. A final-edge
    // answer belongs to the last bin; every other boundary starts its next bin.
    const index = span === 0 ? 0 : Math.min(count - 1, Math.floor((at - start) * count / span));
    const bucket = buckets[index];
    bucket.answers.push(answer);
    if (answer.correct) bucket.correct++;
    else bucket.missed++;
  }
  return buckets;
}

export function questionLabel(key: string): string {
  const rc = /^RC:(\d+):(\d+)$/.exec(key);
  if (rc) return `Passage ${rc[1]} · Question ${rc[2]}`;
  const lr = key.replace(/^LR:/, '');
  const pt = /^(?:PT)?(\d+)[.\-_:]S?(\d+)[.\-_:]Q?(\d+)$/i.exec(lr);
  if (pt) return `PT ${pt[1]} · Section ${pt[2]} · Question ${pt[3]}`;
  return lr;
}

export function readableMode(mode: string): string {
  const modes: Record<string, string> = {
    adaptive: 'Adaptive practice', 'type-drill': 'Question-type practice',
    'natural-drill': 'LR practice', 'practice-set': 'Practice set',
    'bootcamp-pf': 'Bootcamp practice', 'practice-test': 'Practice test',
    'timed-section': 'Timed section', 'rc-drill': 'Reading practice',
  };
  return modes[mode] ?? 'Saved practice';
}

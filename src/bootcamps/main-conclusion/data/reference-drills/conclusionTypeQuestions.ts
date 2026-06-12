/**
 * Conclusion Type Lab — question bank.
 *
 * Fresh, LSAT-flavored stimuli (not lifted from real PTs) authored for the
 * Intro to LR bootcamp. Each item gives a short argument, isolates the
 * conclusion, and asks the student to name its TYPE. The five types and their
 * accent colors mirror the ConclusionTypeCard grid on the Five Types lesson.
 */

export type ConclusionType =
  | 'recommendation'
  | 'causal'
  | 'prediction'
  | 'judgment'
  | 'rebuttal';

export interface ConclusionTypeMeta {
  value: ConclusionType;
  label: string;
  blurb: string;
  color: string;
}

export const CONCLUSION_TYPE_META: ConclusionTypeMeta[] = [
  { value: 'recommendation', label: 'Recommendation', blurb: 'says what should happen', color: '#FACC15' },
  { value: 'causal', label: 'Causal Hypothesis', blurb: 'says what caused something', color: '#A855F7' },
  { value: 'prediction', label: 'Prediction', blurb: 'says what will happen', color: '#38BDF8' },
  { value: 'judgment', label: 'Judgment / Label', blurb: 'assigns a verdict', color: '#10B981' },
  { value: 'rebuttal', label: 'Rebuttal', blurb: 'says the other side is wrong', color: '#F97316' },
];

export function conclusionTypeMeta(value: ConclusionType): ConclusionTypeMeta {
  return CONCLUSION_TYPE_META.find((meta) => meta.value === value) ?? CONCLUSION_TYPE_META[0];
}

export interface ConclusionTypeQuestion {
  id: string;
  stimulus: string;
  conclusion: string;
  answer: ConclusionType;
  explanation: string;
}

export const CONCLUSION_TYPE_QUESTIONS: ConclusionTypeQuestion[] = [
  {
    id: 'CT-Q01',
    stimulus:
      'The clinic’s waiting room is overcrowded by mid-morning every day. Patients who arrive on time often wait more than an hour past their appointment. The clinic should stagger its scheduling across the full day.',
    conclusion: 'The clinic should stagger its scheduling across the full day.',
    answer: 'recommendation',
    explanation:
      'It tells us what should happen, so it is a recommendation. Predictable weakness: the author assumes staggering beats the costs and the alternatives.',
  },
  {
    id: 'CT-Q02',
    stimulus:
      'After the city repainted the crosswalks near the school, pedestrian injuries in that area dropped sharply. No other safety measure was introduced that year. The brighter crosswalks must have caused the decline.',
    conclusion: 'The brighter crosswalks must have caused the decline.',
    answer: 'causal',
    explanation:
      'It claims to know why something happened, so it is a causal hypothesis. Weakness: timing alone is not proof; something else may explain the drop.',
  },
  {
    id: 'CT-Q03',
    stimulus:
      'Streaming subscriptions have grown every quarter for three years. Several new services launch next spring. Subscription growth will continue through the coming year.',
    conclusion: 'Subscription growth will continue through the coming year.',
    answer: 'prediction',
    explanation:
      'It claims something will happen, so it is a prediction. Weakness: it assumes today’s conditions stay stable, and they often do not.',
  },
  {
    id: 'CT-Q04',
    stimulus:
      'The committee approved the budget without reading the full report. They spent less than ten minutes in discussion. The committee’s decision was irresponsible.',
    conclusion: 'The committee’s decision was irresponsible.',
    answer: 'judgment',
    explanation:
      'It assigns a verdict, so it is a judgment or label. Weakness: the label sounds strong, but the evidence may not prove it fits.',
  },
  {
    id: 'CT-Q05',
    stimulus:
      'Some critics claim the new novel is too sentimental to take seriously. But sentiment is exactly what the story is about, and the author handles it with care. These critics are mistaken.',
    conclusion: 'These critics are mistaken.',
    answer: 'rebuttal',
    explanation:
      'The author says the other side is wrong, so it is a rebuttal. Weakness: the author may answer the wrong criticism or never really meet the point.',
  },
  {
    id: 'CT-Q06',
    stimulus:
      'Remote employees report feeling disconnected from their teams. Productivity dips in the weeks after major launches. Managers should schedule regular one-on-one check-ins with remote staff.',
    conclusion: 'Managers should schedule regular one-on-one check-ins with remote staff.',
    answer: 'recommendation',
    explanation:
      'It proposes an action, so it is a recommendation. Weakness: it assumes check-ins are worth the time and better than the alternatives.',
  },
  {
    id: 'CT-Q07',
    stimulus:
      'Sales of the energy drink spiked the same month the company changed its packaging. Customer surveys never mentioned the new look. The redesigned packaging drove the jump in sales.',
    conclusion: 'The redesigned packaging drove the jump in sales.',
    answer: 'causal',
    explanation:
      'It names a cause, so it is a causal hypothesis. Weakness: a coincidence in timing is not proof; another factor may be responsible.',
  },
  {
    id: 'CT-Q08',
    stimulus:
      'The region has seen milder winters each of the past five years. Long-range models point the same direction. This winter will be warmer than the historical average.',
    conclusion: 'This winter will be warmer than the historical average.',
    answer: 'prediction',
    explanation:
      'It claims a future outcome, so it is a prediction. Weakness: it assumes the trend holds, but conditions can shift.',
  },
  {
    id: 'CT-Q09',
    stimulus:
      'The museum spent its entire grant on a single exhibit that few visitors attended. Other programs went unfunded that year. The museum’s spending was a failure.',
    conclusion: 'The museum’s spending was a failure.',
    answer: 'judgment',
    explanation:
      'It assigns a verdict, so it is a judgment or label. Weakness: “failure” is a strong label the evidence may not fully support.',
  },
  {
    id: 'CT-Q10',
    stimulus:
      'Opponents argue the proposed park will be too expensive to maintain. Yet maintenance is already covered by a dedicated fund in place. Their objection does not hold up.',
    conclusion: 'Their objection does not hold up.',
    answer: 'rebuttal',
    explanation:
      'The author pushes back on someone else’s view, so it is a rebuttal. Weakness: the author may misstate or dodge the real objection.',
  },
  {
    id: 'CT-Q11',
    stimulus:
      'Students who attend the optional review sessions score higher on the final. The sessions are held only once a week. The department should offer the review sessions more frequently.',
    conclusion: 'The department should offer the review sessions more frequently.',
    answer: 'recommendation',
    explanation:
      'It proposes an action, so it is a recommendation. Weakness: it assumes more sessions are worth the cost and better than other fixes.',
  },
  {
    id: 'CT-Q12',
    stimulus:
      'Ever since the café started playing slow background music, customers have lingered longer over their meals. Staff changed nothing else about the service. The slow music is what keeps customers at their tables.',
    conclusion: 'The slow music is what keeps customers at their tables.',
    answer: 'causal',
    explanation:
      'It claims a cause, so it is a causal hypothesis. Weakness: other changes or plain chance could explain why customers linger.',
  },
];

export const ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS: readonly ConclusionTypeQuestion[] =
  CONCLUSION_TYPE_QUESTIONS;

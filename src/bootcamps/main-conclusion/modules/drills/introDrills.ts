export interface IntroDrillDefinition {
  id: string;
  slug: string;
  number: string;
  title: string;
  summary: string;
  questionCount?: number;
  route: string;
  runRoute: string;
  completionId: string;
  skill: string;
  interaction: string;
  why: string;
  gatesSimulator?: boolean;
}

const BC = '/bootcamp/intro-to-lr';

export const INTRO_DRILLS: IntroDrillDefinition[] = [
  {
    id: 'MC-DRL-MCL',
    slug: 'main-conclusion-lab',
    number: '1',
    title: 'Main Conclusion Lab',
    summary: 'Find the author’s main conclusion inside full LR stimuli.',
    questionCount: 20,
    route: `${BC}/drills/main-conclusion-lab`,
    runRoute: `${BC}/drills/main-conclusion-lab/run`,
    completionId: 'MC-DRL-MCL',
    skill: 'Conclusion Spotting',
    interaction: 'full stimulus · 20 questions',
    why: 'Tap the sentence the author is trying to prove. Wrong picks get a hint; right picks reveal the full role map.',
  },
  {
    id: 'MC-DRL-CLS',
    slug: 'first-sentence-vs-rebuttal-lab',
    number: '2',
    title: 'First Sentence vs Rebuttal',
    summary: 'Spot the indicator words, select the main conclusion, classify the structure, and name the sentence role.',
    questionCount: 20,
    route: `${BC}/drills/first-sentence-vs-rebuttal-lab`,
    runRoute: `${BC}/drills/first-sentence-vs-rebuttal-lab/run`,
    completionId: 'MC-DRL-CLS',
    skill: 'Structure Read',
    interaction: '4-step flow · explanation breakdowns',
    why: 'Work through the two dominant conclusion placements in a faithful native port with end-of-question feedback and session review.',
  },
];

export function getIntroDrillBySlug(slug: string | undefined) {
  return INTRO_DRILLS.find((drill) => drill.slug === slug) ?? null;
}

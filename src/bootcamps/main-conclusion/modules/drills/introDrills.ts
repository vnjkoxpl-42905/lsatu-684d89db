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
  {
    id: 'MC-DRL-XRY',
    slug: 'structure-reveal-review',
    number: '3',
    title: 'Structure Reveal Review Mode',
    summary: 'Review argument roles through reveal-based examples.',
    route: `${BC}/drills/structure-reveal-review`,
    runRoute: `${BC}/drills/structure-reveal-review/run`,
    completionId: 'MC-DRL-XRY',
    skill: 'Review and Demo',
    interaction: 'reveal demos · logical gap simulator',
    why: 'Toggle reveal modes on canonical arguments to inspect conclusion, support, opposing view, and the logical gap.',
  },
  {
    id: 'MC-DRL-MIX',
    slug: 'final-mixed-structure-check',
    number: '4',
    title: 'Final Mixed Structure Check',
    summary: 'Complete mixed structure reps before moving on.',
    questionCount: 12,
    route: `${BC}/drills/final-mixed-structure-check`,
    runRoute: `${BC}/drills/final-mixed-structure-check/run`,
    completionId: 'MC-DRL-MIX',
    skill: 'Capstone',
    interaction: 'mixed structure reps · capstone flow',
    why: 'Capstone reps that mix both structures. Clear this drill to unlock the Question Simulator.',
    gatesSimulator: true,
  },
];

export function getIntroDrillBySlug(slug: string | undefined) {
  return INTRO_DRILLS.find((drill) => drill.slug === slug) ?? null;
}

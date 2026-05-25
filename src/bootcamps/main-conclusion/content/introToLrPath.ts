/**
 * Intro to LR Path - Integrated Path Map
 * Defines the logical 8-step sequence for the LR Introduction bootcamp.
 */

export interface PathStep {
  id: string;
  title: string;
  description: string;
  noteRoute?: string;
  drillId?: string;
  toolSlug?: string;
  practiceSlug?: string;
}

export const INTRO_LR_PATH: PathStep[] = [
  {
    id: 'argument-basics',
    title: 'Argument Basics',
    description: 'Learn how to separate claims from support and see the basic structure underneath every LR argument.',
    noteRoute: '/bootcamp/intro-to-lr/lessons/notes/argument-basics',
  },
  {
    id: 'indicator-recognition',
    title: 'Indicator Recognition',
    description: 'Identify whether a signal points to support, conclusion, contrast, concession, or another person’s view.',
    drillId: 'MC-DRL-3.1',
  },
  {
    id: 'structure-reading',
    title: 'Structure Reading',
    description: 'Confirm the role each sentence plays before choosing the main conclusion.',
    drillId: 'MC-DRL-3.2',
  },
  {
    id: 'where-conclusions-hide',
    title: 'Where Conclusions Hide',
    description: 'Practice finding conclusions when they appear at the beginning, after a pivot, or between context and evidence.',
    noteRoute: '/bootcamp/intro-to-lr/lessons/notes/where-conclusions-hide',
    drillId: 'MC-DRL-3.3',
    practiceSlug: 'first-sentence-conclusions',
  },
  {
    id: 'opposing-view-rebuttal',
    title: 'Opposing View & Rebuttal',
    description: 'Separate the author’s conclusion from the view the author rejects.',
    drillId: 'MC-DRL-3.4',
    practiceSlug: 'rebuttal-conclusions',
  },
  {
    id: 'layered-arguments',
    title: 'Layered Arguments',
    description: 'Learn how premises, intermediate conclusions, and main conclusions stack together.',
    noteRoute: '/bootcamp/intro-to-lr/lessons/notes/layered-arguments',
    drillId: 'MC-DRL-3.5',
  },
  {
    id: 'matching-the-answer',
    title: 'Matching the Answer',
    description: 'Practice matching the author’s conclusion without getting trapped by wording changes.',
    noteRoute: '/bootcamp/intro-to-lr/lessons/notes/matching-the-answer',
    drillId: 'MC-DRL-3.7',
  },
  {
    id: 'final-practice',
    title: 'Final Practice',
    description: 'Capstone application, trap review, and Hard Mode testing.',
  },
];

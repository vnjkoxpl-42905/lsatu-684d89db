/**
 * Intro to LR Guided Sequence - Source of Truth
 * Defines the order of notes, drills, and practice pools.
 */

export type WorkbookStepType = 
  | 'note' 
  | 'checkpoint' 
  | 'drill-slice' 
  | 'drill-full-review' 
  | 'practice-pool' 
  | 'simulator' 
  | 'utility';

export interface WorkbookStep {
  id: string;
  type: WorkbookStepType;
  title: string;
  description?: string;
  noteId?: string; // ID for existing note components if applicable
  drillId?: string; // Drill ID (e.g., MC-DRL-3.1)
  stage?: number; // Specific stage for drill-slice
  practiceSlug?: string; // For practice-pool
  requiredForSimulator?: boolean;
}

export const INTRO_GUIDED_SEQUENCE: WorkbookStep[] = [
  // 1. Argument Basics
  {
    id: 'argument-basics',
    type: 'note',
    title: 'Argument Anatomy',
    noteId: 'argument-basics',
    requiredForSimulator: true,
  },
  {
    id: 'argument-basics-checkpoint',
    type: 'checkpoint',
    title: 'Basics Checkpoint',
    requiredForSimulator: true,
  },

  // 2. Premise vs Conclusion
  {
    id: 'premise-vs-conclusion',
    type: 'note',
    title: 'Mini Premise / Conclusion Breakdown',
    noteId: 'premise-vs-conclusion', // This might be combined in argument-basics but we can split or map
    requiredForSimulator: true,
  },

  // 3. Indicator Words
  {
    id: 'indicator-words',
    type: 'note',
    title: 'Indicator Words',
    noteId: 'indicator-words',
    requiredForSimulator: true,
  },
  {
    id: 'indicator-slice',
    type: 'drill-slice',
    title: 'Signal Drill',
    drillId: 'MC-DRL-3.1',
    stage: 1,
    requiredForSimulator: true,
  },

  // 4. 2-Part Conclusion Check
  {
    id: 'two-part-check',
    type: 'note',
    title: '2-Part Conclusion Check',
    noteId: 'two-part-check',
    requiredForSimulator: true,
  },
  {
    id: 'x-ray-slice',
    type: 'drill-slice',
    title: 'X-Ray Basics',
    drillId: 'MC-DRL-3.2',
    stage: 1,
    requiredForSimulator: true,
  },

  // 5. Where Conclusions Hide
  {
    id: 'where-conclusions-hide',
    type: 'note',
    title: 'Where Conclusions Hide',
    noteId: 'where-conclusions-hide',
    requiredForSimulator: true,
  },
  {
    id: 'first-sentence-slice',
    type: 'drill-slice',
    title: 'First-Sentence Rep',
    drillId: 'MC-DRL-3.3',
    stage: 1,
    requiredForSimulator: true,
  },

  // 6. Rebuttal / Trojan Horse
  {
    id: 'rebuttal-trojan-horse',
    type: 'note',
    title: 'Rebuttal / Trojan Horse',
    noteId: 'rebuttal-trojan-horse',
    requiredForSimulator: true,
  },
  {
    id: 'rebuttal-slice',
    type: 'drill-slice',
    title: 'Rebuttal Rep',
    drillId: 'MC-DRL-3.4',
    stage: 2, // Rebuttal stage
    requiredForSimulator: true,
  },

  // 7. Layered Arguments
  {
    id: 'layered-arguments',
    type: 'note',
    title: 'Layered Arguments',
    noteId: 'layered-arguments',
    requiredForSimulator: true,
  },
  {
    id: 'chain-mapping-slice',
    type: 'drill-slice',
    title: 'Chain Mapping',
    drillId: 'MC-DRL-3.5',
    stage: 1,
    requiredForSimulator: true,
  },
  {
    id: 'nested-claims-slice',
    type: 'drill-slice',
    title: 'Nested Claims',
    drillId: 'MC-DRL-3.9',
    stage: 1,
    requiredForSimulator: true,
  },

  // 8. Matching the Answer
  {
    id: 'matching-the-answer',
    type: 'note',
    title: 'Matching the Answer',
    noteId: 'matching-the-answer',
    requiredForSimulator: true,
  },
  {
    id: 'read-restate-slice',
    type: 'drill-slice',
    title: 'Restate',
    drillId: 'MC-DRL-3.8',
    stage: 1,
    requiredForSimulator: true,
  },
  {
    id: 'pronoun-replacement-slice',
    type: 'drill-slice',
    title: 'Pronoun Replacement',
    drillId: 'MC-DRL-3.7',
    stage: 1,
    requiredForSimulator: true,
  },

  // 9. Practice Path
  {
    id: 'practice-path',
    type: 'drill-full-review',
    title: 'Review Drills',
    description: 'Consolidate your skills with full drills.',
  },

  // 10. Main Conclusion Practice
  {
    id: 'mc-practice-first-sentence',
    type: 'practice-pool',
    title: 'First-Sentence Set',
    practiceSlug: 'first-sentence-conclusions',
  },
  {
    id: 'mc-practice-rebuttal',
    type: 'practice-pool',
    title: 'Rebuttal Set',
    practiceSlug: 'rebuttal-conclusions',
  },

  // Read & Restate
  {
    id: 'read-restate-slice',
    type: 'drill-slice',
    title: 'Read & Restate',
    drillId: 'MC-DRL-3.8',
    stage: 1,
  },
  {
    id: 'pronoun-replacement-slice',
    type: 'drill-slice',
    title: 'Pronoun Replacement',
    drillId: 'MC-DRL-3.7',
    stage: 1,
  },

  // 11. Simulator
  {
    id: 'simulator-assessment',
    type: 'simulator',
    title: 'Final Assessment',
  },
];

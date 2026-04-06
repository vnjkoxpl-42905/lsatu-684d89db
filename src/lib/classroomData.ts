// ─────────────────────────────────────────────────────────────────────────────
// Classroom — types and mock seed data
// ─────────────────────────────────────────────────────────────────────────────

export type AssignmentStatus =
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'returned'
  | 'revision_needed'
  | 'completed';

export type AssignmentType =
  | 'drill'
  | 'pt'
  | 'section'
  | 'review'
  | 'reading'
  | 'written';

export interface AssignmentFeedback {
  score?: number;           // optional numeric score / 100
  comments: string;
  returnedAt: string;       // ISO date string
  opened: boolean;
}

export interface ClassroomAssignment {
  id: string;
  title: string;
  type: AssignmentType;
  status: AssignmentStatus;
  dueDate: string | null;   // ISO date string or null
  assignedDate: string;     // ISO date string
  description: string;
  linkedRoute?: string;     // internal SPA route to launch the work
  attachments?: string[];
  feedback?: AssignmentFeedback;
}

export interface ClassroomMaterial {
  id: string;
  title: string;
  topic: string;
  postedAt: string;
  summary: string;
  linkedRoute?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  returned: 'Returned',
  revision_needed: 'Revision Needed',
  completed: 'Completed',
};

export const TYPE_LABEL: Record<AssignmentType, string> = {
  drill: 'Drill Set',
  pt: 'Practice Test',
  section: 'Section',
  review: 'Review Task',
  reading: 'Reading',
  written: 'Written Response',
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock seed data — structured for real data replacement later
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_ASSIGNMENTS: ClassroomAssignment[] = [
  {
    id: 'a1',
    title: 'Sufficient Assumption — Problem Set',
    type: 'drill',
    status: 'assigned',
    dueDate: '2026-04-02T23:59:00Z',
    assignedDate: '2026-03-25T10:00:00Z',
    description: '20 Sufficient Assumption questions, adaptive mode. Focus on gap identification and conditional chain mapping.',
    linkedRoute: '/drill',
  },
  {
    id: 'a2',
    title: 'PT 87 — Section 3 (LR)',
    type: 'section',
    status: 'in_progress',
    dueDate: '2026-03-31T23:59:00Z',
    assignedDate: '2026-03-22T10:00:00Z',
    description: 'Full section under timed conditions. 35 minutes. Submit after completing.',
    linkedRoute: '/drill',
  },
  {
    id: 'a3',
    title: 'Strengthen & Weaken — Review Set',
    type: 'drill',
    status: 'submitted',
    dueDate: '2026-03-28T23:59:00Z',
    assignedDate: '2026-03-20T10:00:00Z',
    description: '15 questions each — Strengthen then Weaken. Review your eliminations before submitting.',
  },
  {
    id: 'a4',
    title: 'PT 92 — Full Exam',
    type: 'pt',
    status: 'returned',
    dueDate: '2026-03-24T23:59:00Z',
    assignedDate: '2026-03-17T10:00:00Z',
    description: 'Timed full exam. Four sections. Official LSAC conditions.',
    feedback: {
      score: 76,
      comments:
        'Solid performance in Section 1 and 4. Parallel Reasoning continues to drag — revisit the structural pattern. Section 2 timing was off by 4 minutes; consider your pacing on long stimuli.',
      returnedAt: '2026-03-26T14:30:00Z',
      opened: false,
    },
  },
  {
    id: 'a5',
    title: 'Parallel Reasoning — Response',
    type: 'written',
    status: 'revision_needed',
    dueDate: '2026-03-30T23:59:00Z',
    assignedDate: '2026-03-21T10:00:00Z',
    description: 'Written breakdown of your approach to two Parallel Reasoning problems. Explain why you eliminated each wrong answer.',
    feedback: {
      comments:
        'Good attempt but the analysis of answer (D) on Q14 is incomplete. Revise and resubmit — walk through the structural match failure explicitly.',
      returnedAt: '2026-03-25T09:00:00Z',
      opened: true,
    },
  },
  {
    id: 'a6',
    title: 'Causal Reasoning — Drill Set',
    type: 'drill',
    status: 'completed',
    dueDate: '2026-03-20T23:59:00Z',
    assignedDate: '2026-03-14T10:00:00Z',
    description: '12 Causal Reasoning questions with WAJ review on any misses.',
    linkedRoute: '/drill',
    feedback: {
      score: 92,
      comments: 'Excellent work. One timing note — Q9 took over 4 minutes. Flag it for review.',
      returnedAt: '2026-03-22T11:00:00Z',
      opened: true,
    },
  },
];

export const MOCK_MATERIALS: ClassroomMaterial[] = [
  {
    id: 'm1',
    title: 'Argument Structure — Lesson Notes',
    topic: 'Foundations',
    postedAt: '2026-03-18T10:00:00Z',
    summary: 'Core argument anatomy: premises, conclusions, background assumptions. How to diagram quickly under time pressure.',
  },
  {
    id: 'm2',
    title: 'Conditional Logic — Reference Sheet',
    topic: 'Conditional Reasoning',
    postedAt: '2026-03-20T10:00:00Z',
    summary: 'Sufficient vs. necessary conditions, contrapositive, common trap patterns. Two-page reference.',
  },
  {
    id: 'm3',
    title: 'Parallel Reasoning — Structural Mapping',
    topic: 'Parallel Reasoning',
    postedAt: '2026-03-24T10:00:00Z',
    summary: 'How to abstract argument form and match it to answer choices. Common structural isomorphs.',
  },
];

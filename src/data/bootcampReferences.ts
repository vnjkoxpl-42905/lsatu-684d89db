/**
 * Seeded admin-only reference bootcamp metadata.
 * These are prototype/reference ZIPs imported for inspiration — never published to students.
 * Structured so each entry can migrate to Supabase storage (admin_bootcamp_references table) later.
 */

export type ReferenceType = 'bootcamp' | 'drill' | 'visual-reference' | 'content-reference';
export type PreviewStatus = 'static-ready' | 'metadata-only' | 'needs-extraction';

export interface BootcampReference {
  id: string;
  title: string;
  sourceFilename: string;
  topic: string;
  referenceType: ReferenceType;
  status: 'reference';
  previewStatus: PreviewStatus;
  /** Static HTML index path relative to /public — only set if previewStatus is 'static-ready' */
  previewPath?: string;
  /** Optional in-app route (e.g. `/bootcamp/causation-station`). When set, the detail page
   *  prefers this over the static preview because it runs the real integrated app. */
  appRoute?: string;
  tags: string[];
  notes: string;
  importedAt: string; // ISO date string
  description: string;
  fileCount?: number;
}

export const BOOTCAMP_REFERENCES: BootcampReference[] = [
  {
    id: 'ref-causation-station',
    title: 'Causation Station',
    sourceFilename: 'Causation-station--main.zip',
    topic: 'Causation & Causal Reasoning',
    referenceType: 'bootcamp',
    status: 'reference',
    previewStatus: 'static-ready',
    previewPath: '/references/bootcamps/causation-station/index.html',
    appRoute: '/bootcamp/causation-station',
    tags: ['causation', 'causal-reasoning', 'bootcamp', 'training-yard', 'wrong-answer-journal', 'ai-tutor'],
    notes: 'FULL INTEGRATION: Source code moved to src/references/bootcamps/causation-station/. Features Training Yard, WAJ, and Gemini-powered AI tutor. This is the canonical bootcamp model for LSAT U.',
    importedAt: '2026-05-28T00:00:00Z',
    description: 'An LSAT training app that helps students master causal reasoning through guided skill drills and an interactive AI-powered tutor. Features a Training Yard, Wrong-Answer Journal, and detailed performance analytics.',
    fileCount: 12,
  },
  {
    id: 'ref-arguments',
    title: 'Arguments Foundations',
    sourceFilename: 'arguments-main__1_.zip',
    topic: 'Argument Structure',
    referenceType: 'content-reference',
    status: 'reference',
    previewStatus: 'static-ready',
    previewPath: '/references/bootcamps/arguments/index.html',
    tags: ['arguments', 'argument-structure', 'premises', 'conclusions', 'logical-reasoning'],
    notes: 'Single-page static reference covering argument anatomy: premises, conclusions, and extra argument parts. Content reference for LR foundations curriculum.',
    importedAt: '2026-05-28T00:00:00Z',
    description: 'Static reference covering foundational argument structure concepts including premises, conclusions, and supporting components used in LSAT Logical Reasoning.',
    fileCount: 1,
  },
  {
    id: 'ref-structure-drill',
    title: 'Structure Drill',
    sourceFilename: 'structuredrill-main__2_.zip',
    topic: 'Argument Structure',
    referenceType: 'drill',
    status: 'reference',
    previewStatus: 'static-ready',
    previewPath: '/references/bootcamps/structuredrill/index.html',
    tags: ['drill', 'argument-structure', 'structure', 'interactive'],
    notes: 'Prototype drill interface for practicing argument structure identification. Useful as a drill UX reference when building structure-focused bootcamp surfaces.',
    importedAt: '2026-05-28T00:00:00Z',
    description: 'Interactive drill prototype focused on argument structure identification and practice.',
    fileCount: 1,
  },
  {
    id: 'ref-intro-conclusion-drill',
    title: 'Intro & Conclusion Drill',
    sourceFilename: 'introconclusiondrill-main.zip',
    topic: 'Main Conclusions',
    referenceType: 'drill',
    status: 'reference',
    previewStatus: 'static-ready',
    previewPath: '/references/bootcamps/introconclusiondrill/index.html',
    tags: ['drill', 'conclusions', 'main-conclusion', 'first-sentence', 'intro'],
    notes: 'Intro and conclusion identification drill. Reference for Main Conclusion bootcamp drill surface design.',
    importedAt: '2026-05-28T00:00:00Z',
    description: 'Drill prototype for identifying introductory clauses and main conclusions in LR stimulus passages.',
    fileCount: 1,
  },
  {
    id: 'ref-lr-foundational',
    title: 'LR Foundational Partial',
    sourceFilename: 'logicalreasoningfoundationalpartial-main.zip',
    topic: 'Logical Reasoning Foundations',
    referenceType: 'content-reference',
    status: 'reference',
    previewStatus: 'static-ready',
    previewPath: '/references/bootcamps/lrfoundational/index.html',
    tags: ['logical-reasoning', 'foundations', 'partial', 'content-reference', 'study-guide'],
    notes: 'Partial LR foundational content reference. Single-page static. Useful for content planning on intro LR modules.',
    importedAt: '2026-05-28T00:00:00Z',
    description: 'Partial foundational Logical Reasoning reference covering core LR concepts. Single-page static content reference.',
    fileCount: 1,
  },
];

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  'bootcamp': 'Bootcamp',
  'drill': 'Drill',
  'visual-reference': 'Visual Reference',
  'content-reference': 'Content Reference',
};

export const PREVIEW_STATUS_LABELS: Record<PreviewStatus, { label: string; color: string }> = {
  'static-ready': { label: 'Preview Available', color: 'text-emerald-400' },
  'metadata-only': { label: 'Metadata Only', color: 'text-amber-400' },
  'needs-extraction': { label: 'Needs Extraction', color: 'text-zinc-500' },
};

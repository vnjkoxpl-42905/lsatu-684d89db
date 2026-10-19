import { BOOTCAMP_REFERENCES } from '@/data/bootcampReferences';
import {
  CANONICAL_STRUCTURE_QUESTIONS,
  FOUNDATIONAL_REVEAL_DEMOS,
} from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import type { ReferenceTemplateFamily } from '@/bootcamps/main-conclusion/data/reference-drills/types';

export interface BootcampReferenceLabEntry {
  referenceId: string;
  sourceBootcamp: string;
  formatFamily: ReferenceTemplateFamily | 'content-reference';
  lsatUTarget: string;
  audience: 'student-facing' | 'reference-only' | 'lesson-only' | 'admin-dev';
  itemCount: number;
  duplicateOfCanonicalId: string[];
  previewPath?: string;
  notes: string;
}

function canonicalIdsForSource(sourceBootcamp: string): string[] {
  return CANONICAL_STRUCTURE_QUESTIONS.filter((question) => question.sourceBootcamps.includes(sourceBootcamp as never)).map(
    (question) => question.id,
  );
}

function canonicalDuplicateIds(...sourceBootcamps: string[]): string[] {
  return CANONICAL_STRUCTURE_QUESTIONS.filter((question) =>
    sourceBootcamps.every((sourceBootcamp) => question.sourceBootcamps.includes(sourceBootcamp as never)),
  ).map((question) => question.id);
}

export const BOOTCAMP_REFERENCE_LAB_ENTRIES: BootcampReferenceLabEntry[] = [
  {
    referenceId: 'ref-intro-conclusion-drill',
    sourceBootcamp: 'mainconclusion',
    formatFamily: 'main-conclusion-replica',
    lsatUTarget: 'Main Conclusion Lab',
    audience: 'student-facing',
    itemCount: canonicalIdsForSource('mainconclusion').filter((id) => id.startsWith('CANON-MC-')).length,
    duplicateOfCanonicalId: canonicalDuplicateIds('mainconclusion', 'arguments-foundations'),
    previewPath: BOOTCAMP_REFERENCES.find((entry) => entry.id === 'ref-intro-conclusion-drill')?.previewPath,
    notes: 'Direct click-the-conclusion replica. Two exact duplicate stimuli also appear inside Arguments Foundations.',
  },
  {
    referenceId: 'ref-structure-drill',
    sourceBootcamp: 'structuredrill',
    formatFamily: 'structured-dissection-replica',
    lsatUTarget: 'Main Conclusion drill sequence',
    audience: 'student-facing',
    itemCount: canonicalIdsForSource('structuredrill').length,
    duplicateOfCanonicalId: [],
    previewPath: BOOTCAMP_REFERENCES.find((entry) => entry.id === 'ref-structure-drill')?.previewPath,
    notes: 'Backbone of the new Intro to LR drill system. Full workspace + role-map reveal.',
  },
  {
    referenceId: 'ref-arguments',
    sourceBootcamp: 'arguments-foundations',
    formatFamily: 'arguments-foundations-mini',
    lsatUTarget: 'Lesson mini-interactions',
    audience: 'lesson-only',
    itemCount: 4,
    duplicateOfCanonicalId: canonicalIdsForSource('arguments-foundations'),
    previewPath: BOOTCAMP_REFERENCES.find((entry) => entry.id === 'ref-arguments')?.previewPath,
    notes: 'Claim buckets, Trojan Horse reveal, referential-language unpack, and FABS hover tool.',
  },
  {
    referenceId: 'ref-lr-foundational',
    sourceBootcamp: 'logicalreasoningfoundationalpartial',
    formatFamily: 'foundational-reveal-demo',
    lsatUTarget: 'lesson demos',
    audience: 'student-facing',
    itemCount: FOUNDATIONAL_REVEAL_DEMOS.length + 1,
    duplicateOfCanonicalId: [],
    previewPath: BOOTCAMP_REFERENCES.find((entry) => entry.id === 'ref-lr-foundational')?.previewPath,
    notes: 'Reveal-mode patterns: Stock Analysts, concession/pivot reveal, and logical-gap demonstration.',
  },
];

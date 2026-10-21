export type ReferenceTemplateFamily =
  | 'main-conclusion-replica'
  | 'structured-dissection-replica'
  | 'rebuttal-vs-first-replica'
  | 'foundational-reveal-demo'
  | 'arguments-foundations-mini';

export type CanonicalStructureType = 'standard' | 'first-sentence' | 'rebuttal' | 'mixed';

export type CanonicalRoleLabel =
  | 'main-conclusion'
  | 'support'
  | 'opposing-view'
  | 'concession'
  | 'background'
  | 'neutral';

export type ReferenceBootcampSource =
  | 'mainconclusion'
  | 'structuredrill'
  | 'arguments-foundations'
  | 'mainconclusionrebuttalvsfirst'
  | 'logicalreasoningfoundationalpartial';

export interface CanonicalQuestionCompatibility {
  template: ReferenceTemplateFamily;
  sourceBootcamp: ReferenceBootcampSource;
  stageTags?: string[];
}

export interface CanonicalStructureQuestion {
  id: string;
  stimulus: string;
  chunks: string[];
  correctMainConclusionIndex: number;
  supportIndexes: number[];
  opposingViewIndexes: number[];
  concessionOrPivotIndexes: number[];
  structureType: CanonicalStructureType;
  sourceBootcamps: ReferenceBootcampSource[];
  compatibleTemplates: ReferenceTemplateFamily[];
  hint: string;
  revealExplanation: string;
  roleLabels: CanonicalRoleLabel[];
  duplicateKey: string;
  compatibility: CanonicalQuestionCompatibility[];
}


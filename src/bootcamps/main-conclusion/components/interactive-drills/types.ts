import type {
  ChainMappingQuestion,
  DesignConclusionQuestion,
  FamilyQuestion,
  FirstSentenceQuestion,
  IndicatorIdQuestion,
  NestedClaimsQuestion,
  PronounReplacementQuestion,
  RrPassage,
  XRayQuestion,
} from '@/bootcamps/main-conclusion/content/drills.source';

export type DrillMode =
  | 'signal_classification'
  | 'conclusion_click'
  | 'first_sentence_check'
  | 'rebuttal_dissection'
  | 'chain_mapping'
  | 'conclusion_construction'
  | 'pronoun_replacement'
  | 'read_cover_restate'
  | 'nested_claims';

export type PartRole =
  | 'main'
  | 'conclusion'
  | 'intermediate'
  | 'premise'
  | 'support'
  | 'opposing'
  | 'concession'
  | 'background';

export interface StimulusPart {
  id: string;
  text: string;
  role?: PartRole;
  hint?: string;
}

export interface ConclusionConstructionReveal {
  p1Contribution: string;
  p2Contribution: string;
  forcedConclusion: string;
  temptingWrongMove: string;
  wrongMoveFailure: string;
}

export interface RevealEntry {
  id: string;
  label: string;
  role: PartRole;
  text: string;
  note?: string;
}

export type InteractivePayload =
  | IndicatorIdQuestion
  | XRayQuestion
  | FirstSentenceQuestion
  | FamilyQuestion
  | ChainMappingQuestion
  | DesignConclusionQuestion
  | PronounReplacementQuestion
  | RrPassage
  | NestedClaimsQuestion;

export interface InteractiveDrillItem {
  id: string;
  mode: DrillMode;
  title: string;
  prompt: string;
  payload: InteractivePayload;
  stimulus?: string;
  parts?: StimulusPart[];
  correctConclusionPartId?: string;
  correctSupportPartIds?: string[];
  correctOpposingPartIds?: string[];
  correctIntermediateConclusionPartIds?: string[];
  hint?: string;
  revealMap?: RevealEntry[];
  constructionReveal?: ConclusionConstructionReveal;
}

export interface DrillProtocol {
  title: string;
  goal: string;
  interaction: string;
  afterSubmit: string;
}

export interface RunnerState {
  answered: boolean;
  correct: boolean | null;
  selectedAnswer?: string | null;
  questionIndex: number;
  totalQuestions: number;
}

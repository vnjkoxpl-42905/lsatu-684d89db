import type {
  ChainMappingQuestion,
  FamilyQuestion,
  FirstSentenceQuestion,
  IndicatorIdQuestion,
  NestedClaimsQuestion,
  XRayQuestion,
} from '@/bootcamps/main-conclusion/content/drills.source';
import type { InteractiveDrillItem, PartRole, RevealEntry, StimulusPart } from './types';

const EXPLICIT_ROLE_SEQUENCES: Record<string, PartRole[]> = {
  'D33-S1-Q1': ['conclusion', 'support'],
  'D33-S1-Q2': ['opposing', 'conclusion'],
  'D33-S1-Q3': ['conclusion', 'support'],
  'D33-S1-Q4': ['support', 'conclusion'],
  'D33-S1-Q5': ['conclusion', 'support'],
  'D33-S2-Q1': ['background', 'support', 'conclusion'],
  'D33-S2-Q2': ['opposing', 'conclusion'],
  'D33-S2-Q3': ['support', 'conclusion'],
  'D33-S2-Q4': ['conclusion', 'support'],
  'D33-S2-Q5': ['concession', 'support', 'conclusion'],
  'D33-S3-Q1': ['concession', 'conclusion'],
  'D33-S3-Q2': ['conclusion', 'support'],
  'D33-S3-Q3': ['concession', 'support', 'conclusion'],
  'D33-S3-Q4': ['conclusion', 'support'],
  'D33-S3-Q5': ['concession', 'conclusion'],
  'D33-S4-Q1': ['conclusion', 'support'],
  'D33-S4-Q2': ['support', 'conclusion'],
  'D33-S4-Q3': ['opposing', 'conclusion'],
  'D33-S4-Q4': ['conclusion', 'support'],
  'D33-S4-Q5': ['opposing', 'conclusion'],
  'D34-S1-Q1': ['conclusion', 'support'],
  'D34-S1-Q2': ['opposing', 'conclusion', 'support'],
  'D34-S1-Q3': ['conclusion', 'support'],
  'D34-S1-Q4': ['opposing', 'conclusion', 'support'],
  'D34-S1-Q5': ['conclusion', 'support'],
  'D34-S2-Q1': ['opposing', 'conclusion'],
  'D34-S2-Q2': ['concession', 'conclusion'],
  'D34-S2-Q3': ['conclusion', 'support'],
  'D34-S2-Q4': ['opposing', 'conclusion', 'support'],
  'D34-S2-Q5': ['opposing', 'conclusion'],
  'D34-S3-Q1': ['conclusion', 'opposing'],
  'D34-S3-Q2': ['opposing', 'conclusion', 'support'],
  'D34-S3-Q3': ['conclusion', 'support'],
  'D34-S3-Q4': ['concession', 'conclusion'],
  'D34-S3-Q5': ['opposing', 'conclusion'],
  'D34-S4-Q1': ['conclusion', 'support', 'support'],
  'D34-S4-Q2': ['opposing', 'conclusion'],
  'D34-S4-Q3': ['opposing', 'support', 'conclusion'],
  'D34-S4-Q4': ['conclusion', 'support', 'support', 'support'],
  'D34-S4-Q5': ['conclusion', 'concession', 'support'],
};

export function splitStimulusIntoParts(stimulus: string, prefix: string): StimulusPart[] {
  return stimulus
    .split(/(?<=[.!?])\s+/)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: `${prefix}-part-${index + 1}`, text }));
}

function clean(text: string): string {
  return text.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
}

function findPartId(parts: StimulusPart[], text: string): string | undefined {
  const target = clean(text);
  return parts.find((part) => clean(part.text).includes(target) || target.includes(clean(part.text)))?.id;
}

function roleLabel(role: PartRole): string {
  switch (role) {
    case 'main':
      return 'Main Conclusion';
    case 'intermediate':
      return 'Intermediate Conclusion';
    case 'premise':
    case 'support':
      return 'Support';
    case 'opposing':
      return 'Opposing View';
    case 'concession':
      return 'Concession';
    case 'background':
      return 'Background';
    default:
      return 'Conclusion';
  }
}

function revealFromParts(parts: StimulusPart[]): RevealEntry[] {
  return parts
    .filter((part) => part.role)
    .map((part) => ({
      id: part.id,
      role: part.role!,
      label: roleLabel(part.role!),
      text: part.text,
      note: part.hint,
    }));
}

export function adaptIndicatorQuestion(q: IndicatorIdQuestion): InteractiveDrillItem {
  return {
    id: q.id,
    mode: 'signal_classification',
    title: 'Signal Classification',
    prompt: q.prompt,
    payload: q,
    stimulus: q.text,
    hint: `Ask what the highlighted phrase introduces: support, the author's claim, a turn, a concession, or someone else's view.`,
  };
}

export function adaptXRayQuestion(q: XRayQuestion): InteractiveDrillItem {
  const parts = q.candidates.map((candidate, index) => ({
    id: `${q.id}-part-${index + 1}`,
    text: candidate.text,
    role: candidate.is_correct ? 'conclusion' as PartRole : inferSupportRole(candidate.text),
    hint: candidate.is_correct ? q.rationale : 'This sentence is doing work for, against, or around the author’s main point.',
  }));
  const correct = parts.find((part) => part.role === 'conclusion');
  return {
    id: q.id,
    mode: 'conclusion_click',
    title: 'Structure Reading',
    prompt: q.prompt,
    payload: q,
    stimulus: q.stimulus,
    parts,
    correctConclusionPartId: correct?.id,
    correctSupportPartIds: parts.filter((part) => part.role === 'support' || part.role === 'premise').map((part) => part.id),
    correctOpposingPartIds: parts.filter((part) => part.role === 'opposing').map((part) => part.id),
    hint: 'Find the claim the other sentences are trying to prove. Facts and examples usually support; pivots often introduce the author’s real view.',
    revealMap: revealFromParts(parts),
  };
}

export function adaptFirstSentenceQuestion(q: FirstSentenceQuestion): InteractiveDrillItem {
  const roleSequence = EXPLICIT_ROLE_SEQUENCES[q.id];
  const parts = splitStimulusIntoParts(q.stimulus, q.id).map((part, index) => {
    const explicitRole = roleSequence?.[index];
    const isConclusion = explicitRole
      ? explicitRole === 'conclusion' || explicitRole === 'main'
      : q.is_first_sentence_conclusion ? index === 0 : conclusionIndexFromRationale(q.rationale, index);
    return {
      ...part,
      role: explicitRole ?? (isConclusion ? 'conclusion' as PartRole : inferSupportRole(part.text, q.rationale)),
      hint: index === 0 && !q.is_first_sentence_conclusion ? firstSentenceTrapLabel(q.rationale) : undefined,
    };
  });
  const correct = parts.find((part) => part.role === 'conclusion') ?? parts[0];
  return {
    id: q.id,
    mode: 'first_sentence_check',
    title: 'First-Sentence Check',
    prompt: q.prompt,
    payload: q,
    stimulus: q.stimulus,
    parts,
    correctConclusionPartId: correct?.id,
    hint: 'First click the author’s actual conclusion. Then decide whether that conclusion was the first sentence.',
    revealMap: revealFromParts(parts),
  };
}

export function adaptFamilyQuestion(q: FamilyQuestion): InteractiveDrillItem {
  const roleSequence = EXPLICIT_ROLE_SEQUENCES[q.id];
  const parts = splitStimulusIntoParts(q.stimulus, q.id).map((part, index) => {
    const role = roleSequence?.[index] ?? roleForFamilyPart(q, part.text, index);
    return { ...part, role, hint: roleLabel(role) };
  });
  const conclusion = parts.find((part) => part.role === 'conclusion' || part.role === 'main');
  return {
    id: q.id,
    mode: 'rebuttal_dissection',
    title: 'Rebuttal Dissection',
    prompt: q.prompt,
    payload: q,
    stimulus: q.stimulus,
    parts,
    correctConclusionPartId: conclusion?.id,
    correctSupportPartIds: parts.filter((part) => part.role === 'support' || part.role === 'premise').map((part) => part.id),
    correctOpposingPartIds: parts.filter((part) => part.role === 'opposing' || part.role === 'concession').map((part) => part.id),
    hint: 'Separate the author’s claim from the view being rejected. Rebuttal items often start with someone else’s view.',
    revealMap: revealFromParts(parts),
  };
}

export function adaptChainQuestion(q: ChainMappingQuestion): InteractiveDrillItem {
  const parts = splitStimulusIntoParts(q.stimulus, q.id).map((part) => {
    const role = roleForChainPart(q, part.text);
    return { ...part, role };
  });
  return {
    id: q.id,
    mode: 'chain_mapping',
    title: 'Chain Mapping',
    prompt: q.prompt,
    payload: q,
    stimulus: q.stimulus,
    parts,
    correctConclusionPartId: findPartId(parts, q.layers.main_conclusion),
    correctIntermediateConclusionPartIds: q.layers.intermediate_conclusion ? [findPartId(parts, q.layers.intermediate_conclusion)].filter(Boolean) as string[] : [],
    correctSupportPartIds: q.layers.premises.map((premise) => findPartId(parts, premise)).filter(Boolean) as string[],
    hint: 'A premise supports something. An intermediate conclusion is supported by a premise and then supports the main conclusion.',
    revealMap: revealFromParts(parts),
  };
}

export function adaptNestedQuestion(q: NestedClaimsQuestion): InteractiveDrillItem {
  const parts = q.candidates.map((candidate, index) => ({
    id: `${q.id}-part-${index + 1}`,
    text: candidate.text,
    role: candidate.role === 'main' ? 'main' as PartRole : candidate.role,
  }));
  return {
    id: q.id,
    mode: 'nested_claims',
    title: 'Nested Claims',
    prompt: q.prompt,
    payload: q,
    stimulus: q.stimulus,
    parts,
    correctConclusionPartId: parts.find((part) => part.role === 'main')?.id,
    correctIntermediateConclusionPartIds: parts.filter((part) => part.role === 'intermediate').map((part) => part.id),
    correctSupportPartIds: parts.filter((part) => part.role === 'premise').map((part) => part.id),
    hint: 'Do not stop at the intermediate claim. The main conclusion is the destination the whole chain supports.',
    revealMap: revealFromParts(parts),
  };
}

function inferSupportRole(text: string, rationale = ''): PartRole {
  const combined = `${text} ${rationale}`.toLowerCase();
  if (/(many believe|critics|some|opposing view|concession|granted|it is true|while)/.test(combined)) return 'opposing';
  if (/(background|rhetorical question|sets up)/.test(combined)) return 'background';
  return 'support';
}

function conclusionIndexFromRationale(rationale: string, index: number): boolean {
  const lower = rationale.toLowerCase();
  if (/(final sentence|third sentence|conclusion is the final)/.test(lower)) return index === 2;
  if (/(sentence two|second sentence|follows in sentence two)/.test(lower)) return index === 1;
  if (/(this is false|evidence does not|doctors should|honest answer|variance should)/.test(lower)) return index > 0;
  return index === 1;
}

function firstSentenceTrapLabel(rationale: string): string {
  const lower = rationale.toLowerCase();
  if (lower.includes('opposing')) return 'First sentence is the rejected view.';
  if (lower.includes('concession')) return 'First sentence is a concession.';
  if (lower.includes('support') || lower.includes('statistic')) return 'First sentence is support.';
  if (lower.includes('rhetorical')) return 'First sentence is setup.';
  return 'First sentence is not the author’s final claim.';
}

function roleForFamilyPart(q: FamilyQuestion, text: string, index: number): PartRole {
  const lower = `${text} ${q.rationale}`.toLowerCase();
  if (q.family === 'First-sentence') return index === 0 ? 'conclusion' : 'support';
  if (index === 0) return lower.includes('granted') || lower.includes('it is true') ? 'concession' : 'opposing';
  if (/(wrong|mistaken|opposite|cannot|does not support|reply|truth|should not|does not back|actual)/.test(lower)) return 'conclusion';
  return 'support';
}

function roleForChainPart(q: ChainMappingQuestion, text: string): PartRole {
  const normalized = clean(text);
  if (normalized.includes(clean(q.layers.main_conclusion)) || clean(q.layers.main_conclusion).includes(normalized)) return 'main';
  if (q.layers.intermediate_conclusion) {
    const intermediate = clean(q.layers.intermediate_conclusion);
    if (normalized.includes(intermediate) || intermediate.includes(normalized)) return 'intermediate';
  }
  return 'premise';
}

import type { ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { conditionalAssignmentUnitIds, registryStepAllowed } from './assignments';
import { courseStepsForEdition, type OpeningCourseStep } from './openingCoursePath';

export const CONDITIONAL_REQUIREMENTS_REVISION = 'conditional-required-20261027-r1';
export interface ConditionalRequirementsSnapshot {
  version: 1;
  revision: typeof CONDITIONAL_REQUIREMENTS_REVISION;
  requiredStepIds: string[];
}
export interface ConditionalRequirements {
  source: 'snapshot' | 'pre-split-default';
  revision: string;
  requiredStepIds: string[];
}
// Frozen from the pre-build LOCAL registry in the 2026-10-27 baseline. This is
// historical membership, never a filter over today's required registry flags.
export const PRE_SPLIT_REQUIRED_STEP_IDS = [
  'meaning', 'sufficient', 'necessary', 'must-arrow', 'contrapositive',
  'foundation-practice', 'sufficient-practice', 'source-intro-identify', 'source-intro-diagrams',
  'source-rephrase', 'mixed-practice', 'source-intro-diagrams-contrapositive',
  'source-rephrase-contrapositive', 'contrapositive-practice', 'source-full-translation', 'source-independent',
  'and-or-both-or-either', 'and-or-either-condition', 'and-or-either-side', 'and-or-negate-group',
  'and-or-meaning-practice', 'and-or-placement-practice', 'and-or-whole-group-practice', 'and-or-transfer-practice',
  'exception-language', 'exception-language-practice', 'exclusion-language', 'exclusion-language-practice',
  'negative-translation', 'negative-translation-practice', 'implicit-guarantees', 'implicit-guarantees-practice',
  'two-way-rules', 'contextual-two-way', 'contextual-two-way-practice', 'deny-whole-rule', 'deny-whole-rule-practice',
  'facts-with-rules', 'facts-with-rules-practice', 'direct-chains', 'hidden-chain', 'hidden-chain-practice',
  'failed-connections', 'failed-connections-practice', 'same-domain', 'same-domain-practice',
  'missing-bridges', 'missing-bridges-practice', 'quantity-meaning', 'quantity-meaning-practice',
  'quantity-denial', 'quantity-denial-practice', 'quantity-links', 'quantity-links-practice',
  'quantity-gaps', 'quantity-gaps-practice', 'supported-inferences', 'supported-inferences-practice',
  'sufficient-bridges', 'sufficient-bridges-practice', 'necessary-assumptions', 'necessary-assumptions-practice',
  'apply-principle', 'apply-principle-practice', 'match-structure', 'match-structure-practice',
  'conditional-flaws', 'conditional-flaws-practice', 'conditional-conclusions', 'conditional-conclusions-practice',
] as const;

export function eligibleConditionalSteps(target: ConditionalAssignmentTarget): OpeningCourseStep[] {
  const grant = { id: 'requirements', title: '', route: '', target,
    unitIds: conditionalAssignmentUnitIds(target), mode: target.mode,
    ...(target.scope !== 'course' && target.scope !== 'stage' ? { difficulty: target.difficulty } : {}) };
  return courseStepsForEdition(target.courseEdition).filter(step => registryStepAllowed(grant, step));
}

/** Called only after the fetched row's protected entitlement has been validated. */
export function resolveConditionalRequirements(target: ConditionalAssignmentTarget, metadata?: unknown): ConditionalRequirements {
  const eligible = eligibleConditionalSteps(target);
  const allowed = new Set(eligible.map(step => step.id));
  if (metadata === undefined) return { source: 'pre-split-default', revision: 'pre-split-default',
    requiredStepIds: PRE_SPLIT_REQUIRED_STEP_IDS.filter(id => allowed.has(id)) };
  const snapshot = metadata as Partial<ConditionalRequirementsSnapshot> | null;
  if (target.courseEdition !== FULL_CONDITIONAL_EDITION || !snapshot || snapshot.version !== 1
    || snapshot.revision !== CONDITIONAL_REQUIREMENTS_REVISION || !Array.isArray(snapshot.requiredStepIds)
    || snapshot.requiredStepIds.some(id => typeof id !== 'string' || !allowed.has(id))
    || new Set(snapshot.requiredStepIds).size !== snapshot.requiredStepIds.length || !snapshot.requiredStepIds.length) {
    throw new Error('This assignment needs its required lessons reviewed by your teacher.');
  }
  return { source: 'snapshot', revision: snapshot.revision, requiredStepIds: [...snapshot.requiredStepIds] };
}

export function snapshotConditionalRequirements(target: ConditionalAssignmentTarget): ConditionalRequirementsSnapshot {
  if (target.courseEdition !== FULL_CONDITIONAL_EDITION) throw new Error('Requirements snapshots belong to the full course.');
  return { version: 1, revision: CONDITIONAL_REQUIREMENTS_REVISION,
    requiredStepIds: eligibleConditionalSteps(target).filter(step => step.requiredForEditionCompletion !== false).map(step => step.id) };
}

export function applyConditionalRequirements(steps: OpeningCourseStep[], requirements: ConditionalRequirements): OpeningCourseStep[] {
  const required = new Set(requirements.requiredStepIds);
  return steps.map(step => ({ ...step, requiredForEditionCompletion: required.has(step.id) }));
}

/** Authoring compares completion generations as well as the protected target. */
export function hasCurrentConditionalRequirements(target: ConditionalAssignmentTarget, metadata: unknown): boolean {
  if (metadata === undefined) return false;
  try {
    const stored = resolveConditionalRequirements(target, metadata);
    const current = snapshotConditionalRequirements(target);
    return stored.revision === current.revision && stored.requiredStepIds.length === current.requiredStepIds.length
      && current.requiredStepIds.every(id => stored.requiredStepIds.includes(id));
  } catch { return false; }
}

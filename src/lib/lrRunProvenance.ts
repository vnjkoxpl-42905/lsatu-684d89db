import { z } from 'zod';
import type { DrillRunSpec } from '@/lib/drillRunSpec';
import { pickModelForRun } from '@/lib/drillReviewPolicy';

/** Saved conditions describe the actual runner, independently of its analytics mode. */
export const LrRunProvenanceSchema = z.object({
  version: z.literal(1),
  study_mode: z.literal('training'),
  feedback: z.enum(['manual_answer_and_explanation', 'after_submit']),
  source_key: z.string().min(1),
  launch_kind: z.enum(['questions', 'filter', 'saved-set', 'smart-drill']),
  pick_model: z.enum(['list', 'commit']),
  layout: z.enum(['official', 'classic']),
}).strict().superRefine((value, context) => {
  const adaptive = value.launch_kind === 'smart-drill';
  const expectedFeedback = adaptive || (value.layout === 'classic' && value.pick_model === 'commit') ? 'after_submit' : 'manual_answer_and_explanation';
  if (value.feedback !== expectedFeedback || (adaptive && value.pick_model !== 'commit')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Saved LR feedback conditions are inconsistent.' });
  }
  if (adaptive ? value.source_key !== 'drill::adaptive' : !value.source_key.startsWith('drill::type-drill::')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Saved LR source does not match its launch.' });
  }
});

export type LrRunProvenance = z.infer<typeof LrRunProvenanceSchema>;

export function lrRunProvenanceForSpec(
  spec: DrillRunSpec,
  sourceKey: string | null | undefined,
  layout: LrRunProvenance['layout'],
): LrRunProvenance | undefined {
  if (!sourceKey || !['type-drill', 'adaptive'].includes(spec.mode ?? '') || spec.sealed || spec.ptRun
    || spec.assignmentId || spec.guidedSetId || spec.guidedDrillId || spec.guidedAssignmentId
    || spec.isGuidedDrill || spec.practiceSource || spec.practiceSlug || spec.resumeIdentity) return undefined;
  const launchKind = spec.launchKind;
  if (launchKind !== 'questions' && launchKind !== 'filter' && launchKind !== 'saved-set' && launchKind !== 'smart-drill') return undefined;
  if ((spec.mode === 'adaptive') !== (launchKind === 'smart-drill')) return undefined;
  const pickModel = pickModelForRun(spec);
  const candidate = LrRunProvenanceSchema.safeParse({
    version: 1, study_mode: 'training', source_key: sourceKey, launch_kind: launchKind,
    feedback: spec.mode === 'adaptive' || (layout === 'classic' && pickModel === 'commit') ? 'after_submit' : 'manual_answer_and_explanation',
    pick_model: pickModel, layout,
  });
  return candidate.success ? candidate.data : undefined;
}

export function lrRunProvenanceLabel(provenance: LrRunProvenance | undefined): string {
  if (!provenance) return 'Feedback settings were not saved for this older sitting.';
  return provenance.feedback === 'manual_answer_and_explanation'
    ? 'Training · Answers and explanations appear when you choose to reveal them.'
    : 'Training · Feedback appears after you submit an answer.';
}

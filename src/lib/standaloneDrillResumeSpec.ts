import type { StandaloneDrillRun } from '@/lib/drillRunLedger';
import type { DrillRunSpec } from '@/lib/drillRunSpec';

/** A Continue link names a sitting. Its questions and conditions come from the account. */
export function standaloneDrillResumeSpec(run: StandaloneDrillRun): DrillRunSpec {
  if (!run.source_key.startsWith('drill::') || !['adaptive', 'type-drill'].includes(run.mode) ||
      /^drill::(?:section|practice-test|assignment|bootcamp-day)::/.test(run.source_key)) {
    throw new Error('This saved drill cannot be opened through this route.');
  }
  const adaptive = run.mode === 'adaptive';
  if (adaptive !== (run.source_key === 'drill::adaptive')) {
    throw new Error('The saved drill mode does not match its source.');
  }
  const pickModel = run.provenance?.pick_model ?? 'list';
  return {
    savedStandaloneRun: run,
    launchKind: adaptive ? 'smart-drill' : run.provenance?.launch_kind ?? 'questions',
    mode: adaptive ? 'adaptive' : 'type-drill',
    practicingLabel: run.label,
    returnTo: '/practice/drills',
    sealed: false,
    config: adaptive ? undefined : {
      qtypes: [], difficulties: [], pts: [], count: run.session.question_queue.length,
      ...(pickModel === 'list' ? { selectedQids: run.session.question_queue } : {}),
    },
  };
}

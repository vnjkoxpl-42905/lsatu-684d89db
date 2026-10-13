/**
 * Lifecycle bridge for full-interactive guided drills: self-contained HTML
 * drills (intro, questions, grading, results) that run inside an iframe and
 * never hand off to the question-bank /drill runner.
 *
 * The HTML posts `lsatu:interactive-guided-start` / `-complete`; this module
 * maps those to the existing guided_drill_assignments helpers. With no
 * assignment (admin Open/Preview, direct slug link) it never writes anything.
 */
import type { GuidedDrillHtmlManifestEntry } from '@/data/guidedDrillHtmlManifest';

export type GuidedDrillRunnerMode = 'interactive' | 'native';

/** Interactive entries stay in their HTML; everything else uses the native runner. */
export function guidedDrillRunnerMode(
  entry: Pick<GuidedDrillHtmlManifestEntry, 'mode'> | null | undefined,
): GuidedDrillRunnerMode {
  return entry?.mode === 'interactive' ? 'interactive' : 'native';
}

export interface InteractiveLifecycleDeps {
  assignmentId?: string | null;
  /** Assignment status at load, so a reopened completed drill is not re-marked. */
  initialStatus?: string | null;
  markCardRead: (id: string) => Promise<void>;
  markStarted: (id: string) => Promise<void>;
  markCompleted: (id: string) => Promise<void>;
  onCompleted?: (result: { score: number; total: number; accuracy: number }) => void;
}

export function createInteractiveLifecycle(deps: InteractiveLifecycleDeps) {
  let started = deps.initialStatus === 'started' || deps.initialStatus === 'completed';
  let completed = deps.initialStatus === 'completed';

  return async function handle(data: unknown): Promise<void> {
    const msg = data as { type?: unknown; score?: unknown; total?: unknown; accuracy?: unknown } | null;
    if (!msg || typeof msg.type !== 'string') return;
    const id = deps.assignmentId;

    if (msg.type === 'lsatu:interactive-guided-start') {
      if (!id || started) return;
      started = true;
      await deps.markCardRead(id);
      await deps.markStarted(id);
      return;
    }

    if (msg.type === 'lsatu:interactive-guided-complete') {
      const score = Number(msg.score);
      const total = Number(msg.total);
      if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return;
      if (!id || completed) return;
      completed = true;
      if (!started) {
        started = true;
        await deps.markCardRead(id);
        await deps.markStarted(id);
      }
      await deps.markCompleted(id);
      deps.onCompleted?.({ score, total, accuracy: Number(msg.accuracy) || Math.round((score / total) * 100) });
    }
  };
}

import { supabase } from '@/integrations/supabase/client';

// Task -> action wiring for the student to-do list.
//
// A weekly_plan_item may carry an `action` object in metadata_json describing
// what tapping the task should launch and what surface completing it maps to:
//   { kind: 'drill'|'homework'|'bootcamp'|'plain', ref_id?: string, route?: string }
// 'plain' (or absent) means a free-text checkbox with no launch target.

export type TodoActionKind = 'drill' | 'homework' | 'bootcamp' | 'plain';

export interface TodoAction {
  kind: TodoActionKind;
  ref_id?: string;
  route?: string;
}

/** Read the action object off an item's metadata_json, defaulting to plain. */
export function readTodoAction(metadata: Record<string, unknown> | null | undefined): TodoAction {
  const raw = (metadata as { action?: unknown } | null | undefined)?.action;
  if (!raw || typeof raw !== 'object') return { kind: 'plain' };
  const a = raw as Record<string, unknown>;
  const kind = a.kind;
  if (kind !== 'drill' && kind !== 'homework' && kind !== 'bootcamp') {
    return { kind: 'plain' };
  }
  return {
    kind,
    ref_id: typeof a.ref_id === 'string' ? a.ref_id : undefined,
    route: typeof a.route === 'string' ? a.route : undefined,
  };
}

/**
 * Resolve a task action to the student-facing route to launch, or null when the
 * task is plain (nothing to open). An explicit `route` wins; otherwise we derive
 * a sensible path per kind from `ref_id`, mirroring resolveItemRoute in
 * src/lib/classroomItems.ts.
 */
export function resolveTodoRoute(action: TodoAction, returnTo = '/schedule'): string | null {
  if (action.kind === 'plain') return null;
  if (action.route) return action.route;
  const ref = action.ref_id ? encodeURIComponent(action.ref_id) : null;
  switch (action.kind) {
    case 'drill':
      return ref
        ? `/drill?assignmentId=${ref}&returnTo=${encodeURIComponent(returnTo)}`
        : '/drill';
    case 'homework':
      return ref ? `/classroom/${ref}` : '/classroom';
    case 'bootcamp':
      return ref ? `/bootcamp/${ref}` : '/bootcamps';
    default:
      return null;
  }
}

/**
 * Auto-complete any of the signed-in student's to-do items wired to a just-
 * finished surface. Matches weekly_plan_items whose metadata_json.action.ref_id
 * equals refId. RLS scopes the update to the caller's own rows. Non-fatal: the
 * source assignment stays the source of truth, so failure only logs.
 */
export async function completeLinkedTodo(refId: string | null | undefined): Promise<void> {
  if (!refId) return;
  const { error } = await supabase
    .from('weekly_plan_items')
    .update({ status: 'completed' })
    .eq('metadata_json->action->>ref_id', refId)
    .neq('status', 'completed');
  if (error) {
    console.error('[todo:auto-complete] failed', { refId, error });
  }
}

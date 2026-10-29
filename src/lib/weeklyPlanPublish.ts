// Publishing a weekly plan, in stages that can stop and resume.
//
// The old publish inserted the plan as `published` first, so a failure halfway
// left the student a published week with missing tasks, and a failed backlink
// update was ignored. Here the order is:
//
//   0. checks    refuse before any write if a curriculum task has no saved
//                assignment link (see below)
//   1. plan      insert the plan as `draft` (students cannot see drafts)
//   2. items     insert the plan's tasks (invisible while the plan is a draft)
//   3. mirrors   create each task's Classroom row, hidden from the student
//   4. links     point each task at its Classroom row, requiring a matched row
//   5. reveal    make the Classroom rows visible, requiring every row matched
//   6. publish   flip the plan to `published`, requiring the draft row matched
//
// Actor: a job belongs to the teacher who started it. Before every write the
// signed-in account is read again; if it is missing or different, the job
// stops without writing. A request already sent cannot be recalled, so a write
// that was in flight when the account changed may still land under the old
// account; the job keeps its exact origin (teacher, student, ids) so it can be
// reconciled.
//
// Curriculum: publishing never assigns drills. Automatic assignment had no
// stable idempotency key and could create student-visible rows before this
// plan was acknowledged, so a suggested curriculum drill must first be
// assigned through the normal assignment workflow and linked to its saved
// assignment in the builder. Until then the publish is refused with no writes.
//
// Failure: each stage records what it finished on the job and stops at the
// first failure, keeping every record already written; nothing is deleted.
// These are separate requests, not one transaction. A write whose answer was
// lost is ambiguous: it may or may not have landed. Ids are chosen before
// writing, so a retry looks for the row first and does not insert a second
// plan, task or Classroom row. The retry state lives only in this page; a
// reload loses it, and any draft already saved then stays in Existing plans
// for the teacher to deal with by hand.
//
// Visibility: between `reveal` and `publish` the Classroom rows are visible
// while the plan is still a draft. If `publish` fails there, the retry finishes
// it; the teacher is told exactly that. The plan is acknowledged as published
// only by the last stage, and only then may anyone notify the student.

import { endOfDay, parseISO, startOfDay } from 'date-fns';
import type { TodoAction } from '@/lib/todoActions';
import type { StudentLevel } from '@/lib/studentLevel';
import { prescribedSortOrder } from '@/lib/weeklyPlanBuilder';

export interface PublishDraft {
  day: string; // yyyy-MM-dd (local)
  title: string;
  estimatedMinutes?: number;
  deadline?: string;
  action?: TodoAction;
  /** A curriculum suggestion. Publishable only once `action` links its saved assignment. */
  curriculumDrillId?: string;
  curriculumLevel?: StudentLevel | null;
}

export type PublishStage = 'blocked' | 'actor' | 'plan' | 'items' | 'mirrors' | 'links' | 'reveal' | 'publish';

export interface PublishJob {
  /** Who started it and for whom. Never changes after creation. */
  teacherId: string;
  studentId: string;
  title: string;
  weekStart: string;
  /** Snapshot of the builder at the moment Publish was pressed. */
  drafts: PublishDraft[];
  /**
   * Ids chosen before anything is written, so a retry after a write whose
   * answer was lost finds the same rows instead of inserting new ones.
   */
  planKey: string;
  itemKeys: string[];
  planId: string | null;
  /** weekly_plan_items ids, by draft index. */
  itemIds: Record<number, string>;
  /** classroom_items ids, by draft index. */
  mirrorIds: Record<number, string>;
  /** Draft indexes whose task row is acknowledged as pointing at its mirror. */
  linked: Record<number, true>;
  revealed: boolean;
  published: boolean;
}

export interface PublishOutcome {
  job: PublishJob;
  ok: boolean;
  failedAt?: PublishStage;
  message?: string;
}

/**
 * The writes, injected so the order and acknowledgments can be tested. Each
 * must be safe to call again with the same input: an insert whose row already
 * exists reports that row, an update reports how many rows now match.
 */
export interface PublishDeps {
  /** The account signed in right now, read fresh. Null when signed out or unknown. */
  currentActorId(): Promise<string | null>;
  insertDraftPlan(row: Record<string, unknown>): Promise<{ id: string }>;
  /** Inserts rows and returns what was saved, including sort_order. */
  insertItems(rows: Record<string, unknown>[]): Promise<{ id: string; sort_order: number }[]>;
  /** Reuses the Classroom row already pointing at `sourceId` when there is one. */
  createMirror(input: Record<string, unknown>): Promise<{ id: string }>;
  /** Returns how many task rows were updated (must be 1). */
  linkMirror(itemId: string, mirrorId: string): Promise<number>;
  /** Returns how many Classroom rows were made visible. */
  revealMirrors(mirrorIds: string[]): Promise<number>;
  /** Flips the plan from draft to published; returns rows matched (must be 1). */
  publishPlan(planId: string, publishedAt: string): Promise<number>;
}

export function newPublishJob(
  input: {
    teacherId: string;
    studentId: string;
    title: string;
    weekStart: string;
    drafts: PublishDraft[];
  },
  makeId: () => string = () => crypto.randomUUID(),
): PublishJob {
  return {
    ...input,
    // A deep-enough copy that later builder edits cannot reach the job.
    drafts: input.drafts.map((d) => ({ ...d })),
    planKey: makeId(),
    itemKeys: input.drafts.map(() => makeId()),
    planId: null,
    itemIds: {},
    mirrorIds: {},
    linked: {},
    revealed: false,
    published: false,
  };
}

export function publishedTitle(job: Pick<PublishJob, 'title'>): string {
  return job.title.trim() || 'Weekly plan';
}

/** A late acknowledgment must not discard edits made after Publish. */
export function matchesPublishedBuilder(
  current: { title: string; weekStart: string; items: PublishDraft[] },
  job: Pick<PublishJob, 'title' | 'weekStart' | 'drafts'>,
): boolean {
  return current.title === job.title && current.weekStart === job.weekStart &&
    JSON.stringify(current.items) === JSON.stringify(job.drafts);
}

/** Curriculum suggestions with no saved assignment linked. Any of these blocks publishing. */
export function unlinkedCurriculum<D extends PublishDraft>(drafts: D[]): D[] {
  return drafts.filter((d) => !!d.curriculumDrillId && !d.action);
}

export function unlinkedCurriculumMessage(count: number): string {
  return (
    `${count} suggested curriculum drill${count === 1 ? ' is' : 's are'} not assigned yet. ` +
    'Assign each one through the usual assignment workflow first, then pick its saved assignment ' +
    'in the task\'s Link menu. Nothing has been saved.'
  );
}

function errorText(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}

function itemRow(job: PublishJob, idx: number, sortOrder: number) {
  const it = job.drafts[idx];
  const dayDate = parseISO(it.day);
  return {
    id: job.itemKeys[idx],
    weekly_plan_id: job.planId,
    student_id: job.studentId,
    day_date: it.day,
    title: it.title.trim(),
    estimated_minutes: it.estimatedMinutes ?? null,
    sort_order: sortOrder,
    status: 'assigned',
    unlock_at: startOfDay(dayDate).toISOString(),
    due_at: it.deadline ? new Date(it.deadline).toISOString() : endOfDay(dayDate).toISOString(),
    metadata_json: it.action ? { action: it.action } : {},
  };
}

/**
 * Run (or resume) a publish. Never throws; a failure comes back as an outcome
 * carrying the job with everything finished so far.
 */
export async function runPublish(start: PublishJob, deps: PublishDeps): Promise<PublishOutcome> {
  // Work on a copy so a caller holding the old job never sees half a stage.
  const job: PublishJob = {
    ...start,
    itemIds: { ...start.itemIds },
    mirrorIds: { ...start.mirrorIds },
    linked: { ...start.linked },
  };
  const title = publishedTitle(job);
  const indexes = job.drafts.map((_, i) => i);
  const sortOrder = prescribedSortOrder(job.drafts);
  const fail = (failedAt: PublishStage, message: string): PublishOutcome => ({ job, ok: false, failedAt, message });

  // 0. Refuse before any write.
  const unlinked = unlinkedCurriculum(job.drafts);
  if (unlinked.length > 0) return fail('blocked', unlinkedCurriculumMessage(unlinked.length));

  /** Null when the signed-in account is still the job's teacher. */
  const actorProblem = async (): Promise<PublishOutcome | null> => {
    let actor: string | null = null;
    try {
      actor = await deps.currentActorId();
    } catch {
      actor = null;
    }
    if (actor === job.teacherId) return null;
    return fail(
      'actor',
      actor
        ? 'You are now signed in as a different account, so this publish stopped before its next save.'
        : 'Your sign-in could not be confirmed, so this publish stopped before its next save.',
    );
  };

  // 1. plan, as a draft.
  if (!job.planId) {
    const blocked = await actorProblem();
    if (blocked) return blocked;
    try {
      const weekStart = parseISO(job.weekStart);
      const end = new Date(weekStart);
      end.setDate(weekStart.getDate() + 6);
      const pad = (n: number) => String(n).padStart(2, '0');
      const plan = await deps.insertDraftPlan({
        id: job.planKey,
        student_id: job.studentId,
        created_by: job.teacherId,
        title,
        week_start: job.weekStart,
        week_end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
        status: 'draft',
      });
      if (!plan?.id) return fail('plan', 'Saving the plan could not be confirmed.');
      job.planId = plan.id;
    } catch (e) {
      return fail('plan', `Saving the plan could not be confirmed (${errorText(e, 'no answer')}).`);
    }
  }

  // 2. task rows, only for drafts without one.
  const missingItems = indexes.filter((i) => !job.itemIds[i]);
  if (missingItems.length > 0) {
    const blocked = await actorProblem();
    if (blocked) return blocked;
    try {
      const saved = await deps.insertItems(missingItems.map((i) => itemRow(job, i, sortOrder[i])));
      // sort_order is unique within a plan, so it maps each saved row back to
      // its draft even if only some rows came back.
      for (const row of saved ?? []) {
        const idx = missingItems.find((i) => sortOrder[i] === row.sort_order);
        if (idx !== undefined) job.itemIds[idx] = row.id;
      }
    } catch (e) {
      return fail('items', `Saving the tasks could not be confirmed (${errorText(e, 'no answer')}).`);
    }
    const still = indexes.filter((i) => !job.itemIds[i]).length;
    if (still > 0) return fail('items', `${still} task${still === 1 ? '' : 's'} could not be confirmed as saved.`);
  }

  // 3. hidden Classroom rows, only for tasks without one.
  for (const i of indexes) {
    if (job.mirrorIds[i]) continue;
    const blocked = await actorProblem();
    if (blocked) return blocked;
    const it = job.drafts[i];
    const row = itemRow(job, i, sortOrder[i]);
    try {
      const mirror = await deps.createMirror({
        studentId: job.studentId,
        createdBy: job.teacherId,
        type: 'weekly_plan_task',
        title: row.title,
        description: title + (it.estimatedMinutes ? ` · ~${it.estimatedMinutes} min` : ''),
        unlockAt: row.unlock_at,
        dueAt: row.due_at,
        sourceTable: 'weekly_plan_items',
        sourceId: job.itemIds[i],
        visibleToStudent: false,
        status: 'assigned',
        notificationPolicy: 'suppressed',
        notificationGroupId: job.planKey,
        metadata: { weekly_plan_id: job.planId, day_date: it.day, estimated_minutes: row.estimated_minutes },
      });
      if (!mirror?.id) return fail('mirrors', `Adding "${row.title}" to Classroom could not be confirmed.`);
      job.mirrorIds[i] = mirror.id;
    } catch (e) {
      return fail('mirrors', `Adding "${row.title}" to Classroom could not be confirmed (${errorText(e, 'no answer')}).`);
    }
  }

  // 4. backlinks, each acknowledged by exactly one matched row.
  for (const i of indexes) {
    if (job.linked[i]) continue;
    const blocked = await actorProblem();
    if (blocked) return blocked;
    const name = job.drafts[i].title.trim();
    try {
      const matched = await deps.linkMirror(job.itemIds[i], job.mirrorIds[i]);
      if (matched !== 1) return fail('links', `Linking "${name}" to its Classroom row could not be confirmed.`);
      job.linked[i] = true;
    } catch (e) {
      return fail('links', `Linking "${name}" to its Classroom row could not be confirmed (${errorText(e, 'no answer')}).`);
    }
  }

  // 5. reveal every Classroom row at once.
  if (!job.revealed) {
    const blocked = await actorProblem();
    if (blocked) return blocked;
    const ids = indexes.map((i) => job.mirrorIds[i]);
    try {
      const matched = await deps.revealMirrors(ids);
      if (matched !== ids.length) return fail('reveal', 'Showing every task in Classroom could not be confirmed.');
      job.revealed = true;
    } catch (e) {
      return fail('reveal', `Showing the tasks in Classroom could not be confirmed (${errorText(e, 'no answer')}).`);
    }
  }

  // 6. published, last.
  if (!job.published) {
    const blocked = await actorProblem();
    if (blocked) return blocked;
    try {
      const matched = await deps.publishPlan(job.planId as string, new Date().toISOString());
      if (matched !== 1) return fail('publish', 'Marking the plan published could not be confirmed.');
      job.published = true;
    } catch (e) {
      return fail('publish', `Marking the plan published could not be confirmed (${errorText(e, 'no answer')}).`);
    }
  }

  return { job, ok: true };
}

/** What a stopped publish means for the student, in the teacher's words. */
export function stoppedPublishNote(outcome: Pick<PublishOutcome, 'failedAt' | 'job'>): string {
  const { job } = outcome;
  switch (outcome.failedAt) {
    case 'blocked':
      return 'Nothing was sent.';
    case 'plan':
      return 'A draft plan may or may not have been saved. The student cannot see drafts. Trying again looks for it first.';
    case 'actor':
      return (
        'Nothing more was sent under the new account. ' +
        (job.revealed
          ? 'The tasks may already be visible in the student\'s Classroom; the week is not published.'
          : job.planId
            ? 'What was saved before stays as a draft the student cannot see.'
            : 'No plan had been saved.')
      );
    case 'reveal':
      return 'Some tasks may already be visible in the student\'s Classroom, but the week itself is not published yet.';
    case 'publish':
      return 'The tasks are already visible in the student\'s Classroom. The week itself may not be published; trying again checks.';
    default:
      return 'What was saved is kept as a draft. The student cannot see this week yet.';
  }
}

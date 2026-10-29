import type { ManualChange } from "./teachingDeskModel";
export interface PendingManualCreate {
  actorId: string;
  key: string;
  change: ManualChange;
}
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const manualCreateStorageKey = (actorId: string) =>
  `teacher-home-manual-create:${actorId}`;
const normalize = (change: ManualChange): ManualChange => ({
  action: "create",
  title: change.title?.trim() ?? "",
  studentId: change.studentId ?? null,
  blocker: change.blocker ?? null,
});
export function readPendingManualCreate(
  actorId: string,
  store: Store = sessionStorage,
): PendingManualCreate | null {
  const raw = store.getItem(manualCreateStorageKey(actorId));
  if (!raw) return null;
  let pending: PendingManualCreate;
  try {
    pending = JSON.parse(raw);
  } catch {
    throw new Error(
      "The earlier task request could not be read. Review your saved tasks before creating another.",
    );
  }
  if (
    pending.actorId !== actorId ||
    typeof pending.key !== "string" ||
    !pending.key ||
    pending.change?.action !== "create" ||
    typeof pending.change.title !== "string" ||
    (pending.change.studentId !== null &&
      typeof pending.change.studentId !== "string") ||
    (pending.change.blocker !== null &&
      typeof pending.change.blocker !== "string")
  )
    throw new Error(
      "The earlier task request needs review. Its operation identity has been preserved.",
    );
  return pending;
}
export function prepareManualCreate(
  actorId: string,
  change: ManualChange,
  store: Store = sessionStorage,
): PendingManualCreate {
  const previous = readPendingManualCreate(actorId, store);
  const next = normalize(change);
  if (previous) {
    if (JSON.stringify(previous.change) !== JSON.stringify(next))
      throw new Error(
        "An earlier task may already have saved. Confirm the original request before creating another task.",
      );
    return previous;
  }
  const pending = { actorId, key: crypto.randomUUID(), change: next };
  store.setItem(manualCreateStorageKey(actorId), JSON.stringify(pending));
  return pending;
}
export function confirmManualCreate(
  pending: PendingManualCreate,
  store: Store = sessionStorage,
) {
  const current = readPendingManualCreate(pending.actorId, store);
  if (current?.key === pending.key)
    store.removeItem(manualCreateStorageKey(pending.actorId));
}

/** Only explicit database rejections prove a brand-new request did not apply. */
export function manualCreateWasRejected(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; message?: string };
  return (
    (value.code === "P0001" &&
      ["invalid_student", "invalid_blocker", "invalid_title"].includes(
        value.message ?? "",
      )) ||
    (value.code === "23514" &&
      /teacher_home_manual_title_check/.test(value.message ?? ""))
  );
}

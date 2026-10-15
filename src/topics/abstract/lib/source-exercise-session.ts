import { mirroredSetItem } from "@/lib/cloudMirror";
import { ANSWER_CHOICE_ITEMS, ROLE_CHOICE_SOURCE_CONTENT_SHA256 } from "../data/answerChoiceDrill";

export const SOURCE_REVIEW_TAG = "source_breakdown_reviewed";
export interface SourceDraft { requirements: string; example: string; revealed: boolean }
export interface SourceExerciseSession {
  version: 1;
  sourceHash: string;
  index: number;
  finished: boolean;
  reviewedIds: string[];
  practicedIds: string[];
  drafts: Record<string, SourceDraft>;
}
const ids = ANSWER_CHOICE_ITEMS.map((item) => item.id);
export function sourceSessionKey(userId?: string): string {
  return `lsatu_abstract_source_exercise_v1_${userId ? `user_${userId}` : "preview"}`;
}
export function emptySourceSession(): SourceExerciseSession {
  return { version: 1, sourceHash: ROLE_CHOICE_SOURCE_CONTENT_SHA256, index: 0, finished: false, reviewedIds: [], practicedIds: [], drafts: {} };
}
export function readSourceSession(raw: string | null): SourceExerciseSession | null {
  if (!raw || raw.length > 170000) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.sourceHash !== ROLE_CHOICE_SOURCE_CONTENT_SHA256 || !Number.isInteger(value.index) || value.index < 0 || value.index >= ids.length || typeof value.finished !== "boolean") return null;
    if (![value.reviewedIds, value.practicedIds].every((list) => Array.isArray(list) && list.length <= 15 && list.every((id) => ids.includes(id)))) return null;
    if (!value.drafts || typeof value.drafts !== "object" || Array.isArray(value.drafts)) return null;
    for (const [id, draft] of Object.entries(value.drafts)) {
      const item = draft as SourceDraft;
      if (!ids.includes(id) || !item || typeof item.requirements !== "string" || item.requirements.length > 5000 || typeof item.example !== "string" || item.example.length > 5000 || typeof item.revealed !== "boolean") return null;
    }
    return { ...value, reviewedIds: [...new Set(value.reviewedIds)], practicedIds: [...new Set(value.practicedIds)] };
  } catch { return null; }
}
export function loadSourceSession(key: string): SourceExerciseSession | null {
  try { return readSourceSession(localStorage.getItem(key)); } catch { return null; }
}
export function saveSourceSession(key: string, session: SourceExerciseSession): boolean {
  try {
    const raw = JSON.stringify(session);
    localStorage.setItem(key, raw);
    mirroredSetItem(key, raw);
    return true;
  } catch { return false; }
}
export function restoreSourceSession(saved: SourceExerciseSession | null, attempts: { drillId: string; trapTag?: string }[]): SourceExerciseSession {
  const session = saved ?? emptySourceSession();
  const practicedIds = [...new Set([...session.practicedIds, ...attempts.filter((a) => a.trapTag === "source_exercise_ungraded" && ids.includes(a.drillId)).map((a) => a.drillId)])];
  const reviewedIds = [...new Set([...session.reviewedIds, ...practicedIds, ...attempts.filter((a) => a.trapTag === SOURCE_REVIEW_TAG && ids.includes(a.drillId)).map((a) => a.drillId)])];
  if (saved) return { ...session, practicedIds, reviewedIds };
  const next = ids.findIndex((id) => !reviewedIds.includes(id));
  return { ...session, practicedIds, reviewedIds, index: next < 0 ? 14 : next, finished: next < 0 };
}

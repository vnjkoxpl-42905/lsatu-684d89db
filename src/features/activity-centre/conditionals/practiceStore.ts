import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConditionalQuestion } from "./content";
import type { ActivityItem, Verdict } from "../api/types";

export type PracticeMode = "general" | "linking" | "missing-link" | "must-be-true";
export type ConditionalPracticeTiming = "progressive" | "untimed" | "timed";
export interface PracticeAnswer {
  id: string;
  questionId: string;
  choiceId?: string;
  text: string;
  verdict: Verdict | null;
  attempt: number;
  revealed: boolean;
  at: string;
}
export interface PracticeRun {
  id: string;
  userId: string;
  mode: PracticeMode;
  createdAt: string;
  updatedAt: string;
  questions: ConditionalQuestion[];
  general?: { sourceUrl: string; items: ActivityItem[]; collectionId?: "conditional-rephrase"; timing?: ConditionalPracticeTiming };
  position: number;
  stage: "intro" | "paper" | "choices" | "feedback" | "done";
  /** Absolute deadline for the current General question; omitted for untimed questions. */
  paperDeadline?: string;
  selection: string;
  answers: PracticeAnswer[];
}
interface CachedRun { run: PracticeRun; revision: number | null; dirty: boolean; pending?: PracticeRun }
interface RunRow { id: string; user_id: string; snapshot: Pick<PracticeRun, "mode" | "questions" | "general" | "createdAt">; state: Omit<PracticeRun, "id" | "userId" | "mode" | "questions" | "general" | "createdAt">; revision: number }
const prefix = "lsatu:conditional-practice:v1:";
/** Older General sessions used their launch route as identity. Keep their snapshots intact. */
export function isConditionalRephraseRun(run: PracticeRun): boolean {
  if (run.mode !== "general" || !run.general?.items.length) return false;
  if (run.general.collectionId) return run.general.collectionId === "conditional-rephrase";
  return /^\/activities\/(?:[a-f\d-]{36}|preview\/7946f46b-e7f8-4c60-b405-4ece9c409deb)\/?$/i.test(run.general.sourceUrl);
}
const keyFor = (userId: string, id: string) => `${prefix}${userId}:${id}`;
const conflict = () => new Error("This session changed in another tab or device. Your device copy is kept, but it has not synced. Continue from the device with the latest session.");
class CacheError extends Error {}
class SyncError extends Error {}
// JSONB returns object keys in database order. Compare JSON values, preserving array order.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
// Keep the new relation typed until the generated database schema is refreshed.
type PracticeDatabase = {
  public: {
    Tables: {
      conditional_practice_runs: {
        Row: { [Key in keyof RunRow]: RunRow[Key] };
        Insert: { [Key in keyof RunRow]: RunRow[Key] };
        Update: Partial<Pick<RunRow, "state" | "revision">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
const table = () => (supabase as unknown as SupabaseClient<PracticeDatabase>).from("conditional_practice_runs");

export function readCachedRuns(userId: string): PracticeRun[] {
  const runs: PracticeRun[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${prefix}${userId}:`)) continue;
      const cached = readCache(userId, key.slice(`${prefix}${userId}:`.length));
      if (cached) runs.push(cached.run);
    }
  } catch (error) {
    if (error instanceof CacheError) throw error;
    throw new CacheError("Device storage could not be read. Existing saved copies have been kept; retry before continuing.");
  }
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
function readCache(userId: string, id: string): CachedRun | null {
  try {
    const raw = localStorage.getItem(keyFor(userId, id));
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedRun;
    if (cached.run?.userId !== userId || cached.run.id !== id || !Array.isArray(cached.run.answers)) {
      throw new CacheError("A saved practice session could not be read. Its stored copy has been kept.");
    }
    return cached;
  } catch (error) {
    if (error instanceof CacheError) throw error;
    throw new CacheError("A saved practice session could not be read. Its stored copy has been kept.");
  }
}
function writeCache(cached: CachedRun) {
  try {
    localStorage.setItem(keyFor(cached.run.userId, cached.run.id), JSON.stringify(cached));
  } catch {
    throw new CacheError("Device storage could not save this change. Keep this page open and retry before continuing.");
  }
}
export function cachePracticeRun(run: PracticeRun): void {
  const previous = readCache(run.userId, run.id);
  if (previous && (canonical(toRow(previous.run).snapshot) !== canonical(toRow(run).snapshot)
    || previous.run.updatedAt > run.updatedAt
    || previous.run.answers.length > run.answers.length
    || previous.run.answers.some((answer, index) => canonical(answer) !== canonical(run.answers[index])))) throw conflict();
  writeCache({ run, revision: previous?.revision ?? null, dirty: true, pending: previous?.pending });
}
export function createPracticeRun(userId: string, mode: PracticeMode, questions: ConditionalQuestion[], general?: PracticeRun["general"]): PracticeRun {
  const now = new Date().toISOString();
  const run: PracticeRun = { id: crypto.randomUUID(), userId, mode, createdAt: now, updatedAt: now,
    questions: structuredClone(questions), general: general ? structuredClone(general) : undefined,
    position: 0, stage: "paper", selection: "", answers: [] };
  cachePracticeRun(run);
  return run;
}
function toRow(run: PracticeRun) {
  const { id, userId, mode, questions, general, createdAt, ...state } = run;
  return { id, user_id: userId, snapshot: { mode, questions, ...(general ? { general } : {}), createdAt }, state };
}
function fromRow(row: RunRow): PracticeRun {
  return { id: row.id, userId: row.user_id, ...row.snapshot, ...row.state };
}
const uploads = new Map<string, Promise<void>>();
export function syncPracticeRun(userId: string, id: string): Promise<void> {
  const key = keyFor(userId, id);
  const existing = uploads.get(key);
  if (existing) return existing;
  const upload = uploadPending(userId, id).catch(error => {
    if (error instanceof CacheError || (error instanceof Error && error.message.includes("another tab"))) throw error;
    throw new SyncError("Saved on this device. Account sync is unavailable; keep using this device and retry syncing when connected.");
  }).finally(() => uploads.delete(key));
  uploads.set(key, upload);
  return upload;
}
async function uploadPending(userId: string, id: string): Promise<void> {
  for (;;) {
    const outgoing = readCache(userId, id);
    if (!outgoing?.dirty) return;
    // Keep the attempted payload until acknowledged, even if more answers arrive.
    const attempted = outgoing.pending ?? outgoing.run;
    if (!outgoing.pending) writeCache({ ...outgoing, pending: attempted });
    const row = toRow(attempted);
    let revision: number;
    if (outgoing.revision === null) {
      const { error } = await table().insert({ ...row, revision: 0 });
      if (error) {
        if (error.code !== "23505") throw error;
        // A response can be lost after a successful insert. Only accept that
        // retry when the remote record is exactly the snapshot being uploaded.
        const remote = await table().select("*").eq("id", id).eq("user_id", userId).single();
        if (remote.error) throw remote.error;
        const remoteRun = fromRow(remote.data as unknown as RunRow);
        if (canonical(toRow(remoteRun)) !== canonical(row)) throw conflict();
        revision = (remote.data as unknown as RunRow).revision;
      } else revision = 0;
    } else {
      revision = outgoing.revision + 1;
      const result = await table().update({ state: row.state, revision })
        .eq("id", id).eq("user_id", userId).eq("revision", outgoing.revision).select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) {
        const remote = await table().select("*").eq("id", id).eq("user_id", userId).single();
        if (remote.error) throw remote.error;
        const remoteRow = remote.data as unknown as RunRow;
        if (remoteRow.revision !== revision || canonical(toRow(fromRow(remoteRow))) !== canonical(row)) throw conflict();
      }
    }
    const latest = readCache(userId, id);
    if (!latest) return;
    writeCache({ run: latest.run, revision, dirty: canonical(latest.run) !== canonical(attempted) });
  }
}
export async function loadPracticeRuns(userId: string): Promise<PracticeRun[]> {
  const { data, error } = await table().select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  for (const row of (data ?? []) as unknown as RunRow[]) {
    if (row.user_id !== userId) throw new Error("The account session could not be verified. Reload before continuing.");
    const local = readCache(userId, row.id);
    if (!local?.dirty && (local?.revision == null || row.revision >= local.revision)) {
      writeCache({ run: fromRow(row), revision: row.revision, dirty: false });
    }
  }
  return readCachedRuns(userId);
}
export async function syncPendingPractice(userId: string): Promise<void> {
  const results = await Promise.allSettled(readCachedRuns(userId).map(run => syncPracticeRun(userId, run.id)));
  const failed = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failed) throw failed.reason;
}

export function practiceSaveMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? "Connection unavailable");
  if (error instanceof CacheError || error instanceof SyncError || message.includes("another tab")) return message;
  return "Account history could not be loaded. Device copies have been kept; retry when connected.";
}

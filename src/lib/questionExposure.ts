import { supabase } from "@/integrations/supabase/client";

// Mirrors the silent-skip pattern in src/lib/lastActivity.ts. Treats "table
// not deployed yet" as a no-op instead of a write failure to surface, so the
// student isn't blasted with toasts during a deploy race.
function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  return /relation .*question_exposures.* does not exist/i.test(e.message ?? "");
}

// Bulk insert. Throws on any real Supabase error; silent skip if the table
// isn't deployed yet. Callers fire-and-forget — exposure writes never block
// the student's flow, but a real RLS / transport failure still surfaces.
export async function recordExposures(userId: string, qids: string[]): Promise<void> {
  if (!userId || qids.length === 0) return;
  const rows = qids.map((qid) => ({ user_id: userId, question_id: qid }));
  const { error } = await (supabase as any).from("question_exposures").insert(rows);
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[questionExposure] question_exposures table not deployed yet; skipping insert");
      return;
    }
    throw new Error(`recordExposures failed: ${error.message}`);
  }
}

// Returns the user's most recent N exposed qids as a Set, for O(1) exclusion
// checks at the selector layer. Empty Set on missing-table or zero history.
export async function getRecentExposureSet(
  userId: string,
  windowSize = 500,
): Promise<Set<string>> {
  if (!userId) return new Set();
  const { data, error } = await (supabase as any)
    .from("question_exposures")
    .select("question_id")
    .eq("user_id", userId)
    .not("question_id", "like", "rc:%")
    .order("shown_at", { ascending: false })
    .limit(windowSize);
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[questionExposure] question_exposures table not deployed yet; returning empty set");
      return new Set();
    }
    throw new Error(`getRecentExposureSet failed: ${error.message}`);
  }
  const set = new Set<string>();
  for (const row of data ?? []) {
    const r = row as { question_id: string };
    if (r.question_id) set.add(r.question_id);
  }
  return set;
}

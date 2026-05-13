import { supabase } from "@/integrations/supabase/client";

export type DrillSnapshot = {
  kind: "drill";
  mode: string;
  qids: string[];
  current_index: number;
  current_qid: string;
  assignment_id?: string;
  label: string;
};

export type SectionSnapshot = {
  kind: "section";
  pt: number;
  section_number: number;
  qids: string[];
  current_qid: string;
  current_index: number;
  label: string;
};

export type BootcampStepSnapshot = {
  kind: "bootcamp_step";
  bootcamp_id: string;
  lesson_id: string;
  step_index: number;
  label: string;
};

export type LastActivitySnapshot = DrillSnapshot | SectionSnapshot | BootcampStepSnapshot;

export type LastActivityType = LastActivitySnapshot["kind"];

export interface LastActivityRow {
  user_id: string;
  activity_type: LastActivityType;
  activity_id: string;
  state_snapshot: LastActivitySnapshot;
  updated_at: string;
}

// Recognizes the "the user_last_activity table hasn't been deployed yet"
// error so we can silently skip during the deploy race instead of spamming
// the student with a toast on every drill advance + lesson view. Real
// errors (RLS denial, transport failure, schema drift on a deployed table)
// still throw and surface through the call site's catch.
function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  return /relation .*user_last_activity.* does not exist/i.test(e.message ?? "");
}

// Throws on any real Supabase error. Returns silently (no-op) when the
// table itself isn't deployed yet — that's a deploy race, not a write
// failure to surface.
export async function upsertLastActivity(
  userId: string,
  snapshot: LastActivitySnapshot,
): Promise<void> {
  const activity_type: LastActivityType = snapshot.kind;
  const activity_id = activityIdFor(snapshot);
  const { error } = await (supabase as any)
    .from("user_last_activity")
    .upsert(
      {
        user_id: userId,
        activity_type,
        activity_id,
        state_snapshot: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[lastActivity] user_last_activity table not deployed yet; skipping upsert");
      return;
    }
    throw new Error(`upsertLastActivity failed: ${error.message}`);
  }
}

// Returns null when the user has no recorded activity yet OR when the
// table isn't deployed yet. Throws on real transport errors.
export async function getLastActivity(userId: string): Promise<LastActivityRow | null> {
  const { data, error } = await (supabase as any)
    .from("user_last_activity")
    .select("user_id, activity_type, activity_id, state_snapshot, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[lastActivity] user_last_activity table not deployed yet; treating as empty");
      return null;
    }
    throw new Error(`getLastActivity failed: ${error.message}`);
  }
  if (!data) return null;
  return data as unknown as LastActivityRow;
}

function activityIdFor(snapshot: LastActivitySnapshot): string {
  switch (snapshot.kind) {
    case "drill":
      return snapshot.assignment_id ?? `${snapshot.mode}:${snapshot.current_qid}`;
    case "section":
      return `PT${snapshot.pt}-S${snapshot.section_number}`;
    case "bootcamp_step":
      return `${snapshot.bootcamp_id}:${snapshot.lesson_id}:${snapshot.step_index}`;
  }
}

// Resolves where the Resume CTA should navigate. Returns a tuple of
// (path, optional react-router state). Callers pass the state to navigate().
export function resolveResumeTarget(
  snapshot: LastActivitySnapshot,
): { path: string; state?: unknown } {
  switch (snapshot.kind) {
    case "drill":
      return {
        path: "/drill",
        state: {
          mode: snapshot.mode,
          config: {
            qtypes: [],
            difficulties: [],
            pts: [],
            count: snapshot.qids.length,
            selectedQids: snapshot.qids,
            resumeIndex: snapshot.current_index,
          },
          assignmentId: snapshot.assignment_id,
        },
      };
    case "section":
      return {
        path: "/drill",
        state: {
          mode: "section",
          config: {
            qtypes: [],
            difficulties: [],
            pts: [snapshot.pt],
            count: snapshot.qids.length,
            selectedQids: snapshot.qids,
            resumeIndex: snapshot.current_index,
            section_number: snapshot.section_number,
          },
        },
      };
    case "bootcamp_step":
      return {
        path: `/bootcamp/${snapshot.bootcamp_id}/lessons/${snapshot.lesson_id}`,
        state: { step_index: snapshot.step_index },
      };
  }
}

export function labelFor(snapshot: LastActivitySnapshot): string {
  return snapshot.label;
}

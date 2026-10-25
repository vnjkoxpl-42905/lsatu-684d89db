import { rcDb, RC_ATTEMPTS_TABLE, RC_SESSIONS_TABLE, type RcAttemptRow, type RcDrillSessionRow } from "@/features/rc/api/rcSupabase.types";
import { loadRcQuestionIndex } from "@/features/rc/lib/rcBank";
import { buildRcReviewQueue } from "./rcReviewAdapter";

const PAGE_SIZE = 500;

async function ownedRows<T>(table: string, userId: string, dateColumn: string): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await rcDb.from(table)
      .select("*")
      .eq("user_id", userId)
      .order(dateColumn, { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function loadRcReviewQueue(userId: string) {
  const [sessions, attempts, index] = await Promise.all([
    ownedRows<RcDrillSessionRow>(RC_SESSIONS_TABLE, userId, "started_at"),
    ownedRows<RcAttemptRow>(RC_ATTEMPTS_TABLE, userId, "created_at"),
    loadRcQuestionIndex(),
  ]);
  return buildRcReviewQueue(attempts, sessions, index.questions);
}

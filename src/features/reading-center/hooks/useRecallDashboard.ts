import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { activityRevocationAvailable } from "@/features/activity-centre/api/activityRevocation";
import type { ActivityAssignmentSummary } from "@/features/activity-centre/api/types";
import type { SectionGradeStub } from "@/features/activity-centre/api/types";
import type { Progress, ReadingSession } from "../lib/types";
import { rcDb } from "../lib/db";
import { readingCenterKey } from "../lib/persistence";
import type { DashboardPassage } from "../lib/dashboard";

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

async function allPages<T>(request: (offset: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await request(offset);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function loadRecallDashboard(userId: string) {
  const revocationColumns = await activityRevocationAvailable() ? ",revoked_at" : "";
  const [assignments, grades] = await Promise.all([
    allPages<ActivityAssignmentSummary>(offset => rcDb("activity_assignments")
      .select(`id,student_id,title,mode,source_section,status,created_at,started_at,completed_at${revocationColumns}`)
      .eq("student_id", userId).eq("mode", "section").eq("item_format", "spoken-recall")
      .order("created_at", { ascending: false }).order("id").range(offset, offset + 999)),
    allPages<SectionGradeStub>(offset => rcDb("activity_section_grades")
      .select("assignment_id,attempt_no,source_section,section,graded_at")
      .eq("student_id", userId).order("graded_at", { ascending: false })
      .order("assignment_id").order("attempt_no").range(offset, offset + 999)),
  ]);
  return { assignments, grades };
}

export function loadDashboardSessions(userId: string) {
  return allPages<ReadingSession>(offset => rcDb("reading_center_sessions")
    .select("id,passage_id,reading_mode,wpm,words_read,active_ms,paused_ms,started_at,ended_at")
    .eq("user_id", userId).order("started_at").order("id").range(offset, offset + 999));
}

export function loadDashboardProgress(userId: string) {
  return allPages<Progress>(offset => rcDb("reading_center_progress")
    .select("passage_id,word_index,completed_at,last_opened_at,hidden_from_recent")
    .eq("user_id", userId).order("passage_id").range(offset, offset + 999));
}

export async function loadDashboardPassages(userId: string) {
  const [passages, metadata] = await Promise.all([
    allPages<DashboardPassage>(offset => rcDb("reading_center_passages")
      .select("id,slug,title").or(`owner_id.is.null,owner_id.eq.${userId}`)
      .order("id").range(offset, offset + 999)),
    allPages<{ passage_id: string; hidden: boolean; title_override: string | null }>(offset => rcDb("reading_center_passage_metadata")
      .select("passage_id,hidden,title_override").eq("user_id", userId)
      .order("passage_id").range(offset, offset + 999)),
  ]);
  const byId = new Map(metadata.map(row => [row.passage_id, row]));
  return passages.filter(p => !byId.get(p.id)?.hidden)
    .map(p => ({ ...p, title: byId.get(p.id)?.title_override ?? p.title }));
}

export function useDashboardPassages() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "dashboard-passages"), enabled: !!user,
    queryFn: () => loadDashboardPassages(user!.id) });
}

export function useDashboardSessions() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "dashboard-sessions"), enabled: !!user,
    queryFn: () => loadDashboardSessions(user!.id) });
}

export function useDashboardProgress() {
  const { user } = useAuth();
  return useQuery({ queryKey: readingCenterKey(user?.id, "dashboard-progress"), enabled: !!user,
    queryFn: () => loadDashboardProgress(user!.id) });
}

export function useRecallDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: readingCenterKey(user?.id, "recall-dashboard"), enabled: !!user,
    queryFn: () => loadRecallDashboard(user!.id),
  });
}

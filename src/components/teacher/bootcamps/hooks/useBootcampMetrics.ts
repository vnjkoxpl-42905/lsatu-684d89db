import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BootcampTopicDef } from "../topicRegistry";
import { isUngradedAttempt } from "@/topics/abstract/lib/grading-status";

// All admin-side read hooks. Errors surface via toast and the React Query
// `error` field so callers can render an error state instead of silent zeros.

function surfaceError(label: string, err: unknown) {
  console.error(`[bootcamps] ${label}`, err);
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : "Unknown error";
  toast.error(`Could not load ${label}.`, { description: msg });
}

// Normalized attempt row, source-agnostic. `mode` holds whichever column the
// topic matches drills against (`attempts.mode` or, for topics with their own
// table, that table's mode column). `ts` is the activity timestamp.
interface NormalizedAttempt {
  user_id: string | null;
  correct: boolean;
  mode: string;
  ts: string | null;
  graded: boolean;
}

// Reads a topic's drill attempts from the correct table. Default is the shared
// `attempts` table; topics declaring `attemptsSource` read their own table.
// Throws on error so callers can surface a labeled toast and let React Query
// render an error state instead of silent zeros.
async function fetchTopicAttempts(
  topic: BootcampTopicDef,
  opts?: { userId?: string },
): Promise<NormalizedAttempt[]> {
  const modes = topic.drills.map((d) => d.attemptMode);

  if (topic.attemptsSource?.table === "abstract_drill_attempts") {
    let q = supabase
      .from("abstract_drill_attempts")
      .select("user_id, correct, drill_type, completed_at, trap_tag")
      .in("drill_type", modes);
    if (opts?.userId) q = q.eq("user_id", opts.userId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      user_id: r.user_id,
      correct: !!r.correct,
      mode: r.drill_type,
      ts: r.completed_at,
      graded: !isUngradedAttempt(r.trap_tag ?? undefined),
    }));
  }

  let q = supabase
    .from("attempts")
    .select("user_id, correct, mode, timestamp_iso")
    .in("mode", modes);
  if (opts?.userId) q = q.eq("user_id", opts.userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    user_id: r.user_id,
    correct: !!r.correct,
    mode: r.mode,
    ts: r.timestamp_iso,
    graded: true,
  }));
}

// Only chapter_progress rows whose section_id is one of the topic's canonical
// sections count toward completion. Abstract mirrors many non-lesson rows
// (translator_stem_*, gauntlet_*, module_*) into chapter_progress for activity
// tracking; counting those would push completion past 100%.
function canonicalSectionFilter(topic: BootcampTopicDef): (sectionId: string) => boolean {
  const canonical = new Set(topic.chapterSections.map((s) => s.id));
  return (sectionId: string) => canonical.has(sectionId);
}

export interface TopicAggregate {
  topicId: string;
  studentsEnrolled: number;
  studentsActive: number;
  avgChapterCompletionPct: number;
  avgDrillAccuracyPct: number | null;
  flashcardsReviewed: number;
  flashcardTotal: number;
}

// All-bootcamps grid. One aggregate row per topic. The query fans out a single
// fetch per topic, since each topic has its own attempt-mode pattern and its
// own chapter section count. For 1-3 topics this is fine; if the list grows
// beyond ~10 topics, fold into one Edge Function aggregation.
export function useTopicAggregate(topics: BootcampTopicDef[]) {
  return useQuery({
    queryKey: ["bootcamps", "aggregate", topics.map((t) => t.id).join(",")],
    queryFn: async (): Promise<TopicAggregate[]> => {
      const out: TopicAggregate[] = [];
      for (const topic of topics) {
        const isCanonicalSection = canonicalSectionFilter(topic);

        let attempts: NormalizedAttempt[];
        try {
          attempts = await fetchTopicAttempts(topic);
        } catch (err) {
          surfaceError(`${topic.name} attempts`, err);
          throw err;
        }

        const [chapterRes, flashcardRes] = await Promise.all([
          supabase
            .from("chapter_progress")
            .select("user_id, section_id")
            .eq("topic_tag", topic.topicTag),
          supabase
            .from("flashcard_reviews")
            .select("user_id, card_id, reviewed_at")
            .eq("topic_tag", topic.topicTag),
        ]);

        if (chapterRes.error) {
          surfaceError(`${topic.name} chapter progress`, chapterRes.error);
          throw chapterRes.error;
        }
        if (flashcardRes.error) {
          surfaceError(`${topic.name} flashcards`, flashcardRes.error);
          throw flashcardRes.error;
        }

        const chapter = chapterRes.data ?? [];
        const flashcards = flashcardRes.data ?? [];

        const studentIdsAttempts = new Set(
          attempts.map((a) => a.user_id).filter((id): id is string => !!id),
        );
        const studentIdsChapter = new Set(
          chapter.map((c) => c.user_id).filter((id): id is string => !!id),
        );
        const studentIdsFlash = new Set(
          flashcards.map((f) => f.user_id).filter((id): id is string => !!id),
        );

        const enrolled = new Set([
          ...studentIdsAttempts,
          ...studentIdsChapter,
          ...studentIdsFlash,
        ]);
        // "Active" = any activity in the last 14 days.
        const fourteenDaysAgo = new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const recentlyActive = new Set<string>();
        for (const f of flashcards) {
          if (f.user_id && f.reviewed_at > fourteenDaysAgo) {
            recentlyActive.add(f.user_id);
          }
        }
        for (const attempt of attempts) {
          if (attempt.user_id && attempt.ts && attempt.ts > fourteenDaysAgo) {
            recentlyActive.add(attempt.user_id);
          }
        }
        const chapterRecentRes = await supabase
          .from("chapter_progress")
          .select("user_id, last_viewed_at")
          .eq("topic_tag", topic.topicTag)
          .gte("last_viewed_at", fourteenDaysAgo);
        if (chapterRecentRes.error) {
          surfaceError(`${topic.name} recent activity`, chapterRecentRes.error);
          throw chapterRecentRes.error;
        }
        for (const c of chapterRecentRes.data ?? []) {
          if (c.user_id) recentlyActive.add(c.user_id);
        }

        const gradedAttempts = attempts.filter((a) => a.graded);
        const correctCount = gradedAttempts.filter((a) => a.correct).length;
        const avgDrillAccuracyPct =
          gradedAttempts.length === 0
            ? null
            : Math.round((correctCount / gradedAttempts.length) * 100);

        // Average chapter completion = average over enrolled students of
        // (distinct sections viewed / total sections). Students with zero
        // activity are excluded so an empty topic stays 0%, not NaN.
        const sectionsPerStudent: Record<string, Set<string>> = {};
        for (const c of chapter) {
          if (!c.user_id) continue;
          if (!isCanonicalSection(c.section_id)) continue;
          (sectionsPerStudent[c.user_id] ??= new Set()).add(c.section_id);
        }
        const completionRatios = Object.values(sectionsPerStudent).map(
          (s) => s.size / Math.max(topic.chapterSectionCount, 1),
        );
        const avgChapterCompletionPct =
          completionRatios.length === 0
            ? 0
            : Math.round(
                (completionRatios.reduce((sum, r) => sum + r, 0) /
                  completionRatios.length) *
                  100,
              );

        out.push({
          topicId: topic.id,
          studentsEnrolled: enrolled.size,
          studentsActive: recentlyActive.size,
          avgChapterCompletionPct,
          avgDrillAccuracyPct,
          flashcardsReviewed: new Set(
            flashcards.map((f) => `${f.user_id}:${f.card_id}`),
          ).size,
          flashcardTotal: topic.flashcardTotal * Math.max(enrolled.size, 1),
        });
      }
      return out;
    },
    staleTime: 60_000,
  });
}

export interface BootcampStudentRow {
  userId: string;
  displayName: string;
  email: string | null;
  completionPct: number;
  drillAccuracyPct: number;
  attemptsCount: number;
  flashcardsReviewed: number;
  lastActivityIso: string | null;
}

// Detail view: per-student rows scoped to a single topic.
export function useBootcampStudents(topic: BootcampTopicDef | undefined) {
  return useQuery({
    queryKey: ["bootcamps", "students", topic?.id],
    enabled: !!topic,
    queryFn: async (): Promise<BootcampStudentRow[]> => {
      if (!topic) return [];
      const isCanonicalSection = canonicalSectionFilter(topic);

      let attempts: NormalizedAttempt[];
      try {
        attempts = await fetchTopicAttempts(topic);
      } catch (err) {
        surfaceError("drill attempts", err);
        throw err;
      }

      const [studentsRes, profilesRes, chapterRes, flashRes] =
        await Promise.all([
          supabase.from("students").select("user_id, class_id"),
          supabase.from("profiles").select("class_id, display_name"),
          supabase
            .from("chapter_progress")
            .select("user_id, section_id, last_viewed_at")
            .eq("topic_tag", topic.topicTag),
          supabase
            .from("flashcard_reviews")
            .select("user_id, card_id, reviewed_at")
            .eq("topic_tag", topic.topicTag),
        ]);

      if (studentsRes.error) {
        surfaceError("student roster", studentsRes.error);
        throw studentsRes.error;
      }
      if (profilesRes.error) {
        surfaceError("student profiles", profilesRes.error);
        throw profilesRes.error;
      }
      if (chapterRes.error) {
        surfaceError("chapter progress", chapterRes.error);
        throw chapterRes.error;
      }
      if (flashRes.error) {
        surfaceError("flashcard reviews", flashRes.error);
        throw flashRes.error;
      }

      const classIdByUserId = new Map<string, string>();
      for (const s of studentsRes.data ?? []) {
        if (s.user_id) classIdByUserId.set(s.user_id, s.class_id);
      }
      const profileByClassId = new Map<string, { display_name: string | null }>();
      for (const p of profilesRes.data ?? []) {
        profileByClassId.set(p.class_id, { display_name: p.display_name });
      }
      function nameOf(userId: string): string {
        const cid = classIdByUserId.get(userId);
        const dn = cid ? profileByClassId.get(cid)?.display_name : null;
        return dn ?? "Student";
      }

      const perStudent: Record<
        string,
        {
          sections: Set<string>;
          attempts: { correct: boolean; ts: string | null }[];
          cards: Set<string>;
          lastActivity: string | null;
        }
      > = {};

      function bump(uid: string | null, ts: string | null) {
        if (!uid) return;
        const row = (perStudent[uid] ??= {
          sections: new Set(),
          attempts: [],
          cards: new Set(),
          lastActivity: null,
        });
        if (ts && (!row.lastActivity || ts > row.lastActivity)) {
          row.lastActivity = ts;
        }
      }

      for (const a of attempts) {
        bump(a.user_id, a.ts);
        if (a.user_id && a.graded) {
          perStudent[a.user_id].attempts.push({
            correct: a.correct,
            ts: a.ts,
          });
        }
      }
      for (const c of chapterRes.data ?? []) {
        bump(c.user_id, c.last_viewed_at);
        if (c.user_id && isCanonicalSection(c.section_id)) {
          perStudent[c.user_id].sections.add(c.section_id);
        }
      }
      for (const f of flashRes.data ?? []) {
        bump(f.user_id, f.reviewed_at);
        if (f.user_id) perStudent[f.user_id].cards.add(f.card_id);
      }

      return Object.entries(perStudent).map(([userId, row]) => {
        const correct = row.attempts.filter((a) => a.correct).length;
        return {
          userId,
          displayName: nameOf(userId),
          email: null,
          completionPct: Math.round(
            (row.sections.size / Math.max(topic.chapterSectionCount, 1)) * 100,
          ),
          drillAccuracyPct:
            row.attempts.length === 0
              ? 0
              : Math.round((correct / row.attempts.length) * 100),
          attemptsCount: row.attempts.length,
          flashcardsReviewed: row.cards.size,
          lastActivityIso: row.lastActivity,
        } satisfies BootcampStudentRow;
      });
    },
    staleTime: 60_000,
  });
}

export interface DrillBreakdownRow {
  attemptMode: string;
  label: string;
  attempts: number;
  correct: number;
  accuracyPct: number;
}

// Detail view: per-drill aggregate across all students in the topic.
export function useDrillBreakdown(topic: BootcampTopicDef | undefined) {
  return useQuery({
    queryKey: ["bootcamps", "drill-breakdown", topic?.id],
    enabled: !!topic,
    queryFn: async (): Promise<DrillBreakdownRow[]> => {
      if (!topic) return [];
      let data: NormalizedAttempt[];
      try {
        data = await fetchTopicAttempts(topic);
      } catch (error) {
        surfaceError("drill breakdown", error);
        throw error;
      }
      return topic.drills.map((d) => {
        const rows = data.filter((r) => r.mode === d.attemptMode && r.graded);
        const correct = rows.filter((r) => r.correct).length;
        return {
          attemptMode: d.attemptMode,
          label: d.label,
          attempts: rows.length,
          correct,
          accuracyPct:
            rows.length === 0 ? 0 : Math.round((correct / rows.length) * 100),
        };
      });
    },
    staleTime: 60_000,
  });
}

export interface StudentTopicDetail {
  topicId: string;
  sectionsViewed: { section_id: string; last_viewed_at: string }[];
  drillStats: DrillBreakdownRow[];
  flashcardStats: {
    reviewed: number;
    total: number;
    masteryPct: number;
    dueCount: number;
    avgIntervalDays: number;
  };
  playgroundSessions: number;
  lastActivityIso: string | null;
}

export function useStudentTopicDetail(
  studentUserId: string | undefined,
  topic: BootcampTopicDef | undefined,
) {
  return useQuery({
    queryKey: ["bootcamps", "student-topic", studentUserId, topic?.id],
    enabled: !!studentUserId && !!topic,
    queryFn: async (): Promise<StudentTopicDetail | null> => {
      if (!studentUserId || !topic) return null;

      let attempts: NormalizedAttempt[];
      try {
        attempts = await fetchTopicAttempts(topic, { userId: studentUserId });
      } catch (err) {
        surfaceError("drill attempts", err);
        throw err;
      }

      const [chapterRes, flashRes] = await Promise.all([
        supabase
          .from("chapter_progress")
          .select("section_id, last_viewed_at")
          .eq("user_id", studentUserId)
          .eq("topic_tag", topic.topicTag),
        supabase
          .from("flashcard_reviews")
          .select("card_id, due_at, interval_days, reviewed_at")
          .eq("user_id", studentUserId)
          .eq("topic_tag", topic.topicTag),
      ]);

      if (chapterRes.error) {
        surfaceError("chapter progress", chapterRes.error);
        throw chapterRes.error;
      }
      if (flashRes.error) {
        surfaceError("flashcard reviews", flashRes.error);
        throw flashRes.error;
      }

      const sectionsViewed = (chapterRes.data ?? []).map((c) => ({
        section_id: c.section_id,
        last_viewed_at: c.last_viewed_at,
      }));

      const drillStats: DrillBreakdownRow[] = topic.drills.map((d) => {
        const rows = attempts.filter((r) => r.mode === d.attemptMode && r.graded);
        const correct = rows.filter((r) => r.correct).length;
        return {
          attemptMode: d.attemptMode,
          label: d.label,
          attempts: rows.length,
          correct,
          accuracyPct:
            rows.length === 0 ? 0 : Math.round((correct / rows.length) * 100),
        };
      });

      // Per-card most-recent review for mastery + due calculations.
      const latestByCard = new Map<
        string,
        { due_at: string; interval_days: number; reviewed_at: string }
      >();
      for (const r of flashRes.data ?? []) {
        const prev = latestByCard.get(r.card_id);
        if (!prev || r.reviewed_at > prev.reviewed_at) {
          latestByCard.set(r.card_id, r);
        }
      }
      const reviewed = latestByCard.size;
      const total = topic.flashcardTotal;
      // Mastery proxy: any card whose latest interval is ≥ 7 days.
      let mastered = 0;
      let intervalSum = 0;
      let due = 0;
      const nowIso = new Date().toISOString();
      for (const r of latestByCard.values()) {
        if (r.interval_days >= 7) mastered++;
        intervalSum += r.interval_days;
        if (r.due_at <= nowIso) due++;
      }
      const avgIntervalDays =
        reviewed === 0 ? 0 : Math.round((intervalSum / reviewed) * 10) / 10;

      const allTs = [
        ...sectionsViewed.map((s) => s.last_viewed_at),
        ...(attempts.map((a) => a.ts).filter(Boolean) as string[]),
        ...(flashRes.data ?? []).map((f) => f.reviewed_at),
      ];
      const lastActivityIso = allTs.length
        ? allTs.reduce((a, b) => (a > b ? a : b))
        : null;

      return {
        topicId: topic.id,
        sectionsViewed,
        drillStats,
        flashcardStats: {
          reviewed,
          total,
          masteryPct:
            total === 0 ? 0 : Math.round((mastered / total) * 100),
          dueCount: due,
          avgIntervalDays,
        },
        // Playground is ungraded. Without a playground_sessions table we
        // surface 0 and document the gap in the UI. Future work: add a
        // lightweight playground_sessions table.
        playgroundSessions: 0,
        lastActivityIso,
      };
    },
    staleTime: 30_000,
  });
}

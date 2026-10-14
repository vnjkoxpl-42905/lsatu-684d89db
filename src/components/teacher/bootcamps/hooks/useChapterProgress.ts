import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AttemptResult =
  | { ok: true }
  | { ok: false; error: unknown };

// useRecordChapterSection: write-only helper for tracking "this student
// viewed section X of topic Y." Upserts on (user_id, topic_tag, section_id).
// Increments view_count + bumps last_viewed_at on subsequent views. The hook
// also de-dupes calls within a single session via an in-memory cache so an
// IntersectionObserver firing several times for the same section produces a
// single network call.

export function useRecordChapterSection() {
  const { user } = useAuth();
  const seenRef = useRef<Set<string>>(new Set());

  return useCallback(
    async (topicTag: string, sectionId: string): Promise<AttemptResult> => {
      if (!user) return { ok: true };
      const cacheKey = `${topicTag}:${sectionId}`;
      if (seenRef.current.has(cacheKey)) return { ok: true };
      seenRef.current.add(cacheKey);

      const nowIso = new Date().toISOString();

      // First try INSERT. If a row already exists, fall back to UPDATE that
      // bumps view_count and last_viewed_at.
      const insertRes = await supabase.from("chapter_progress").insert({
        user_id: user.id,
        topic_tag: topicTag,
        section_id: sectionId,
        first_viewed_at: nowIso,
        last_viewed_at: nowIso,
        view_count: 1,
      });

      if (!insertRes.error) return { ok: true };

      // Duplicate primary key: update existing row.
      const isUniqueViolation =
        typeof insertRes.error === "object" &&
        insertRes.error !== null &&
        "code" in insertRes.error &&
        insertRes.error.code === "23505";

      if (isUniqueViolation) {
        // We can't atomically increment via the JS client; pull view_count,
        // add one, write back. Acceptable: a tiny race overcounts by 1.
        const { data, error: selErr } = await supabase
          .from("chapter_progress")
          .select("view_count")
          .eq("user_id", user.id)
          .eq("topic_tag", topicTag)
          .eq("section_id", sectionId)
          .maybeSingle();

        if (selErr) {
          toast.error("Could not record section view.", {
            description: selErr.message,
          });
          // Drop the cache key so a retry can happen.
          seenRef.current.delete(cacheKey);
          return { ok: false, error: selErr };
        }

        const updateRes = await supabase
          .from("chapter_progress")
          .update({
            last_viewed_at: nowIso,
            view_count: (data?.view_count ?? 1) + 1,
          })
          .eq("user_id", user.id)
          .eq("topic_tag", topicTag)
          .eq("section_id", sectionId);

        if (updateRes.error) {
          toast.error("Could not record section view.", {
            description: updateRes.error.message,
          });
          seenRef.current.delete(cacheKey);
          return { ok: false, error: updateRes.error };
        }
        return { ok: true };
      }

      toast.error("Could not record section view.", {
        description: insertRes.error.message,
      });
      seenRef.current.delete(cacheKey);
      return { ok: false, error: insertRes.error };
    },
    [user],
  );
}

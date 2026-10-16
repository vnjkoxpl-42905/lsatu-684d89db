import { useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AttemptResult =
  | { ok: true }
  | { ok: false; error: unknown };

export type FlashcardRating = "again" | "hard" | "good" | "easy";

export interface RecordFlashcardReviewInput {
  topicTag: string;
  cardId: string;
  rating: FlashcardRating;
  intervalDays: number;
  dueAtIso: string;
  reviewCount: number;
}

// useRecordFlashcardReview: append-only write. Each review event becomes one
// row. Aggregates (mastery %, due count, avg interval) compose at read time
// in useBootcampMetrics, so the schema is forward-compatible if the SRS
// algorithm changes.
export function useRecordFlashcardReview() {
  const { user } = useAuth();

  return useCallback(
    async (input: RecordFlashcardReviewInput): Promise<AttemptResult> => {
      if (!user) return { ok: true };
      const { error } = await supabase.from("flashcard_reviews").insert({
        user_id: user.id,
        topic_tag: input.topicTag,
        card_id: input.cardId,
        rating: input.rating,
        interval_days: input.intervalDays,
        due_at: input.dueAtIso,
        review_count: input.reviewCount,
        reviewed_at: new Date().toISOString(),
      });
      if (error) {
        toast.error("We could not save your flashcard review, tap to retry.", {
          description: error.message,
        });
        return { ok: false, error };
      }
      return { ok: true };
    },
    [user],
  );
}

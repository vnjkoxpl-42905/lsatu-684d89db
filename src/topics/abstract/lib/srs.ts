// Lite SM-2 scheduler for Abstract bootcamp flashcards. Maps a four-button
// rating (Again / Hard / Good / Easy) to the next review interval in days.
//
// Why a lite version: the canonical SM-2 algorithm tracks an easiness factor
// per card. For the bootcamp surface we only need a stable, predictable
// schedule, so we collapse the EF into rating-driven multipliers. If a real
// EF becomes useful later, the call site already passes the previous
// interval and review count, so the function can be swapped without
// touching callers.

import type { FlashcardRating } from "@/components/teacher/bootcamps/hooks/useFlashcardReviews";

const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 365;

export interface SrsNext {
  rating: FlashcardRating;
  intervalDays: number;
  dueAtIso: string;
}

export function computeNextReview(
  rating: FlashcardRating,
  prevIntervalDays: number,
  prevReviewCount: number,
): SrsNext {
  const base = Math.max(prevIntervalDays || 0, MIN_INTERVAL_DAYS);
  let nextInterval: number;

  switch (rating) {
    case "again":
      nextInterval = 1;
      break;
    case "hard":
      nextInterval = Math.max(base * 1.2, 2);
      break;
    case "good":
      if (prevReviewCount <= 0) nextInterval = 1;
      else if (prevReviewCount === 1) nextInterval = 3;
      else nextInterval = base * 2.5;
      break;
    case "easy":
      if (prevReviewCount <= 0) nextInterval = 4;
      else nextInterval = base * 3.5;
      break;
  }

  nextInterval = Math.min(Math.round(nextInterval), MAX_INTERVAL_DAYS);
  const dueAt = new Date(Date.now() + nextInterval * 86_400_000);
  return { rating, intervalDays: nextInterval, dueAtIso: dueAt.toISOString() };
}

export function isDueNow(dueAtIso: string | undefined): boolean {
  if (!dueAtIso) return true;
  return new Date(dueAtIso).getTime() <= Date.now();
}

import type { ReviewItem } from '../types/progress';

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export function reviewItem(item: ReviewItem, quality: Quality, now: number = Date.now()): ReviewItem {
  if (quality < 3) {
    return {
      ...item,
      repetitions: 0,
      interval: 1,
      lastSeen: now,
      due: now + 1 * DAY_MS,
    };
  }
  const ease = Math.max(
    1.3,
    item.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );
  const repetitions = item.repetitions + 1;
  const interval =
    item.repetitions === 0
      ? 1
      : item.repetitions === 1
        ? 6
        : Math.round(item.interval * ease);
  return {
    ...item,
    ease,
    repetitions,
    interval,
    lastSeen: now,
    due: now + interval * DAY_MS,
  };
}

export function seedReviewItem(flawSlug: string, questionId: string, now: number = Date.now()): ReviewItem {
  return {
    flawSlug,
    questionId,
    ease: 2.5,
    interval: 1,
    repetitions: 0,
    lastSeen: now,
    due: now + 1 * DAY_MS,
  };
}

export function dueItems(queue: ReviewItem[], now: number = Date.now()): ReviewItem[] {
  return queue.filter((it) => it.due <= now);
}

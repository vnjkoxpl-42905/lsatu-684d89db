import type { ActivityItem } from "./api/types";
import relationship from "./content/spot-the-relationship.json";

export const RELATIONSHIP_ANSWER_PROMPT = "Give each relationship type and quote the relevant words.";

/** Older graders can return this stock hint. Keep student copy current. */
export function relationshipFeedback(feedback: string): string {
  if (feedback === "Check each relationship you name against the exact words in the sentence that create it. Then reread the sentence for anything you have not yet named.") {
    return "Check that each relationship type matches the words you quoted. Reread the whole sentence for any relationship you missed.";
  }
  return feedback;
}

/** Presentation only. The caller must supply the activity identity. Historical
 * keys, responses, scores, hashes and completion are never replaced or mutated.
 * An explanation overlay cannot repair an old grading key. */
export function relationshipExplanation(item: ActivityItem, activitySlug?: string): string {
  if (activitySlug !== relationship.slug) return item.explanation ?? "";
  const canonical = relationship.items.find((candidate) =>
    candidate.order === item.order && candidate.prompt === item.prompt,
  );
  // Reworded or unmatched snapshots retain their own authored explanation.
  if (!canonical) return item.explanation ?? "";
  return canonical.explanation.replace(/^\d+ relationships? in this sentence\.\s*/i, "");
}

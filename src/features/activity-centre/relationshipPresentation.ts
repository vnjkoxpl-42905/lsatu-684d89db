import type { ActivityItem } from "./api/types";
import relationship from "./content/spot-the-relationship.json";

export const RELATIONSHIP_ANSWER_PROMPT = "Name each relationship and quote the words that signal it.";

/** Presentation only. Stored answers, earned results and grading keys stay intact. */
export function relationshipExplanation(item: ActivityItem): string {
  const first = relationship.items[0];
  const text = item.prompt === first.prompt ? first.explanation : item.explanation;
  return (text ?? "").replace(/^\d+ relationships? in this sentence\.\s*/i, "");
}

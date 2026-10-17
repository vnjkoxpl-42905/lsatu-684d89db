import type { ActivityItem } from "./api/types";
import relationship from "./content/spot-the-relationship.json";

export const RELATIONSHIP_ANSWER_PROMPT = "Name each relationship and quote the words that signal it.";

/** Older graders can return this stock hint. Keep student copy current. */
export function relationshipFeedback(feedback: string): string {
  if (feedback === "Check each relationship you name against the exact words in the sentence that create it. Then reread the sentence for anything you have not yet named.") {
    return "Check that each relationship type matches the words you quoted. Reread the whole sentence for any relationship you missed.";
  }
  return feedback;
}

/** Presentation only. Stored answers, earned results and grading keys stay intact. */
export function relationshipExplanation(item: ActivityItem): string {
  const first = relationship.items[0];
  const text = item.prompt === first.prompt ? first.explanation : item.explanation;
  return (text ?? "").replace(/^\d+ relationships? in this sentence\.\s*/i, "");
}

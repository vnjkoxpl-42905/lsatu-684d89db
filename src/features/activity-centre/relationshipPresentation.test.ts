import { describe, expect, it } from "vitest";
import relationship from "./content/spot-the-relationship.json";
import { RELATIONSHIP_ANSWER_PROMPT, relationshipExplanation } from "./relationshipPresentation";
import type { ActivityItem } from "./api/types";

const slug = "spot-the-relationship";
const items = relationship.items as ActivityItem[];
const plain = (text: string) => text.replace(/^\d+ relationships? in this sentence\.\s*/i, "");

describe("Spot explanation overlay scope and historical state", () => {
  it("keeps every-type answer requirements in the revised student prompt", () => {
    expect(RELATIONSHIP_ANSWER_PROMPT).toBe("Give each relationship type and quote the relevant words.");
    expect(relationship.instructions.task).toBe(RELATIONSHIP_ANSWER_PROMPT);
    expect(relationship.instructions.answer_placeholder).toBe(RELATIONSHIP_ANSWER_PROMPT);
    expect(relationship.subtitle).toBe(RELATIONSHIP_ANSWER_PROMPT.slice(0, -1));
    expect(relationship.instructions.coach.drill).toContain("signal it");
  });
  it.each(items.map((item) => [item.order, item] as const))(
    "repairs only the explanation for exact prompt/order Q%s", (_order, item) => {
      const saved = JSON.parse(JSON.stringify({ ...item, explanation: "Saved historical explanation.",
        studentResponse: "original response", score: 0.5, receiptHash: "original hash", completed: true }));
      const before = JSON.stringify(saved);
      expect(relationshipExplanation(saved, slug)).toBe(plain(item.explanation));
      expect(JSON.stringify(saved)).toBe(before);
    },
  );

  it("does not identify an activity from a matching prompt, Rung category or key", () => {
    const saved = { ...items[0], explanation: "1 relationship in this sentence. Keep my explanation." };
    expect(relationshipExplanation(saved)).toBe(saved.explanation);
    expect(relationshipExplanation(saved, "another-activity")).toBe(saved.explanation);
  });

  it("requires order and prompt to agree, preserving saved explanations otherwise", () => {
    for (const saved of [
      { ...items[0], order: 2, explanation: "Different order." },
      { ...items[0], prompt: `${items[0].prompt} Reworded.`, explanation: "Reworded item." },
      { ...items[33], prompt: items[33].prompt.replace("contains", "yields"), explanation: "Historical Q34." },
      { ...items[34], prompt: items[34].prompt.replace("Because", "Since"), explanation: "Historical Q35." },
    ]) expect(relationshipExplanation(saved, slug)).toBe(saved.explanation);
  });

  it("keeps a stale key and credited answer while repairing matching presentation", () => {
    const saved = { ...items[30], credited_answers: ["original credited answer"],
      answer_key: undefined, explanation: "Old teaching." };
    const before = JSON.stringify(saved);
    expect(relationshipExplanation(saved, slug)).toContain("smaller alternative");
    expect(JSON.stringify(saved)).toBe(before);
  });
});

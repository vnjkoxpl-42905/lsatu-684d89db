import { describe, expect, it } from "vitest";
import SOURCE from "../content/read-recall-colour-pt105-s2.json";
import { buildJudgeEntries, toDetailsByLine } from "./grading";
import { applyReviewedMateriality, MEANING_KEY_VERSION } from "../../../../supabase/functions/_shared/rrcMeaningKeys";

const packet = (index: number) => {
  const item = SOURCE.items[index];
  return { slug: item.slug, stimulus: item.chunks.map((chunk) => chunk.text).join(" "),
    entries: buildJudgeEntries(toDetailsByLine(item.chunks, item.slug), []) };
};

describe("source-reviewed meaning keys", () => {
  it.each([[0, 16, 24], [1, 18, 19], [2, 11, 11]])(
    "binds every authored fact of example index %i before any response is graded", (index, material, total) => {
      const result = applyReviewedMateriality(packet(index));
      expect(result.status).toBe("reviewed");
      expect(result.keyVersion).toBe(MEANING_KEY_VERSION);
      expect(result.entries).toHaveLength(total);
      expect(result.entries.filter((entry) => entry.reviewedMaterial)).toHaveLength(material);
      expect(result.entries.every((entry) => entry.reviewedMaterialReason.trim().length > 20)).toBe(true);
    });

  it("keeps the same denominator for faithful and incorrect responses", () => {
    const input = packet(0);
    const marked = applyReviewedMateriality(input).entries;
    const count = (carried: boolean) => {
      const response = Object.fromEntries(input.entries.map((entry) => [entry.id, carried]));
      return { total: marked.filter((entry) => entry.reviewedMaterial).length,
        carried: marked.filter((entry) => entry.reviewedMaterial && response[entry.id]).length };
    };
    expect(count(true)).toEqual({ total: 16, carried: 16 });
    expect(count(false)).toEqual({ total: 16, carried: 0 });
    expect(marked.filter((entry) => !entry.reviewedMaterial).map((entry) => entry.text))
      .toContain("The water is seawater.");
  });

  it.each(["source", "detail", "order", "line", "count", "identity"])(
    "fails the entire reviewed key closed when its %s changes", (change) => {
      const input = packet(0);
      if (change === "source") input.stimulus += " The conditions are different.";
      if (change === "detail") input.entries[0].text = "Divers did not find a cave.";
      if (change === "order") [input.entries[0], input.entries[1]] = [input.entries[1], input.entries[0]];
      if (change === "line") input.entries[0].line = 99;
      if (change === "count") input.entries.pop();
      if (change === "identity") input.slug = "PT999_S1_Q1";
      const result = applyReviewedMateriality(input);
      expect(result.status).toBe("fallback");
      expect(result.keyVersion).toBeNull();
      expect(result.entries.every((entry) => entry.reviewedMaterial)).toBe(true);
    });

  it("treats whitespace changes as the same source but never ignores changed punctuation or words", () => {
    const input = packet(0);
    expect(applyReviewedMateriality({ ...input, stimulus: `  ${input.stimulus.replace(/ /g, "\n")}  ` }).status)
      .toBe("reviewed");
    expect(applyReviewedMateriality({ ...input, stimulus: input.stimulus.replace("only", "usually") }).status)
      .toBe("fallback");
  });

  it("never gives unrelated-source checks an incidental exemption", () => {
    const input = packet(0);
    input.entries.push({ id: 99, text: "The water is seawater.", kind: "content", decoy: true });
    const result = applyReviewedMateriality(input);
    expect(result.status).toBe("reviewed");
    expect(result.entries.at(-1)?.reviewedMaterial).toBe(true);
  });

  it("does not let a structural or logical classification become incidental", () => {
    const input = packet(0);
    const label = input.entries.find((entry) => entry.text === "This is about the inside of the cave.")!;
    label.kind = "structure";
    const changed = applyReviewedMateriality(input);
    expect(changed.status).toBe("fallback");
    expect(changed.entries.every((entry) => entry.reviewedMaterial)).toBe(true);
    const reviewed = applyReviewedMateriality(packet(1));
    expect(reviewed.entries.filter((entry) => /only once|likely|any other/.test(entry.text))
      .every((entry) => entry.reviewedMaterial)).toBe(true);
  });

  it("invalidates the whole key when a protected logical kind is changed to content", () => {
    const input = packet(1);
    const relation = input.entries.find((entry) => entry.kind === "structure")!;
    expect(relation).toBeDefined();
    relation.kind = "content";
    const changed = applyReviewedMateriality(input);
    expect(changed.status).toBe("fallback");
    expect(changed.keyVersion).toBeNull();
    expect(changed.entries.every((entry) => entry.reviewedMaterial)).toBe(true);
  });

  it("never inherits a caller's incidental classification for an unknown source", () => {
    const input = packet(0);
    const result = applyReviewedMateriality({ ...input, slug: "unknown", entries: input.entries.map((entry) => ({
      ...entry, reviewedMaterial: false, reviewedMaterialReason: "Override the key.",
    })) });
    expect(result.entries.every((entry) => entry.reviewedMaterial)).toBe(true);
  });
});

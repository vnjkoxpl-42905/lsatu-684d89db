import { describe, expect, it } from "vitest";

import {
  FALLBACK_FEATURE_FAMILY_ID,
  FEATURE_FAMILIES,
  familyForFeature,
  getFeatureFamiliesWithFallback,
} from "./questionFeatureFamilies";

const CANONICAL_FEATURES = [
  "2-Speaker",
  "Abstract Answers",
  "Alternatives",
  "Analogies",
  "Anti-Causal",
  "Argue the Anti-Conclusion",
  "Assumes Difference",
  "Assumes Similarity",
  "Battle of Opinions",
  "Belief / Knowledge / Intent",
  "Binaries",
  "Breadcrumbs",
  "Causal Chains",
  "Causal Difference-Maker",
  "Clarification/Misunderstanding",
  "Complex Conditionals",
  "Conditional Conclusion",
  "Conditional Diagramming",
  "Contrapositive Logic",
  "Defender",
  "Dense Stimulus",
  "EXCEPT",
  "Explain Curious Fact",
  "Famous Flaws",
  "First Sentence Conclusion",
  "Focused on Evidence",
  "Games-y LR",
  "Implicit Principles",
  "Implied Conclusion",
  "Important Pivot",
  "Intermediate Conclusions",
  "Links Between Premises",
  "Logical Completion",
  "Math-y Stuff",
  "Medical",
  "Missing Link / Idea",
  "Net Effect",
  "New Concept in Conclusion",
  "Part vs. Whole",
  "Percentages",
  "Plans / Recommendations",
  "Plausibility",
  "Predictions",
  "Principles in Answers",
  "Principles in Stimulus",
  "Proposition/Generalization",
  "Quantifiers",
  "Rebuttals",
  "Refute a Conditional",
  "Relative vs. Absolute",
  "Repetitive Answers",
  "Ruling Out Options",
  "Sampling",
  "Science",
  "Sufficient vs. Necessary Flaw",
  "Timeframes",
  "Untriggered Conditional",
  "Volume Dial",
  "Weighing Tradeoffs",
  "Worst of the Worst",
] as const;

describe("question feature families", () => {
  it("declares all 60 canonical features exactly once", () => {
    const features = FEATURE_FAMILIES.flatMap((family) => family.features);

    expect(features).toHaveLength(60);
    expect(new Set(features).size).toBe(features.length);
    expect([...features].sort()).toEqual([...CANONICAL_FEATURES].sort());
    expect(familyForFeature("Belief / Knowledge / Intent")).toBe("quirks");
  });

  it("does not duplicate declared features from repeated bank names", () => {
    const families = getFeatureFamiliesWithFallback([
      "Conditional Diagramming",
      "Conditional Diagramming",
      "Science",
    ]);
    const features = families.flatMap((family) => family.features);

    expect(new Set(features).size).toBe(features.length);
    expect(families).toHaveLength(FEATURE_FAMILIES.length);
  });

  it("puts unknown bank tags in one deterministic fallback family", () => {
    const families = getFeatureFamiliesWithFallback([
      "Future Tag Z",
      "Conditional Diagramming",
      "Future Tag A",
      "Future Tag Z",
      "  Future Tag M  ",
      "",
    ]);
    const fallback = families.find((family) => family.id === FALLBACK_FEATURE_FAMILY_ID);

    expect(fallback).toEqual({
      id: FALLBACK_FEATURE_FAMILY_ID,
      label: "Other",
      features: ["Future Tag A", "Future Tag M", "Future Tag Z"],
    });
    expect(families.at(-1)).toBe(fallback);
  });
});

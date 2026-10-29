// Maps every LSAT U `questionFeatures` tag to a family bucket so the
// Build a Set filter UI can render a collapsed, navigable taxonomy instead
// of a flat 60-item chip wall. All 60 distinct features extracted from the
// bank are accounted for. Order within a family is alphabetical for stable
// rendering.

export interface FeatureFamily {
  id: string;
  label: string;
  features: string[];
}

export const FEATURE_FAMILIES: FeatureFamily[] = [
  {
    id: "conditional",
    label: "Conditional & Formal Logic",
    features: [
      "Complex Conditionals",
      "Conditional Conclusion",
      "Conditional Diagramming",
      "Contrapositive Logic",
      "Logical Completion",
      "Refute a Conditional",
      "Sufficient vs. Necessary Flaw",
      "Untriggered Conditional",
    ],
  },
  {
    id: "causal",
    label: "Causal Reasoning",
    features: ["Anti-Causal", "Causal Chains", "Causal Difference-Maker"],
  },
  {
    id: "quantity",
    label: "Quantities, Sampling & Math",
    features: [
      "Math-y Stuff",
      "Net Effect",
      "Percentages",
      "Quantifiers",
      "Relative vs. Absolute",
      "Sampling",
      "Volume Dial",
    ],
  },
  {
    id: "structure",
    label: "Argument Structure",
    features: [
      "First Sentence Conclusion",
      "Focused on Evidence",
      "Implicit Principles",
      "Implied Conclusion",
      "Important Pivot",
      "Intermediate Conclusions",
      "Links Between Premises",
      "Missing Link / Idea",
      "New Concept in Conclusion",
      "Principles in Stimulus",
    ],
  },
  {
    id: "traps",
    label: "Answer Choice Traps",
    features: [
      "Abstract Answers",
      "Argue the Anti-Conclusion",
      "Defender",
      "Famous Flaws",
      "Principles in Answers",
      "Repetitive Answers",
      "Worst of the Worst",
    ],
  },
  {
    id: "match",
    label: "Match, Similarity & Composition",
    features: ["Analogies", "Assumes Difference", "Assumes Similarity", "Part vs. Whole"],
  },
  {
    id: "stimulus",
    label: "Stimulus Style",
    features: [
      "2-Speaker",
      "Battle of Opinions",
      "Clarification/Misunderstanding",
      "Dense Stimulus",
      "Rebuttals",
    ],
  },
  {
    id: "tasks",
    label: "Tasks & Question Goals",
    features: [
      "Alternatives",
      "Binaries",
      "Breadcrumbs",
      "Explain Curious Fact",
      "Plans / Recommendations",
      "Plausibility",
      "Predictions",
      "Proposition/Generalization",
      "Ruling Out Options",
      "Timeframes",
      "Weighing Tradeoffs",
    ],
  },
  {
    id: "quirks",
    label: "Quirks & Topics",
    features: ["Belief / Knowledge / Intent", "EXCEPT", "Rule Puzzle", "Medical", "Science"],
  },
];

export const FALLBACK_FEATURE_FAMILY_ID = "other";
export const FALLBACK_FEATURE_FAMILY_LABEL = "Other";

/**
 * Returns the declared taxonomy and appends any feature names that are present
 * in the loaded bank but absent from it. The first declared occurrence wins if
 * a feature is accidentally listed more than once, and fallback features use
 * a locale-independent sort so their order is stable in every environment.
 */
export function getFeatureFamiliesWithFallback(
  featureNames: Iterable<string>,
): FeatureFamily[] {
  const seen = new Set<string>();
  const families = FEATURE_FAMILIES.map((family) => ({
    ...family,
    features: family.features.filter((feature) => {
      if (seen.has(feature)) return false;
      seen.add(feature);
      return true;
    }),
  }));

  const fallbackFeatures = Array.from(
    new Set(
      Array.from(featureNames)
        .map((feature) => feature.trim())
        .filter((feature) => feature.length > 0 && !seen.has(feature)),
    ),
  ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (fallbackFeatures.length > 0) {
    families.push({
      id: FALLBACK_FEATURE_FAMILY_ID,
      label: FALLBACK_FEATURE_FAMILY_LABEL,
      features: fallbackFeatures,
    });
  }

  return families;
}

// Reverse lookup: feature tag → family id. Built lazily on first call.
let _byFeature: Map<string, string> | null = null;
function getReverseIndex(): Map<string, string> {
  if (_byFeature) return _byFeature;
  const m = new Map<string, string>();
  for (const fam of FEATURE_FAMILIES) {
    for (const f of fam.features) m.set(f, fam.id);
  }
  _byFeature = m;
  return m;
}

export function familyForFeature(feature: string): string | undefined {
  return getReverseIndex().get(feature);
}

export const FEATURE_FAMILY_BY_ID: Record<string, FeatureFamily> = Object.fromEntries(
  FEATURE_FAMILIES.map((f) => [f.id, f]),
);

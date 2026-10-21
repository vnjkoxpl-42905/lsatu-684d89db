import { isRenderableLRQuestion, questionBank, type LRQuestion } from "@/lib/questionLoader";

type FlawRule = {
  featureTags?: string[];
  answerPatterns?: RegExp[];
};

export type FlawQuestionGroup = {
  flawId: string;
  label: string;
  questions: LRQuestion[];
};

const FLAW_ID_ALIASES: Record<string, string> = {
  "nec-suff": "necessary-vs-sufficient",
  causal: "causal-flaw",
  "value-assumption-2": "value-assumption",
  "sleazy-sales-pitch-2": "sleazy-sales-pitch",
};

export const FLAW_LABELS: Record<string, string> = {
  "necessary-vs-sufficient": "Necessary vs. Sufficient",
  "causal-flaw": "Causal Flaw",
  "sampling-fallacy": "Sampling Fallacy",
  "part-vs-whole": "Part vs. Whole",
  "unproven-vs-proven-false": "Unproven vs. Proven False",
  "ad-hominem": "Ad Hominem",
  "circular-reasoning": "Circular Reasoning",
  "internal-contradiction": "Internal Contradiction",
  equivocation: "Equivocation",
  "inappropriate-appeal": "Inappropriate Appeal",
  "sleight-of-hand": "Sleight of Hand",
  "value-assumption": "Value Assumption",
  "sleazy-sales-pitch": "Sleazy Sales Pitch",
  "universal-desires-assumption": "Universal Desires Assumption",
};

export const FLAW_ID_TO_FEATURES: Record<string, string[]> = {
  "necessary-vs-sufficient": ["Sufficient vs. Necessary Flaw"],
  "causal-flaw": ["Anti-Causal", "Causal Chains"],
  "sampling-fallacy": ["Sampling"],
  "part-vs-whole": ["Part vs. Whole"],
  "sleight-of-hand": ["New Concept in Conclusion"],
  "sleazy-sales-pitch": ["Net Effect", "Weighing Tradeoffs"],
};

const FLAW_RULES: Record<string, FlawRule> = {
  "necessary-vs-sufficient": {
    featureTags: FLAW_ID_TO_FEATURES["necessary-vs-sufficient"],
    answerPatterns: [
      /necessary (?:condition|for|as)/i,
      /sufficient (?:condition|for|to)/i,
      /necessary.*sufficient|sufficient.*necessary/i,
    ],
  },
  "causal-flaw": {
    featureTags: FLAW_ID_TO_FEATURES["causal-flaw"],
    answerPatterns: [
      /\bcaus(?:e|al|ed|es|ing)\b/i,
      /\bcorrelation\b|\bcorrelated\b/i,
      /responsible for both/i,
      /effect of|effect rather than/i,
      /preceded.*caused|caused.*preceded/i,
    ],
  },
  "sampling-fallacy": {
    featureTags: FLAW_ID_TO_FEATURES["sampling-fallacy"],
    answerPatterns: [
      /\bsample\b|\bsampling\b/i,
      /unrepresentative|representative of/i,
      /generaliz(?:es|e|ing|ation)/i,
      /selected only on the basis/i,
    ],
  },
  "part-vs-whole": {
    featureTags: FLAW_ID_TO_FEATURES["part-vs-whole"],
    answerPatterns: [
      /part(?:s)? of .* whole|whole .* part(?:s)?/i,
      /group as a whole|individual members|members of a group/i,
      /constituent (?:parts|elements)|each of its parts/i,
      /what is true of .* individual .* true of .* group/i,
    ],
  },
  "unproven-vs-proven-false": {
    answerPatterns: [
      /failure .* (?:establish|prove|show).* evidence .* false/i,
      /failure .* prove .* proof of .* denial/i,
      /not (?:been )?(?:shown|proven|demonstrated) .* (?:false|true)/i,
      /lack of (?:evidence|proof)/i,
      /inadequate evidence .* (?:falsity|false)/i,
      /what has not been proven .* nevertheless true/i,
    ],
  },
  "ad-hominem": {
    answerPatterns: [
      /attacks? .* (?:person|character|source|proponent|supporters)/i,
      /criticiz(?:es|ing) .* (?:source|character|people|person|actions|lifestyle)/i,
      /assails .* (?:character|supporters)/i,
      /rather than (?:examining|addressing|criticizing) .* (?:claim|argument|position)/i,
      /diverts attention .* (?:content|claim|argument)/i,
    ],
  },
  "circular-reasoning": {
    answerPatterns: [
      /presuppos(?:es|ing) .* (?:conclusion|truth|what it seeks|what it sets out)/i,
      /takes for granted what it (?:sets out|seeks) to/i,
      /purported evidence .* presumes .* conclusion/i,
      /assumes what it is attempting to prove/i,
    ],
  },
  "internal-contradiction": {
    answerPatterns: [
      /contradict(?:s|ion|ory)/i,
      /inconsistent|incompatible/i,
      /cannot (?:all |both )?be true/i,
      /simultaneously true/i,
    ],
  },
  equivocation: {
    answerPatterns: [
      /two (?:distinct|different) senses/i,
      /ambiguous(?:ly)? uses|ambiguity/i,
      /equivocat(?:es|ion|ing)/i,
      /different meaning|meaning .* shift/i,
      /term [“"][^”"]+[”"]|word [“"][^”"]+[”"]/i,
    ],
  },
  "inappropriate-appeal": {
    answerPatterns: [
      /appeals? .* (?:emotion|pity|popular|popularity|authority)/i,
      /emotion of pity/i,
      /expertise .* not shown|experts? whose expertise/i,
      /authority .* irrelevant|irrelevant authority/i,
      /majority .* believe/i,
    ],
  },
  "sleight-of-hand": {
    featureTags: FLAW_ID_TO_FEATURES["sleight-of-hand"],
    answerPatterns: [
      /new (?:term|concept|idea)/i,
      /treats? .* (?:distinct|different) .* as (?:identical|equivalent|the same)/i,
      /fails to distinguish .* (?:concepts|claims|issues)/i,
      /substitut(?:es|ing) .* for/i,
      /misinterprets .* claim/i,
    ],
  },
  "value-assumption": {
    answerPatterns: [
      /value judgment/i,
      /normative|moral(?:ly)?|morality/i,
      /desirable|undesirable/i,
      /worth (?:having|pursuing|following)/i,
      /should (?:be|not be|have|not have)/i,
      /good|bad|better|worse/i,
    ],
  },
  "sleazy-sales-pitch": {
    featureTags: FLAW_ID_TO_FEATURES["sleazy-sales-pitch"],
    answerPatterns: [
      /disadvantage|drawback/i,
      /advantages? .* disadvantages?|disadvantages? .* advantages?/i,
      /one-sided/i,
      /alternative .* (?:advantage|benefit|drawback)/i,
      /net effect/i,
      /only some of the factors/i,
    ],
  },
  "universal-desires-assumption": {
    answerPatterns: [
      /everyone .* (?:want|desir|prefer|motivat)/i,
      /all (?:people|individuals|members|customers) .* (?:want|desir|prefer|motivat)/i,
      /universally .* (?:want|desir|prefer)/i,
      /goal is desired by all/i,
      /sole motivating factor/i,
      /motivated by a desire/i,
      /goal of an action/i,
      /expected .* personal benefit/i,
    ],
  },
};

export function normalizeFlawId(flawId: string): string {
  return FLAW_ID_ALIASES[flawId] ?? flawId;
}

export function getFeaturesForFlaw(flawId: string): string[] {
  const normalized = normalizeFlawId(flawId);
  return FLAW_RULES[normalized]?.featureTags ?? [];
}

function getCorrectAnswerText(q: LRQuestion): string {
  return q.answerChoices?.[q.correctAnswer] ?? "";
}

function matchesRule(q: LRQuestion, rule: FlawRule): boolean {
  const features = q.questionFeatures ?? [];
  if (rule.featureTags?.some((feature) => features.includes(feature))) return true;

  const correctAnswer = getCorrectAnswerText(q);
  if (!correctAnswer.trim()) return false;
  return rule.answerPatterns?.some((pattern) => pattern.test(correctAnswer)) ?? false;
}

function getFamousFlawQuestions(): LRQuestion[] {
  if (!questionBank.isReady()) return [];
  return questionBank
    .getAllQuestions()
    .filter(
      (q) =>
        q.qtype === "Flaw" &&
        isRenderableLRQuestion(q) &&
        (q.questionFeatures ?? []).includes("Famous Flaws"),
    );
}

export function getQuestionsForFlaw(flawId: string): LRQuestion[] {
  const normalized = normalizeFlawId(flawId);
  const rule = FLAW_RULES[normalized];
  if (!rule) return [];

  return getFamousFlawQuestions()
    .filter((q) => matchesRule(q, rule))
    .sort((a, b) => (a.difficulty ?? 3) - (b.difficulty ?? 3) || a.pt - b.pt || a.section - b.section || a.qnum - b.qnum);
}

export function getFlawQuestionGroups(flawIds = Object.keys(FLAW_LABELS)): FlawQuestionGroup[] {
  return flawIds
    .map((flawId) => {
      const normalized = normalizeFlawId(flawId);
      return {
        flawId: normalized,
        label: FLAW_LABELS[normalized] ?? normalized,
        questions: getQuestionsForFlaw(normalized),
      };
    })
    .filter((group) => group.questions.length > 0);
}

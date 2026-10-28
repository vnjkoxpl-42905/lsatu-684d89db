import { Flashcard } from "../types";

// Flashcards: union of the new bootcamp's 13 cards (mockData.ts FLASHCARDS)
// and the current LSATU Abstract module's 52 cards
// (`src/topics/abstract/content/flashcards.json`), deduped by question text
// and topic-mapped to the new Flashcard shape.
//
// Category map from the current LSATU concept tags:
// - "glossary" -> "Terminology"
// - "translation-language" -> "Indicators"
// - "verb-taxonomy" -> "Answer Phrasing"
//
// Total: 75 cards.
export const FLASHCARDS: Flashcard[] = [
  // --- New bootcamp originals (13) ---
  {
    id: "fc_1",
    category: "Terminology",
    question: "How are the terms \"Explanation for a Phenomenon\" and \"Hypothesis\" related on the LSAT?",
    answer: "They are essentially synonyms. Both refer to identifying the cause of a curious fact or event.",
  },
  {
    id: "fc_2",
    category: "Question Stems",
    question: "What are typical keywords for a Parallel Flaw question stem?",
    answer: "\"Flawed pattern of reasoning\", \"most closely parallel\", \"most similar to\", \"most like that in...\".",
  },
  {
    id: "fc_3",
    category: "Distinctions",
    question: "What is the difference between a Counterexample and an Alternate Explanation?",
    answer: "Counterexample: a specific case that disproves a general rule. Alternate Explanation: a different way to explain a specific curious fact.",
  },
  {
    id: "fc_4",
    category: "Terminology",
    question: "What is an Inference in the context of the LSAT?",
    answer: "A claim that can be derived from a statement or set of statements. It must be strictly provable based on the given information.",
  },
  {
    id: "fc_5",
    category: "Concepts",
    question: "What is a \"claim\"?",
    answer: "A grammatically complete idea. Everything in a stimulus (premises, conclusions, background, counterpoints) is a claim. A single sentence can contain multiple claims.",
  },
  {
    id: "fc_6",
    category: "Terminology",
    question: "What is another name for a \"Supported Premise\"?",
    answer: "An Intermediate Conclusion (or Subsidiary Conclusion). It supports the main conclusion but is itself supported by a premise.",
  },
  {
    id: "fc_7",
    category: "Answer Phrasing",
    question: "In the phrase \"using X to support Y\", which is the conclusion and which is the evidence?",
    answer: "Y is the conclusion (the thing being supported), and X is the evidence (the thing used to do the supporting).",
  },
  {
    id: "fc_8",
    category: "Answer Phrasing",
    question: "In the phrase \"doing X by doing Y\", which is the conclusion and which is the evidence?",
    answer: "X is the conclusion, and Y is the evidence. The word \"by\" indicates the method or evidence.",
  },
  {
    id: "fc_9",
    category: "Answer Phrasing",
    question: "In the phrase \"concludes, from the claim that X, that Y\", which is the conclusion and which is the evidence?",
    answer: "Y is the conclusion, and X is the evidence.",
  },
  {
    id: "fc_10",
    category: "Answer Phrasing",
    question: "In the phrase \"appeals to X in order to Y\", which is the conclusion and which is the evidence?",
    answer: "Y is the conclusion, and X is the evidence. One appeals to evidence to reach a conclusion.",
  },
  {
    id: "fc_11",
    category: "Answer Phrasing",
    question: "In the phrase \"infers that X on the grounds that Y\", which is the conclusion and which is the evidence?",
    answer: "X is the conclusion (infers = concludes), and Y is the evidence (grounds = premises).",
  },
  {
    id: "fc_12",
    category: "Concepts",
    question: "What are typical phrasings LSAT uses to present a correlation?",
    answer: "Temporal: \"X happened at the same time as Y\". Statistical: \"People who are X tend to be Y\", \"X is associated with Y\", \"Being X makes Y more likely\".",
  },
  {
    id: "fc_13",
    category: "Distinctions",
    question: "What is the difference between an Analogy and an Example?",
    answer: "Analogy: a specific case similar in some general way to another specific case. Example: a specific case that illustrates a broader general idea.",
  },

  // --- Ported from current LSATU Abstract flashcards.json (52) ---
  // Terminology (was concept_tag: glossary)
  { id: "fc-abstract-001", category: "Terminology", question: "Presuppose", answer: "In daily usage, a presupposition can mean either an assumption or something that is necessary. On the LSAT, presuppose simply means \"require.\" It refers to a necessary condition." },
  { id: "fc-abstract-002", category: "Terminology", question: "Explanation", answer: "Means cause. The cause that produced the effect. Not 'elaborating' or 'clarifying.'" },
  { id: "fc-abstract-003", category: "Terminology", question: "Hypothesis", answer: "Means potential cause. A causal guess. Not a prediction. Not a theory in the loose sense." },
  { id: "fc-abstract-005", category: "Terminology", question: "Slot 1: Background", answer: "Neutral facts setting the scene. Not the argument, just the world the argument lives in." },
  { id: "fc-abstract-006", category: "Terminology", question: "Slot 2: Opposing Conclusion", answer: "What someone else thinks. The view the author pushes back against." },
  { id: "fc-abstract-007", category: "Terminology", question: "Slot 3: Opposing Evidence", answer: "Why the opposing view thinks they're right. Supports the opposing conclusion, not the author's." },
  { id: "fc-abstract-008", category: "Terminology", question: "Slot 4: Concession", answer: "Something the author admits is true even though it could be used against them. Tell: granted, while, although, naturally, though it is true." },
  { id: "fc-abstract-009", category: "Terminology", question: "Slot 5: Author's Conclusion", answer: "What the author actually thinks. The main point. Only supported, never supports." },
  { id: "fc-abstract-010", category: "Terminology", question: "Slot 6: Intermediate Conclusion", answer: "A sub-claim the author proves on the way to the main conclusion. Both supported by, and supporting, other claims." },
  { id: "fc-abstract-011", category: "Terminology", question: "Slot 7: Author's Evidence", answer: "The reasons the author gives. Supports the conclusion, not supported by anything inside the argument." },
  { id: "fc-abstract-012", category: "Terminology", question: "Inference", answer: "A claim that must be true given the statements. Provable, not necessarily important." },
  { id: "fc-abstract-013", category: "Terminology", question: "Imply / Suggest", answer: "Indicate or hint at, but weaker than entail." },
  { id: "fc-abstract-014", category: "Terminology", question: "Entail", answer: "Logically guarantee." },
  { id: "fc-abstract-015", category: "Terminology", question: "Assume / Take for granted", answer: "Rely on without proof." },
  { id: "fc-abstract-016", category: "Terminology", question: "Phenomenon", answer: "Something that happened that needs explaining. The effect side of a cause-effect pair." },
  { id: "fc-abstract-017", category: "Terminology", question: "Illustrate", answer: "An illustration, as it appears in a Logical Reasoning (LR) question, is simply referring to an example or examples." },
  { id: "fc-abstract-018", category: "Terminology", question: "Analogy", answer: "A different specific case that's similar in some general way." },
  { id: "fc-abstract-019", category: "Terminology", question: "Example", answer: "A specific case that illustrates a general idea." },
  { id: "fc-abstract-020", category: "Terminology", question: "Counterexample", answer: "A specific case that goes against a general claim." },
  { id: "fc-abstract-021", category: "Terminology", question: "Alternate Explanation", answer: "A different proposed cause for the same effect." },
  { id: "fc-abstract-022", category: "Terminology", question: "General Principle", answer: "A principle is a rule on what we should or shouldn't do. It applies to multiple conditions and scenarios." },
  { id: "fc-abstract-023", category: "Terminology", question: "Generalization", answer: "A summary statement derived from smaller findings, like \"All swans are white.\" Generalizations describe more so what is, while principles prescribe what they should or ought to be. They can function as premises or conclusions." },
  { id: "fc-abstract-024", category: "Terminology", question: "Principle", answer: "A generalizable statement used to guide or justify (similar to a rule) future or past actions or decisions. Example: \"Punishment should be proportional to the crime committed.\" Principles can be premises or conclusions." },
  { id: "fc-abstract-025", category: "Terminology", question: "Aesthetic Principle", answer: "A broad normative rule, not a one-off judgment." },
  { id: "fc-abstract-026", category: "Terminology", question: "Defend", answer: "Justify as right or correct. Not just stating a motive." },
  { id: "fc-abstract-027", category: "Terminology", question: "Substantiate", answer: "Support with evidence." },
  { id: "fc-abstract-028", category: "Terminology", question: "Corroborate", answer: "Confirm or back up." },
  { id: "fc-abstract-029", category: "Terminology", question: "Establish", answer: "Prove. Stronger than support." },
  { id: "fc-abstract-030", category: "Terminology", question: "Undermine", answer: "Weaken. Attack the support." },
  { id: "fc-abstract-031", category: "Terminology", question: "Refute", answer: "Prove false. Stronger than undermine." },
  { id: "fc-abstract-032", category: "Terminology", question: "Concede", answer: "Admit something potentially against your own position." },
  { id: "fc-abstract-033", category: "Terminology", question: "Maintain / Hold / Contend / Assert", answer: "Claim or argue. Often the verb attached to an opposing view." },
  { id: "fc-abstract-034", category: "Terminology", question: "Posit", answer: "Propose, usually a cause." },
  { id: "fc-abstract-035", category: "Terminology", question: "Account For", answer: "Explain. Causal sense." },
  { id: "fc-abstract-036", category: "Terminology", question: "Supported Premise", answer: "An intermediate conclusion. Functions as both a premise and a sub-conclusion." },
  { id: "fc-abstract-067", category: "Terminology", question: "Decision", answer: "A choice made, like \"I will be taking the train from Canada to USA instead of Bus.\" Decisions can also play roles as premises or conclusions." },
  { id: "fc-abstract-068", category: "Terminology", question: "Facts", answer: "Statements such as \"Canada is the largest country in the world\" or \"Water consists of hydrogen and oxygen.\" Not arguments by themselves. Can serve as premises or background information in an argument." },

  // Answer Phrasing (was concept_tag: verb-taxonomy)
  { id: "fc-abstract-052", category: "Answer Phrasing", question: "Concludes / Infers / Reasons / Argues", answer: "Verb taxonomy. The author has a conclusion. The verb flags it." },
  { id: "fc-abstract-053", category: "Answer Phrasing", question: "Presupposes / Assumes / Takes for granted", answer: "Verb taxonomy. The author depends on something unstated. Necessary-assumption territory." },
  { id: "fc-abstract-054", category: "Answer Phrasing", question: "Appeals to / Cites / Uses", answer: "Verb taxonomy. The author is invoking evidence." },
  { id: "fc-abstract-055", category: "Answer Phrasing", question: "Counters / Anticipates / Pre-empts", answer: "Verb taxonomy. The author shuts down an objection in advance." },
  { id: "fc-abstract-056", category: "Answer Phrasing", question: "Denies / Rejects / Challenges", answer: "Verb taxonomy. The author argues against another claim." },
  { id: "fc-abstract-057", category: "Answer Phrasing", question: "Substantiates / Supports", answer: "Verb taxonomy. Provides evidence for something." },
  { id: "fc-abstract-058", category: "Answer Phrasing", question: "Establishes / Demonstrates", answer: "Verb taxonomy. Stronger than supports. Provides proving-strength evidence." },
  { id: "fc-abstract-059", category: "Answer Phrasing", question: "Undermines / Weakens / Calls into question", answer: "Verb taxonomy. The author attacks another claim." },
  { id: "fc-abstract-060", category: "Answer Phrasing", question: "Illustrates", answer: "Verb taxonomy. The author is giving an example." },
  { id: "fc-abstract-061", category: "Answer Phrasing", question: "Derives", answer: "Verb taxonomy. The author concludes something from a constraint or impossibility." },
  { id: "fc-abstract-062", category: "Answer Phrasing", question: "Maintains / Holds / Contends", answer: "Verb taxonomy. The author has a position. Often introduces an opposing view." },
  { id: "fc-abstract-063", category: "Answer Phrasing", question: "Posits", answer: "Verb taxonomy. The author proposes something, usually a causal account." },
  { id: "fc-abstract-064", category: "Answer Phrasing", question: "Anticipates an objection", answer: "Verb taxonomy. The author flags a possible counter-argument and shuts it down preemptively." },
  { id: "fc-abstract-065", category: "Answer Phrasing", question: "Concludes X on the basis of Y", answer: "Y is the evidence, X is the conclusion. 'On the basis of' points backward." },
  { id: "fc-abstract-066", category: "Answer Phrasing", question: "Doing X by doing Y", answer: "X is the broader move. Y is the specific tactic. 'By' points backward to the tactic." },

  // --- Methods of Reasoning (10 additional, distilled from `_source/01`) ---
  { id: "fc-method-01", category: "Methods", question: "Method 1: Providing an alternative explanation", answer: "The author offers a different cause for the observed effect than the one originally suggested. Watch for: \"could also be due to\", \"alternatively\", \"the real cause is\"." },
  { id: "fc-method-02", category: "Methods", question: "Method 2: Excluding alternative explanations", answer: "The author rules out several possible causes, leaving one. Watch for: \"not X, not Y, therefore Z\"." },
  { id: "fc-method-04", category: "Methods", question: "Method 4: Inferring causation from correlation", answer: "Two things happen together; the author concludes one causes the other. Flag this on Flaw stems." },
  { id: "fc-method-05", category: "Methods", question: "Method 5: Appeal to definition", answer: "The author uses what a word means to support the conclusion. Watch for: \"by definition\", \"is properly understood as\"." },
  { id: "fc-method-06", category: "Methods", question: "Method 6: Appeal to authority", answer: "The author cites an expert. Watch for named scientists, doctors, named officials." },
  { id: "fc-method-08", category: "Methods", question: "Method 8: Failed to consider relevant information", answer: "The author introduces information the opponent overlooked. Watch for: \"but you ignored\", \"this overlooks\"." },
  { id: "fc-method-09", category: "Methods", question: "Method 9: Deriving a general principle from examples", answer: "List of specific cases leads to a broad rule. Watch for the principle being stated last." },
  { id: "fc-method-11", category: "Methods", question: "Method 11: Counterexample to a generalization", answer: "Opponent makes a universal claim; author provides one case that doesn't fit." },
  { id: "fc-method-14", category: "Methods", question: "Method 14: Inappropriate analogy", answer: "Opponent compares two situations; author argues they aren't similar in the relevant way." },
  { id: "fc-method-17", category: "Methods", question: "Method 17: Conclusion leads to impossible result", answer: "Take the opponent's conclusion seriously; derive an absurd consequence. Watch for: \"if that were true...\"." },
];

import { TermDefinitionItem } from "../types";

// 7 key terms verbatim from
// `~/Documents/Obsidian Vault/raw/curriculum/Abstract/_source/06-keyword-list.md`
// which mirrors `KEYWORD_LIST.pdf`. Each term carries the LSAT-specific
// definition, four MC options, and the correct option index.
export const TERMS: TermDefinitionItem[] = [
  {
    id: "term_1",
    term: "Presuppose",
    options: [
      "To guess about the future",
      "To require or assume as a necessary condition",
      "To state explicitly as a premise",
      "To disagree with a previous claim",
    ],
    correctOption: 1,
    definition: "In daily usage, a presupposition can mean either an assumption or something that is necessary.",
    explanation: "On the LSAT, presuppose simply means \"require.\" It refers to a necessary condition.",
  },
  {
    id: "term_2",
    term: "Illustrate",
    options: [
      "To draw a diagram",
      "To provide a detailed causal mechanism",
      "To provide an example of something",
      "To logically prove something is true",
    ],
    correctOption: 2,
    definition: "An illustration, as it appears in a Logical Reasoning (LR) question, is simply referring to an example or examples.",
    explanation: "Whenever you see illustration/illustrates in an answer choice, treat it as \"example\".",
  },
  {
    id: "term_3",
    term: "General Principle",
    options: [
      "A specific law passed by a government",
      "A rule on what we should or shouldn't do, applying beyond one specific case",
      "A summary of numerical data",
      "An unstated assumption made by the author",
    ],
    correctOption: 1,
    definition: "A principle is a rule on what we should or shouldn't do.",
    explanation: "Principles apply to multiple conditions and scenarios. \"John is always tired and should go to bed earlier\" is not a principle (one person). \"Those who are tired in the morning should strive to get to bed earlier\" is a principle (applies to a category).",
  },
  {
    id: "term_4",
    term: "Facts",
    options: [
      "Arguments that need to be proven by evidence",
      "Statements about the world that are accepted as true",
      "The author's main conclusion",
      "Hypotheses about what might be the case",
    ],
    correctOption: 1,
    definition: "Statements such as \"Canada is the largest country in the world\" or \"Water consists of hydrogen and oxygen.\"",
    explanation: "Facts are not arguments by themselves. They can serve as premises or background information in an argument.",
  },
  {
    id: "term_5",
    term: "Decision",
    options: [
      "An unstated assumption",
      "A choice made about future or past actions",
      "A formal logical proof",
      "A counterexample to a generalization",
    ],
    correctOption: 1,
    definition: "A choice made, like \"I will be taking the train from Canada to USA instead of Bus.\"",
    explanation: "Decisions can also play roles as premises or conclusions.",
  },
  {
    id: "term_6",
    term: "Principle",
    options: [
      "A statistical summary of past data",
      "A statement of what someone has decided",
      "A generalizable statement used to guide or justify actions",
      "A specific case used as a counterexample",
    ],
    correctOption: 2,
    definition: "A generalizable statement used to guide or justify (similar to a rule) future or past actions or decisions.",
    explanation: "Example: \"Punishment should be proportional to the crime committed.\" Principles can be premises or conclusions.",
  },
  {
    id: "term_7",
    term: "Generalization",
    options: [
      "A specific prescription about what should be done",
      "A statement that applies only to one entity",
      "A summary statement derived from smaller findings",
      "An unstated premise of an argument",
    ],
    correctOption: 2,
    definition: "A summary statement derived from smaller findings, like \"All swans are white.\"",
    explanation: "Generalizations describe more so what is, while principles prescribe what they should or ought to be. They can function as premises or conclusions.",
  },
];

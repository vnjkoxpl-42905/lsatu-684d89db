// Module 3 "Break It Down" drill.
//
// Three operations, in this order, each one checked before the student moves on:
//
// 1. map    Find the direction words in an abstract phrase, then say which
//           letter is the conclusion. Phrases come from Joshua's Argument
//           Parsing and Advanced Parsing worksheets (corpus/Curriculum/Abstract).
// 2. decode Abstract answer choice -> plain English -> which argument it
//           describes, then the student writes a tiny argument of their own
//           ("Write a real-world example" in the Level 1 worksheet). The
//           written example is self-checked against a model, never auto-graded.
// 3. build  Concrete argument -> the abstract description. The student
//           assembles the answer choice from slots.
//
// Scenarios are original to this drill. They are not reused elsewhere in the
// bootcamp.

export interface MapItem {
  id: string;
  kind: "map";
  // The phrase split into tappable pieces. Exactly one piece is the
  // direction word or phrase.
  pieces: string[];
  directionIndex: number;
  conclusion: "X" | "Y";
  directionWhy: string;
  conclusionWhy: string;
}

export interface Choice {
  text: string;
  correct: boolean;
  why: string;
}

export interface DecodeItem {
  id: string;
  kind: "decode";
  answerChoice: string;
  translations: Choice[];
  arguments: Choice[];
  writePrompt: string;
  modelExample: string;
  modelCheck: string[];
}

export interface BuildSlot {
  options: string[];
  correct: number;
  why: string;
}

export interface BuildItem {
  id: string;
  kind: "build";
  sentences: string[];
  // Index of the sentence being described, or null when the item asks about
  // the whole argument.
  focus: number | null;
  prompt: string;
  // Fixed text and slots alternate: template[0], slots[0], template[1], ...
  template: string[];
  slots: BuildSlot[];
}

export type BreakdownItem = MapItem | DecodeItem | BuildItem;

export const BREAKDOWN_PARTS: { kind: BreakdownItem["kind"]; title: string; instruction: string }[] = [
  {
    kind: "map",
    title: "Which side is the conclusion?",
    instruction:
      "Tap the words that tell you which way the support runs. Then pick the letter that stands for the conclusion.",
  },
  {
    kind: "decode",
    title: "Decode it, then make it concrete",
    instruction:
      "Pick the plain-English version of the answer choice. Then pick the argument it describes. Then write a tiny argument of your own that fits it.",
  },
  {
    kind: "build",
    title: "Describe it abstractly",
    instruction:
      "Read the argument. Then build the answer choice that describes it by picking one option for each blank.",
  },
];

export const BREAKDOWN_ITEMS: BreakdownItem[] = [
  // ---------- Part 1: map ----------
  {
    id: "bd_map_1",
    kind: "map",
    pieces: ["concludes", "X", "on the basis of", "Y"],
    directionIndex: 2,
    conclusion: "X",
    directionWhy: "\"On the basis of\" introduces the evidence. Whatever comes after it is the basis.",
    conclusionWhy: "Y is the basis, so Y is the evidence. X is what gets concluded.",
  },
  {
    id: "bd_map_2",
    kind: "map",
    pieces: ["using", "X", "to support", "Y"],
    directionIndex: 2,
    conclusion: "Y",
    directionWhy: "\"To support\" tells you X is doing the supporting.",
    conclusionWhy: "X is used as support, so X is the evidence. Y is the thing being supported, so Y is the conclusion.",
  },
  {
    id: "bd_map_3",
    kind: "map",
    pieces: ["infers,", "on the grounds that", "X,", "that", "Y"],
    directionIndex: 1,
    conclusion: "Y",
    directionWhy: "\"On the grounds that\" introduces the grounds, which is the evidence.",
    conclusionWhy: "X is the grounds. Y is what the argument infers, so Y is the conclusion.",
  },
  {
    id: "bd_map_4",
    kind: "map",
    pieces: ["takes for granted that", "Y", "because", "X"],
    directionIndex: 2,
    conclusion: "Y",
    directionWhy: "\"Because\" introduces the reason.",
    conclusionWhy: "X is the reason. Y is what the argument takes for granted, so Y is the conclusion. The order of the letters doesn't matter. The direction word does.",
  },
  {
    id: "bd_map_5",
    kind: "map",
    pieces: ["derives the necessity of", "X", "from", "the impossibility of", "Y"],
    directionIndex: 2,
    conclusion: "X",
    directionWhy: "\"From\" points back to where the argument starts, which is the evidence.",
    conclusionWhy: "The argument starts from the impossibility of Y. It ends at the necessity of X, so X is the conclusion.",
  },

  // ---------- Part 2: decode ----------
  {
    id: "bd_decode_1",
    kind: "decode",
    answerChoice:
      "Rejects a position on the grounds that the proponents of the position have a vested interest in its acceptance.",
    translations: [
      {
        text: "The argument says a view is wrong because the people pushing it would gain if others believed it.",
        correct: true,
        why: "Correct. \"Rejects\" means the argument throws the view out. \"Vested interest\" means the people behind it stand to gain.",
      },
      {
        text: "The argument says a view is wrong because the people pushing it have no evidence.",
        correct: false,
        why: "Not that one. The choice never mentions missing evidence. It's about what the people behind the view stand to gain.",
      },
      {
        text: "The argument accepts a view because the people pushing it are experts.",
        correct: false,
        why: "Not that one. \"Rejects\" means the argument throws the view out. It doesn't accept it.",
      },
    ],
    arguments: [
      {
        text: "The dentist says I need a crown. Dentists get paid for every crown they put in, so I probably don't need one.",
        correct: true,
        why: "Correct. The argument throws out the dentist's view because the dentist would profit from it.",
      },
      {
        text: "The dentist says I need a crown. But my X-ray last month was clean, so I probably don't need one.",
        correct: false,
        why: "Not that one. This rejects the view using evidence about the tooth, not the dentist's motive.",
      },
      {
        text: "The dentist says I need a crown, and dentists know teeth better than I do, so I should get one.",
        correct: false,
        why: "Not that one. This accepts the dentist's view. The choice describes rejecting one.",
      },
    ],
    writePrompt: "Write a two-sentence argument that rejects a view because of who benefits from it.",
    modelExample:
      "The bottled-water company says tap water in our town is unsafe. They sell bottled water, so I'm not worried about the tap.",
    modelCheck: [
      "Someone holds a view.",
      "The argument rejects that view.",
      "The only reason given is that the person gains if others believe it.",
    ],
  },
  {
    id: "bd_decode_2",
    kind: "decode",
    answerChoice: "Mistakes a temporal relationship between two events for a causal relationship.",
    translations: [
      {
        text: "The argument assumes that because one thing happened before another, the first thing caused the second.",
        correct: true,
        why: "Correct. \"Temporal\" is about time order. \"Causal\" is about cause. The mistake is jumping from one to the other.",
      },
      {
        text: "The argument assumes two events happened at the same time.",
        correct: false,
        why: "Not that one. The choice isn't about timing being wrong. It's about treating timing as proof of cause.",
      },
      {
        text: "The argument assumes that because two things are similar, they have the same cause.",
        correct: false,
        why: "Not that one. Similarity isn't a temporal relationship. \"Temporal\" means one event came before the other.",
      },
    ],
    arguments: [
      {
        text: "Maya started drinking green tea in March. In April, her headaches stopped. So the tea cured her headaches.",
        correct: true,
        why: "Correct. The only link between the tea and the headaches is that one came first.",
      },
      {
        text: "Maya's headaches stopped after she started drinking green tea, but her doctor also changed her medication that month, so the tea may not be the reason.",
        correct: false,
        why: "Not that one. This argument avoids the mistake. It points out that something else could be the cause.",
      },
      {
        text: "Most people who drink green tea get fewer headaches, so Maya should try it.",
        correct: false,
        why: "Not that one. Nothing here depends on one event coming before another.",
      },
    ],
    writePrompt: "Write a short argument that treats \"this came first\" as proof that it caused what came next.",
    modelExample:
      "Our team switched to a new playbook in week five. We won every game after that. So the playbook is why we started winning.",
    modelCheck: [
      "One event happens first.",
      "Another event happens after it.",
      "The argument concludes the first caused the second, with nothing but the order to go on.",
    ],
  },
  {
    id: "bd_decode_3",
    kind: "decode",
    answerChoice: "Challenges the plausibility of a claim by offering an alternative explanation.",
    translations: [
      {
        text: "The argument casts doubt on a claim by giving a different possible cause.",
        correct: true,
        why: "Correct. \"Challenges the plausibility\" means it casts doubt. On the LSAT, \"explanation\" means cause.",
      },
      {
        text: "The argument casts doubt on a claim by showing that it contradicts itself.",
        correct: false,
        why: "Not that one. The choice says the doubt comes from another explanation, not from a contradiction.",
      },
      {
        text: "The argument supports a claim by explaining it in more detail.",
        correct: false,
        why: "Not that one. \"Challenges\" means pushing against the claim, and \"explanation\" means a cause, not more detail.",
      },
    ],
    arguments: [
      {
        text: "The store owner thinks the new sign brought in more customers. But the street reopened that same week after months of construction, and that could explain the crowds.",
        correct: true,
        why: "Correct. The argument doubts the owner's claim by offering another cause for the crowds: the street reopening.",
      },
      {
        text: "The store owner thinks the new sign brought in more customers. But the sign is hard to read from the street, so I doubt anyone noticed it.",
        correct: false,
        why: "Not that one. This doubts the claim, but it never offers another cause for the crowds.",
      },
      {
        text: "The store owner thinks the new sign brought in more customers, and the sales records show the jump started the day it went up.",
        correct: false,
        why: "Not that one. This supports the owner's claim. The choice describes challenging it.",
      },
    ],
    writePrompt: "Write a short argument that doubts someone's explanation by offering a different cause.",
    modelExample:
      "Dad thinks the plant died because I watered it too much. But it sat next to the heater all winter, and that alone could have killed it.",
    modelCheck: [
      "Someone offers a cause for something.",
      "The argument doubts that cause.",
      "It does so by naming a different cause that could explain the same thing.",
    ],
  },

  // ---------- Part 3: build ----------
  {
    id: "bd_build_1",
    kind: "build",
    sentences: [
      "The city should plant more trees along Main Street.",
      "Shaded streets stay several degrees cooler in summer.",
      "After all, trees block direct sun from the pavement.",
    ],
    focus: 1,
    prompt: "Describe the role of sentence 2.",
    template: ["It is ", " ", "."],
    slots: [
      {
        options: [
          "a premise with no support of its own",
          "a claim that is supported by another statement",
          "the main conclusion",
        ],
        correct: 1,
        why: "Sentence 3 (\"After all...\") supports sentence 2, so sentence 2 has support of its own.",
      },
      {
        options: [
          "and that supports the main conclusion",
          "and that the argument rejects",
          "and that illustrates a general principle",
        ],
        correct: 0,
        why: "Cooler streets are the reason to plant trees, so sentence 2 supports the main conclusion in sentence 1. That makes it an intermediate conclusion.",
      },
    ],
  },
  {
    id: "bd_build_2",
    kind: "build",
    sentences: [
      "Some managers say remote work makes teams less productive.",
      "But our team's output rose 12 percent the year we went remote.",
      "So remote work doesn't have to hurt productivity.",
    ],
    focus: 0,
    prompt: "Describe the role of sentence 1.",
    template: ["It is ", " that the argument ", "."],
    slots: [
      {
        options: ["a position", "a premise", "an example"],
        correct: 0,
        why: "Sentence 1 reports what some managers believe. The author doesn't offer it as a reason, so it isn't a premise.",
      },
      {
        options: ["attempts to undermine", "relies on", "concludes"],
        correct: 0,
        why: "The \"But\" in sentence 2 starts the push against it, and sentence 3 concludes the opposite.",
      },
    ],
  },
  {
    id: "bd_build_3",
    kind: "build",
    sentences: [
      "Every student who finished the summer reading list passed the placement test.",
      "Jordan finished the summer reading list.",
      "So Jordan passed the placement test.",
    ],
    focus: 0,
    prompt: "Describe the role of sentence 1.",
    template: ["It is ", " that the argument ", "."],
    slots: [
      {
        options: ["a general statement", "a specific example", "the main conclusion"],
        correct: 0,
        why: "\"Every student who...\" covers a whole group, so it's a general statement.",
      },
      {
        options: ["applies to a particular case", "rejects", "offers as an explanation"],
        correct: 0,
        why: "The argument takes the rule about every student and applies it to one student, Jordan.",
      },
    ],
  },
  {
    id: "bd_build_4",
    kind: "build",
    sentences: [
      "Lena says the bakery must use real butter, because its croissants taste so rich.",
      "But rich flavor can also come from margarine with added flavoring.",
      "So the taste alone doesn't show that the bakery uses butter.",
    ],
    focus: null,
    prompt: "Describe what the argument does in sentences 2 and 3.",
    template: ["The argument ", " in order to show that ", "."],
    slots: [
      {
        options: [
          "points out another way Lena's evidence could come about",
          "attacks Lena's character",
          "gives an example of a general rule",
        ],
        correct: 0,
        why: "Rich flavor is Lena's evidence. Margarine is another way that same flavor could come about.",
      },
      {
        options: [
          "her evidence doesn't prove her conclusion",
          "her conclusion is false",
          "her evidence is false",
        ],
        correct: 0,
        why: "Read sentence 3 closely: \"doesn't show.\" The author never says the bakery skips butter. One word, \"false,\" would turn a correct description into a wrong one.",
      },
    ],
  },
];

export const BREAKDOWN_DRILL_IDS: string[] = BREAKDOWN_ITEMS.map((item) => item.id);

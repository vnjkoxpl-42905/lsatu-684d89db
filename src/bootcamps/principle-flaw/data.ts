export type QuestionTopic = 
  | "Flaw"
  | "Principle"
  | "Principle Strengthen"
  | "Strengthen Application"
  | "Principle Conform"
  | "Parallel Flaw"
  | "Timed LR"
  | "RC";

export type QuestionRef = {
  id: string;
  topic: QuestionTopic;
  set: string;
  level?: "Foundation" | "Level 1" | "Level 2" | "Level 3" | "Level 4" | "Bridge" | "Timed" | "Review";
  pt: string;
  section: string;
  question: string;
  instructions: string;
  reviewPrompt: string;
};

export type PracticeSet = {
  id: string;
  title: string;
  topic: "Flaw" | "Principle" | "Parallel Flaw" | "RC" | "Timed LR";
  stage: string;
  purpose: string;
  whenToDo: string;
  beforeYouStart: string[];
  questions: string[]; // IDs from questionBank
  reviewInstructions: string[];
  completionCriteria: string[];
};

export type Flashcard = {
  id: string;
  topic: "Flaw" | "Principle" | "Parallel Flaw" | "Review";
  front: string;
  back: string;
  tag: string;
};

export const questionBank: QuestionRef[] = [
  // Flaw Level 1
  {
    id: "flaw-l1-001",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 1",
    level: "Level 1",
    pt: "151",
    section: "2",
    question: "3",
    instructions: "Before answering, identify the conclusion, evidence, and assumption. Predict the flaw in plain English before checking the answer choices.",
    reviewPrompt: "Write: The author’s mistake is ______. Then explain why the tempting wrong answer was wrong."
  },
  {
    id: "flaw-l1-002",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 1",
    level: "Level 1",
    pt: "104",
    section: "4",
    question: "10",
    instructions: "Before answering, identify the conclusion, evidence, and assumption. Predict the flaw in plain English before checking the answer choices.",
    reviewPrompt: "Write: The author’s mistake is ______. Then explain why the tempting wrong answer was wrong."
  },
  {
    id: "flaw-l1-003",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 1",
    level: "Level 1",
    pt: "106",
    section: "3",
    question: "5",
    instructions: "Before answering, identify the conclusion, evidence, and assumption. Predict the flaw in plain English before checking the answer choices.",
    reviewPrompt: "Write: The author’s mistake is ______. Then explain why the tempting wrong answer was wrong."
  },
  {
    id: "flaw-l1-004",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 1",
    level: "Level 1",
    pt: "139",
    section: "4",
    question: "3",
    instructions: "Before answering, identify the conclusion, evidence, and assumption. Predict the flaw in plain English before checking the answer choices.",
    reviewPrompt: "Write: The author’s mistake is ______. Then explain why the tempting wrong answer was wrong."
  },
  {
    id: "flaw-l1-005",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 1",
    level: "Level 1",
    pt: "118",
    section: "3",
    question: "6",
    instructions: "Before answering, identify the conclusion, evidence, and assumption. Predict the flaw in plain English before checking the answer choices.",
    reviewPrompt: "Write: The author’s mistake is ______. Then explain why the tempting wrong answer was wrong."
  },
  // Flaw Level 2
  {
    id: "flaw-l2-001",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 2",
    level: "Level 2",
    pt: "127",
    section: "3",
    question: "17",
    instructions: "Answer-choice precision. Predict the flaw in plain English first. Be careful with 'Too Strong' traps.",
    reviewPrompt: "Label every answer choice for its specific logical style. Why exactly was the trap answer too strong?"
  },
  {
    id: "flaw-l2-002",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 2",
    level: "Level 2",
    pt: "105",
    section: "1",
    question: "26",
    instructions: "Answer-choice precision. Predict the flaw in plain English first. Be careful with 'Too Strong' traps.",
    reviewPrompt: "Label every answer choice for its specific logical style. Why exactly was the trap answer too strong?"
  },
  {
    id: "flaw-l2-003",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 2",
    level: "Level 2",
    pt: "106",
    section: "3",
    question: "2",
    instructions: "Answer-choice precision. Predict the flaw in plain English first. Be careful with 'Too Strong' traps.",
    reviewPrompt: "Label every answer choice for its specific logical style. Why exactly was the trap answer too strong?"
  },
  {
    id: "flaw-l2-004",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 2",
    level: "Level 2",
    pt: "110",
    section: "2",
    question: "3",
    instructions: "Answer-choice precision. Predict the flaw in plain English first. Be careful with 'Too Strong' traps.",
    reviewPrompt: "Label every answer choice for its specific logical style. Why exactly was the trap answer too strong?"
  },
  {
    id: "flaw-l2-005",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 2",
    level: "Level 2",
    pt: "103",
    section: "3",
    question: "8",
    instructions: "Answer-choice precision. Predict the flaw in plain English first. Be careful with 'Too Strong' traps.",
    reviewPrompt: "Label every answer choice for its specific logical style. Why exactly was the trap answer too strong?"
  },
  // Flaw Level 3
  {
    id: "flaw-l3-001",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 3",
    level: "Level 3",
    pt: "155",
    section: "4",
    question: "20",
    instructions: "Slow down on abstract wording. Map the abstract terms back to the stimulus facts.",
    reviewPrompt: "Explain why the tempting wrong answer was tempting. Translate the correct answer's abstract wording into concrete facts."
  },
  {
    id: "flaw-l3-002",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 3",
    level: "Level 3",
    pt: "102",
    section: "3",
    question: "23",
    instructions: "Slow down on abstract wording. Map the abstract terms back to the stimulus facts.",
    reviewPrompt: "Explain why the tempting wrong answer was tempting. Translate the correct answer's abstract wording into concrete facts."
  },
  {
    id: "flaw-l3-003",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 3",
    level: "Level 3",
    pt: "126",
    section: "4",
    question: "15",
    instructions: "Slow down on abstract wording. Map the abstract terms back to the stimulus facts.",
    reviewPrompt: "Explain why the tempting wrong answer was tempting. Translate the correct answer's abstract wording into concrete facts."
  },
  {
    id: "flaw-l3-004",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 3",
    level: "Level 3",
    pt: "113",
    section: "4",
    question: "22",
    instructions: "Slow down on abstract wording. Map the abstract terms back to the stimulus facts.",
    reviewPrompt: "Explain why the tempting wrong answer was tempting. Translate the correct answer's abstract wording into concrete facts."
  },
  {
    id: "flaw-l3-005",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 3",
    level: "Level 3",
    pt: "117",
    section: "3",
    question: "6",
    instructions: "Slow down on abstract wording. Map the abstract terms back to the stimulus facts.",
    reviewPrompt: "Explain why the tempting wrong answer was tempting. Translate the correct answer's abstract wording into concrete facts."
  },
  // Flaw Level 4
  {
    id: "flaw-l4-001",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 4",
    level: "Level 4",
    pt: "152",
    section: "2",
    question: "18",
    instructions: "Predict before answer choices. These involve mixed flaws and very technical wording.",
    reviewPrompt: "If you missed it, redo after 24 hours. State exactly which logical bridge was missing."
  },
  {
    id: "flaw-l4-002",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 4",
    level: "Level 4",
    pt: "152",
    section: "4",
    question: "16",
    instructions: "Predict before answer choices. These involve mixed flaws and very technical wording.",
    reviewPrompt: "If you missed it, redo after 24 hours. State exactly which logical bridge was missing."
  },
  {
    id: "flaw-l4-003",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 4",
    level: "Level 4",
    pt: "106",
    section: "2",
    question: "18",
    instructions: "Predict before answer choices. These involve mixed flaws and very technical wording.",
    reviewPrompt: "If you missed it, redo after 24 hours. State exactly which logical bridge was missing."
  },
  {
    id: "flaw-l4-004",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 4",
    level: "Level 4",
    pt: "108",
    section: "3",
    question: "15",
    instructions: "Predict before answer choices. These involve mixed flaws and very technical wording.",
    reviewPrompt: "If you missed it, redo after 24 hours. State exactly which logical bridge was missing."
  },
  {
    id: "flaw-l4-005",
    topic: "Flaw",
    set: "Flaw Progressive Mastery Level 4",
    level: "Level 4",
    pt: "149",
    section: "3",
    question: "20",
    instructions: "Predict before answer choices. These involve mixed flaws and very technical wording.",
    reviewPrompt: "If you missed it, redo after 24 hours. State exactly which logical bridge was missing."
  },
  // Principle Strengthen
  {
    id: "prin-st-001",
    topic: "Principle Strengthen",
    set: "Principle Strengthen Homework",
    pt: "135",
    section: "1",
    question: "14",
    instructions: "Identify the conclusion and evidence first. Match evidence to the IF side and conclusion to the THEN side.",
    reviewPrompt: "State the rule clearly: If [Evidence], then [Conclusion]. Why was the wrong answer a mismatch?"
  },
  {
    id: "prin-st-002",
    topic: "Principle Strengthen",
    set: "Principle Strengthen Homework",
    pt: "137",
    section: "2",
    question: "8",
    instructions: "Identify the conclusion and evidence first. Match evidence to the IF side and conclusion to the THEN side.",
    reviewPrompt: "State the rule clearly: If [Evidence], then [Conclusion]. Why was the wrong answer a mismatch?"
  },
  {
    id: "prin-st-003",
    topic: "Principle Strengthen",
    set: "Principle Strengthen Homework",
    pt: "138",
    section: "2",
    question: "5",
    instructions: "Identify the conclusion and evidence first. Match evidence to the IF side and conclusion to the THEN side.",
    reviewPrompt: "State the rule clearly: If [Evidence], then [Conclusion]. Why was the wrong answer a mismatch?"
  },
  {
    id: "prin-st-004",
    topic: "Principle Strengthen",
    set: "Principle Strengthen Homework",
    pt: "142",
    section: "1",
    question: "10",
    instructions: "Identify the conclusion and evidence first. Match evidence to the IF side and conclusion to the THEN side.",
    reviewPrompt: "State the rule clearly: If [Evidence], then [Conclusion]. Why was the wrong answer a mismatch?"
  },
  {
    id: "prin-st-005",
    topic: "Principle Strengthen",
    set: "Principle Strengthen Homework",
    pt: "144",
    section: "2",
    question: "14",
    instructions: "Identify the conclusion and evidence first. Match evidence to the IF side and conclusion to the THEN side.",
    reviewPrompt: "State the rule clearly: If [Evidence], then [Conclusion]. Why was the wrong answer a mismatch?"
  },
  // Strengthen Application
  {
    id: "str-app-001",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "133",
    section: "1",
    question: "18",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-002",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "137",
    section: "2",
    question: "8",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-003",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "137",
    section: "2",
    question: "25",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-004",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "137",
    section: "4",
    question: "8",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-005",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "138",
    section: "2",
    question: "5",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-006",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "143",
    section: "4",
    question: "19",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-007",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "124",
    section: "3",
    question: "25",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  {
    id: "str-app-008",
    topic: "Strengthen Application",
    set: "Strengthen Application Homework",
    pt: "137",
    section: "3",
    question: "20",
    instructions: "Locate the rule in the stimulus. What condition (trigger) still needs proof?",
    reviewPrompt: "What condition does the correct answer establish to pull the trigger?"
  },
  // Principle Conform
  {
    id: "prin-cf-001",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "131",
    section: "1",
    question: "9",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-002",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "127",
    section: "3",
    question: "23",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-003",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "124",
    section: "1",
    question: "17",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-004",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "130",
    section: "1",
    question: "21",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-005",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "125",
    section: "4",
    question: "17",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-006",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "129",
    section: "3",
    question: "14",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-007",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "134",
    section: "2",
    question: "22",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  {
    id: "prin-cf-008",
    topic: "Principle Conform",
    set: "Principle Conform Homework",
    pt: "131",
    section: "1",
    question: "17",
    instructions: "Extract the logic of the rule into a simple 'If X, then Y' statement.",
    reviewPrompt: "Identify the exact rule language that was triggered."
  },
  // Parallel Flaw Bridge
  {
    id: "par-fl-001",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "127",
    section: "3",
    question: "24",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-002",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "131",
    section: "2",
    question: "16",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-003",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "121",
    section: "4",
    question: "22",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-004",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "124",
    section: "3",
    question: "23",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-005",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "125",
    section: "4",
    question: "25",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-006",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "110",
    section: "2",
    question: "6",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-007",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "119",
    section: "2",
    question: "20",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-008",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "132",
    section: "2",
    question: "7",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-009",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "134",
    section: "3",
    question: "23",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-010",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "110",
    section: "3",
    question: "23",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-011",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "135",
    section: "1",
    question: "11",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  },
  {
    id: "par-fl-012",
    topic: "Parallel Flaw",
    set: "Parallel Flaw Bridge",
    pt: "102",
    section: "4",
    question: "12",
    instructions: "Identify the Flaw first. State it as a 'Bridge' sentence: 'The author concludes X because Y, but assumes Z.'",
    reviewPrompt: "Write the original argument pattern. Then write why the correct answer matches it."
  }
];

export const practiceSets: PracticeSet[] = [
  {
    id: "flaw-worksheet-set",
    title: "Flaw Worksheet",
    topic: "Flaw",
    stage: "Foundation",
    purpose: "Recognize flaw answer-choice wording.",
    whenToDo: "Day 1",
    beforeYouStart: [
      "Do not solve from memory.",
      "Classify the wording as assumption-style, objection-style, or abstract match."
    ],
    questions: [], // Special worksheet in UI
    reviewInstructions: [
      "Write the test you would use for each answer choice."
    ],
    completionCriteria: [
      "All wording types identified."
    ]
  },
  {
    id: "flaw-l1-set",
    title: "Flaw Progressive Mastery Level 1",
    topic: "Flaw",
    stage: "Level 1",
    purpose: "Basic flaw prediction.",
    whenToDo: "Day 1",
    beforeYouStart: [
      "Write the conclusion and evidence before answering."
    ],
    questions: ["flaw-l1-001", "flaw-l1-002", "flaw-l1-003", "flaw-l1-004", "flaw-l1-005"],
    reviewInstructions: [
      "Write 'The author’s mistake is ______.' for every miss."
    ],
    completionCriteria: [
      "90% accuracy or full review completed."
    ]
  },
  {
    id: "flaw-l2-set",
    title: "Flaw Progressive Mastery Level 2",
    topic: "Flaw",
    stage: "Level 2",
    purpose: "Answer-choice precision.",
    whenToDo: "Day 4",
    beforeYouStart: [
      "Predict the flaw in plain English first."
    ],
    questions: ["flaw-l2-001", "flaw-l2-002", "flaw-l2-003", "flaw-l2-004", "flaw-l2-005"],
    reviewInstructions: [
      "For the hardest two questions, label each answer choice."
    ],
    completionCriteria: [
      "Completed with logged Precision reviews."
    ]
  },
  {
    id: "flaw-l3-set",
    title: "Flaw Progressive Mastery Level 3",
    topic: "Flaw",
    stage: "Level 3",
    purpose: "Harder flaw patterns.",
    whenToDo: "Day 8",
    beforeYouStart: [
      "Slow down on abstract wording."
    ],
    questions: ["flaw-l3-001", "flaw-l3-002", "flaw-l3-003", "flaw-l3-004", "flaw-l3-005"],
    reviewInstructions: [
      "Explain why the tempting wrong answer was tempting."
    ],
    completionCriteria: [
      "All misses analyzed in Review Log."
    ]
  },
  {
    id: "flaw-l4-set",
    title: "Flaw Progressive Mastery Level 4",
    topic: "Flaw",
    stage: "Level 4",
    purpose: "High-difficulty mixed flaw recognition.",
    whenToDo: "Day 13",
    beforeYouStart: [
      "Predict before answer choices."
    ],
    questions: ["flaw-l4-001", "flaw-l4-002", "flaw-l4-003", "flaw-l4-004", "flaw-l4-005"],
    reviewInstructions: [
      "Redo all misses after 24 hours."
    ],
    completionCriteria: [
      "Level 4 accuracy confirmed."
    ]
  },
  {
    id: "prin-st-set",
    title: "Principle Strengthen Homework",
    topic: "Principle",
    stage: "Strengthen",
    purpose: "Matching a rule to an argument.",
    whenToDo: "Day 3, 5",
    beforeYouStart: [
      "Identify conclusion and evidence."
    ],
    questions: ["prin-st-001", "prin-st-002", "prin-st-003", "prin-st-004", "prin-st-005"],
    reviewInstructions: [
      "Identify rule, trigger, and outcome."
    ],
    completionCriteria: [
      "All rules mapped correctly."
    ]
  },
  {
    id: "str-app-set",
    title: "Strengthen Application Homework",
    topic: "Principle",
    stage: "Application",
    purpose: "Proving the missing trigger.",
    whenToDo: "Day 5, 8",
    beforeYouStart: [
      "Locate the rule and ask what condition still needs proof."
    ],
    questions: ["str-app-001", "str-app-002", "str-app-003", "str-app-004", "str-app-005", "str-app-006", "str-app-007", "str-app-008"],
    reviewInstructions: [
      "Write what condition the correct answer establishes."
    ],
    completionCriteria: [
      "Trigger identification verified."
    ]
  },
  {
    id: "prin-cf-set",
    title: "Principle Conform Homework",
    topic: "Principle",
    stage: "Conform",
    purpose: "Applying a rule to a situation.",
    whenToDo: "Day 9, 10, 11",
    beforeYouStart: [
      "Identify the rule’s trigger and outcome."
    ],
    questions: ["prin-cf-001", "prin-cf-002", "prin-cf-003", "prin-cf-004", "prin-cf-005", "prin-cf-006", "prin-cf-007", "prin-cf-008"],
    reviewInstructions: [
      "Identify exact rule language triggered."
    ],
    completionCriteria: [
      "Fact-to-rule mapping complete."
    ]
  },
  {
    id: "par-fl-bridge-set",
    title: "Parallel Flaw Bridge",
    topic: "Parallel Flaw",
    stage: "Bridge",
    purpose: "Matching structure, not topic.",
    whenToDo: "Day 11, 14",
    beforeYouStart: [
      "Write the original argument pattern."
    ],
    questions: ["par-fl-001", "par-fl-002", "par-fl-003", "par-fl-004", "par-fl-005", "par-fl-006", "par-fl-007", "par-fl-008", "par-fl-009", "par-fl-010", "par-fl-011", "par-fl-012"],
    reviewInstructions: [
      "Write 'The author concludes X because Y, but assumes Z.'"
    ],
    completionCriteria: [
      "Pattern matching mastery verified."
    ]
  },
  {
    id: "timed-lr-set",
    title: "Timed LR Section",
    topic: "Timed LR",
    stage: "Maintenance",
    purpose: "Expose weak spots under pressure.",
    whenToDo: "Day 6, 12",
    beforeYouStart: [
      "Use normal timing (35 mins)."
    ],
    questions: [], // Reference full sections
    reviewInstructions: [
      "Review missed, flagged, Flaw, Principle, and two-choice questions."
    ],
    completionCriteria: [
      "Full section reviewed."
    ]
  },
  {
    id: "rc-passage-set",
    title: "Untimed RC Passage Review",
    topic: "RC",
    stage: "Maintenance",
    purpose: "Keep RC accuracy active.",
    whenToDo: "Day 13",
    beforeYouStart: [
      "Read for structure."
    ],
    questions: [], // Reference full passages
    reviewInstructions: [
      "Find the exact line support for every missed answer."
    ],
    completionCriteria: [
      "Structural mapping complete."
    ]
  }
];

export const flashcards: Flashcard[] = [
  // Flaw
  { id: "f-1", topic: "Flaw", tag: "Basics", front: "What is a Flaw question asking?", back: "It asks for the logical error in the transition from evidence to conclusion. It’s not asking if the facts are true, but why they don’t prove the goal." },
  { id: "f-2", topic: "Flaw", tag: "Basics", front: "What is the four-step Flaw method?", back: "1. Conclusion. 2. Evidence. 3. Assumption (Gap). 4. Predict the Flaw." },
  { id: "f-3", topic: "Flaw", tag: "Style", front: "What is an assumption-style answer?", back: "An answer that describes what the author needed but didn’t say. (Uses: 'assumes', 'takes for granted')" },
  { id: "f-4", topic: "Flaw", tag: "Style", front: "What is an objection-style answer?", back: "An answer that describes a possibility the author ignored. (Uses: 'fails to consider', 'overlooks')" },
  { id: "f-5", topic: "Flaw", tag: "Style", front: "What is an abstract match answer?", back: "An answer that uses logic jargon to describe the movement. (Uses: 'infers a X from Y')" },
  { id: "f-6", topic: "Flaw", tag: "Test", front: "What is the negation test for assumption-style Flaw answers?", back: "If you make the answer false and the argument dies, it’s a necessary assumption of the author." },
  { id: "f-7", topic: "Flaw", tag: "Test", front: "What is the truth test for objection-style Flaw answers?", back: "If you treat the answer as true and the conclusion gets weaker, it’s a valid objection." },
  { id: "f-8", topic: "Flaw", tag: "Trap", front: "What is a too-strong trap?", back: "An answer using extreme words (always, never) when the argument only needed a likely or possible connection." },
  { id: "f-9", topic: "Flaw", tag: "Trap", front: "What is a wrong-flaw trap?", back: "Describing a real logical error (like circular reasoning) that simply didn't happen in this specific story." },
  { id: "f-10", topic: "Flaw", tag: "Trap", front: "What is reversed logic?", back: "Using the right facts but flipping the direction of the error (e.g., A confuses for B instead of B for A)." },
  { id: "f-11", topic: "Flaw", tag: "Concepts", front: "What is a causal flaw?", back: "Assuming correlation implies causation, or ignoring alternative causes." },
  { id: "f-12", topic: "Flaw", tag: "Concepts", front: "What is a necessary vs sufficient flaw?", back: "Treating a requirement as enough to guarantee an outcome." },
  { id: "f-13", topic: "Flaw", tag: "Concepts", front: "What is a part vs whole flaw?", back: "Assuming what’s true of the parts is true of the collective, or vice versa." },
  { id: "f-14", topic: "Flaw", tag: "Concepts", front: "What is unproven vs false?", back: "Thinking that a lack of evidence for X proves that X is false." },
  { id: "f-15", topic: "Flaw", tag: "Concepts", front: "What is a sampling flaw?", back: "Generalizing from an unrepresentative or biased group." },

  // Principle
  { id: "p-1", topic: "Principle", tag: "Basics", front: "What is a Principle question?", back: "A question about general rules or logical standards that govern specific situations." },
  { id: "p-2", topic: "Principle", tag: "Framework", front: "What are the four parts of the Principle framework?", back: "1. Rule. 2. Trigger. 3. Application. 4. Outcome." },
  { id: "p-3", topic: "Principle", tag: "Framework", front: "What is the rule?", back: "The general 'If... then' standard being discussed." },
  { id: "p-4", topic: "Principle", tag: "Framework", front: "What is the trigger?", back: "The 'If' part; the condition that must be met to activate the rule." },
  { id: "p-5", topic: "Principle", tag: "Framework", front: "What is the application?", back: "The specific case or set of facts we are testing." },
  { id: "p-6", topic: "Principle", tag: "Framework", front: "What is the outcome?", back: "The 'Then' part; the result required if the trigger is met." },
  { id: "p-7", topic: "Principle", tag: "Types", front: "What is Principle Strengthen?", back: "Giving a rule that connects the stimulus facts to the conclusion." },
  { id: "p-8", topic: "Principle", tag: "Types", front: "What is Strengthen Application?", back: "Providing the missing fact to trigger a rule already stated." },
  { id: "p-9", topic: "Principle", tag: "Types", front: "What is Principle Conform?", back: "Finding a situation that obeys the logical movement of the stimulus rule." },
  { id: "p-10", topic: "Principle", tag: "Concepts", front: "What is an implicit principle?", back: "A rule that isn't stated but is required for the argument to make sense." },
  { id: "p-11", topic: "Principle", tag: "Trap", front: "What does too broad mean?", back: "A rule that covers many cases but doesn't specifically help the stimulus bridge." },
  { id: "p-12", topic: "Principle", tag: "Trap", front: "What does too narrow mean?", back: "A rule that only covers part of the stimulus gap or adds irrelevant conditions." },
  { id: "p-13", topic: "Principle", tag: "Trap", front: "What is a rule mismatch?", back: "The answer uses the right topics but the wrong logical relationship (flips trigger/outcome)." },
  { id: "p-14", topic: "Principle", tag: "Trap", front: "What is the missing trigger problem?", back: "Concluding the outcome happens without proving the required trigger facts." },
  { id: "p-15", topic: "Principle", tag: "Review", front: "What is the review template for Principle questions?", back: "Map: Rule -> Trigger -> Application -> Outcome. Find exactly where the match failed." },

  // Parallel Flaw
  { id: "pa-1", topic: "Parallel Flaw", tag: "Goal", front: "What is the goal of Parallel Flaw?", back: "To find an argument with the same logical structure and error as the stimulus." },
  { id: "pa-2", topic: "Parallel Flaw", tag: "Trap", front: "Why should you not match by topic?", back: "The LSAT uses similar topics to distract. Structure and force are what matter, not subject matter." },
  { id: "pa-3", topic: "Parallel Flaw", tag: "Method", front: "What sentence should you write before answer choices?", back: "'The author concludes X because Y, but assumes Z.' (The exact flawed bridge)." },
  { id: "pa-4", topic: "Parallel Flaw", tag: "Concepts", front: "What does structure matching mean?", back: "Matching the type of evidence (conditional, causal, comparison) used to reach the goal." },
  { id: "pa-5", topic: "Parallel Flaw", tag: "Concepts", front: "What is logical force matching?", back: "Ensuring the conclusion strength (some vs all) matches the original." },

  // Review
  { id: "r-1", topic: "Review", tag: "Wait", front: "What should you write for a missed Flaw question?", back: "Conclusion, Evidence, Assumption, Plain English Flaw, and why the trap was tempting." },
  { id: "r-2", topic: "Review", tag: "Wait", front: "What should you write for a missed Principle question?", back: "The Trigger fact I missed, or why the rule was a logical mismatch." },
  { id: "r-3", topic: "Review", tag: "Wait", front: "What should you write for a missed Parallel Flaw question?", back: "The flawed bridge sentence and why the wrong answer changed that bridge." },
  { id: "r-4", topic: "Review", tag: "Queue", front: "What belongs in the redo queue?", back: "Any question you missed, guessed on, or felt slow solving." },
  { id: "r-5", topic: "Review", tag: "Lesson", front: "What does 'next time I need to notice' mean?", back: "A specific trigger wording or pattern you missed (e.g., 'only if' reversal)." }
];

export type StudyResource = {
  id: string;
  title: string;
  category: "Schedule" | "Flaw Notes" | "Flaw Homework" | "Principle Notes" | "Principle Homework" | "Bridge";
  description: string;
  useWhen: string;
  driveUrl?: string;
  includedInApp: boolean;
};

export const studyResources: StudyResource[] = [
  {
    id: "flaw-packet",
    title: "Flaw Packet",
    category: "Flaw Notes",
    description: "The complete foundation for Flaw questions.",
    useWhen: "Days 1, 2, 4, 8, 10, 13",
    includedInApp: true
  },
  {
    id: "flaw-notes-strategy",
    title: "Flaw Notes: Strategy",
    category: "Flaw Notes",
    description: "Core 4-Step Method and Answer Choice Styles.",
    useWhen: "Day 1",
    includedInApp: true
  },
  {
    id: "flaw-worksheet",
    title: "Flaw Worksheet",
    category: "Flaw Homework",
    description: "Foundation drill for Assumption vs Objection wording.",
    useWhen: "Day 1",
    includedInApp: true
  },
  {
    id: "flaw-pm-1",
    title: "Flaw Progressive Mastery L1",
    category: "Flaw Homework",
    description: "Introductory difficulty flaws (PT 104-151).",
    useWhen: "Day 1",
    includedInApp: true
  },
  {
    id: "principle-packet",
    title: "Principle Packet",
    category: "Principle Notes",
    description: "Logic for Strengthen and Conform principles.",
    useWhen: "Days 3, 5, 9, 10, 11",
    includedInApp: true
  },
  {
    id: "principle-recap",
    title: "Principle Recap: Trigger & Outcome",
    category: "Principle Notes",
    description: "Mapping rules to facts.",
    useWhen: "Day 3",
    includedInApp: true
  },
  {
    id: "flaw-notes-advanced",
    title: "Flaw Notes: Assumption vs Objection",
    category: "Flaw Notes",
    description: "Deep dive into L2 and L3 traps.",
    useWhen: "Day 4",
    includedInApp: true
  },
  {
    id: "flaw-pm-2",
    title: "Flaw Progressive Mastery L2",
    category: "Flaw Homework",
    description: "Intermediate difficulty flaws.",
    useWhen: "Day 4",
    includedInApp: true
  },
  {
    id: "principle-strengthen-hw",
    title: "Principle Strengthen Homework",
    category: "Principle Homework",
    description: "Drilling the 'justify' relationship.",
    useWhen: "Day 3, 5",
    includedInApp: true
  },
  {
    id: "principle-app-strategy",
    title: "Principle Application strategy",
    category: "Principle Notes",
    description: "Applying rules to check maintenance and arguments.",
    useWhen: "Day 5",
    includedInApp: true
  },
  {
    id: "strengthen-app-hw",
    title: "Strengthen Application Homework",
    category: "Principle Homework",
    description: "Applying principles to diverse stimuli.",
    useWhen: "Day 5, 8",
    includedInApp: true
  },
  {
    id: "timed-strategy-lr",
    title: "Timed Strategy: LR",
    category: "Bridge",
    description: "Pacing and triage methods for timed sections.",
    useWhen: "Day 6, 12",
    includedInApp: true
  },
  {
    id: "flaw-pm-3",
    title: "Flaw Progressive Mastery L3",
    category: "Flaw Homework",
    description: "High-difficulty flaws with complex language.",
    useWhen: "Day 8",
    includedInApp: true
  },
  {
    id: "principle-conform-strategy",
    title: "Principle Conform strategy",
    category: "Principle Notes",
    description: "Fact-to-rule matching techniques.",
    useWhen: "Day 9",
    includedInApp: true
  },
  {
    id: "principle-conform-hw",
    title: "Principle Conform Homework",
    category: "Principle Homework",
    description: "Matching scenarios to stated rules.",
    useWhen: "Day 9, 10, 11",
    includedInApp: true
  },
  {
    id: "parallel-flaw-strategy",
    title: "Parallel Flaw: Pattern Matching",
    category: "Flaw Notes",
    description: "Mirroring logical forms across arguments.",
    useWhen: "Day 11",
    includedInApp: true
  },
  {
    id: "parallel-flaw-bridge",
    title: "Parallel Flaw Bridge Homework",
    category: "Flaw Homework",
    description: "Transitioning from standard Flaws to Parallel forms.",
    useWhen: "Day 11, 14",
    includedInApp: true
  },
  {
    id: "rc-structure-strategy",
    title: "RC: Structure vs Details",
    category: "Bridge",
    description: "Method for identifying author's main point and tone.",
    useWhen: "Day 13",
    includedInApp: true
  }
];

export const scheduleData = [
  {
    day: 1,
    label: "Monday",
    focus: "Flaw Foundation",
    plainGoal: "Learn the basic Flaw method and start Level 1.",
    open: ["flaw-packet"],
    read: ["flaw-notes-strategy"],
    do: ["flaw-worksheet", "flaw-pm-1"],
    review: [
      "Conclusion",
      "Evidence",
      "Assumption",
      "Flaw",
      "Tempting wrong answer"
    ],
    bring: ["2 confusing questions for tutoring"],
    time: "75-100 minutes",
    intensity: "Medium" as const,
    deliverable: "Worksheet completed and Level 1 misses logged"
  },
  {
    day: 2,
    label: "Tuesday",
    focus: "Tutoring Prep & Light Review",
    plainGoal: "Review Monday's work and prepare questions for tutoring.",
    open: ["flaw-packet"],
    read: ["Monday's Review Log entries"],
    do: ["Redo 2 hardest questions from Monday"],
    review: [
      "Process efficiency",
      "Clarity of explanations",
      "Specific confusion points"
    ],
    bring: ["List of 2-3 specific questions for tutoring"],
    time: "30-45 minutes",
    intensity: "Light" as const,
    deliverable: "Ready for tutoring session"
  },
  {
    day: 3,
    label: "Wednesday",
    focus: "Principle Foundation",
    plainGoal: "Learn the Principle framework and start basic drills.",
    open: ["principle-packet", "flaw-packet"],
    read: ["principle-recap"],
    do: ["principle-strengthen-hw", "Redo 2 Flaw Level 1 questions"],
    review: [
      "Rule identification",
      "Trigger mapping",
      "Missing link",
      "Matching outcome"
    ],
    bring: ["1 Principle question that felt slow"],
    time: "60-90 minutes",
    intensity: "High" as const,
    deliverable: "Principle mapping completed and Flaw re-dos logged"
  },
  {
    day: 4,
    label: "Thursday",
    focus: "Flaw Level 2 & Precision",
    plainGoal: "Master harder flaws and refine answer choice breakdown.",
    open: ["flaw-packet"],
    read: ["flaw-notes-advanced"],
    do: ["flaw-pm-2"],
    review: [
      "Label every answer choice",
      "Identify the 'too strong' trap",
      "Spot 'bad match' errors"
    ],
    bring: ["A 'too strong' wrong answer you liked"],
    time: "75-100 minutes",
    intensity: "Medium" as const,
    deliverable: "Level 2 completed with full answer breakdowns"
  },
  {
    day: 5,
    label: "Friday",
    focus: "Principle Application",
    plainGoal: "Apply principles to strengthen arguments and check maintenance.",
    open: ["principle-packet", "flaw-packet"],
    read: ["principle-app-strategy"],
    do: ["principle-strengthen-hw", "strengthen-app-hw", "Redo 2 Flaw misses"],
    review: [
      "Identify the proven condition",
      "Check for necessary vs sufficient",
      "Verify the result"
    ],
    bring: ["1 Application question with a tricky 'if'"],
    time: "60-90 minutes",
    intensity: "Medium" as const,
    deliverable: "Principle and Application homework completed"
  },
  {
    day: 6,
    label: "Saturday",
    focus: "Timed Practice",
    plainGoal: "Measure progress under time and perform deep review.",
    open: ["Schedule"],
    read: ["timed-strategy-lr"],
    do: ["One timed LR section"],
    review: [
      "All Flaw misses",
      "All Principle misses",
      "Flagged questions",
      "Two-choice decisions"
    ],
    bring: ["Your worst miss from the timed section"],
    time: "120 minutes",
    intensity: "High" as const,
    deliverable: "Section score and comprehensive review log"
  },
  {
    day: 7,
    label: "Sunday",
    focus: "Controlled Review Day",
    plainGoal: "Identify recurring patterns and solidify wins.",
    open: ["Review Log"],
    read: ["This week's takeaways"],
    do: ["Redo 3 Flaw misses", "Redo 2 Principle misses"],
    review: [
      "Recurring error types",
      "Timing bottlenecks",
      "Progress against goals"
    ],
    bring: ["Top 3 mistake list for next week"],
    time: "45-60 minutes",
    intensity: "Light" as const,
    deliverable: "Top 3 recurring mistakes list"
  },
  {
    day: 8,
    label: "Monday (Week 2)",
    focus: "Flaw Level 3",
    plainGoal: "Attack high-difficulty flaws and continue application.",
    open: ["flaw-packet", "principle-packet"],
    read: ["flaw-notes-strategy"],
    do: ["flaw-pm-3", "strengthen-app-hw"],
    review: [
      "Abstract match consistency",
      "Tough language mapping",
      "Speed of identification"
    ],
    bring: ["1 Level 3 question that felt alien"],
    time: "90-120 minutes",
    intensity: "Medium" as const,
    deliverable: "Level 3 and Application work logged"
  },
  {
    day: 9,
    label: "Tuesday (Week 2)",
    focus: "Tutoring Prep & Conform",
    plainGoal: "Learn Principle Conform and prepare for session.",
    open: ["principle-packet", "flaw-packet"],
    read: ["principle-conform-strategy"],
    do: ["principle-conform-hw", "Redo 3 Flaw misses"],
    review: [
      "Fact-to-rule matching",
      "Identity mapping",
      "Outcome verification"
    ],
    bring: ["List of Conform questions to review"],
    time: "75-100 minutes",
    intensity: "Medium" as const,
    deliverable: "Ready for tutoring session"
  },
  {
    day: 10,
    label: "Wednesday (Week 2)",
    focus: "Mixed Drills",
    plainGoal: "Handle shifting targets between Flaw and Principle.",
    open: ["flaw-packet", "principle-packet"],
    read: ["Task-switching mindset"],
    do: ["flaw-pm-3", "principle-conform-hw"],
    review: [
      "Task identification speed",
      "Process separation",
      "Accuracy vs speed"
    ],
    bring: ["1 question where you matched the wrong task"],
    time: "90-120 minutes",
    intensity: "High" as const,
    deliverable: "Mixed drill completed"
  },
  {
    day: 11,
    label: "Thursday (Week 2)",
    focus: "Conform & Parallel Bridge",
    plainGoal: "Finish Conform and bridge to Parallel Flaw.",
    open: ["principle-packet"],
    read: ["parallel-flaw-strategy"],
    do: ["principle-conform-hw", "parallel-flaw-bridge"],
    review: [
      "Argument pattern mapping",
      "Answer choice mirroring",
      "Logical force matching"
    ],
    bring: ["A Parallel Flaw answer you thought mirrored perfectly"],
    time: "90-120 minutes",
    intensity: "High" as const,
    deliverable: "Parallel Bridge started"
  },
  {
    day: 12,
    label: "Friday (Week 2)",
    focus: "Final Timed LR",
    plainGoal: "Final section test before wrap-up.",
    open: ["Schedule"],
    read: ["timed-strategy-lr"],
    do: ["One timed LR section"],
    review: [
      "Priority review: Flaws first",
      "Secondary: Principles",
      "Tertiary: Flags"
    ],
    bring: ["A question you flagged but got right"],
    time: "120 minutes",
    intensity: "High" as const,
    deliverable: "Timed section score and prioritized review"
  },
  {
    day: 13,
    label: "Saturday (Week 2)",
    focus: "Final Mastery & RC",
    plainGoal: "Close out Level 4 and incorporate reading.",
    open: ["flaw-packet", "Schedule"],
    read: ["rc-structure-strategy"],
    do: ["flaw-pm-3", "Redo 5 Flaw hard ones", "One untimed RC passage"],
    review: [
      "Full argument mapping for RC",
      "Proof lines for every answer",
      "Flaw Level 4 final patterns"
    ],
    bring: ["1 RC question where the proof felt hidden"],
    time: "120 minutes",
    intensity: "Medium" as const,
    deliverable: "Flaw mastery finished and RC passage logged"
  },
  {
    day: 14,
    label: "Sunday (Week 2)",
    focus: "Strategic Wrap-up",
    plainGoal: "Extract permanent takeaways for future blocks.",
    open: ["Schedule"],
    read: ["Takeaway formatting"],
    do: ["Redo 3 Flaw, 3 Principle, 1 Parallel Flaw"],
    review: [
      "Final takeaways",
      "Next block goals",
      "Confidence check"
    ],
    bring: ["5 key takeaways for your coach"],
    time: "60 minutes",
    intensity: "Light" as const,
    deliverable: "5 clear takeaways logged"
  }
];

export const flawHubData = {
  styles: [
    {
      id: "assumption",
      style: "Assumption (Bridge)",
      meaning: "The author leaves a gap and assumes you'll accept an unstated link. They treat weightless premises as if they prove the conclusion.",
      language: ["takes for granted", "assumes", "presumes", "relies on the unstated premise"],
      test: "Negation: If you make this answer false, does the whole argument die? If yes, it's the assumption.",
      correctBehavior: "It identifies the exact missing piece of the logical bridge.",
      wrongBehavior: "It describes a helpful fact that isn't strictly necessary for the conclusion.",
      studentTest: "Did the author NEED this to be true for the argument to not crash?",
      reviewPrompt: "The author assumes ______ is true, but they never prove it in the text.",
    },
    {
      id: "objection",
      style: "Possibility (Counter)",
      meaning: "The author ignored a real-world scenario that ruins their argument. They failed to 'clear the path' of obstacles.",
      language: ["fails to consider", "overlooks the possibility that", "ignores the prospect that"],
      test: "Weakening: If you add this answer as a fact, does it make the conclusion look foolish? If yes, it's the flaw.",
      correctBehavior: "It introduces a hurdles the author didn't jump over.",
      wrongBehavior: "It introduces a fact that is irrelevant or actually supports the author.",
      studentTest: "If this scenario exists, is the conclusion now structurally weaker?",
      reviewPrompt: "The author fails to account for the damaging possibility that ______.",
    },
    {
      id: "abstract",
      style: "Abstract Description",
      meaning: "A purely structural description using logical terms (like 'Necessary/Sufficient' or 'Unrepresentative Sample').",
      language: ["confuses a condition that is required for one that is enough", "bases a generalization on a sample that is likely to be unrepresentative"],
      test: "Substitution: Can you replace the 'fancy' words with specific parts of the story? If the map is 1:1, it's right.",
      correctBehavior: "It is a dry, literal description of the logical machine's error.",
      wrongBehavior: "It sounds smart but describes a movement that didn't actually happen in the text.",
      studentTest: "Can I point at the part of the argument that matches EVERY word in this answer?",
      reviewPrompt: "The answer describes the movement from ______ to ______ correctly.",
    },
  ],
  miniDrill: [
    { stem: "Takes for granted that X", style: "Assumption (Bridge)", why: "Uses 'takes for granted' which implies an unproven requirement." },
    { stem: "Fails to consider that Y", style: "Possibility (Counter)", why: "Uses 'fails to consider' which points to an ignored alternative." },
    { stem: "Treats a necessary condition as sufficient", style: "Abstract Description", why: "Describes a logical error using general terminology." },
  ],
  traps: [
    {
      trap: "The 'Right Flaw, Wrong Story'",
      meaning: "Names a real logical error (like Correlation) that simply didn't happen in *this* argument.",
      trick: "Uses familiar logic terms to trigger your 'I know this!' reflex.",
      avoid: "Double-check: Did they actually use a link to prove a cause? If not, it's a trap.",
    },
    {
      trap: "The 'Satisfying Objection'",
      meaning: "Provides a counter-fact that sounds smart but doesn't hit the author's logic gap.",
      trick: "Appeals to your real-world 'common sense' or personal feelings about the topic.",
      avoid: "Ask: 'Even if this is true, does it actually break the logical LINK or just the story?'",
    },
    {
      trap: "Force Mismatch",
      meaning: "The answer is much 'stronger' (always/all) than the argument's conclusion allows.",
      trick: "Matches the topic but overstates the logical force needed to fix/break it.",
      avoid: "Match the 'temperature' of the answer choice to the 'temperature' of the conclusion.",
    },
  ],
  famousFlaws: [
    {
      flaw: "Necessary vs Sufficient",
      meaning: "Confusing what is needed (Necessary) with what is enough (Sufficient).",
      spot: "Conclusion is a 'Must' statement based on meeting a 'Might' condition.",
      ask: "Just because A gives us B, does B have to have come from A?",
      do: "Identify the Reversal Error or the Negation Error."
    },
    {
      flaw: "Correlation vs Causation",
      meaning: "Assuming a timing link proves a physical link.",
      spot: "Two things happened at the same time or in a sequence.",
      ask: "Could it be a Reverse Cause? A Third Fact (Z)? Or just Coincidence?",
      do: "Focus on the mechanism. Is there any evidence for 'HOW' it caused it?"
    },
    {
      flaw: "Sampling Bias",
      meaning: "Assuming a weird group represents a normal group.",
      spot: "Surveys, tiny subgroups, or 'extreme' cases representing the 'average'.",
      ask: "Is the subject of the evidence fundamentally different from the subject of the conclusion?",
      do: "Check if the group used for the 'stat' matches the group used for the 'claim'."
    }
  ],
  reviewTemplate: [
    { label: "Ref", prompt: "PT/Section/Question #" },
    { label: "The Gap", prompt: "Just because [Evidence], that doesn't mean [Conclusion] because..." },
    { label: "Target style", prompt: "Is the answer naming an Assumption, an Objection, or a Structural movement?" },
    { label: "My Trap", prompt: "Why did my chosen answer look right? (Usually: I bought the story/vibe)." },
    { label: "Takeaway", prompt: "Next time I see [Feature], I will [Action]." }
  ],
  // ... (rest of the drills etc)
  worksheet: [
    { trigger: "Takes for granted that X", identify: "Assumption or Objection?", ask: "Make X false. Does the argument crash?" },
    { trigger: "Fails to consider that Y", identify: "Assumption or Objection?", ask: "Take Y as true. Does the conclusion die?" },
    { trigger: "Presumes that X", identify: "Assumption or Objection?", ask: "Make X false. Does the argument crash?" },
    { trigger: "Overlooks the possibility that Y", identify: "Assumption or Objection?", ask: "Take Y as true. Does the conclusion die?" },
    { trigger: "Ignores the possibility that Y", identify: "Assumption or Objection?", ask: "Take Y as true. Does the conclusion die?" },
    { trigger: "Assumes that X", identify: "Assumption or Objection?", ask: "Make X false. Does the argument crash?" },
    { trigger: "Fails to establish that X", identify: "Assumption or Objection?", ask: "Make X false. Does the argument crash?" },
    { trigger: "Neglects to consider that Y", identify: "Assumption or Objection?", ask: "Take Y as true. Does the conclusion die?" },
  ],
  worksheetAnswers: [
    { wording: "Ignores the possibility that the bottle contained an acidic liquid other than vinegar.", type: "Objection", test: "If true, would it weaken the conclusion?" },
    { wording: "Assumes that a labeling error is proof of an intention to deceive.", type: "Assumption", test: "If false, does the argument collapse?" },
    { wording: "Ignores the possibility that some food additives are harmful to most people.", type: "Objection", test: "If true, would it weaken the conclusion?" },
    { wording: "Presumes that most consumers heed the warning labels.", type: "Assumption", test: "If false, does the argument collapse?" },
    { wording: "Fails to consider that the economy might not improve.", type: "Objection", test: "If true, would it weaken the conclusion?" },
    { wording: "Assumes that the economy will improve in the near future.", type: "Assumption", test: "If false, does the argument collapse?" },
  ],
  progressMastery: {
    level1: [
      { pt: "151", sec: "2", q: "3" },
      { pt: "104", sec: "4", q: "10" },
      { pt: "106", sec: "3", q: "5" },
      { pt: "139", sec: "4", q: "3" },
      { pt: "118", sec: "3", q: "6" },
    ],
    level2: [
      { pt: "127", sec: "3", q: "17" },
      { pt: "105", sec: "1", q: "26" },
      { pt: "106", sec: "3", q: "2" },
      { pt: "110", sec: "2", q: "3" },
      { pt: "103", sec: "3", q: "8" },
    ],
    level3: [
      { pt: "155", sec: "4", q: "20" },
      { pt: "102", sec: "3", q: "23" },
      { pt: "126", sec: "4", q: "15" },
      { pt: "113", sec: "4", q: "22" },
      { pt: "117", sec: "3", q: "6" },
    ],
    level4: [
      { pt: "152", sec: "2", q: "18" },
      { pt: "152", sec: "4", q: "16" },
      { pt: "106", sec: "2", q: "18" },
      { pt: "108", sec: "3", q: "15" },
      { pt: "149", sec: "3", q: "20" },
    ]
  }
};

export const principleHubData = {
  intro: "Principle questions bridge abstract laws and concrete stories. You have to match the 'Skeleton' of the logic.",
  varieties: [
    { t: "Strengthen", d: "Fix a broken argument by adding a required law." },
    { t: "Conform", d: "Identify the general rule that matches the specific story." },
    { t: "Application", d: "Apply a given rule to a new set of facts." },
    { t: "Parallel Flaw Bridge", d: "Match the underlying structural error of a principle." }
  ],
  framework: [
    { t: "The Trigger (If)", d: "The condition that must happen first.", detail: "If a meal costs >$50..." },
    { t: "The Outcome (Then)", d: "The mandatory result.", detail: "...then you MUST leave a 20% tip." },
    { t: "Reversion Trap", d: "Results don't prove triggers.", detail: "Leaving a 20% tip does NOT prove the meal was >$50." },
    { t: "Identity Match", d: "Words must be logical synonyms.", detail: "Does 'over $50' match 'expensive' in the story?" }
  ],
  majorTypes: [
    {
      type: "Principle Strengthen",
      meaning: "Plug a structural hole with a general rule.",
      spot: "Which principle, if valid, most helps to justify the reasoning?",
      question: "If I add this law to the evidence, is the conclusion now bulletproof?",
      strategy: "The rule MUST bridge the Gap (Conclusion -> Evidence). Cross out any rule that doesn't name BOTH parts.",
      mistake: "Picking a rule that matches the story but isn't relevant to the actual jump in logic."
    },
    {
      type: "Principle Conform",
      meaning: "Map a specific story to its underlying 'Law'.",
      spot: "The situation described above most closely conforms to which of the following principles?",
      question: "Is the stimulus a valid example of this general rule?",
      strategy: "Facts -> Rule. The 'Trigger' of the rule must be something that was 100% true in the story.",
      mistake: "Picking a law where the story matches the 'result' but not the 'trigger'."
    },
    {
      type: "Parallel Flaw Bridge",
      meaning: "Match the exact 'shape' of a broken principle.",
      spot: "Which most closely parallels the flawed reasoning above?",
      question: "Is the 'error movement' in this answer identical to the one in the stimulus?",
      strategy: "Ignore the story. Map the arrows. Reversal? Negation? Shift in meaning? The answer must replicate the shift.",
      mistake: "Matching the topic (e.g. both about science) instead of the arrow direction."
    }
  ],
  practiceConnections: [
    { type: "Principle Strengthen", resources: ["Principle Strengthen Homework", "Strengthen Application Homework"] },
    { type: "Principle Conform", resources: ["Principle Conform Homework"] }
  ],
  reviewTemplate: [
    { label: "Ref", prompt: "PT/Section/Question #" },
    { label: "Skeleton", prompt: "If [Trigger Fact] then [Required Outcome]" },
    { label: "Trigger Error", prompt: "Did I pick a rule where the 'if' condition wasn't actually met?" },
    { label: "Direction", prompt: "Did I fall for a reversal (matching the then, not the if)?" },
    { label: "Takeaway", prompt: "Check the 'if' condition before looking at the 'then' result." }
  ],
  wrongPatterns: [
    { pattern: "Too broad", catch: "The rule would cover more cases than the argument needs." },
    { pattern: "Too narrow", catch: "The rule only covers part of the stimulus or adds an extra condition." },
    { pattern: "Wrong side of the arrow", catch: "The answer puts the conclusion language on the trigger side." },
    { pattern: "Moral-sounding but mismatched", catch: "The rule sounds reasonable but does not fit the actual evidence/conclusion." },
    { pattern: "Missing trigger", catch: "The application concludes the outcome without proving the condition." }
  ],
  strengthenDrill: [
    { pt: "135", sec: "1", q: "14" },
    { pt: "137", sec: "2", q: "8" },
    { pt: "138", sec: "2", q: "5" },
    { pt: "142", sec: "1", q: "10" },
    { pt: "144", sec: "2", q: "14" }
  ],
  strengthenTimed: [
    { pt: "133", sec: "1", q: "18" },
    { pt: "137", sec: "2", q: "8" },
    { pt: "137", sec: "2", q: "25" },
    { pt: "137", sec: "4", q: "8" },
    { pt: "138", sec: "2", q: "5" },
    { pt: "143", sec: "4", q: "19" },
    { pt: "124", sec: "3", q: "25" },
    { pt: "137", sec: "3", q: "20" }
  ],
  conformDrill: [
    { pt: "131", sec: "1", q: "9" },
    { pt: "127", sec: "3", q: "23" },
    { pt: "124", sec: "1", q: "17" },
    { pt: "130", sec: "1", q: "21" },
    { pt: "125", sec: "4", q: "17" },
    { pt: "129", sec: "3", q: "14" },
    { pt: "134", sec: "2", q: "22" },
    { pt: "131", sec: "1", q: "17" }
  ],
  parallelBridge: [
    { pt: "127", sec: "3", q: "24" },
    { pt: "131", sec: "2", q: "16" },
    { pt: "121", sec: "4", q: "22" },
    { pt: "124", sec: "3", q: "23" },
    { pt: "125", sec: "4", q: "25" },
    { pt: "110", sec: "2", q: "6" },
    { pt: "119", sec: "2", q: "20" },
    { pt: "132", sec: "2", q: "7" },
    { pt: "134", sec: "3", q: "23" },
    { pt: "110", sec: "3", q: "23" },
    { pt: "135", sec: "1", q: "11" },
    { pt: "102", sec: "4", q: "12" }
  ]
};

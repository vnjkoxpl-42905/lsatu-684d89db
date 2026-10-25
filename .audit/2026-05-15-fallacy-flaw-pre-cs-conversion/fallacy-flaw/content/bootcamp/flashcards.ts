/**
 * Fallacy Flashcards · ported from NotebookLM "Mastering Logical Flaws and the
 * Art of Argumentative Hostility". 65 cards total, classified by bootcamp day.
 * Day 6 is Live Fire (no new content) — no deck.
 */

import type { DayId } from '../../lib/store';

export interface Flashcard {
  front: string;
  back: string;
}

export const FLASHCARDS_BY_DAY: Partial<Record<DayId, Flashcard[]>> = {
  /* ─────────── Day 1 · Hostile Mode + the Key ─────────── */
  1: [
    {
      front: "What is the strategic mindset for flaw questions according to the Master Guide?",
      back: "Read the stimulus aggressively and argue with it ('Objection, Your Honor!').",
    },
    {
      front: "What question should you ask yourself while reading a stimulus to find the flaw?",
      back: "Is the conclusion too strong for the evidence provided?",
    },
    {
      front: "According to the 'What if...?' FAQ, how should you formulate an objection?",
      back: "Start the thought process with 'What if...' followed by a situation that destroys the argument's validity.",
    },
  ],

  /* ─────────── Day 2 · Three Languages ─────────── */
  2: [
    {
      front: "What are the three distinct 'languages' or styles of flaw answer choices?",
      back: "Assumption (Type A), Objection (Type B), and Description/Match (Type C).",
    },
    { front: "Trigger phrase classification: 'takes for granted'", back: "Type A: Assumption Style." },
    { front: "Trigger phrase classification: 'presumes'", back: "Type A: Assumption Style." },
    { front: "Trigger phrase classification: 'assumes'", back: "Type A: Assumption Style." },
    { front: "Trigger phrase classification: 'fails to establish'", back: "Type A: Assumption Style." },
    { front: "Trigger phrase classification: 'fails to consider'", back: "Type B: Objection Style." },
    { front: "Trigger phrase classification: 'overlooks the possibility'", back: "Type B: Objection Style." },
    { front: "Trigger phrase classification: 'ignores'", back: "Type B: Objection Style." },
    { front: "Trigger phrase classification: 'neglects'", back: "Type B: Objection Style." },
    { front: "Trigger phrase classification: 'concludes C on the basis of P'", back: "Type C: Match/Description Style." },
    { front: "Trigger phrase classification: 'infers... that C'", back: "Type C: Match/Description Style." },
    { front: "Trigger phrase classification: 'confuses P with C'", back: "Type C: Match/Description Style." },
    {
      front: "What is the 'Benefit Test' used for in Type A (Assumption) answer choices?",
      back: "Determining if the claim actually helps or supports the author's argument.",
    },
    {
      front: "What is the 'Negation Test' used for in Type A (Assumption) answer choices?",
      back: "Making the statement false to see if the argument then collapses.",
    },
    {
      front: "The 'Weakener Test' for Type B (Objection) answers requires taking the possibility as _____.",
      back: "true, then checking if it destroys the argument's conclusion.",
    },
    {
      front: "The 'Matching Test' for Type C answers requires translating _____ back into the specific text.",
      back: "abstract terms (like premises and conclusions).",
    },
    {
      front: "What is the first step when evaluating a Type A (Assumption) flaw answer choice?",
      back: "Ask if the claim actually helps the author's argument.",
    },
    {
      front: "In a Type B (Objection) flaw answer, what happens if the possibility destroys the conclusion when true?",
      back: "It is the correct answer choice.",
    },
    {
      front: "In Type C (Match) phrasings, the term 'P' typically refers to the _____.",
      back: "premise(s) of the argument.",
    },
    {
      front: "In Type C (Match) phrasings, the term 'C' typically refers to the _____.",
      back: "conclusion of the argument.",
    },
    {
      front: "If an answer choice 'neglects to consider that Y', what is the correct test to apply?",
      back: "Take Y to be true and see if the conclusion dies.",
    },
    {
      front: "Which trigger indicates that an answer choice is identifying an unstated premise necessary for the argument?",
      back: "'Presumes that X'.",
    },
    {
      front: "What protocol step follows determining that an assumption-style claim helps the argument?",
      back: "Apply the Negation Test (make the statement false).",
    },
    {
      front: "If a Type C answer choice is 'descriptively inaccurate', it is considered a _____.",
      back: "Bad Match trap answer.",
    },
    { front: "The 'Neglects to consider' trigger requires the _____ Test.", back: "Weakener." },
    {
      front: "In the Pop Quiz, which trigger type is 'Overlooks the possibility that Y'?",
      back: "Objection.",
    },
    {
      front: "The trigger 'Fails to establish that X' identifies which type of flaw answer?",
      back: "Assumption Style.",
    },
    {
      front: "What is the correct protocol for an answer choice that 'presumes that X'?",
      back: "Make X false and see if the argument crashes.",
    },
  ],

  /* ─────────── Day 3 · The Heavy Hitters ─────────── */
  3: [
    {
      front: "What is the core error in an 'Ad Hominem' fallacy?",
      back: "Attacking the source or author of an argument rather than the argument's merit.",
    },
    {
      front: "In 'Causation Confusions', what is the error in concluding A causes B solely based on correlation?",
      back: "It ignores possibilities like reverse causation, a third factor causing both, or coincidence.",
    },
    {
      front: "The 'Part vs. Whole' fallacy assumes that a trait true of an individual member must therefore _____.",
      back: "be true of the entire collective or whole (and vice versa).",
    },
    {
      front: "What is the logical error in the 'Unproven vs. Proven False' fallacy?",
      back: "Concluding that a claim is false simply because someone failed to prove it is true.",
    },
    {
      front: "Fallacy type: Necessary vs. Sufficient",
      back: "Mistaking a condition required for a result to occur with a condition that guarantees that result.",
    },
    {
      front: "What defines the 'Sampling Flaw' in logical reasoning?",
      back: "Generalizing a conclusion based on a sample that is too small, biased, or unrepresentative.",
    },
    {
      front: "Which group in the 'Famous Flaw Map' includes 'Necessary vs. Sufficient' errors?",
      back: "Group 1 (Frequently the Real Flaw).",
    },
    {
      front: "Which 'Famous Flaw' involves drawing a general conclusion from an unrepresentative sample?",
      back: "Sampling Flaw.",
    },
    {
      front: "The 'Necessary vs. Sufficient' flaw involves illegally thinking through a conditional rule _____.",
      back: "backwards or in the opposite direction.",
    },
    {
      front: "Which fallacy type assumes that what is true of a country must be true of its individual citizens?",
      back: "Whole to Part (Division).",
    },
    {
      front: "What error is made when an author dismisses a study based on the 'motives' of those reporting it?",
      back: "Ad Hominem.",
    },
    {
      front: "Which 'Famous Flaw' involves thinking a lack of evidence for a claim means the claim is definitely false?",
      back: "Unproven vs. False.",
    },
    {
      front: "A 'Causal Flaw' answer choice might state the author 'fails to rule out the possibility' of _____.",
      back: "reverse causality (the effect being the cause).",
    },
  ],

  /* ─────────── Day 4 · The House Five ─────────── */
  4: [
    {
      front: "Sleight of Hand · Dangling Variable. What is the move?",
      back: "A new word appears in the conclusion that wasn't in the premises. The author silently treats it as 'basically the same' as a different word from the premises. Nothing is basically the same on the LSAT — put a ≠ between the two terms. Example (Ethicist meat, June 2007.S3.Q21): premises talk about feeding people with grain vs. meat; the conclusion brings in 'morally unacceptable.' Where did morality come from? Nowhere.",
    },
    {
      front: "Sleazy Sales Pitch. What's the tell?",
      back: "The author compares two options and recommends one — but lists only the preferred option's strengths and only the alternative's weaknesses. You hear nothing about the preferred option's drawbacks or the alternative's compensating strengths. One-sided. Example (Dolores vs. Victor, PT 16.S2.Q19): we hear Dolores's strengths and Victor's weaknesses; their opposites are nowhere on the page. What if the preferred option has a major downside we're not being told?",
    },
    {
      front: "Universal Desires Assumption. What's the move?",
      back: "The argument concludes someone 'should' do something because it achieves a commonly-marketed goal — lose weight, make more money, be healthier — without ever establishing that this person actually wants that goal. Example: 'Everyone should switch to the new low-fat diet because it will help them lose weight.' Some people need to gain weight; some don't care about it. The conclusion pretends weight loss is a universal goal. It isn't.",
    },
    {
      front: "Value Assumption. What makes it different from plain Sleight of Hand?",
      back: "Value Assumption is the specific case of Sleight of Hand where the dangling word is evaluative — moral, appropriate, should, good, right, demeaning. Example (Robot engineer, PT 16.S2.Q10): premises describe labor as 'least expensive, least skilled.' The conclusion calls it 'demeaning.' That label is the author's value judgment, not a fact in evidence. Cleaning floors is unskilled and many people find it perfectly fine. If the new conclusion-term is a value word, name it Value Assumption.",
    },
    {
      front: "Secret Downsides. What's the tell?",
      back: "The argument recommends an action based on a benefit without addressing the costs or unintended consequences. A single-option pitch missing the downsides — close cousin of Sleazy Sales Pitch, but no comparison is involved. Example: 'We should switch to solar energy to save money on electricity.' What about the high initial installation costs that erase the long-term savings? What if grid emissions or battery sourcing offset the gain? The argument never says.",
    },
    {
      front: "House Five disambiguator · how do you pick the right label?",
      back: "Run the questions in order: (1) Is there a new term in the conclusion that wasn't in the premises? → Sleight of Hand. (2) Is that new term evaluative — moral / should / good / appropriate? → Value Assumption (specific case of Sleight of Hand). (3) Is it a comparison between two options where only one side's strengths and the other's weaknesses are listed? → Sleazy Sales Pitch. (4) Is it 'everyone should' or 'people would want' for a commonly-marketed goal? → Universal Desires. (5) Is it a single-option recommendation that ignores costs or downsides? → Secret Downsides.",
    },
  ],

  /* ─────────── Day 5 · Trap School ─────────── */
  5: [
    {
      front: "The fallacy of 'Equivocation' occurs when an author uses a term _____.",
      back: "with more than one meaning inconsistently throughout the argument.",
    },
    {
      front: "At what point do arguments by analogy typically fall apart?",
      back: "When the items being compared lack relevant similarities in the given context.",
    },
    {
      front: "What is the defining characteristic of an 'Appeal to Authority' fallacy?",
      back: "Citing an authority on a subject that is outside their specific field of expertise.",
    },
    {
      front: "Term: Circular Reasoning",
      back: "An argument where the premise assumes the truth of the conclusion it is trying to prove.",
    },
    {
      front: "What characterizes a 'False Dichotomy'?",
      back: "Presenting two options as the only possibilities when other viable alternatives exist.",
    },
    {
      front: "Term: Straw Man Fallacy",
      back: "Misrepresenting an opponent's argument in a weakened form to make it easier to attack.",
    },
    {
      front: "The 'Beliefs vs. Facts' fallacy involves conflating what is true with _____.",
      back: "what people believe or know about those facts.",
    },
    {
      front: "What is the defining trait of an 'Internal Contradiction' flaw?",
      back: "The author makes two or more claims that cannot both be true simultaneously.",
    },
    {
      front: "The fallacy of 'Inappropriate Appeal' relies on factors like sympathy or popularity rather than _____.",
      back: "logical reasoning and evidence.",
    },
    {
      front: "In the 'Famous Flaw Map', which category does 'Circular Reasoning' fall into?",
      back: "Group 2 (Frequently the Distractor).",
    },
    {
      front: "Identify the 'Trap Answer' pattern: Accusing the author of assuming something extreme.",
      back: "Too Strong.",
    },
    {
      front: "Identify the 'Trap Answer' pattern: Describing evidence or a conclusion that does not exist in the text.",
      back: "Bad Match.",
    },
    {
      front: "Identify the 'Trap Answer' pattern: Confusing the condition for the result.",
      back: "Reversed Logic.",
    },
    {
      front: "Identify the 'Trap Answer' pattern: Using a label like 'Ad Hominem' when that specific error isn't present.",
      back: "Wrong Flaw.",
    },
    {
      front: "Identify the 'Trap Answer' pattern: Claiming the author 'failed to consider' something they actually discussed.",
      back: "Contradicted.",
    },
    {
      front: "Which Group 2 flaw involves using one word to mean two different things?",
      back: "Equivocation.",
    },
    {
      front: "A 'Bad Rebuttal' or Straw Man misrepresents an argument in a _____ form.",
      back: "weakened.",
    },
    {
      front: "Which 'Famous Flaw' is characterized by the phrase 'X is true because X is true'?",
      back: "Circular Reasoning.",
    },
    {
      front: "An 'Irrelevant' fallacy occurs when the author brings up points that do not _____.",
      back: "pertain to the issue at hand.",
    },
    {
      front: "Which flaw group is described as 'Frequently the Distractor'?",
      back: "Group 2.",
    },
  ],
};

export function getFlashcards(day: DayId): Flashcard[] {
  return FLASHCARDS_BY_DAY[day] ?? [];
}

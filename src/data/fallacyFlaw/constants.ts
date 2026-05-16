// Migrated from src/bootcamps/fallacy-flaw/content/bootcamp/flashcards.ts (~66 cards
// across Days 1-5), src/bootcamps/fallacy-flaw/content/note-2-catalog.ts (15 flaw
// entries), src/bootcamps/fallacy-flaw/content/disambiguation-pairs.ts (10 pairs),
// and src/bootcamps/fallacy-flaw/content/disguise-library.ts (5 mechanics).
//
// Source `front` → `term`, `back` → `definition`. Other source structures (flaw
// taxonomy entries, disambiguation pairs, disguise mechanics) are flattened into
// `term`/`definition` pairs preserving original wording.

import { JournalEntry, QuestionModuleId, FlashcardDeck } from '../../types/fallacyFlaw';

export interface Module {
  id: QuestionModuleId;
  name: string;
  description: string;
}

export const MODULES: Module[] = [
  {
    id: 'causal-flaws',
    name: 'Module 1: Causal Flaws',
    description:
      'Name and attack flaws that misuse cause and effect: mistaking correlation for causation, reverse causation, post hoc, and ignoring alternate causes.',
  },
  {
    id: 'conditional-flaws',
    name: 'Module 2: Conditional Flaws',
    description:
      'Spot necessary-vs-sufficient confusion, mistaken reversal, mistaken negation, and affirming the consequent. The classic LSAT logic-error family.',
  },
  {
    id: 'sampling-comparison-scope',
    name: 'Module 3: Sampling, Comparison & Scope Flaws',
    description:
      'Hasty generalization, unrepresentative sample, faulty analogy, equivocation, scope shift, composition/division, ad hominem, appeal to authority, and circular reasoning.',
  },
  {
    id: 'famous-flaws-capstone',
    name: 'Module 4: Famous Flaws Capstone',
    description:
      'All 18 canonical flaw types mixed. Real LSAT questions, per-question stopwatch, no hand-holding. The integration test.',
  },
];

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [];

export const FLASHCARD_DECKS: FlashcardDeck[] = [
  {
    id: 'day-1-hostile-mode',
    name: 'Day 1: Hostile Mode + the Key',
    cards: [
      {
        term: 'What is the strategic mindset for flaw questions according to the Master Guide?',
        definition: "Read the stimulus aggressively and argue with it ('Objection, Your Honor!').",
      },
      {
        term: 'What question should you ask yourself while reading a stimulus to find the flaw?',
        definition: 'Is the conclusion too strong for the evidence provided?',
      },
      {
        term: "According to the 'What if...?' FAQ, how should you formulate an objection?",
        definition: "Start the thought process with 'What if...' followed by a situation that destroys the argument's validity.",
      },
    ],
  },
  {
    id: 'day-2-three-languages',
    name: 'Day 2: Three Languages',
    cards: [
      { term: "What are the three distinct 'languages' or styles of flaw answer choices?", definition: 'Assumption (Type A), Objection (Type B), and Description/Match (Type C).' },
      { term: "Trigger phrase classification: 'takes for granted'", definition: 'Type A: Assumption Style.' },
      { term: "Trigger phrase classification: 'presumes'", definition: 'Type A: Assumption Style.' },
      { term: "Trigger phrase classification: 'assumes'", definition: 'Type A: Assumption Style.' },
      { term: "Trigger phrase classification: 'fails to establish'", definition: 'Type A: Assumption Style.' },
      { term: "Trigger phrase classification: 'fails to consider'", definition: 'Type B: Objection Style.' },
      { term: "Trigger phrase classification: 'overlooks the possibility'", definition: 'Type B: Objection Style.' },
      { term: "Trigger phrase classification: 'ignores'", definition: 'Type B: Objection Style.' },
      { term: "Trigger phrase classification: 'neglects'", definition: 'Type B: Objection Style.' },
      { term: "Trigger phrase classification: 'concludes C on the basis of P'", definition: 'Type C: Match/Description Style.' },
      { term: "Trigger phrase classification: 'infers... that C'", definition: 'Type C: Match/Description Style.' },
      { term: "Trigger phrase classification: 'confuses P with C'", definition: 'Type C: Match/Description Style.' },
      { term: "What is the 'Benefit Test' used for in Type A (Assumption) answer choices?", definition: "Determining if the claim actually helps or supports the author's argument." },
      { term: "What is the 'Negation Test' used for in Type A (Assumption) answer choices?", definition: 'Making the statement false to see if the argument then collapses.' },
      { term: "The 'Weakener Test' for Type B (Objection) answers requires taking the possibility as _____.", definition: "true, then checking if it destroys the argument's conclusion." },
      { term: "The 'Matching Test' for Type C answers requires translating _____ back into the specific text.", definition: 'abstract terms (like premises and conclusions).' },
      { term: 'What is the first step when evaluating a Type A (Assumption) flaw answer choice?', definition: "Ask if the claim actually helps the author's argument." },
      { term: 'In a Type B (Objection) flaw answer, what happens if the possibility destroys the conclusion when true?', definition: 'It is the correct answer choice.' },
      { term: "In Type C (Match) phrasings, the term 'P' typically refers to the _____.", definition: 'premise(s) of the argument.' },
      { term: "In Type C (Match) phrasings, the term 'C' typically refers to the _____.", definition: 'conclusion of the argument.' },
      { term: "If an answer choice 'neglects to consider that Y', what is the correct test to apply?", definition: 'Take Y to be true and see if the conclusion dies.' },
      { term: 'Which trigger indicates that an answer choice is identifying an unstated premise necessary for the argument?', definition: "'Presumes that X'." },
      { term: 'What protocol step follows determining that an assumption-style claim helps the argument?', definition: 'Apply the Negation Test (make the statement false).' },
      { term: "If a Type C answer choice is 'descriptively inaccurate', it is considered a _____.", definition: 'Bad Match trap answer.' },
      { term: "The 'Neglects to consider' trigger requires the _____ Test.", definition: 'Weakener.' },
      { term: "In the Pop Quiz, which trigger type is 'Overlooks the possibility that Y'?", definition: 'Objection.' },
      { term: "The trigger 'Fails to establish that X' identifies which type of flaw answer?", definition: 'Assumption Style.' },
      { term: "What is the correct protocol for an answer choice that 'presumes that X'?", definition: 'Make X false and see if the argument crashes.' },
    ],
  },
  {
    id: 'day-3-heavy-hitters',
    name: 'Day 3: The Heavy Hitters',
    cards: [
      { term: "What is the core error in an 'Ad Hominem' fallacy?", definition: "Attacking the source or author of an argument rather than the argument's merit." },
      { term: "In 'Causation Confusions', what is the error in concluding A causes B solely based on correlation?", definition: 'It ignores possibilities like reverse causation, a third factor causing both, or coincidence.' },
      { term: "The 'Part vs. Whole' fallacy assumes that a trait true of an individual member must therefore _____.", definition: 'be true of the entire collective or whole (and vice versa).' },
      { term: "What is the logical error in the 'Unproven vs. Proven False' fallacy?", definition: 'Concluding that a claim is false simply because someone failed to prove it is true.' },
      { term: 'Fallacy type: Necessary vs. Sufficient', definition: 'Mistaking a condition required for a result to occur with a condition that guarantees that result.' },
      { term: "What defines the 'Sampling Flaw' in logical reasoning?", definition: 'Generalizing a conclusion based on a sample that is too small, biased, or unrepresentative.' },
      { term: "Which group in the 'Famous Flaw Map' includes 'Necessary vs. Sufficient' errors?", definition: 'Group 1 (Frequently the Real Flaw).' },
      { term: "Which 'Famous Flaw' involves drawing a general conclusion from an unrepresentative sample?", definition: 'Sampling Flaw.' },
      { term: "The 'Necessary vs. Sufficient' flaw involves illegally thinking through a conditional rule _____.", definition: 'backwards or in the opposite direction.' },
      { term: 'Which fallacy type assumes that what is true of a country must be true of its individual citizens?', definition: 'Whole to Part (Division).' },
      { term: "What error is made when an author dismisses a study based on the 'motives' of those reporting it?", definition: 'Ad Hominem.' },
      { term: "Which 'Famous Flaw' involves thinking a lack of evidence for a claim means the claim is definitely false?", definition: 'Unproven vs. False.' },
      { term: "A 'Causal Flaw' answer choice might state the author 'fails to rule out the possibility' of _____.", definition: 'reverse causality (the effect being the cause).' },
    ],
  },
  {
    id: 'day-4-house-five',
    name: 'Day 4: The House Five',
    cards: [
      {
        term: 'Sleight of Hand · Dangling Variable. What is the move?',
        definition:
          "A new word appears in the conclusion that wasn't in the premises. The author silently treats it as 'basically the same' as a different word from the premises. Nothing is basically the same on the LSAT — put a ≠ between the two terms. Example (Ethicist meat, June 2007.S3.Q21): premises talk about feeding people with grain vs. meat; the conclusion brings in 'morally unacceptable.' Where did morality come from? Nowhere.",
      },
      {
        term: "Sleazy Sales Pitch. What's the tell?",
        definition:
          "The author compares two options and recommends one — but lists only the preferred option's strengths and only the alternative's weaknesses. You hear nothing about the preferred option's drawbacks or the alternative's compensating strengths. One-sided. Example (Dolores vs. Victor, PT 16.S2.Q19): we hear Dolores's strengths and Victor's weaknesses; their opposites are nowhere on the page. What if the preferred option has a major downside we're not being told?",
      },
      {
        term: "Universal Desires Assumption. What's the move?",
        definition:
          "The argument concludes someone 'should' do something because it achieves a commonly-marketed goal — lose weight, make more money, be healthier — without ever establishing that this person actually wants that goal. Example: 'Everyone should switch to the new low-fat diet because it will help them lose weight.' Some people need to gain weight; some don't care about it. The conclusion pretends weight loss is a universal goal. It isn't.",
      },
      {
        term: 'Value Assumption. What makes it different from plain Sleight of Hand?',
        definition:
          "Value Assumption is the specific case of Sleight of Hand where the dangling word is evaluative — moral, appropriate, should, good, right, demeaning. Example (Robot engineer, PT 16.S2.Q10): premises describe labor as 'least expensive, least skilled.' The conclusion calls it 'demeaning.' That label is the author's value judgment, not a fact in evidence. Cleaning floors is unskilled and many people find it perfectly fine. If the new conclusion-term is a value word, name it Value Assumption.",
      },
      {
        term: "Secret Downsides. What's the tell?",
        definition:
          "The argument recommends an action based on a benefit without addressing the costs or unintended consequences. A single-option pitch missing the downsides — close cousin of Sleazy Sales Pitch, but no comparison is involved. Example: 'We should switch to solar energy to save money on electricity.' What about the high initial installation costs that erase the long-term savings? What if grid emissions or battery sourcing offset the gain? The argument never says.",
      },
      {
        term: 'House Five disambiguator · how do you pick the right label?',
        definition:
          "Run the questions in order: (1) Is there a new term in the conclusion that wasn't in the premises? → Sleight of Hand. (2) Is that new term evaluative — moral / should / good / appropriate? → Value Assumption (specific case of Sleight of Hand). (3) Is it a comparison between two options where only one side's strengths and the other's weaknesses are listed? → Sleazy Sales Pitch. (4) Is it 'everyone should' or 'people would want' for a commonly-marketed goal? → Universal Desires. (5) Is it a single-option recommendation that ignores costs or downsides? → Secret Downsides.",
      },
    ],
  },
  {
    id: 'day-5-trap-school',
    name: 'Day 5: Trap School',
    cards: [
      { term: "The fallacy of 'Equivocation' occurs when an author uses a term _____.", definition: 'with more than one meaning inconsistently throughout the argument.' },
      { term: 'At what point do arguments by analogy typically fall apart?', definition: 'When the items being compared lack relevant similarities in the given context.' },
      { term: "What is the defining characteristic of an 'Appeal to Authority' fallacy?", definition: 'Citing an authority on a subject that is outside their specific field of expertise.' },
      { term: 'Term: Circular Reasoning', definition: 'An argument where the premise assumes the truth of the conclusion it is trying to prove.' },
      { term: "What characterizes a 'False Dichotomy'?", definition: 'Presenting two options as the only possibilities when other viable alternatives exist.' },
      { term: 'Term: Straw Man Fallacy', definition: "Misrepresenting an opponent's argument in a weakened form to make it easier to attack." },
      { term: "The 'Beliefs vs. Facts' fallacy involves conflating what is true with _____.", definition: 'what people believe or know about those facts.' },
      { term: "What is the defining trait of an 'Internal Contradiction' flaw?", definition: 'The author makes two or more claims that cannot both be true simultaneously.' },
      { term: "The fallacy of 'Inappropriate Appeal' relies on factors like sympathy or popularity rather than _____.", definition: 'logical reasoning and evidence.' },
      { term: "In the 'Famous Flaw Map', which category does 'Circular Reasoning' fall into?", definition: 'Group 2 (Frequently the Distractor).' },
      { term: "Identify the 'Trap Answer' pattern: Accusing the author of assuming something extreme.", definition: 'Too Strong.' },
      { term: "Identify the 'Trap Answer' pattern: Describing evidence or a conclusion that does not exist in the text.", definition: 'Bad Match.' },
      { term: "Identify the 'Trap Answer' pattern: Confusing the condition for the result.", definition: 'Reversed Logic.' },
      { term: "Identify the 'Trap Answer' pattern: Using a label like 'Ad Hominem' when that specific error isn't present.", definition: 'Wrong Flaw.' },
      { term: "Identify the 'Trap Answer' pattern: Claiming the author 'failed to consider' something they actually discussed.", definition: 'Contradicted.' },
      { term: 'Which Group 2 flaw involves using one word to mean two different things?', definition: 'Equivocation.' },
      { term: "A 'Bad Rebuttal' or Straw Man misrepresents an argument in a _____ form.", definition: 'weakened.' },
      { term: "Which 'Famous Flaw' is characterized by the phrase 'X is true because X is true'?", definition: 'Circular Reasoning.' },
      { term: "An 'Irrelevant' fallacy occurs when the author brings up points that do not _____.", definition: 'pertain to the issue at hand.' },
      { term: "Which flaw group is described as 'Frequently the Distractor'?", definition: 'Group 2.' },
    ],
  },
  {
    id: 'flaw-catalog',
    name: 'Flaw Catalog (Groups 1-3)',
    // Migrated from note-2-catalog.ts. term = "<name> (Group N)"; definition = source
    // definition + stimulus tells, preserving the catalog content as quick reference.
    cards: [
      {
        term: 'Necessary vs. Sufficient (Group 1 · Real Flaw)',
        definition:
          'Illegally thinking through a conditional rule backwards or in the opposite direction. Mistaking what is required for what is guaranteed. Tell: an "if X then Y" rule appears, then the conclusion reverses it ("Y therefore X") or negates it ("not X therefore not Y") instead of contrapositing.',
      },
      {
        term: 'Causal (Group 1 · Real Flaw)',
        definition:
          "Concluding one specific cause for a correlation when other interpretations exist. Whenever the LSAT concludes or assumes A causes B, 99.9% of the time it's wrong. Tell: a correlation, coincidence, or co-occurrence is described, then the conclusion picks ONE causal direction. The author always ignores reverse causation, third-variable causation, and pure coincidence.",
      },
      {
        term: 'Part vs. Whole (Group 1 · Real Flaw)',
        definition:
          'Assuming what is true of the parts is true of the whole, or vice versa. Tell: a property is established about either every member of a group, then concluded about the group as a whole, or about the group as a whole, then concluded about every member.',
      },
      {
        term: 'Unproven vs. Proven False (Group 1 · Real Flaw)',
        definition:
          "Concluding that because something hasn't been proven true, it must be false. Or because someone provided a weak argument FOR a claim, the claim itself must be wrong. Tell: the author points out a lack of evidence and concludes the opposite, or attacks an argument's quality and concludes the argument's claim is false.",
      },
      {
        term: 'Ad Hominem (Group 1 · Real Flaw)',
        definition:
          "Dismissing an argument or point of view based on an attack on the source rather than the claim itself. The LSAT version is often subtler than the textbook version — not always a personal insult, often pointing out the source's bias or self-interest. Tell: the author rejects a claim by pointing out something about the speaker (bias, motive, past behavior, identity) rather than addressing the claim's content.",
      },
      {
        term: 'Sampling (Group 1 · Real Flaw)',
        definition:
          'Generalizing from a sample that is too small, biased, or unrepresentative. Tell: a study, survey, or set of examples is reported, then a sweeping conclusion is drawn about a much larger population.',
      },
      {
        term: 'Circular Reasoning (Group 2 · Distractor)',
        definition:
          'The premise is a restatement or assumption of the conclusion. The argument provides no real support; it just says the conclusion twice. Pure circular reasoning is rare on the LSAT. When you see "circular" in an answer choice, it\'s usually wrong.',
      },
      {
        term: 'Internal Contradiction (Group 2 · Distractor)',
        definition:
          "Something the author says undermines or contradicts something else they say. Two statements the author makes can't both be true. Rare in real Flaw stimuli. Almost never the right answer — be very suspicious.",
      },
      {
        term: 'Equivocation (Group 2 · Distractor)',
        definition:
          'Using the same word or phrase to mean two different things in the same argument. The shift in meaning is often subtle. Tell: a single key term appears in both a premise and the conclusion, but the meaning has shifted between uses. Textbook example: "fine for parking" (penalty) vs. "fine" (acceptable).',
      },
      {
        term: 'Inappropriate Appeal (Group 2 · Distractor)',
        definition:
          'Relying on sympathy, popular opinion, or an irrelevant authority figure rather than evidence. Tell: the premise is "an authority said so" (where the authority isn\'t actually qualified on the subject), or "everyone agrees," or "have pity on the speaker."',
      },
      {
        term: 'Sleight of Hand / Dangling Variable (Group 3 · House-Named)',
        definition:
          "New words appear in the conclusion that weren't in the premises. The author pretends these new words are \"basically\" the same as different words from the premises. Nothing is basically the same on the LSAT. Possibly the #1 LR flaw, period.",
      },
      {
        term: 'Sleazy Sales Pitch (Group 3 · House-Named)',
        definition:
          "The author compares two things and says one is superior without telling you the full story. They highlight the preferred choice's benefits and hide the drawbacks. Tell: one option is praised for its strengths; the other is criticized for its weaknesses. Nothing about the praised option's weaknesses or the criticized option's strengths. One-sided.",
      },
      {
        term: 'Universal Desires Assumption (Group 3 · House-Named)',
        definition:
          'The author assumes everyone would want certain goals — usually the goals you constantly see commercials about: lose weight, make more money, be healthier, lower cholesterol, be more successful. Tell: the argument concludes someone "should" do something because it would achieve some commonly-desired outcome, never establishing that this person actually desires that outcome.',
      },
      {
        term: 'Value Assumptions (Group 3 · House-Named)',
        definition:
          "The author makes a judgment in the conclusion using a loaded word (moral, appropriate, good, right, should) without clarifying what that word means in the premises. A specific case of Sleight of Hand where the dangling variable is an evaluative term. If you can identify the loaded word, label it Value Assumption — otherwise default to Sleight of Hand.",
      },
      {
        term: 'Secret Downsides (Group 3 · House-Named)',
        definition:
          "Potential drawbacks or negative consequences that the argument ignores or doesn't address. A close cousin of Sleazy Sales Pitch but applies even when no comparison is involved. Tell: the argument recommends an action based on its benefits without addressing its costs or unintended consequences.",
      },
    ],
  },
  {
    id: 'disambiguation-pairs',
    name: 'Disambiguation Pairs',
    // Migrated from disambiguation-pairs.ts. term = pair name; definition = distinction + ask.
    cards: [
      { term: 'Necessary vs. Sufficient ↔ Causal', definition: 'Both involve a relationship that gets reasoned about wrong. Distinction: logical condition (if-then) → Necessary vs. Sufficient. Cause-and-effect → Causal. Ask: is the relationship a logical condition or a real-world cause?' },
      { term: 'Sampling ↔ Hasty Generalization', definition: 'Both generalize from limited evidence. Distinction: SIZE problem → Hasty Generalization. SELECTION-method problem → biased Sampling. (Hasty Generalization is a subtype of Sampling.) Ask: is the problem the size, the selection method, or both?' },
      { term: 'Sleight of Hand ↔ Equivocation', definition: 'Both falsely equate concepts via language. Distinction: SAME word with shifting meaning → Equivocation. TWO DIFFERENT words treated as equivalent → Sleight of Hand. Ask: same word being used twice, or two different words being treated as equivalent?' },
      { term: 'Sleight of Hand ↔ Value Assumption', definition: "Both involve a conclusion concept the premises didn't establish. Distinction: EVALUATIVE term in the conclusion → Value Assumption. Otherwise → Sleight of Hand. Ask: is the new conclusion-term a moral / appropriate / should word?" },
      { term: 'Ad Hominem ↔ Unproven vs. Proven False', definition: "Both involve dismissing a claim. Distinction: attack on the SOURCE → Ad Hominem. Attack on the EVIDENCE or lack thereof → Unproven vs. Proven False. Ask: what's being attacked — the speaker or the evidence?" },
      { term: 'Part vs. Whole ↔ Sampling', definition: 'Both move scope. Distinction: SAMPLE → POPULATION = Sampling. PART → WHOLE / WHOLE → PART = Part vs. Whole. Ask: sample-to-population or part-to-whole?' },
      { term: 'Sleazy Sales Pitch ↔ Secret Downsides', definition: 'Both hide negatives. Distinction: COMPARISON between two options → Sleazy Sales Pitch. Promotes ONE option → Secret Downsides. Ask: is this a comparison or a single-option pitch?' },
      { term: 'Causal ↔ Sleight of Hand', definition: 'Both involve the conclusion overreaching the premises. Distinction: conclusion claims CAUSATION → Causal. Conclusion introduces a NEW concept → Sleight of Hand. Ask: is the new claim about cause-and-effect, or about a new term entirely?' },
      { term: 'Equivocation ↔ Necessary vs. Sufficient', definition: 'Both can hide inside a conditional argument. Distinction: SAME conditional term used inconsistently → Equivocation. Conditional logic moves done backwards → Necessary vs. Sufficient. Ask: are the terms in the conditional defined consistently?' },
      { term: 'Universal Desires ↔ Value Assumption', definition: 'Both involve unjustified normative claims. Distinction: about what people WANT → Universal Desires. About whether something IS good/moral/appropriate → Value Assumption. Ask: is the unjustified claim about desires or about values?' },
    ],
  },
  {
    id: 'disguise-mechanics',
    name: 'Disguise Mechanics',
    // Migrated from disguise-library.ts. term = mechanic name; definition = description + examples.
    cards: [
      {
        term: '1 · Abstract verb substitution',
        definition:
          "The LSAT replaces the flaw's name with an abstract action verb. Pattern: [verb] [flaw concept abstracted into a noun phrase]. Examples: \"Conflates\" / \"Treats as equivalent\" → Sleight of Hand or Equivocation. \"Generalizes\" / \"Extrapolates\" → Sampling. \"Confuses\" / \"Mistakes\" → Necessary vs. Sufficient or Causal. \"Presupposes\" / \"Assumes\" / \"Takes for granted\" → any Assumption-language flaw. \"Fails to rule out\" / \"Fails to consider\" / \"Ignores\" → Objection-language for any flaw.",
      },
      {
        term: '2 · Inverted formal description',
        definition:
          'The LSAT describes the flaw by stating what the argument SHOULD have done, framed in formal language. Recognize that the argument failed to do exactly the thing being described. Examples: "Treats a condition that ensures the truth of another condition for one that is necessary..." → Necessary vs. Sufficient. "Treats the failure to establish that a certain claim is false as equivalent to a demonstration that that claim is true." → Unproven vs. Proven False. "Fails to rule out the possibility that what appears to be the result of a given condition may in fact be the cause of that condition." → Causal (reverse causation).',
      },
      {
        term: '3 · Specific-noun camouflage',
        definition:
          'The LSAT references the SPECIFIC nouns of the stimulus rather than the abstract category. Mentally translate from "the policies" or "the report" to "the term Y" or "the population claim." Examples: "It is assumed that what is true of persons individually is true of a country as a whole." → Part vs. Whole. "Generalizes from a sample that is unlikely to be representative of public sentiment." → Sampling. "Casts doubt on the reliability of a study by questioning the motives of those reporting it." → Ad Hominem.',
      },
      {
        term: '4 · Half-truth misdirection',
        definition:
          'The LSAT describes a flaw the argument almost commits, but doesn\'t quite. Verify the flaw is actually present (Trap 4 Wrong Flaw, Trap 5 Contradicted). Examples: "Confuses correlation with causation" — when the stimulus didn\'t actually invoke causation. "Argues from a biased sample" — when no sampling actually occurred. "Attacks the source rather than the argument" — when the source\'s bias is actually relevant evidence. Default-skeptical: scan stimulus for the flaw before selecting.',
      },
      {
        term: '5 · Compound disguise',
        definition:
          'Two flaws stitched into one answer. Verify BOTH halves are present. Examples: "Both relies on a sample that is too small AND fails to consider third-variable explanations" → Sampling + Causal — both must be present. "Treats a sufficient condition as if it were necessary AND assumes that what holds in one case holds in all cases" → Necessary vs. Sufficient + Hasty Generalization — both must be present.',
      },
    ],
  },
];

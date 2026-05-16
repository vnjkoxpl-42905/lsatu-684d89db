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
    id: 'canonical-flaw-glossary',
    name: 'Canonical Flaw Glossary',
    cards: [
      {
        term: 'Hostile Mode',
        definition:
          'The strategic mindset for flaw questions: read the stimulus aggressively and argue with it. Treat every premise like opposing counsel testimony you intend to object to.',
      },
      {
        term: '"What if...?" Objection',
        definition:
          'The drill for finding a flaw fast: complete the sentence "What if..." with a situation that destroys the argument. If the conclusion survives, you have not found the flaw yet.',
      },
      {
        term: 'Three Answer-Choice Languages',
        definition:
          'Flaw answers come in three styles: Type A Assumption ("takes for granted," "presumes," "fails to establish"), Type B Objection ("fails to consider," "overlooks the possibility," "ignores"), and Type C Match/Description ("concludes C on the basis of P," "confuses P with C").',
      },
      {
        term: 'Type A · Assumption Style',
        definition:
          'Answer choices using "takes for granted," "presumes," "assumes," or "fails to establish." Test by asking whether the claim helps the argument, then negating it to see if the argument collapses.',
      },
      {
        term: 'Type B · Objection Style',
        definition:
          'Answer choices using "fails to consider," "overlooks the possibility," "ignores," or "neglects." Test by taking the possibility as true and checking whether it destroys the conclusion (Weakener Test).',
      },
      {
        term: 'Type C · Match / Description Style',
        definition:
          'Answer choices using "concludes C on the basis of P," "infers... that C," or "confuses P with C." Test by translating abstract terms back into the specific text of the stimulus (Matching Test).',
      },
      {
        term: 'Ad Hominem',
        definition:
          'Attacking the source or author of an argument rather than the argument itself. On LSAT, often surfaces as dismissing a study based on the "motives" of the people reporting it.',
      },
      {
        term: 'Correlation / Causation Confusion',
        definition:
          'Concluding A causes B from the fact that A and B are correlated. The argument ignores reverse causation (B causes A), a third common cause, or coincidence.',
      },
      {
        term: 'Part vs. Whole (Composition / Division)',
        definition:
          'Assuming a trait true of an individual member must also be true of the whole group (composition), or that a trait true of the whole must be true of each member (division).',
      },
      {
        term: 'Unproven vs. Proven False',
        definition:
          'Concluding that a claim is false simply because no one has proved it true (or vice versa). Absence of evidence is not evidence of absence.',
      },
      {
        term: 'Necessary vs. Sufficient',
        definition:
          'Mistaking a condition required for a result with a condition that guarantees the result. Manifests as mistaken reversal or mistaken negation of a conditional rule.',
      },
      {
        term: 'Sampling Flaw (Hasty Generalization)',
        definition:
          'Generalizing a conclusion from a sample that is too small, biased, or unrepresentative of the target population.',
      },
      {
        term: 'Sleight of Hand (Dangling Variable)',
        definition:
          'A new term appears in the conclusion that was not in the premises, and the author silently treats it as equivalent to a premise term. Nothing is "basically the same" on the LSAT.',
      },
      {
        term: 'Sleazy Sales Pitch',
        definition:
          'A comparison between two options where the author lists only the preferred option\'s strengths and only the alternative\'s weaknesses. One-sided by construction.',
      },
      {
        term: 'Universal Desires Assumption',
        definition:
          'Concluding someone "should" do something because it achieves a commonly-marketed goal (lose weight, make money) without ever establishing the person actually wants that goal.',
      },
      {
        term: 'Value Assumption',
        definition:
          'A specific case of Sleight of Hand where the dangling word in the conclusion is evaluative — moral, appropriate, should, good, demeaning. The author treats a value judgment as if it were a fact in evidence.',
      },
      {
        term: 'Secret Downsides',
        definition:
          'Recommending an action based on a benefit while ignoring costs or unintended consequences. A single-option pitch missing the downsides.',
      },
      {
        term: 'Equivocation',
        definition:
          'Using a single term with more than one meaning inconsistently within an argument. The shifted meaning is what carries the conclusion.',
      },
      {
        term: 'Faulty Analogy',
        definition:
          'Drawing a conclusion by comparing two items that lack relevant similarities in the given context. Breaks the moment a disanalogy is surfaced.',
      },
      {
        term: 'Appeal to (Inappropriate) Authority',
        definition:
          'Citing an authority on a subject outside their specific field of expertise, or treating "experts say" as a substitute for argument.',
      },
      {
        term: 'Circular Reasoning',
        definition:
          'An argument whose premise assumes the truth of the conclusion it is trying to prove. "X is true because X is true," dressed up in different words.',
      },
      {
        term: 'False Dichotomy',
        definition:
          'Presenting two options as the only possibilities when other viable alternatives exist.',
      },
      {
        term: 'Straw Man',
        definition:
          "Misrepresenting an opponent's argument in a weakened form, then attacking that weakened version instead of the real one.",
      },
      {
        term: 'Beliefs vs. Facts',
        definition:
          'Conflating what is true with what people believe or know to be true. The fact that someone believes X does not make X the case.',
      },
      {
        term: 'Internal Contradiction',
        definition:
          'The author makes two or more claims that cannot both be true simultaneously.',
      },
      {
        term: 'Inappropriate Appeal',
        definition:
          'Relying on factors like sympathy, fear, or popularity instead of logical reasoning and evidence to support a conclusion.',
      },
      {
        term: 'Too Strong (Trap Answer)',
        definition:
          'A trap answer that accuses the author of assuming something extreme when the author only assumed something modest. The flaw exists but is overstated.',
      },
      {
        term: 'Bad Match (Trap Answer)',
        definition:
          'A trap answer that describes evidence or a conclusion not actually present in the stimulus. Descriptively inaccurate.',
      },
      {
        term: 'Reversed Logic (Trap Answer)',
        definition:
          'A trap answer that flips the direction of the conditional or causal claim — confusing the condition for the result.',
      },
      {
        term: 'Wrong Flaw (Trap Answer)',
        definition:
          'A trap answer that names a real fallacy (e.g. "Ad Hominem") that is not actually present in the argument.',
      },
      {
        term: 'Contradicted (Trap Answer)',
        definition:
          'A trap answer that claims the author "failed to consider" something the author actually discussed in the stimulus.',
      },
    ],
  },
];

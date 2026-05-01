/**
 * M5.8 Capstone — 5 self-contained cluster-decomposition items.
 *
 * Phase E ships these as the working capstone. The OCR-pending calibration items
 * (MC-CAL-M5-Q1..Q5 in calibration.generated.json) wire in at Phase H.1 once the
 * DOCX extractor pulls the source content from Cluster Sentences Review.docx.
 *
 * Voice register 1 (decisive — capstones are scored, not narrated).
 * Trait target on every item: cluster-decomposition.
 */

export interface CapstoneChoice {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  is_correct: boolean;
  rationale: string;
  trap_label?: string; // T1..T7 or local label
}

export interface CapstoneItem {
  id: string;
  number: number;
  stimulus: string;
  prompt: string;
  choices: CapstoneChoice[];
  source_note: string;
}

export const M5_CAPSTONE: CapstoneItem[] = [
  {
    id: 'MC-HS-CAP-Q1',
    number: 1,
    stimulus:
      'The senator’s amendment, which would extend the deadline by ninety days for any state whose plan has not yet been submitted, has stalled.',
    prompt: 'What is the main claim of this sentence?',
    choices: [
      {
        letter: 'A',
        text: 'The senator’s amendment has stalled.',
        is_correct: true,
        rationale: 'Strip the relative clause and the prepositional chain — the core is "the amendment has stalled."',
      },
      {
        letter: 'B',
        text: 'The amendment would extend the deadline by ninety days.',
        is_correct: false,
        rationale: 'A specifier — what the amendment would do — not the claim that it has stalled.',
        trap_label: 'Specifier as core (T2 analog)',
      },
      {
        letter: 'C',
        text: 'Some states have not yet submitted their plans.',
        is_correct: false,
        rationale: 'Inside-the-specifier fact, not the load-bearing claim.',
        trap_label: 'T2 — Premise as conclusion',
      },
      {
        letter: 'D',
        text: 'The senator should withdraw the amendment.',
        is_correct: false,
        rationale: 'Adds a recommendation the sentence never makes.',
        trap_label: 'T1 — Too strong',
      },
    ],
    source_note: 'Adapted from §5.6 practice item 1.',
  },
  {
    id: 'MC-HS-CAP-Q2',
    number: 2,
    stimulus:
      'A study, conducted between 2018 and 2022 by researchers at three regional universities, into the effects of background noise on reading comprehension among adolescents has found a clear correlation.',
    prompt: 'What is the main claim of this sentence?',
    choices: [
      {
        letter: 'A',
        text: 'Researchers at three regional universities conducted a study.',
        is_correct: false,
        rationale: 'Specifier — who conducted it — not the finding.',
        trap_label: 'Specifier as core',
      },
      {
        letter: 'B',
        text: 'Background noise affects reading comprehension among adolescents.',
        is_correct: false,
        rationale: 'Closer — but this is the topic, not the claim. The claim is about correlation, and the framing matters.',
        trap_label: 'T4 — Half the claim',
      },
      {
        letter: 'C',
        text: 'A study has found a clear correlation.',
        is_correct: true,
        rationale: 'Strip the descriptive specifiers; the core is "a study has found a clear correlation."',
      },
      {
        letter: 'D',
        text: 'Schools should reduce background noise to improve reading scores.',
        is_correct: false,
        rationale: 'Adds a recommendation the sentence never makes.',
        trap_label: 'T1 — Too strong',
      },
    ],
    source_note: 'Adapted from §5.6 practice item 2.',
  },
  {
    id: 'MC-HS-CAP-Q3',
    number: 3,
    stimulus:
      'The decision by the city council, despite public opposition that had been building over the previous six months, to relocate the bus depot has been finalized.',
    prompt: 'What is the main claim of this sentence?',
    choices: [
      {
        letter: 'A',
        text: 'The decision has been finalized.',
        is_correct: false,
        rationale: 'Over-stripped. Drops the load-bearing specifier "to relocate the bus depot." The reader can no longer tell what was decided.',
        trap_label: 'T4 — Half the claim',
      },
      {
        letter: 'B',
        text: 'The decision to relocate the bus depot has been finalized.',
        is_correct: true,
        rationale: 'The "to relocate the bus depot" specifier is load-bearing — without it, the sentence loses its content.',
      },
      {
        letter: 'C',
        text: 'Public opposition to the bus depot relocation has been building for six months.',
        is_correct: false,
        rationale: 'Specifier-internal fact, not the main claim.',
        trap_label: 'T2 — Premise as conclusion',
      },
      {
        letter: 'D',
        text: 'The city council has rejected the relocation despite support.',
        is_correct: false,
        rationale: 'Reverses the polarity — the decision was finalized, not rejected.',
        trap_label: 'T1 — Reversed claim',
      },
    ],
    source_note: 'Adapted from §5.6 practice item 3. Tests load-bearing specifier recognition.',
  },
  {
    id: 'MC-HS-CAP-Q4',
    number: 4,
    stimulus:
      'A long-disputed claim, that the artist had completed the disputed canvas before her formal training began under Marchetti in 1887, has been confirmed by infrared analysis of the underdrawing.',
    prompt: 'What is the main claim of this sentence?',
    choices: [
      {
        letter: 'A',
        text: 'The artist completed the canvas before 1887.',
        is_correct: false,
        rationale: 'Inside-the-specifier fact (the disputed claim itself), not the sentence’s core assertion.',
        trap_label: 'T2 — Premise as conclusion',
      },
      {
        letter: 'B',
        text: 'A long-disputed claim has been confirmed by infrared analysis.',
        is_correct: true,
        rationale: 'Strip the appositive and the prepositional specifier; the core is "a claim has been confirmed."',
      },
      {
        letter: 'C',
        text: 'Infrared analysis can confirm the dating of underdrawings.',
        is_correct: false,
        rationale: 'Generalization beyond what the sentence asserts.',
        trap_label: 'T6 — Out of scope',
      },
      {
        letter: 'D',
        text: 'The artist trained under Marchetti.',
        is_correct: false,
        rationale: 'Specifier-internal fact about training, not the claim.',
        trap_label: 'T2 — Premise as conclusion',
      },
    ],
    source_note: 'Adapted from §5.6 practice item 4. Tests appositive recognition.',
  },
  {
    id: 'MC-HS-CAP-Q5',
    number: 5,
    stimulus:
      'The proposal, opposed by every member of the planning board except for two, that the historic district be expanded westward by three blocks, was forwarded to the council without recommendation.',
    prompt: 'What is the main claim of this sentence?',
    choices: [
      {
        letter: 'A',
        text: 'The proposal was forwarded to the council without recommendation.',
        is_correct: true,
        rationale: 'Strip both specifiers — the planning-board opposition and the proposal’s content — and the core is the forwarding action.',
      },
      {
        letter: 'B',
        text: 'The planning board opposed the proposal.',
        is_correct: false,
        rationale: 'Specifier-internal fact, not the main claim.',
        trap_label: 'T2 — Premise as conclusion',
      },
      {
        letter: 'C',
        text: 'The historic district will be expanded by three blocks.',
        is_correct: false,
        rationale: 'Inside-the-specifier proposal content; the sentence does not assert it as fact.',
        trap_label: 'T1 — Too strong',
      },
      {
        letter: 'D',
        text: 'The council will approve the historic-district expansion.',
        is_correct: false,
        rationale: 'A prediction the sentence does not make.',
        trap_label: 'T1 — Too strong',
      },
    ],
    source_note: 'Adapted from §5.6 practice item 5. Two specifiers, one load-bearing.',
  },
];

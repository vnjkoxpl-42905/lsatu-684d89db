/**
 * Module 5: Hard Sentences (Cluster Sentences sub-module).
 * Hand-authored at Phase E, 2026-05-01. Voice register 2 (whimsical/metaphor-led)
 * for prose; Register 1 for procedural callouts and the verdict-style summaries.
 *
 * Source: spec.html §5 + Notes/Cluster Sentences Review.docx (S) + Joshua's
 * Alex/Jordan walkthrough (S).
 */

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'callout'; label: string; body: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'example'; label: string; body: string }
  | { kind: 'cluster-demo'; sentence: string; specifiers: string[]; core: string }
  | { kind: 'visual-spec'; component: string; caption: string };

export interface HardSection {
  id: string;
  number: string;
  title: string;
  route: string;
  voice_register: 1 | 2 | 'mixed';
  hook: string;
  blocks: Block[];
  source: string;
}

export const HARD_SECTIONS: HardSection[] = [
  // ── 5.1 · Why Hard Sentences ──────────────────────────────────────────────
  {
    id: 'MC-HS-5.1',
    number: '5.1',
    title: 'Why Hard Sentences',
    route: '/hard-sentences/5.1',
    voice_register: 2,
    hook: 'Some LSAT sentences are not difficult. They are accreted. Layers of qualification, possessive, and parenthetical have grown over the core like coral on a sunken statue.',
    blocks: [
      {
        kind: 'p',
        text: 'You have already read every word in a hard sentence. The trouble is that you read them all at once, and the brain — being polite — tried to give equal weight to each. The conclusion arrived in a tide of subordinate clauses and wandered off, untraceable.',
      },
      {
        kind: 'p',
        text: 'This module is the dive crew. We chip the coral off, sentence by sentence, until you can see the statue underneath. Then we put the coral back — but you know which parts are statue and which are sediment.',
      },
      {
        kind: 'callout',
        label: 'What we mean by "hard"',
        body: 'A hard sentence is one whose core claim is buried under more than two specifiers (qualifying clauses, possessives, prepositional chains, parenthetical asides). The hardness scales with depth, not length.',
      },
      {
        kind: 'p',
        text: 'The good news is that LSAC writers are honest accreters. They never hide the core inside a different idea — they only stack qualifiers around it. Once you know how to lift the qualifiers off, the core is always there, sitting upright, waiting to be named.',
      },
    ],
    source: 'spec.html §5.1 + Notes/Cluster Sentences Review.docx introduction',
  },

  // ── 5.2 · What is a Cluster ───────────────────────────────────────────────
  {
    id: 'MC-HS-5.2',
    number: '5.2',
    title: 'What is a Cluster',
    route: '/hard-sentences/5.2',
    voice_register: 2,
    hook: 'A cluster is a sentence with a core thought wrapped in specifiers. The specifiers are the wrap. The thought is the gift.',
    blocks: [
      {
        kind: 'p',
        text: 'Imagine a sentence as a small dinner party. There is one host (the core thought). The host says one true sentence. Around the host, four to nine guests have shown up — qualifiers, possessives, asides — and each is a complete thought of its own. The job is to find the host before the guests start telling their own stories.',
      },
      {
        kind: 'cluster-demo',
        sentence:
          'The recommendation, made yesterday by the senior committee that has reviewed the program’s outcomes since 2018, that the funding be doubled, has met with resistance.',
        specifiers: [
          'made yesterday by the senior committee',
          'that has reviewed the program’s outcomes since 2018',
          'that the funding be doubled',
        ],
        core: 'The recommendation has met with resistance.',
      },
      {
        kind: 'callout',
        label: 'The core test',
        body: 'When you’ve removed the specifiers, the remaining sentence should still be grammatical and assertable. If it isn’t, you removed too much — put one specifier back.',
      },
      {
        kind: 'p',
        text: 'Specifiers are not your enemies. They are how the sentence locates the claim in space and time. You need them — eventually. But you do not need them while you are looking for the conclusion. They are coats and scarves; you can hang them up at the door.',
      },
    ],
    source: 'spec.html §5.2 + Notes/Cluster Sentences Review.docx',
  },

  // ── 5.3 · Specifiers ──────────────────────────────────────────────────────
  {
    id: 'MC-HS-5.3',
    number: '5.3',
    title: 'Specifiers',
    route: '/hard-sentences/5.3',
    voice_register: 'mixed',
    hook: 'Six kinds of specifier. Each clings to the core in its own way. Once you can name them, you can remove them.',
    blocks: [
      {
        kind: 'h2',
        text: 'The six',
      },
      {
        kind: 'list',
        ordered: true,
        items: [
          'Possessive (the city’s plan, the program’s outcomes)',
          'Prepositional (in 2018, by the committee, of the funding)',
          'Relative clause (which has reviewed, who recommended, that was made)',
          'Parenthetical (— made yesterday — , (a longstanding effort), commas-bracketed asides)',
          'Reduced relative (made yesterday by the senior committee, viewed by the public)',
          'Appositive (the recommendation, an aggressive proposal, …)',
        ],
      },
      {
        kind: 'callout',
        label: 'How to spot them',
        body: 'Possessives carry an apostrophe-s. Prepositionals start with in/on/by/of/for/with/at. Relatives start with which/that/who/whom/whose. Parentheticals are wrapped in dashes, commas, or parentheses. Reduced relatives drop the "which is" — leaving a participle (made, viewed, reviewed). Appositives sit beside the noun and rename it.',
      },
      {
        kind: 'p',
        text: 'Most cluster sentences carry three to four specifiers stacked in a chain. The chain unspools cleanly if you peel from the inside out: find the innermost specifier, lift it off, then the next, until the core is exposed.',
      },
      {
        kind: 'example',
        label: 'Peeling order',
        body: 'Start: "The recommendation, made yesterday by the senior committee that has reviewed the program’s outcomes since 2018, that the funding be doubled, has met with resistance." Peel innermost first: drop "since 2018" → keep peeling: drop "that has reviewed the program’s outcomes" → drop "made yesterday by the senior committee" → drop "that the funding be doubled" → core: "The recommendation has met with resistance."',
      },
    ],
    source: 'spec.html §5.3 + Notes/Cluster Sentences Review.docx specifier glossary',
  },

  // ── 5.4 · Alex/Jordan walkthrough ─────────────────────────────────────────
  {
    id: 'MC-HS-5.4',
    number: '5.4',
    title: 'Alex / Jordan walkthrough',
    route: '/hard-sentences/5.4',
    voice_register: 2,
    hook: 'Two students. One sentence. One panicked, one composed. Watch what happens when Jordan stops trying to hold every clause in mind at once.',
    blocks: [
      {
        kind: 'p',
        text: 'Alex reads the sentence forward. By the time the period arrives, the early clauses have evaporated. Alex re-reads. The same thing happens. By round three, Alex is reading the same words but no longer absorbing them — the brain has filed the sentence under "I cannot do this."',
      },
      {
        kind: 'p',
        text: 'Jordan, watching from the next seat, asks one question: "What is the verb of the main clause?" Once the verb is named, the subject is two words to the left. Once the subject and verb are named, everything else is decoration. Jordan reads the sentence once more, this time only looking for the subject-verb pair. The pair is "recommendation has met." Decoration: 22 words. Core: 6 words. Done.',
      },
      {
        kind: 'callout',
        label: 'The Jordan move',
        body: 'Find the verb of the main clause. Subject is to its left. Everything else is a specifier. The technique survives any sentence length.',
      },
      {
        kind: 'p',
        text: 'Most readers, when they hit a hard sentence, try to read harder. The Jordan move is to read narrower — to seek the two words that carry the assertion and let the rest stand by.',
      },
      {
        kind: 'example',
        label: 'Try it',
        body: 'Sentence: "The proposal, advanced by the council’s finance subcommittee with the support of three of the five trustees, that the campus expand its athletic facilities, was tabled." Find the main verb. ("was tabled.") Find the subject. ("The proposal.") Core: "The proposal was tabled." The 26 intervening words are scaffolding.',
      },
    ],
    source: 'Joshua’s walkthrough notes + Cluster Sentences Review',
  },

  // ── 5.5 · Optional vs Core ───────────────────────────────────────────────
  {
    id: 'MC-HS-5.5',
    number: '5.5',
    title: 'Optional vs Core',
    route: '/hard-sentences/5.5',
    voice_register: 'mixed',
    hook: 'Some specifiers ARE the conclusion. Knowing which is the difference between right and wrong on the test.',
    blocks: [
      {
        kind: 'p',
        text: 'Most specifiers are decoration. A few — usually one per sentence, sometimes two — are load-bearing. The load-bearing specifier carries the qualification that the conclusion depends on. Strip it and the claim becomes a different claim.',
      },
      {
        kind: 'callout',
        label: 'The load-bearing test',
        body: 'After you’ve identified the core, ask: would the author still endorse this sentence if the specifier were removed? If yes, the specifier is decoration. If no, the specifier is load-bearing — keep it in your pre-phrased conclusion.',
      },
      {
        kind: 'example',
        label: 'Decoration vs load-bearing',
        body: 'Decoration: "The recommendation, made yesterday by the senior committee, has met with resistance." → Drop "made yesterday by the senior committee" → "The recommendation has met with resistance." Same claim. ⚙ Load-bearing: "The recommendation that the funding be doubled has met with resistance." → Drop "that the funding be doubled" → "The recommendation has met with resistance." Different claim — this could be any recommendation.',
      },
      {
        kind: 'p',
        text: 'On the LSAT, the most-tempting wrong answer often drops the load-bearing specifier. The student strips the sentence, picks the matching answer, and never realizes they answered a different question. Drill 3.5 (Chain Mapping) trains this. M1.13 capstone calibration items test it explicitly under T4 (Half the claim).',
      },
    ],
    source: 'spec.html §5.5 + Joshua’s annotated cluster sentences',
  },

  // ── 5.6 · Practice ───────────────────────────────────────────────────────
  {
    id: 'MC-HS-5.6',
    number: '5.6',
    title: 'Practice',
    route: '/hard-sentences/5.6',
    voice_register: 1,
    hook: 'Five sentences. Strip each to its core. The Cluster Decomposer is in the next section if you want a guided pass first.',
    blocks: [
      {
        kind: 'p',
        text: 'Read each sentence. State the core in your head. Then check.',
      },
      {
        kind: 'cluster-demo',
        sentence:
          'The senator’s amendment, which would extend the deadline by ninety days for any state whose plan has not yet been submitted, has stalled.',
        specifiers: [
          'which would extend the deadline by ninety days',
          'for any state whose plan has not yet been submitted',
        ],
        core: 'The senator’s amendment has stalled.',
      },
      {
        kind: 'cluster-demo',
        sentence:
          'A study, conducted between 2018 and 2022 by researchers at three regional universities, into the effects of background noise on reading comprehension among adolescents has found a clear correlation.',
        specifiers: [
          'conducted between 2018 and 2022 by researchers at three regional universities',
          'into the effects of background noise on reading comprehension among adolescents',
        ],
        core: 'A study has found a clear correlation.',
      },
      {
        kind: 'cluster-demo',
        sentence:
          'The decision by the city council, despite public opposition that had been building over the previous six months, to relocate the bus depot has been finalized.',
        specifiers: [
          'by the city council',
          'despite public opposition that had been building over the previous six months',
          'to relocate the bus depot',
        ],
        core: 'The decision to relocate the bus depot has been finalized.',
      },
      {
        kind: 'cluster-demo',
        sentence:
          'A long-disputed claim, that the artist had completed the disputed canvas before her formal training began under Marchetti in 1887, has been confirmed by infrared analysis of the underdrawing.',
        specifiers: [
          'that the artist had completed the disputed canvas before her formal training began',
          'under Marchetti in 1887',
          'of the underdrawing',
        ],
        core: 'A long-disputed claim has been confirmed by infrared analysis.',
      },
      {
        kind: 'cluster-demo',
        sentence:
          'The proposal, opposed by every member of the planning board except for two, that the historic district be expanded westward by three blocks, was forwarded to the council without recommendation.',
        specifiers: [
          'opposed by every member of the planning board except for two',
          'that the historic district be expanded westward by three blocks',
        ],
        core: 'The proposal was forwarded to the council without recommendation.',
      },
    ],
    source: 'spec.html §5.6 + bespoke practice items',
  },

  // ── 5.7 · Cluster Decomposer (interactive) ────────────────────────────────
  {
    id: 'MC-HS-5.7',
    number: '5.7',
    title: 'Cluster Decomposer',
    route: '/hard-sentences/5.7',
    voice_register: 1,
    hook: 'Tap a specifier to lift it off. Watch the core surface.',
    blocks: [
      {
        kind: 'p',
        text: 'The Cluster Decomposer below is an interactive surface, not a prose section. Tap any orange-highlighted specifier to remove it from the sentence. Continue until only the core remains. The "Resolved thought" card at the bottom updates live.',
      },
      {
        kind: 'visual-spec',
        component: 'ClusterDecomposer',
        caption: 'Three sample sentences pre-loaded; tap specifiers to lift them off.',
      },
      {
        kind: 'callout',
        label: 'When you stop',
        body: 'You have reached the core when the remaining sentence is grammatical, assertable, and matches the author’s claim. If the sentence is grammatical but no longer matches the author’s claim, you removed a load-bearing specifier — restore it.',
      },
    ],
    source: 'spec.html §5.7 + Cluster Decomposer interaction sketch',
  },
];

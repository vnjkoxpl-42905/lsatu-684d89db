/**
 * Hard Sentences interactive content: teaching try-its (inline in sections
 * 5.2 / 5.4 / 5.5), the 5.6 Decomposer Lab set, and the 5.7 graded drill set.
 *
 * Grading is by selection set: an attempt is correct when the student lifts
 * exactly the specifiers marked `loadBearing: false` and keeps the rest.
 * `core` is the display target (the sentence with decoration removed and
 * load-bearing specifiers retained).
 *
 * Authoring rules: every `text` is an exact contiguous substring of
 * `sentence`; no sentence is reused on any other surface; no em dashes.
 */

export type SpecifierKind =
  | 'possessive'
  | 'prepositional'
  | 'relative'
  | 'parenthetical'
  | 'reduced-relative'
  | 'appositive';

export interface ClusterSpecifier {
  id: string;
  text: string;
  kind: SpecifierKind;
  /** True when stripping this specifier changes the author's claim. Keep it. */
  loadBearing: boolean;
  /** Shown in the graded reveal, one teaching line per specifier. */
  rationale: string;
}

export interface ClusterItem {
  id: string;
  sentence: string;
  specifiers: ClusterSpecifier[];
  /** Target core, with load-bearing specifiers retained. */
  core: string;
  /** One warm-coach line shown after grading. */
  coachNote: string;
}

// ─── Inline teaching try-its ─────────────────────────────────────────────────

/** 5.2: one gentle lift, no load-bearing specifiers yet. */
export const HS_TRY_IT_5_2: ClusterItem = {
  id: 'MC-HS-T-01',
  sentence:
    'The proposal, announced at a press conference on Tuesday by the mayor’s office, has divided the city council.',
  specifiers: [
    {
      id: 'T-01-a',
      text: 'announced at a press conference on Tuesday by the mayor’s office',
      kind: 'reduced-relative',
      loadBearing: false,
      rationale:
        'This tells you when and by whom the proposal was announced. Helpful detail, but the claim survives without it.',
    },
  ],
  core: 'The proposal has divided the city council.',
  coachNote: 'One lift, and the sentence is six words. That is the whole skill, just scaled up.',
};

/** 5.4: a longer sentence for practicing the find-the-verb move. */
export const HS_TRY_IT_5_4: ClusterItem = {
  id: 'MC-HS-T-02',
  sentence:
    'A petition, signed by more than four hundred residents of the riverside neighborhood, asking that the night ferry schedule be restored, was delivered to the transit authority on Friday.',
  specifiers: [
    {
      id: 'T-02-a',
      text: 'signed by more than four hundred residents of the riverside neighborhood',
      kind: 'reduced-relative',
      loadBearing: false,
      rationale: 'Who signed it is background. The delivery happened either way.',
    },
    {
      id: 'T-02-b',
      text: 'asking that the night ferry schedule be restored',
      kind: 'reduced-relative',
      loadBearing: false,
      rationale:
        'What the petition asks for is detail you will want later, but the sentence asserts the delivery, not the request.',
    },
    {
      id: 'T-02-c',
      text: 'on Friday',
      kind: 'prepositional',
      loadBearing: false,
      rationale: 'A timestamp. Lift it and the claim does not move.',
    },
  ],
  core: 'A petition was delivered to the transit authority.',
  coachNote:
    'Notice the route you took: verb first ("was delivered"), subject just left of it ("A petition"), everything else stood by.',
};

/** 5.5: the first load-bearing specifier the student meets. */
export const HS_TRY_IT_5_5: ClusterItem = {
  id: 'MC-HS-T-03',
  sentence:
    'The claim that the bridge is structurally unsound, repeated in three separate inspection reports since 2019, has finally prompted the county to act.',
  specifiers: [
    {
      id: 'T-03-a',
      text: 'that the bridge is structurally unsound',
      kind: 'relative',
      loadBearing: true,
      rationale:
        'This is the claim itself. Strip it and "the claim has prompted the county to act" could be about anything. Keep it.',
    },
    {
      id: 'T-03-b',
      text: 'repeated in three separate inspection reports since 2019',
      kind: 'reduced-relative',
      loadBearing: false,
      rationale: 'How often the claim was repeated is history, not the assertion. Safe to lift.',
    },
  ],
  core: 'The claim that the bridge is structurally unsound has finally prompted the county to act.',
  coachNote:
    'This is the load-bearing test in action. One specifier was decoration; the other was the content of the claim.',
};

export const HS_TEACHING_ITEMS: ClusterItem[] = [HS_TRY_IT_5_2, HS_TRY_IT_5_4, HS_TRY_IT_5_5];

// ─── 5.6 Decomposer Lab (guided, hints always available) ─────────────────────

export const HS_LAB_ITEMS: ClusterItem[] = [
  {
    id: 'MC-HS-LAB-01',
    sentence:
      'The university’s decision, after two years of contentious debate among the faculty, to phase out the language requirement has angered alumni.',
    specifiers: [
      {
        id: 'LAB-01-a',
        text: 'after two years of contentious debate among the faculty',
        kind: 'prepositional',
        loadBearing: false,
        rationale: 'The backstory of the decision. The anger exists with or without it.',
      },
      {
        id: 'LAB-01-b',
        text: 'to phase out the language requirement',
        kind: 'prepositional',
        loadBearing: true,
        rationale:
          'Which decision? This one. Strip it and you are talking about an unnamed decision, which is a different claim.',
      },
    ],
    core: 'The university’s decision to phase out the language requirement has angered alumni.',
    coachNote: 'The possessive ("university’s") rides along inside the subject. You rarely lift those on their own.',
  },
  {
    id: 'MC-HS-LAB-02',
    sentence:
      'The witness who testified first, visibly nervous and speaking barely above a whisper, contradicted her earlier statement to investigators.',
    specifiers: [
      {
        id: 'LAB-02-a',
        text: 'who testified first',
        kind: 'relative',
        loadBearing: true,
        rationale:
          'This picks out which witness we mean. Without it, "the witness" could be anyone on the stand. Keep it.',
      },
      {
        id: 'LAB-02-b',
        text: 'visibly nervous and speaking barely above a whisper',
        kind: 'parenthetical',
        loadBearing: false,
        rationale: 'Atmosphere. Vivid, memorable, and not part of the claim.',
      },
      {
        id: 'LAB-02-c',
        text: 'to investigators',
        kind: 'prepositional',
        loadBearing: false,
        rationale: 'Where the earlier statement went. The contradiction stands without it.',
      },
    ],
    core: 'The witness who testified first contradicted her earlier statement.',
    coachNote: 'Relative clauses split two ways: some identify (keep), some merely describe (lift). Ask which job this one is doing.',
  },
  {
    id: 'MC-HS-LAB-03',
    sentence:
      'The festival (now in its fortieth year) will move, organizers confirmed yesterday, to the larger fairgrounds north of the city.',
    specifiers: [
      {
        id: 'LAB-03-a',
        text: '(now in its fortieth year)',
        kind: 'parenthetical',
        loadBearing: false,
        rationale: 'Parentheses are the sentence telling you outright: this part is optional.',
      },
      {
        id: 'LAB-03-b',
        text: 'organizers confirmed yesterday',
        kind: 'parenthetical',
        loadBearing: false,
        rationale: 'An attribution aside, wedged into the middle of the verb phrase. Lift it and the verb reconnects.',
      },
      {
        id: 'LAB-03-c',
        text: 'north of the city',
        kind: 'prepositional',
        loadBearing: false,
        rationale: 'Extra geography on top of "the larger fairgrounds." The move is the claim.',
      },
    ],
    core: 'The festival will move to the larger fairgrounds.',
    coachNote: 'When an aside splits the verb ("will move ... to"), lifting it lets the two halves snap back together.',
  },
  {
    id: 'MC-HS-LAB-04',
    sentence:
      'The settlement, an agreement reached only hours before the trial was set to begin, requires the manufacturer to fund a decade of water monitoring.',
    specifiers: [
      {
        id: 'LAB-04-a',
        text: 'an agreement reached only hours before the trial was set to begin',
        kind: 'appositive',
        loadBearing: false,
        rationale: 'An appositive renames the settlement and adds drama. The requirement is the claim, and it survives the lift.',
      },
    ],
    core: 'The settlement requires the manufacturer to fund a decade of water monitoring.',
    coachNote: 'Appositives sit beside a noun and rename it. They are almost always liftable.',
  },
];

// ─── 5.7 Cluster Drill (graded) ──────────────────────────────────────────────

export const HS_DRILL_ID = 'MC-DRL-HS-CLUSTER';

export const HS_DRILL_ITEMS: ClusterItem[] = [
  {
    id: 'MC-HS-DR-01',
    sentence:
      'The recommendation, issued jointly by the two oversight boards, that the plant remain closed through the winter has been accepted.',
    specifiers: [
      {
        id: 'DR-01-a',
        text: 'issued jointly by the two oversight boards',
        kind: 'reduced-relative',
        loadBearing: false,
        rationale: 'Who issued it is provenance, not content. The acceptance happened regardless.',
      },
      {
        id: 'DR-01-b',
        text: 'that the plant remain closed through the winter',
        kind: 'relative',
        loadBearing: true,
        rationale:
          'This is what was recommended. "The recommendation has been accepted" with this stripped is a different, emptier claim.',
      },
    ],
    core: 'The recommendation that the plant remain closed through the winter has been accepted.',
    coachNote: 'Classic trap shape: the tempting wrong answer is the version with the load-bearing clause missing.',
  },
  {
    id: 'MC-HS-DR-02',
    sentence:
      'A survey of commuters, conducted over three weeks at the city’s busiest stations, found that fewer than half had heard of the proposed fare changes.',
    specifiers: [
      {
        id: 'DR-02-a',
        text: 'of commuters',
        kind: 'prepositional',
        loadBearing: true,
        rationale:
          'Who was surveyed is part of the finding. "A survey found that fewer than half had heard" loses the group the statistic is about.',
      },
      {
        id: 'DR-02-b',
        text: 'conducted over three weeks at the city’s busiest stations',
        kind: 'reduced-relative',
        loadBearing: false,
        rationale: 'Methodology detail. Useful if the question attacks the survey, but not part of the core claim.',
      },
    ],
    core: 'A survey of commuters found that fewer than half had heard of the proposed fare changes.',
    coachNote: 'Short specifiers can be load-bearing too. Size is not the test; the claim is.',
  },
  {
    id: 'MC-HS-DR-03',
    sentence:
      'The director’s resignation, which board members described as entirely unexpected, takes effect at the end of the month.',
    specifiers: [
      {
        id: 'DR-03-a',
        text: 'which board members described as entirely unexpected',
        kind: 'relative',
        loadBearing: false,
        rationale: 'A describing clause, not an identifying one. The resignation takes effect either way.',
      },
    ],
    core: 'The director’s resignation takes effect at the end of the month.',
    coachNote: 'A "which" clause set off by commas is usually describing, and describing clauses lift cleanly.',
  },
  {
    id: 'MC-HS-DR-04',
    sentence:
      'The painting, long believed to be a copy made by one of Rembrandt’s students, has been authenticated by the museum’s own laboratory.',
    specifiers: [
      {
        id: 'DR-04-a',
        text: 'long believed to be a copy made by one of Rembrandt’s students',
        kind: 'reduced-relative',
        loadBearing: false,
        rationale: 'The old belief is contrast, not the claim. The sentence asserts the authentication.',
      },
      {
        id: 'DR-04-b',
        text: 'by the museum’s own laboratory',
        kind: 'prepositional',
        loadBearing: false,
        rationale: 'Who did the authenticating is supporting detail here. The authentication is the point.',
      },
    ],
    core: 'The painting has been authenticated.',
    coachNote: 'Notice the possessives ("Rembrandt’s," "museum’s") riding inside larger specifiers. They come off with the whole phrase.',
  },
  {
    id: 'MC-HS-DR-05',
    sentence:
      'The veto, the mayor’s first in six years in office, surprised even members of her own party.',
    specifiers: [
      {
        id: 'DR-05-a',
        text: 'the mayor’s first in six years in office',
        kind: 'appositive',
        loadBearing: false,
        rationale: 'An appositive renaming the veto with a bit of history. The surprise is the claim.',
      },
    ],
    core: 'The veto surprised even members of her own party.',
    coachNote: 'When a noun phrase sits beside another noun just to rename it, lift it and watch the sentence stand.',
  },
  {
    id: 'MC-HS-DR-06',
    sentence:
      'The deadline (already extended twice) will not, the agency said in a brief statement, be extended again.',
    specifiers: [
      {
        id: 'DR-06-a',
        text: '(already extended twice)',
        kind: 'parenthetical',
        loadBearing: false,
        rationale: 'History in parentheses. The sentence is about what happens next, not what happened before.',
      },
      {
        id: 'DR-06-b',
        text: 'the agency said in a brief statement',
        kind: 'parenthetical',
        loadBearing: false,
        rationale: 'An attribution aside splitting "will not ... be extended." Lift it and the verb phrase reconnects.',
      },
    ],
    core: 'The deadline will not be extended again.',
    coachNote: 'Two lifts and a nineteen-word sentence becomes seven. You finished the drill the way Jordan reads.',
  },
];

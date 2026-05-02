/**
 * Phased lesson content — opt-in. Lessons listed here render the PhaseRunner
 * (briefing → demo → attempt → reveal → coach → checkpoint → next).
 * Lessons NOT in this map fall back to the legacy prose-block renderer.
 *
 * Add a new lesson by mapping its `number` (e.g. "1.2") to a PhasedLesson.
 *
 * Source-anchored to lessons.generated.json[1.1] (Monica claimed dinosaurs).
 */

export type Role = 'conclusion' | 'premise' | 'opposing' | 'background';

/** Six categories of LSAT indicator words (M1.3 + Indicator Vault). */
export type IndicatorCategory =
  | 'conclusion'
  | 'premise'
  | 'pivot'
  | 'opinion'
  | 'opposing'
  | 'concession';

export interface RoleLabelTask {
  kind: 'role-label';
  /** Stimulus split into segments that the student labels. */
  segments: Array<{ id: string; text: string; correct: Role }>;
  /** Roles the student is allowed to pick from for this task. */
  allowedRoles: Role[];
  /** Per-segment teaching note shown after reveal. */
  rationale: Record<string, string>;
}

export interface IndicatorTagTask {
  kind: 'indicator-tag';
  /** Sentence shown to the student with one or more words to tag. */
  sentence: string;
  /** The substrings to tag, with their correct category. */
  targets: Array<{
    id: string;
    /** Exact substring to highlight (case-sensitive, single occurrence). */
    word: string;
    correct: IndicatorCategory;
    /** Per-target teaching note shown after reveal. */
    rationale: string;
  }>;
  /** Categories the student picks from. */
  allowedCategories: IndicatorCategory[];
}

export interface ConclusionPickTask {
  kind: 'conclusion-pick';
  /** Stimulus shown as one block to the student. */
  stimulus: string;
  /** Each candidate is a sentence the student could pick as the main conclusion. */
  candidates: Array<{
    id: string;
    text: string;
    is_main: boolean;
    /** Why this is or isn't the main conclusion. */
    rationale: string;
  }>;
}

export type AttemptTask = RoleLabelTask | IndicatorTagTask | ConclusionPickTask;

export interface PhaseBriefing {
  kind: 'briefing';
  /** One-line "what you'll do here". Verb-led. */
  goal: string;
  /** Two short sentences max. Plain language, no spec voice. */
  body: string;
  /** Word the student should leave the briefing with — surfaces in the demo. */
  primer?: string;
}

export interface PhaseDemo {
  kind: 'demo';
  title: string;
  /** Walk-through copy. Short. */
  body: string;
  /** Optional pre-labeled stimulus to *show* what role-labeling looks like. */
  exampleSegments?: Array<{ text: string; role: Role; whisper?: string }>;
  /** Optional interactive widget rendered after `body`. Currently supports the
   *  pronoun-unpack click-reveal used by Lesson 1.10. Demos with an interactive
   *  widget should usually omit `exampleSegments` to keep the surface focused. */
  interactive?: {
    kind: 'pronoun-unpack';
    prompt?: string;
    segments: Array<
      | { kind: 'text'; text: string }
      | { kind: 'pronoun'; spanId: string }
    >;
    spans: Array<{ id: string; pronoun: string; antecedent: string }>;
    caption?: string;
  };
}

export interface PhaseAttempt {
  kind: 'attempt';
  title: string;
  prompt: string;
  task: AttemptTask;
}

export interface PhaseReveal {
  kind: 'reveal';
  title: string;
  /** One-paragraph wrap-up referring back to the student's attempt. */
  body: string;
}

export interface PhaseCoach {
  kind: 'coach';
  title: string;
  /** Three short sections — same shape as CoachNoteCard but lesson-scoped. */
  structure_map: string;
  core_move: string;
  why_it_matters: string;
}

export interface PhaseCheckpoint {
  kind: 'checkpoint';
  prompt: string;
  options: Array<{ id: string; text: string; correct: boolean; reveal: string }>;
}

export type Phase =
  | PhaseBriefing
  | PhaseDemo
  | PhaseAttempt
  | PhaseReveal
  | PhaseCoach
  | PhaseCheckpoint;

export interface PhasedLesson {
  number: string;
  /** Student-facing eyebrow ("Lesson 1") — no internal IDs. */
  studentEyebrow: string;
  title: string;
  hook: string;
  phases: Phase[];
}

export const PHASED_LESSONS: Record<string, PhasedLesson> = {
  '1.1': {
    number: '1.1',
    studentEyebrow: 'Lesson 1',
    title: "What's an argument?",
    hook:
      'Before we hunt the conclusion, we have to know what kind of beast we are hunting.',
    phases: [
      {
        kind: 'briefing',
        goal: 'Learn what an argument is — claim plus support — before you start hunting conclusions.',
        body:
          'An argument is the author taking a position and giving you reasons to believe it. The reasons are premises. The position is the conclusion. Today you will spot the difference inside a real (silly) example.',
        primer: 'Claim plus support.',
      },
      {
        kind: 'demo',
        title: 'How structure looks when it is labeled',
        body:
          'Here is a tiny argument with the roles already painted on. Premises are blue. Conclusions are green. Background is grey — context the author drops in but is not arguing for.',
        exampleSegments: [
          {
            text: 'Most birds can fly.',
            role: 'premise',
            whisper: 'Premise — a fact the author treats as given.',
          },
          {
            text: 'A robin is a bird.',
            role: 'premise',
            whisper: 'Another premise — same role.',
          },
          {
            text: 'Therefore, a robin can probably fly.',
            role: 'conclusion',
            whisper: 'Conclusion — the claim the premises are built to support.',
          },
        ],
      },
      {
        kind: 'attempt',
        title: 'Your turn — label this stimulus',
        prompt:
          'Tap each sentence and pick its role. Conclusion, premise, or background. Submit when every sentence is labeled.',
        task: {
          kind: 'role-label',
          allowedRoles: ['premise', 'conclusion', 'background'],
          segments: [
            {
              id: 's1',
              text: 'Monica is well known among paleontologists for her unconventional theories.',
              correct: 'background',
            },
            {
              id: 's2',
              text: 'Monica claimed to have caused the extinction of the dinosaurs.',
              correct: 'premise',
            },
            {
              id: 's3',
              text: 'Everything Monica claims is true.',
              correct: 'premise',
            },
            {
              id: 's4',
              text: 'Therefore, Monica caused the extinction of the dinosaurs.',
              correct: 'conclusion',
            },
          ],
          rationale: {
            s1:
              'Background. The author is setting the scene — nothing in the argument is being supported by Monica\'s reputation. Drop it from the structure.',
            s2:
              'Premise. The author treats this as given. No support is offered for it. Accept it and move on.',
            s3:
              'Premise. The silliest one — accept it anyway. On the LSAT, premises are not where the action is.',
            s4:
              'Conclusion. "Therefore" is a giveaway, but the real test is the support test: the prior two sentences are aimed at this claim, and nothing is aimed at them.',
          },
        },
      },
      {
        kind: 'reveal',
        title: 'How the structure actually looked',
        body:
          'Two premises, one conclusion, one piece of background. The silliness lives in the premises ("everything Monica claims is true"), and you accept it. The argument is not whether Monica really did the deed — the argument is whether the premises support the conclusion. They do. Inside this universe, the structure is clean.',
      },
      {
        kind: 'coach',
        title: "Coach's note",
        structure_map:
          'Two premises stacked: "Monica claimed it" + "Monica is always right." The conclusion sits on top: "Monica did it." The first sentence is decoration — pure background.',
        core_move:
          'Ask "what is the author trying to prove?" first. Then ask "what is being used to prove it?" The answers are conclusion and premises in that order — never the reverse.',
        why_it_matters:
          'Every Main Conclusion question on the LSAT is built on this skeleton. If you can label the roles inside a clean two-premise stimulus, you have the bones. The rest of Module 1 is teaching you to find the same skeleton when it is hidden.',
      },
      {
        kind: 'checkpoint',
        prompt: 'On the LSAT, what should you do with a premise that sounds wrong?',
        options: [
          {
            id: 'A',
            text: 'Push back. If the premise is false, the argument cannot work.',
            correct: false,
            reveal:
              'Not on the LSAT. Premise truth is given. The whole game is about how the premises fit together — not whether they are world-true.',
          },
          {
            id: 'B',
            text: 'Accept it as given and move on.',
            correct: true,
            reveal:
              'Yes. Accept the premises and look for the move the author makes from them to the conclusion. That is the part that is contestable.',
          },
          {
            id: 'C',
            text: 'Skip the question — broken premise means broken argument.',
            correct: false,
            reveal:
              'No. A weird-sounding premise (Monica, fish made of light) is intentional. It keeps you from importing outside knowledge.',
          },
        ],
      },
    ],
  },
};

PHASED_LESSONS['1.2'] = {
  number: '1.2',
  studentEyebrow: 'Lesson 2',
  title: 'Premises do the lifting. Conclusions take the heat.',
  hook:
    'Premises describe how the world is. Conclusions are claims the author wants you to believe. Different jobs, different scrutiny.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Learn what makes a premise a premise and a conclusion a conclusion — and why the LSAT lets you trust one and pushes you to question the other.',
      body:
        'On the LSAT you accept the premises, even when they sound strange. You push on the conclusion. The whole game lives in the gap between them.',
      primer: 'Accept premises. Question conclusions.',
    },
    {
      kind: 'demo',
      title: 'Two examples — same shape, different roles',
      body:
        'Watch how the same words shift between roles depending on what the author is using them to do. Premises describe. Conclusions claim.',
      exampleSegments: [
        {
          text: 'The town\'s drinking water is treated with fluoride.',
          role: 'premise',
          whisper:
            'A factual statement the author treats as given. No support is offered. You accept it.',
        },
        {
          text: 'Fluoride reduces cavities.',
          role: 'premise',
          whisper:
            'Another fact treated as given. The author leans on it; the LSAT does not invite you to dispute it.',
        },
        {
          text: 'Therefore, the town\'s public health is improving.',
          role: 'conclusion',
          whisper:
            'A claim that goes beyond the premises. This is the part that may be too strong, too narrow, or just unsupported. This is where you push.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — sort by job, not by topic',
      prompt:
        'Tap each sentence. If the author is treating it as a fact you accept, label it Premise. If the author is making a claim that needs support, label it Conclusion. Submit when every sentence has a role.',
      task: {
        kind: 'role-label',
        allowedRoles: ['premise', 'conclusion'],
        segments: [
          {
            id: 'p1',
            text: 'Microphones love coffee in the same way owls love jazz.',
            correct: 'premise',
          },
          {
            id: 'p2',
            text: 'Anything that loves jazz is dangerous in the morning.',
            correct: 'premise',
          },
          {
            id: 'p3',
            text: 'Therefore, microphones are dangerous in the morning.',
            correct: 'conclusion',
          },
        ],
        rationale: {
          p1:
            'Premise. Strange, but you accept it on the LSAT. Strangeness is intentional — it stops you from importing real-world knowledge.',
          p2:
            'Premise. The author treats this as given and uses it as a stepping stone. Accept it.',
          p3:
            'Conclusion. The author is now making a claim. The "Therefore" is a giveaway, but the test is the support test: the prior two sentences are aimed at this one.',
        },
      },
    },
    {
      kind: 'reveal',
      title: 'Two premises, one conclusion — the basic shape',
      body:
        'You accepted two strange premises and watched the conclusion emerge. The argument is valid inside its own universe — accept the premises, the conclusion follows. On the LSAT you do this every time. You do not argue with microphones loving coffee. You ask whether the conclusion follows from what the author gave you.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Two premises stacked: P1 (microphones love coffee like owls love jazz), P2 (jazz-lovers are dangerous in the morning). Conclusion lands on top: microphones are dangerous in the morning.',
      core_move:
        'When in doubt, ask: "Is the author treating this as given, or as something to convince me of?" Given → premise. Convince → conclusion.',
      why_it_matters:
        'The LSAT will give you premises that sound true and conclusions that sound true, all jumbled. The role test cuts through. Once you know which sentence the author is defending, every other sentence is in service of it.',
    },
    {
      kind: 'checkpoint',
      prompt: 'On the LSAT, what should you do with a premise that sounds wrong?',
      options: [
        {
          id: 'A',
          text: 'Push back. If the premise is false, the argument cannot work.',
          correct: false,
          reveal:
            'Not on the LSAT. Premise truth is given. The whole argumentative game is about how the premises fit together — not whether they are world-true.',
        },
        {
          id: 'B',
          text: 'Accept it as given and move on.',
          correct: true,
          reveal:
            'Yes. Accept the premises and look for the move the author makes from them to the conclusion. That is the part that is contestable.',
        },
        {
          id: 'C',
          text: 'Skip the question — broken premise means broken argument.',
          correct: false,
          reveal:
            'No. A weird-sounding premise is intentional. It keeps you from importing outside knowledge.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.3'] = {
  number: '1.3',
  studentEyebrow: 'Lesson 3',
  title: 'Indicator words: the visible signposts',
  hook:
    'The test makers leave breadcrumbs. Some are loud. Some are quiet. Some are traps. Today you learn to read them.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Learn the six categories of indicator words and how to use them as clues — not verdicts.',
      body:
        'LSAC writers mark the role of each claim with a small set of words. Memorize the categories and your eyes start picking them up. But never let an indicator override the support test.',
      primer: 'Indicators are clues, not verdicts.',
    },
    {
      kind: 'demo',
      title: 'Six categories at a glance',
      body:
        'Each category points at a role. Conclusion words point at conclusions. Premise words (FABS — For, After all, Because, Since) point at support. Pivots flip direction. Concessions briefly agree before the author pushes back.',
      exampleSegments: [
        {
          text: '"Therefore, the proposal will fail."',
          role: 'conclusion',
          whisper: 'Conclusion indicator. The clause after "Therefore" is a candidate conclusion.',
        },
        {
          text: '"Because the council has lost faith in the budget."',
          role: 'premise',
          whisper:
            'Premise indicator (FABS). The clause after "Because" is support, and the conclusion sits next door.',
        },
        {
          text: '"But the new plan addresses the council\'s concerns directly."',
          role: 'conclusion',
          whisper:
            'A pivot ("But") usually flips the argument. The author\'s real claim lives on the far side of the pivot.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — tag the indicator',
      prompt:
        'Read the sentence. Tap the highlighted word and pick its category. Then submit.',
      task: {
        kind: 'indicator-tag',
        sentence:
          'Some scientists insist the lake is dying, but the data, after all, show the fish population has tripled since the cleanup, so the lake is recovering.',
        allowedCategories: ['conclusion', 'premise', 'pivot', 'opposing', 'concession'],
        targets: [
          {
            id: 't1',
            word: 'Some scientists insist',
            correct: 'opposing',
            rationale:
              'Opposing-viewpoint indicator. "Some [people] [verb]" attributions almost always set up someone else\'s view, which the author is about to push back against.',
          },
          {
            id: 't2',
            word: 'but',
            correct: 'pivot',
            rationale:
              'Pivot indicator. The author is turning. The author\'s real claim lives on the far side of the pivot.',
          },
          {
            id: 't3',
            word: 'after all',
            correct: 'premise',
            rationale:
              'Premise indicator (FABS — For, After all, Because, Since). What follows is support; the conclusion is right next door.',
          },
          {
            id: 't4',
            word: 'so',
            correct: 'conclusion',
            rationale:
              'Conclusion indicator. The clause after "so" is a candidate conclusion. The 2-Part Conclusion Check still has to confirm it.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'How the sentence actually breaks',
      body:
        'Opposing → pivot → premise → conclusion. Four indicator categories in one sentence, each doing a different job. The "Some scientists insist" sets up an opponent. The "but" announces the author is about to push back. The "after all" introduces evidence. The "so" lands the author\'s claim. This four-beat shape — opposing view, pivot, support, conclusion — is one of the most common Main Conclusion patterns on the test.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Opposing view ("scientists insist the lake is dying") → pivot ("but") → premise ("data show fish tripled") → conclusion ("lake is recovering").',
      core_move:
        'When you see a "Some [people] [verb]" opener, expect a pivot. The conclusion will live after the pivot, not in the opener.',
      why_it_matters:
        'Indicators win you speed. You will not always see one — sometimes LSAC strips them deliberately. But when an indicator is present, it cuts seconds off your read. Use them as clues; verify with the support test.',
    },
    {
      kind: 'checkpoint',
      prompt: 'Which word marks support, not the conclusion?',
      options: [
        {
          id: 'A',
          text: 'Therefore',
          correct: false,
          reveal:
            'Therefore is a conclusion indicator. What follows is a candidate conclusion (still subject to the support test).',
        },
        {
          id: 'B',
          text: 'After all',
          correct: true,
          reveal:
            'Yes. "After all" is in FABS — premise/support territory. The clause it introduces is evidence; the conclusion sits next door.',
        },
        {
          id: 'C',
          text: 'However',
          correct: false,
          reveal:
            'However is a pivot. It marks a turn — the author is about to push back. The author\'s claim lives on the far side of the pivot.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.4'] = {
  number: '1.4',
  studentEyebrow: 'Lesson 4',
  title: 'Main Conclusion: the most salvageable question type ever',
  hook:
    'Find the conclusion. Pick the answer that matches it. That is the whole job. Now, here is why it is hard anyway.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Learn where the LSAT hides the conclusion — and the two stashes that catch more than 90% of cases.',
      body:
        'School taught you the conclusion comes last. The LSAT writers know that. On Main Conclusion questions, the conclusion is almost never last. Today you train to find the two places it actually lives.',
      primer: 'The conclusion is rarely last.',
    },
    {
      kind: 'demo',
      title: 'The two stashes',
      body:
        'Stash 1 — the first sentence sounds like an author opinion → it is the conclusion. Stash 2 — the first sentence is attributed to someone else, then a pivot, then the author\'s claim → the claim after the pivot is the conclusion.',
      exampleSegments: [
        {
          text:
            '"The proposed bridge should not be built. Its cost has tripled since planning began, and the projected traffic has fallen by half."',
          role: 'conclusion',
          whisper:
            'Stash 1. First sentence is the conclusion ("should not be built"). The next two sentences are premises that support it.',
        },
        {
          text:
            '"Some city planners argue the bridge is essential. But the cost has tripled and projected traffic has fallen by half. The bridge should not be built."',
          role: 'conclusion',
          whisper:
            'Stash 2. Opposing-view opener, pivot ("But"), then the author\'s claim arrives at the end after a setup. The final sentence is the conclusion here — but only because of the pivot framing, not because it is last.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — find the main conclusion',
      prompt:
        'Read the stimulus. Pick the sentence the rest of the argument is built to support.',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'Some critics insist that the new transit fare is too high. But ridership has held steady through three months of the new fare, and revenue is up 12% over the same period last year. The fare increase has worked.',
        candidates: [
          {
            id: 'c1',
            text: 'The new transit fare is too high.',
            is_main: false,
            rationale:
              'This is the opposing view. "Some critics insist..." attributes it to other people. The author is about to push back, not endorse it.',
          },
          {
            id: 'c2',
            text: 'Ridership has held steady through three months of the new fare.',
            is_main: false,
            rationale:
              'A premise. The author is using this as support. Nothing in the argument tries to defend it — it is treated as given.',
          },
          {
            id: 'c3',
            text: 'Revenue is up 12% over the same period last year.',
            is_main: false,
            rationale:
              'Another premise. Statistical support that points at the conclusion, not a claim being argued for.',
          },
          {
            id: 'c4',
            text: 'The fare increase has worked.',
            is_main: true,
            rationale:
              'The conclusion. It sits after the pivot ("But"), it is the author\'s claim, and the prior two premises are aimed at it. Stash 2 in action.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'Stash 2 — opposing view, pivot, support, claim',
      body:
        'You found it. Notice the sentence is last, but that is incidental — what made it the conclusion is the pivot setup before it. The opposing-view opener primed you to expect a pivot. The premises landed. The conclusion arrived. If you remove the pivot framing and re-read the stimulus as a flat list, the conclusion would be much harder to find. The framing is the clue.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Opposing view ("critics insist fare is too high") → pivot ("But") → two premises (ridership steady, revenue up 12%) → conclusion ("fare increase has worked"). Stash 2.',
      core_move:
        'When the stimulus opens with someone else\'s view, expect a pivot. The author\'s conclusion lives after the pivot.',
      why_it_matters:
        'Most Main Conclusion stimuli use one of the two stashes. Recognize the stash and the conclusion lights up before you finish reading. This is the move that turns a 90-second question into a 30-second one.',
    },
    {
      kind: 'checkpoint',
      prompt:
        'If the final sentence of a Main Conclusion stimulus sounds confident and verdict-y, what should you do?',
      options: [
        {
          id: 'A',
          text: 'Pick it. Conclusions go at the end.',
          correct: false,
          reveal:
            'Last Claim Trap. School taught you that, and the test makers count on it. The final sentence is the conclusion less than 10% of the time on this question type.',
        },
        {
          id: 'B',
          text: 'Treat it as a candidate, then run the support test.',
          correct: true,
          reveal:
            'Right. It is a candidate, not a verdict. Confirm the prior sentences are aimed at it before you commit.',
        },
        {
          id: 'C',
          text: 'Pick the first sentence instead — Stash 1.',
          correct: false,
          reveal:
            'Not by default. Stash 1 is common but not universal. The support test still has to land.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.5'] = {
  number: '1.5',
  studentEyebrow: 'Lesson 5',
  title: 'Hiding spot 1 — the first sentence',
  hook:
    'Sometimes they hide the conclusion right where you are not looking — at the beginning.',
  phases: [
    {
      kind: 'briefing',
      goal: 'Recognize the first-sentence stash and verify it with the support test.',
      body:
        'The opening sentence often sounds like a verdict ("X is the right move"). On Main Conclusion items, that verdict is almost always the conclusion. The rest of the stimulus is the support stack underneath it.',
      primer: 'Verdict-y first sentence → candidate conclusion.',
    },
    {
      kind: 'demo',
      title: 'A clean first-sentence example',
      body:
        'The opener sounds like the author has already made up their mind. The next sentences explain why. That is the shape: claim first, then support.',
      exampleSegments: [
        {
          text: 'The new bike-share program will fail.',
          role: 'conclusion',
          whisper: 'A verdict in the first sentence. Treat as candidate conclusion.',
        },
        {
          text: 'Three pilot stations have lost half their bikes within a month.',
          role: 'premise',
          whisper: 'Evidence aimed at the conclusion above.',
        },
        {
          text: 'The maintenance cost has already exceeded the planning budget.',
          role: 'premise',
          whisper: 'More evidence pointing the same way.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — find the conclusion',
      prompt: 'Pick the sentence the rest is built to support.',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'The university should reverse its decision to close the campus library. Enrollment has risen for six straight semesters, the library handles more than three thousand reservations a week, and a recent survey found that 84% of students rely on it for graded research. Closing it would create the very access problems the administration claims to be solving.',
        candidates: [
          {
            id: 'c1',
            text: 'The university should reverse its decision to close the campus library.',
            is_main: true,
            rationale:
              'Stash 1 — first-sentence verdict. The next three sentences are aimed at this claim. Support test passes.',
          },
          {
            id: 'c2',
            text: 'Enrollment has risen for six straight semesters.',
            is_main: false,
            rationale: 'Premise. A statistic the author is using as support, not arguing for.',
          },
          {
            id: 'c3',
            text: '84% of students rely on it for graded research.',
            is_main: false,
            rationale: 'Premise. Another support statistic.',
          },
          {
            id: 'c4',
            text: 'Closing it would create the very access problems the administration claims to be solving.',
            is_main: false,
            rationale:
              'Tempting — it sounds like a verdict. But it is a supporting beat, not the main claim. The conclusion is broader: the university should reverse its decision.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'First sentence wins',
      body:
        'The verdict at the top set the frame. Everything that followed was built to support it. The closing sentence sounded conclusion-like — but it is a tactical reinforcement of the claim already made, not a new claim. The first-sentence stash relies on this kind of misdirection at the end.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Conclusion (first sentence) → premise (enrollment) → premise (reservations) → premise (survey) → reinforcement (access problems).',
      core_move:
        'Read the first sentence. If it sounds like a verdict, mark it as a candidate conclusion before you read further. Then verify with the support test.',
      why_it_matters:
        'Stash 1 is the most common Main Conclusion pattern after Stash 2. Recognizing it shaves 20–30 seconds off these questions.',
    },
    {
      kind: 'checkpoint',
      prompt: 'When the first sentence reads as the author\'s verdict, what should you do?',
      options: [
        {
          id: 'A',
          text: 'Read the rest of the stimulus, then look for a verdict at the end.',
          correct: false,
          reveal:
            'That is the trap. School trained you to expect the verdict last. The LSAT exploits that — the verdict is usually first.',
        },
        {
          id: 'B',
          text: 'Mark it as a candidate conclusion and verify with the support test.',
          correct: true,
          reveal:
            'Yes. First-sentence verdict → candidate. Then confirm the rest of the stimulus is aimed at it.',
        },
        {
          id: 'C',
          text: 'Skip the first sentence — opening sentences are usually background.',
          correct: false,
          reveal:
            'Not on Main Conclusion items. On those, the first sentence is the conclusion more often than not.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.6'] = {
  number: '1.6',
  studentEyebrow: 'Lesson 6',
  title: 'Hiding spot 2 — after the pivot',
  hook:
    'When somebody else speaks first, the author is about to disagree. That disagreement is the conclusion.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Recognize the rebuttal-styled stash: opposing-view opener → pivot → author\'s claim.',
      body:
        'When a stimulus opens with someone else\'s view, expect a pivot ("but," "however," "yet") and a counter-claim. That counter-claim is the conclusion.',
      primer: 'Opposing-view opener → expect a pivot.',
    },
    {
      kind: 'demo',
      title: 'The four-beat shape',
      body:
        'Opposing view → pivot → support → conclusion. Once you see this shape, the conclusion almost names itself.',
      exampleSegments: [
        {
          text: 'Many policy analysts argue the housing tax credit has not boosted construction.',
          role: 'opposing',
          whisper: 'Opposing-view opener. Attributed to "many analysts" — not the author.',
        },
        {
          text: 'But permit applications have doubled since the credit took effect, and three new developers have entered the market.',
          role: 'premise',
          whisper: 'Pivot ("But") + the author\'s evidence.',
        },
        {
          text: 'The credit is working.',
          role: 'conclusion',
          whisper: 'The author\'s claim. Short and final.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — pick the conclusion after the pivot',
      prompt: 'Spot the pivot. The conclusion lives on the other side of it.',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'Critics of the new minimum-wage increase claim it has driven small businesses to cut staff. However, in the six months since the increase, total employment in retail and food service has risen by 4%, and reported layoffs are below the prior-year average. The wage increase has not harmed employment.',
        candidates: [
          {
            id: 'c1',
            text: 'The new minimum-wage increase has driven small businesses to cut staff.',
            is_main: false,
            rationale: 'The opposing view. Attributed to "critics" — the author is about to push back.',
          },
          {
            id: 'c2',
            text: 'Total employment in retail and food service has risen by 4%.',
            is_main: false,
            rationale: 'Premise. A statistic the author uses as support.',
          },
          {
            id: 'c3',
            text: 'Reported layoffs are below the prior-year average.',
            is_main: false,
            rationale: 'Another premise.',
          },
          {
            id: 'c4',
            text: 'The wage increase has not harmed employment.',
            is_main: true,
            rationale:
              'The conclusion. Sits after the pivot ("However"). The author\'s actual claim, supported by the two premises before it.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'After the pivot is where the author lives',
      body:
        'The opener belonged to the critics. The author quoted them, pivoted, brought evidence, then planted the flag. That last sentence is the conclusion — not because it is last, but because of the pivot framing.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Opposing view (critics\' claim) → pivot ("However") → two premises (employment up, layoffs down) → conclusion (wage increase has not harmed employment).',
      core_move:
        'When you see "Some [people] [verb]" or "Critics [argue/say]," scan ahead for the pivot. Park your attention on what the author says next.',
      why_it_matters:
        'Stash 2 catches roughly 50–60% of Main Conclusion items. Combined with Stash 1, you have the location of the conclusion in 90%+ of the question type.',
    },
    {
      kind: 'checkpoint',
      prompt: 'A stimulus opens with "Many economists argue..." What should you predict?',
      options: [
        {
          id: 'A',
          text: 'The author agrees with the economists; pick the opener as the conclusion.',
          correct: false,
          reveal: 'Almost never. "Many [people] argue" attributions are setting up a pivot.',
        },
        {
          id: 'B',
          text: 'Expect a pivot. The author\'s claim arrives after it.',
          correct: true,
          reveal: 'Yes. Stash 2. Watch for "but / however / yet" and read the conclusion that follows.',
        },
        {
          id: 'C',
          text: 'Pick the final sentence regardless of structure.',
          correct: false,
          reveal:
            'Last Claim Trap. The conclusion is last only because the pivot framing put it there — not by default.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.7'] = {
  number: '1.7',
  studentEyebrow: 'Lesson 7',
  title: 'Intermediate conclusions vs multi-premise arguments',
  hook:
    'Two premises and one conclusion is simple. Add an intermediate conclusion and the chain gets longer. Confusing them is one of the test\'s favorite tricks.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Tell an intermediate conclusion apart from a regular premise — and from the main conclusion.',
      body:
        'An intermediate conclusion is supported by something *and* supports something else. It sits in the middle of the chain. The main conclusion is supported but supports nothing else.',
      primer: 'Supported AND supporting → intermediate.',
    },
    {
      kind: 'demo',
      title: 'A three-link chain',
      body:
        'Premises → intermediate conclusion → main conclusion. The intermediate is the bridge. Cut it and the main conclusion has nowhere to land.',
      exampleSegments: [
        {
          text: 'The reservoir level has dropped by 40% in the last decade.',
          role: 'premise',
          whisper: 'Premise — a fact, supports the next claim.',
        },
        {
          text: 'Therefore, the city is heading for a water shortage.',
          role: 'background',
          whisper:
            'Intermediate conclusion. Supported by the premise above; itself supports the main claim below. (Painted grey here so the chain is visible — your X-Ray would mark this distinct.)',
        },
        {
          text: 'So the city should invest in desalination now.',
          role: 'conclusion',
          whisper: 'Main conclusion. Supported by the intermediate; supports nothing else.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — find the main conclusion',
      prompt:
        'There is one main conclusion and at least one intermediate conclusion. Pick the sentence that is supported and supports nothing else.',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'The factory has reduced its emissions by 35% over five years. This shows the new filtration system is effective. Since the system is effective, the company should install it at its other three plants.',
        candidates: [
          {
            id: 'c1',
            text: 'The factory has reduced its emissions by 35% over five years.',
            is_main: false,
            rationale: 'Premise. A fact, base of the chain.',
          },
          {
            id: 'c2',
            text: 'The new filtration system is effective.',
            is_main: false,
            rationale:
              'Intermediate conclusion. Supported by the emissions data ("This shows...") AND supports the next claim ("Since the system is effective..."). Bridge, not summit.',
          },
          {
            id: 'c3',
            text: 'The company should install it at its other three plants.',
            is_main: true,
            rationale:
              'Main conclusion. Supported by the intermediate ("Since the system is effective..."). Nothing in the argument is being built toward something else from here. This is the summit.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'The summit is what is supported and supports nothing',
      body:
        'You found it. The middle sentence sounded conclusion-y because it is one — an intermediate one. The trick is to ask "is anything in the argument being supported by *this* sentence?" If yes, it is intermediate. If no, it is the main.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'P (emissions down 35%) → IC ("filtration system is effective") → MC ("install it at other plants").',
      core_move:
        'For each candidate, ask: "Does anything in the stimulus need this sentence to land?" If something downstream depends on it, it is intermediate, not main.',
      why_it_matters:
        'Picking the intermediate is the most common wrong-answer pattern on chained Main Conclusion items. Train this distinction now and the simulator gets easier.',
    },
    {
      kind: 'checkpoint',
      prompt: 'How do you tell an intermediate conclusion apart from the main conclusion?',
      options: [
        {
          id: 'A',
          text: 'The main conclusion always comes last in the stimulus.',
          correct: false,
          reveal: 'No. Position is not reliable. The role test is.',
        },
        {
          id: 'B',
          text: 'The main conclusion is supported but supports nothing else; the intermediate does both.',
          correct: true,
          reveal: 'Yes. Supported AND supporting → intermediate. Supported only → main.',
        },
        {
          id: 'C',
          text: 'Intermediate conclusions never use indicator words.',
          correct: false,
          reveal:
            'They often use them ("Therefore," "This shows"). Indicator words alone do not distinguish.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.8'] = {
  number: '1.8',
  studentEyebrow: 'Lesson 8',
  title: 'The Trojan Horse: opposing views and concessions',
  hook:
    'When the author seems to agree with the other side, it is a setup. The real point is coming.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Identify Trojan Horse concessions and avoid mistaking them for the author\'s position.',
      body:
        'Concession words ("granted," "although," "while," "despite") signal the author is briefly stepping back before pushing forward harder. The clause they introduce is not the author\'s claim — it is the wind-up.',
      primer: 'Concession is wind-up, not landing.',
    },
    {
      kind: 'demo',
      title: 'The wind-up and the swing',
      body:
        'A concession sounds agreeable. That is the trap. Once the concession ends, the author swings.',
      exampleSegments: [
        {
          text: 'Granted, the new tax has raised consumer prices in the short term.',
          role: 'background',
          whisper: 'Concession ("Granted"). The author is acknowledging the other side — wind-up.',
        },
        {
          text: 'But the revenue has funded school improvements that will benefit the next decade of students.',
          role: 'premise',
          whisper: 'Pivot, then the author\'s evidence.',
        },
        {
          text: 'The tax was the right call.',
          role: 'conclusion',
          whisper: 'The swing — the author\'s actual claim.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — do not fall for the wind-up',
      prompt: 'Pick the sentence the author is actually arguing for.',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'Although the company\'s mandatory training program adds two hours to every new hire\'s first week, completion rates on technical certifications have risen by 28% since the program launched, and supervisor-reported readiness scores have hit their highest level in five years. The training program is paying off.',
        candidates: [
          {
            id: 'c1',
            text: 'The company\'s mandatory training program adds two hours to every new hire\'s first week.',
            is_main: false,
            rationale:
              'Concession ("Although..."). The author is acknowledging the cost. Not the conclusion — the wind-up.',
          },
          {
            id: 'c2',
            text: 'Completion rates on technical certifications have risen by 28%.',
            is_main: false,
            rationale: 'Premise. Statistical support for the claim.',
          },
          {
            id: 'c3',
            text: 'Supervisor-reported readiness scores have hit their highest level in five years.',
            is_main: false,
            rationale: 'Another premise. Author uses it as evidence.',
          },
          {
            id: 'c4',
            text: 'The training program is paying off.',
            is_main: true,
            rationale:
              'The conclusion. Author lands here after conceding the cost and citing two pieces of evidence.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'The concession was the wind-up',
      body:
        'You read past it. The "Although..." opening was designed to feel like the author\'s position — a thoughtful "yes, the program has costs." But the author is not arguing for the costs. The author is arguing that the program pays off in spite of them. That swing is the conclusion.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Concession (training adds time) → premise (cert completion +28%) → premise (readiness highest in 5 years) → conclusion (program is paying off).',
      core_move:
        'When you see "Granted / Although / While / Despite" at the start of a clause, mark it as concession and read past it. The conclusion is on the far side of the swing.',
      why_it_matters:
        'Trojan Horse concessions are one of LSAC\'s favorite Main Conclusion misdirects. The wind-up sounds reasonable; students lock onto it; the right answer is the swing.',
    },
    {
      kind: 'checkpoint',
      prompt: 'A stimulus opens "Although the new policy has increased wait times..." What is the function of that clause?',
      options: [
        {
          id: 'A',
          text: 'It is the author\'s main claim — "the new policy has increased wait times."',
          correct: false,
          reveal: 'No. "Although" signals concession. The author is conceding, not arguing.',
        },
        {
          id: 'B',
          text: 'It is the wind-up before the author\'s real claim arrives.',
          correct: true,
          reveal: 'Yes. Concession is wind-up. Read past it for the swing.',
        },
        {
          id: 'C',
          text: 'It is the conclusion — concession words signal conclusions.',
          correct: false,
          reveal:
            'Reverse. Concession words signal the part the author is *not* arguing for. The conclusion lands after.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.9'] = {
  number: '1.9',
  studentEyebrow: 'Lesson 9',
  title: 'The five types of conclusions',
  hook:
    'Not every conclusion looks the same. Knowing the type helps you spot it faster.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Learn the five conclusion types LSAT writers use most: prediction, judgment, recommendation, causal, comparison.',
      body:
        'Conclusions come in flavors. Prediction ("X will happen"). Judgment ("X is good/bad"). Recommendation ("X should be done"). Causal ("X causes Y"). Comparison ("X is more/less than Y"). Knowing the type primes your eye for the matching answer.',
      primer: 'Five flavors. Pattern-match to find them faster.',
    },
    {
      kind: 'demo',
      title: 'The five flavors',
      body:
        'Same evidence, different conclusion shapes. Recognize the shape and you recognize the right answer.',
      exampleSegments: [
        {
          text: 'Sales of electric vehicles will exceed gas vehicles by 2030.',
          role: 'conclusion',
          whisper: 'Prediction. About the future. Will / will not.',
        },
        {
          text: 'The mayor\'s tax plan is unfair to small business owners.',
          role: 'conclusion',
          whisper: 'Judgment. Good / bad / fair / unfair.',
        },
        {
          text: 'The school district should adopt the new reading curriculum.',
          role: 'conclusion',
          whisper: 'Recommendation. Should / ought / must.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — tag the conclusion words by their function',
      prompt: 'In the sentence below, tag each marked phrase as a category.',
      task: {
        kind: 'indicator-tag',
        sentence:
          'Although the bridge\'s opponents argue construction will harm the river, recent surveys show fish populations are stable, so the bridge should be built.',
        allowedCategories: ['conclusion', 'premise', 'pivot', 'opposing', 'concession'],
        targets: [
          {
            id: 't1',
            word: 'Although',
            correct: 'concession',
            rationale:
              'Concession. Author is briefly granting an objection — "the bridge\'s opponents argue construction will harm the river."',
          },
          {
            id: 't2',
            word: 'opponents argue',
            correct: 'opposing',
            rationale:
              'Opposing-view marker. The author is naming the other side, not endorsing it.',
          },
          {
            id: 't3',
            word: 'so',
            correct: 'conclusion',
            rationale:
              'Conclusion indicator. The clause after "so" is the author\'s recommendation: "the bridge should be built."',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'Concession + opposing → pivot → recommendation',
      body:
        'Three indicator categories in one sentence — and the conclusion is a recommendation ("should be built"). When you see "should / ought / must," you are looking at a recommendation conclusion. The matching answer choice will use the same modal.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Concession ("Although") + opposing view ("opponents argue") → pivot implied → premise (fish stable) → conclusion-as-recommendation ("should be built").',
      core_move:
        'When you find the conclusion, name its flavor (prediction / judgment / recommendation / causal / comparison). Then look for an answer choice that matches the flavor.',
      why_it_matters:
        'Wrong answer choices often shift the conclusion\'s flavor — turning a prediction into a recommendation, or a judgment into a causal claim. Knowing the flavor blocks that move.',
    },
    {
      kind: 'checkpoint',
      prompt: '"The committee should reject the proposal." What flavor is this conclusion?',
      options: [
        {
          id: 'A',
          text: 'Prediction — the committee will reject the proposal.',
          correct: false,
          reveal: 'No. "Should" is recommendation, not prediction. The author is not predicting future behavior.',
        },
        {
          id: 'B',
          text: 'Recommendation — the author thinks the committee ought to reject it.',
          correct: true,
          reveal: 'Yes. "Should / ought / must" → recommendation. The matching answer will use a similar modal.',
        },
        {
          id: 'C',
          text: 'Judgment — the proposal is bad.',
          correct: false,
          reveal:
            'Close, but not quite. The judgment is implicit ("bad enough to reject"); the conclusion is the recommendation about what to do.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.10'] = {
  number: '1.10',
  studentEyebrow: 'Lesson 10',
  title: 'Pre-phrase: replace the pronouns before you say the conclusion back',
  hook:
    '"Such laws will not work" tells you nothing on its own. Which laws? Replace the pronoun. Always.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Build the pronoun-replacement habit so you can compare the conclusion to answer choices without losing the antecedent.',
      body:
        'When you say the conclusion back to yourself with "this," "that," "such," or "they" still in it, you have not actually said it. Replace the pronoun with what it refers to. Then compare to the choices.',
      primer: 'Pronouns out before pre-phrase.',
    },
    {
      kind: 'demo',
      title: 'Tap a pronoun. Watch it expand.',
      body:
        'Same paragraph, two ways. Read it once, then tap each highlighted phrase. Each pronoun swaps to the antecedent it points at. The conclusion stops sounding vague the moment you do this.',
      interactive: {
        kind: 'pronoun-unpack',
        prompt: 'Tap each gold phrase to replace it with what it points at.',
        segments: [
          {
            kind: 'text',
            text: 'The city has tried two responses to rising crime: increased police presence and harsher sentencing. ',
          },
          { kind: 'pronoun', spanId: 'such-measures' },
          { kind: 'text', text: ' will not reduce crime, because ' },
          { kind: 'pronoun', spanId: 'they' },
          { kind: 'text', text: ' fail to address the underlying conditions that drive offending in the first place.' },
        ],
        spans: [
          {
            id: 'such-measures',
            pronoun: 'Such measures',
            antecedent: 'Increased police presence and harsher sentencing',
          },
          {
            id: 'they',
            pronoun: 'they',
            antecedent: 'increased police presence and harsher sentencing',
          },
        ],
        caption: 'Tap each gold phrase to expand it. Tap again to collapse.',
      },
    },
    {
      kind: 'attempt',
      title: 'Your turn — pick the answer that survives pronoun replacement',
      prompt:
        'The conclusion in the stimulus is "These changes will damage the local economy." Pick the candidate that captures the conclusion *with the pronoun replaced.*',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'The city council has proposed banning short-term rentals, raising the hotel tax by 6%, and limiting construction permits in the downtown core. Local business groups oppose all three, citing reduced visitor traffic and lower retail sales last year. These changes will damage the local economy.',
        candidates: [
          {
            id: 'c1',
            text: 'These changes will damage the local economy.',
            is_main: false,
            rationale:
              'Verbatim — but with "these changes" still pointing at the prior sentence. Not what an answer choice will look like.',
          },
          {
            id: 'c2',
            text: 'Banning short-term rentals will damage the local economy.',
            is_main: false,
            rationale:
              'Pronoun replaced — but only with one of the three changes. The conclusion was about all three.',
          },
          {
            id: 'c3',
            text: 'Banning short-term rentals, raising the hotel tax, and limiting permits will damage the local economy.',
            is_main: true,
            rationale:
              'Pronoun fully replaced. This is the conclusion in the form the right answer will take.',
          },
          {
            id: 'c4',
            text: 'The local economy has already been damaged.',
            is_main: false,
            rationale:
              'Tense shift — the conclusion is forward-looking ("will damage"). Past-tense claim is a different statement.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'Replace the pronoun before you compare',
      body:
        'You picked the candidate that swapped "these changes" for the actual list. That is the move. Saying the conclusion back to yourself with the pronoun still in it leaves you vulnerable to wrong answers that swap one item from the list for the whole.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Premise list (three proposals) → premise (opposition + cited stats) → conclusion ("these changes will damage the local economy"). The pronoun "these changes" reaches back to the full proposal list.',
      core_move:
        'After you find the conclusion, ask "which words point at something earlier?" Replace them. Then read the conclusion back.',
      why_it_matters:
        'A common LSAC trap is an answer choice that captures one element from the antecedent but not all. Pronoun replacement blocks that.',
    },
    {
      kind: 'checkpoint',
      prompt: 'Why replace pronouns before saying the conclusion back?',
      options: [
        {
          id: 'A',
          text: 'It improves your reading speed.',
          correct: false,
          reveal: 'It does, marginally — but that is not why. The point is accuracy, not speed.',
        },
        {
          id: 'B',
          text: 'Without it, partial-list trap answers (one piece of the antecedent) will look right.',
          correct: true,
          reveal: 'Yes. Replacement makes the full antecedent visible so a partial paraphrase no longer matches.',
        },
        {
          id: 'C',
          text: 'It is required by the LSAT scoring system.',
          correct: false,
          reveal:
            'No — it is a habit, not a rule. The test does not score your method, only your answer.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.11'] = {
  number: '1.11',
  studentEyebrow: 'Lesson 11',
  title: 'The 2-Part Conclusion Check',
  hook:
    'Two questions. Every candidate has to pass both. If it does not, it is not your conclusion.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Run the 2-Part Conclusion Check on every candidate before committing.',
      body:
        'Part 1: does it sound like the author\'s opinion? Part 2: is it supported by at least one explicit claim in the stimulus? Both must be yes. The check is the one tool that does not lie.',
      primer: 'Author opinion + explicit support → conclusion.',
    },
    {
      kind: 'demo',
      title: 'Both gates have to open',
      body:
        'A premise can sound like an opinion. A statement can be supported by something earlier and still not be a conclusion (it can be intermediate). Only a sentence that passes both gates is the main conclusion.',
      exampleSegments: [
        {
          text: 'Candidate: "Vinyl albums sound warmer than digital."',
          role: 'background',
          whisper:
            'Part 1 — sounds like opinion. ✓. Part 2 — is it supported? Need to check the stimulus.',
        },
        {
          text: 'Stimulus support: "...vinyl recordings preserve the analog signal\'s harmonic decay, which gives the playback a perceptibly warmer tone..."',
          role: 'premise',
          whisper: 'Yes, supported. Both gates open → this is the conclusion.',
        },
        {
          text: 'Compare to a premise: "Sales of vinyl have risen for 15 consecutive years." — sounds factual, NOT opinion. Part 1 fails.',
          role: 'background',
          whisper: 'Part 1 fail → not a conclusion candidate.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — find the candidate that passes both parts',
      prompt:
        'Run the 2-Part Conclusion Check on each candidate.',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'Daily commute times in the metro area have increased by 18% since the 2019 transit redesign. Bus ridership has fallen by 23% in the same period. The redesign should be reversed. Many residents drive instead, citing unreliable bus arrivals.',
        candidates: [
          {
            id: 'c1',
            text: 'Daily commute times in the metro area have increased by 18% since the 2019 transit redesign.',
            is_main: false,
            rationale: 'Part 1 fail — this is a statistic, not opinion. Premise.',
          },
          {
            id: 'c2',
            text: 'Bus ridership has fallen by 23% in the same period.',
            is_main: false,
            rationale: 'Part 1 fail — another fact. Premise.',
          },
          {
            id: 'c3',
            text: 'The redesign should be reversed.',
            is_main: true,
            rationale:
              'Part 1 ✓ — sounds like author opinion ("should"). Part 2 ✓ — supported by the commute and ridership stats. Both gates open. Conclusion.',
          },
          {
            id: 'c4',
            text: 'Many residents drive instead, citing unreliable bus arrivals.',
            is_main: false,
            rationale:
              'Part 1 fail — descriptive of behavior, not opinion. And it appears AFTER the conclusion in the stimulus, providing additional context. Background or premise, not conclusion.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'Two gates, both must open',
      body:
        'Three of the four candidates failed Part 1 — they were facts, not opinions. The one that passed Part 1 also had support upstream. That is the conclusion. The 2-Part Check is brutal but reliable.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Premise (commute +18%) + premise (ridership -23%) → conclusion ("redesign should be reversed") → background (residents drive).',
      core_move:
        'For every candidate: Part 1 — opinion or fact? Part 2 — is anything in the stimulus aimed at it? Both yes → conclusion. Otherwise, not.',
      why_it_matters:
        'On hard items the conclusion is hidden, paraphrased, or sandwiched between traps. The 2-Part Check is the move that holds up.',
    },
    {
      kind: 'checkpoint',
      prompt: 'A candidate sentence sounds like author opinion but no other sentence in the stimulus supports it. What is it?',
      options: [
        {
          id: 'A',
          text: 'A conclusion — author opinions are conclusions.',
          correct: false,
          reveal: 'No. Part 2 of the check fails. Without support, it is unsupported assertion, not a conclusion.',
        },
        {
          id: 'B',
          text: 'Background — author commentary that the argument does not actually defend.',
          correct: true,
          reveal:
            'Yes. Author opinion without support is just framing or background. The real conclusion is the opinion that *is* supported.',
        },
        {
          id: 'C',
          text: 'A premise — premises can be opinions.',
          correct: false,
          reveal:
            'Premises are typically treated as factual. An unsupported opinion is rarely doing premise work in an LSAT stimulus.',
        },
      ],
    },
  ],
};

PHASED_LESSONS['1.12'] = {
  number: '1.12',
  studentEyebrow: 'Lesson 12',
  title: 'The trap landscape (preview)',
  hook:
    'The makers of the test have a finite playbook. Seven traits cover almost every wrong answer you will meet.',
  phases: [
    {
      kind: 'briefing',
      goal:
        'Recognize the seven trap traits at a glance so wrong answers stop sneaking past you.',
      body:
        'The seven: Too Strong, Out of Scope, Stay Narrow (too narrow), Reverse, Partial-List, Tense Shift, Wrong Direction (causal-flip). The deep dive lives in the Question Simulator. Today: a preview.',
      primer: 'Seven traits cover the playbook.',
    },
    {
      kind: 'demo',
      title: 'Three of the seven, in the wild',
      body:
        'Each wrong-answer pattern has a verbal fingerprint. Train your ear for the fingerprints; the wrong answers start lighting up.',
      exampleSegments: [
        {
          text: 'Conclusion (in stimulus): "The committee will likely recommend the proposal."',
          role: 'conclusion',
          whisper: 'A prediction with hedging ("likely"). Watch how wrong answers strip the hedging.',
        },
        {
          text: 'Wrong answer A (Too Strong): "The committee will recommend the proposal."',
          role: 'premise',
          whisper:
            'Removed "likely." Stronger than the stimulus. Too Strong is the most common trap on Main Conclusion items.',
        },
        {
          text: 'Wrong answer B (Reverse): "The proposal will recommend the committee\'s changes."',
          role: 'premise',
          whisper: 'Subject and object swapped. Reverse trap — looks similar, says the opposite.',
        },
      ],
    },
    {
      kind: 'attempt',
      title: 'Your turn — name the traps',
      prompt:
        'Below are answer choices for a Main Conclusion item whose conclusion is "The new fee may discourage some new applicants." Pick which choice is the right answer (the one that does not fall into any trap).',
      task: {
        kind: 'conclusion-pick',
        stimulus:
          'Stimulus conclusion: "The new fee may discourage some new applicants." Use this as the reference and pick the answer choice that paraphrases it without falling into a trap.',
        candidates: [
          {
            id: 'c1',
            text: 'The new fee will discourage all new applicants.',
            is_main: false,
            rationale:
              'Too Strong + Partial-List inversion. "May" became "will"; "some" became "all." Two traps stacked.',
          },
          {
            id: 'c2',
            text: 'The new fee may deter at least some prospective applicants from applying.',
            is_main: true,
            rationale:
              'Hedging ("may") preserved. "Some" preserved. Tense aligned. No trait fingerprint — this is the conclusion.',
          },
          {
            id: 'c3',
            text: 'The new fee discouraged some new applicants last year.',
            is_main: false,
            rationale:
              'Tense Shift. Stimulus is forward-looking ("may discourage"); this is past-tense ("discouraged last year"). Different claim.',
          },
          {
            id: 'c4',
            text: 'New applicants may discourage the new fee.',
            is_main: false,
            rationale:
              'Reverse / Wrong Direction. Subject and object swapped. Looks similar, means the opposite.',
          },
        ],
      },
    },
    {
      kind: 'reveal',
      title: 'You ran the trap filter',
      body:
        'Three of the four choices each carry a recognizable trap fingerprint. The right answer preserved everything the conclusion preserved — modal, quantifier, tense, direction. That is what a clean Main Conclusion answer looks like.',
    },
    {
      kind: 'coach',
      title: "Coach's note",
      structure_map:
        'Conclusion: "may discourage some new applicants." Modal: may. Quantifier: some. Tense: forward-looking. Direction: fee → applicants. Right answer preserves all four. Wrong answers each break one.',
      core_move:
        'Once you have the conclusion, list its modal / quantifier / tense / direction. Compare each answer choice against the list. Any mismatch → trap.',
      why_it_matters:
        'On hard Main Conclusion items, two or three answer choices look defensibly close. The trap filter is what separates them. The Question Simulator drills this with all seven traits.',
    },
    {
      kind: 'checkpoint',
      prompt: 'Stimulus says "may discourage some applicants." An answer says "will discourage all applicants." Which trap is this?',
      options: [
        {
          id: 'A',
          text: 'Tense Shift.',
          correct: false,
          reveal:
            'Tense is the same (both future). The shift is in modal strength and quantifier.',
        },
        {
          id: 'B',
          text: 'Too Strong (modal escalated, quantifier escalated).',
          correct: true,
          reveal:
            'Yes. "May" → "will" and "some" → "all" both escalate. The Too Strong trait covers both moves.',
        },
        {
          id: 'C',
          text: 'Wrong Direction.',
          correct: false,
          reveal:
            'Direction (fee → applicants) is preserved. The trap is strength, not direction.',
        },
      ],
    },
  ],
};

export function getPhasedLesson(number: string): PhasedLesson | null {
  return PHASED_LESSONS[number] ?? null;
}

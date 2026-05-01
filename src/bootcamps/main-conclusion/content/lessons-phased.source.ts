/**
 * Phased lesson content — opt-in. Lessons listed here render the PhaseRunner
 * (briefing → demo → attempt → reveal → coach → checkpoint → next).
 * Lessons NOT in this map fall back to the legacy prose-block renderer.
 *
 * Add a new lesson by mapping its `number` (e.g. "1.2") to a PhasedLesson.
 *
 * Source-anchored to lessons.generated.json[1.1] (Monica claimed dinosaurs).
 */

export type Role = 'conclusion' | 'premise' | 'background';

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

export function getPhasedLesson(number: string): PhasedLesson | null {
  return PHASED_LESSONS[number] ?? null;
}

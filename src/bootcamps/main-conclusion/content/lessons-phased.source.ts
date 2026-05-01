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

export interface RoleLabelTask {
  /** Stimulus split into segments that the student labels. */
  segments: Array<{ id: string; text: string; correct: Role }>;
  /** Roles the student is allowed to pick from for this task. */
  allowedRoles: Role[];
  /** Per-segment teaching note shown after reveal. */
  rationale: Record<string, string>;
}

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
  task: RoleLabelTask;
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

export function getPhasedLesson(number: string): PhasedLesson | null {
  return PHASED_LESSONS[number] ?? null;
}

/**
 * Tool Lab content — student-facing tool cards. Tools are practiced, not listed.
 *
 * Each tool ships with: clean name, what it does, when to use it, what it
 * prevents, a mini try-it, and a reveal. Source IDs (NT-*) live in metadata
 * only — never visible to students.
 */

export type TryKind = 'pick' | 'tag-or-not';

export interface TryPickItem {
  kind: 'pick';
  /** The setup for the try-it. */
  prompt: string;
  /** Three or four short choices. */
  options: Array<{
    id: string;
    text: string;
    correct: boolean;
    /** What this answer reveals about the tool. */
    reveal: string;
  }>;
}

export interface TryTagOrNotItem {
  kind: 'tag-or-not';
  /** Sentence with a target word. The student decides if the tool applies. */
  sentence: string;
  /** The substring the student is asked about. */
  target: string;
  /** True if the tool applies to this target. */
  expected: boolean;
  /** Reveal copy on each branch. */
  reveal_yes: string;
  reveal_no: string;
}

export type TryIt = TryPickItem | TryTagOrNotItem;

export interface ToolCard {
  /** Stable slug for routing/anchoring. NEVER displayed to students. */
  slug: string;
  /** Internal source ID (NT-*). NEVER displayed to students. */
  internalId: string;
  /** Student-facing name. */
  name: string;
  /** One sentence, what the tool does. */
  what_it_does: string;
  /** One sentence, when to reach for it. */
  when_to_use: string;
  /** One sentence, the mistake it prevents. */
  prevents: string;
  /** Optional micro-example shown in the demo strip. */
  example?: string;
  try_it: TryIt;
}

export const TOOL_LAB: ToolCard[] = [
  {
    slug: 'fabs',
    internalId: 'NT-FABS',
    name: 'FABS',
    what_it_does:
      'Marks four words that signal a premise: For, After all, Because, Since. What follows them is support — and the conclusion is right next door.',
    when_to_use:
      'When you are scanning a stimulus and need to lock onto evidence quickly so you can spot the conclusion next to it.',
    prevents:
      'Stops you from mistaking a piece of evidence for the conclusion just because it appears late in the stimulus.',
    example: '"…the bridge should be built, since traffic data shows a 40% increase…"',
    try_it: {
      kind: 'tag-or-not',
      sentence:
        'The university\'s graduation rate has improved, since the new advising program has reduced course-failure rates by 30%.',
      target: 'since',
      expected: true,
      reveal_yes:
        'Yes. "Since" is in FABS — premise indicator. The clause after it ("the new advising program has reduced course-failure rates by 30%") is support. The conclusion ("graduation rate has improved") is right next door.',
      reveal_no:
        'It is. "Since" is one of the four FABS words (For, After all, Because, Since). The clause after it is support.',
    },
  },
  {
    slug: '2-part-check',
    internalId: 'NT-2-Part-Conclusion-Check',
    name: '2-Part Conclusion Check',
    what_it_does:
      'Two questions every conclusion candidate has to pass: (1) does it sound like the author\'s opinion? (2) is it supported by at least one explicit claim in the stimulus?',
    when_to_use:
      'Always. Before you commit to a candidate, run both checks. Both must be yes.',
    prevents:
      'Stops you from picking unsupported assertions and intermediate conclusions that look like the main conclusion.',
    try_it: {
      kind: 'pick',
      prompt:
        'A candidate sentence sounds like author opinion but no other sentence in the stimulus supports it. What is it?',
      options: [
        {
          id: 'A',
          text: 'A conclusion — author opinions are conclusions.',
          correct: false,
          reveal: 'Part 2 fails. Without support upstream, it is unsupported assertion, not a conclusion.',
        },
        {
          id: 'B',
          text: 'Background — opinion-style framing the author does not actually defend.',
          correct: true,
          reveal:
            'Yes. Both gates have to open. Author opinion + zero support = framing, not conclusion.',
        },
        {
          id: 'C',
          text: 'A premise — premises can be opinions.',
          correct: false,
          reveal: 'Premises are typically treated as factual. An unsupported opinion is rarely doing premise work.',
        },
      ],
    },
  },
  {
    slug: 'upside-down-argument',
    internalId: 'NT-Upside-Down-Argument',
    name: 'Upside Down Argument',
    what_it_does:
      'Names the LSAT pattern of putting the conclusion *before* its support — opposite of how school taught you. In >90% of Main Conclusion items, the conclusion is not the final claim.',
    when_to_use:
      'On every Main Conclusion item, before you start hunting at the end of the stimulus.',
    prevents: 'The Last Claim Trap — picking the final sentence because it sounds verdict-y.',
    try_it: {
      kind: 'pick',
      prompt: 'When does the conclusion appear at the END of a Main Conclusion stimulus?',
      options: [
        {
          id: 'A',
          text: 'Always — the conclusion is always last.',
          correct: false,
          reveal: 'Less than 10% of the time on this question type. School-trained instinct does not transfer.',
        },
        {
          id: 'B',
          text: 'Sometimes, when an opposing-view opener and pivot push the author\'s claim to the end.',
          correct: true,
          reveal:
            'Yes. Stash 2 (rebuttal-style). The conclusion is last only because the pivot framing put it there — not by default.',
        },
        {
          id: 'C',
          text: 'Never on the LSAT.',
          correct: false,
          reveal: 'It happens — just rarely, and never by default. Pattern dictates position.',
        },
      ],
    },
  },
  {
    slug: 'trojan-horse',
    internalId: 'NT-Trojan-Horse-Concession',
    name: 'Trojan Horse Concession',
    what_it_does:
      'Names the trap where a concession ("granted / although / while / despite") sounds like agreement but is actually wind-up before the author swings.',
    when_to_use:
      'When you see a concession word at the start of a clause — read past it for the swing.',
    prevents: 'Locking onto the concession as the author\'s position when it is the opposite.',
    try_it: {
      kind: 'tag-or-not',
      sentence:
        'Although the new tax has raised consumer prices in the short term, revenue has funded school improvements that will benefit students for the next decade. The tax was the right call.',
      target: 'Although the new tax has raised consumer prices in the short term',
      expected: true,
      reveal_yes:
        'Yes. The "Although..." clause is the wind-up. The author concedes the cost, then swings to "The tax was the right call." The concession is not the author\'s position.',
      reveal_no:
        'Look again — "Although" signals concession. The clause is wind-up; the author\'s claim arrives after it.',
    },
  },
  {
    slug: 'pre-phrase',
    internalId: 'NT-Pre-Phrase-Goal',
    name: 'Pre-Phrase: Replace the Pronouns',
    what_it_does:
      'Forces you to replace "this," "that," "such," and "they" with their actual antecedents before saying the conclusion back to yourself.',
    when_to_use:
      'After you find the conclusion, before you compare it to the answer choices.',
    prevents:
      'Partial-list trap answers — choices that capture one piece of the antecedent but not all of it.',
    try_it: {
      kind: 'pick',
      prompt:
        'Conclusion as written: "These changes will damage the local economy." The prior sentence lists "banning short-term rentals, raising the hotel tax, and limiting permits." What does the right answer choice look like after pronoun replacement?',
      options: [
        {
          id: 'A',
          text: 'These changes will damage the local economy.',
          correct: false,
          reveal: 'Verbatim — pronoun still in. Not what an answer choice will look like.',
        },
        {
          id: 'B',
          text: 'Banning short-term rentals will damage the local economy.',
          correct: false,
          reveal: 'Partial list. Only one of the three changes — wrong-answer trap.',
        },
        {
          id: 'C',
          text: 'Banning short-term rentals, raising the hotel tax, and limiting permits will damage the local economy.',
          correct: true,
          reveal: 'Yes. Pronoun fully replaced with the entire antecedent.',
        },
      ],
    },
  },
  {
    slug: 'opposing-view-filter',
    internalId: 'NT-Stegosaurus-Interrogation',
    name: 'Opposing View Filter',
    what_it_does:
      'Catches sentences attributed to other people ("some say," "critics argue," "opponents claim") and labels them so you do not mistake them for the author\'s position.',
    when_to_use:
      'On every stimulus, especially when the opener is an attribution. Expect a pivot and the author\'s claim to follow.',
    prevents:
      'Mistaking someone else\'s view for the author\'s conclusion — the most common Stash 2 trap.',
    try_it: {
      kind: 'pick',
      prompt:
        '"Many economists argue the trade deal will reduce manufacturing jobs. However, output in the targeted sectors has risen 8%, and reported layoffs are below the prior-year average. The trade deal is working." What is the author\'s conclusion?',
      options: [
        {
          id: 'A',
          text: 'The trade deal will reduce manufacturing jobs.',
          correct: false,
          reveal: 'That is the opposing view. "Many economists argue" attributes it to others — the author is about to push back.',
        },
        {
          id: 'B',
          text: 'Output in the targeted sectors has risen 8%.',
          correct: false,
          reveal: 'A premise. The author is using it as support.',
        },
        {
          id: 'C',
          text: 'The trade deal is working.',
          correct: true,
          reveal:
            'Yes. After the pivot ("However") + supporting evidence, the author lands here. This is the author\'s claim.',
        },
      ],
    },
  },
  {
    slug: 'x-ray-scan',
    internalId: 'NT-X-Ray-Scan',
    name: 'X-Ray Scan',
    what_it_does:
      'Reveals the structure of a stimulus by painting roles in color: conclusion, premise, opposing view, concession, background.',
    when_to_use:
      'After your own attempt — never as a substitute for it. Use the X-Ray to verify your read, not to replace it.',
    prevents:
      'Rushing past structural cues that the role colors would have surfaced.',
    try_it: {
      kind: 'pick',
      prompt:
        'When should you turn on the X-Ray Scan during practice?',
      options: [
        {
          id: 'A',
          text: 'Before you read the stimulus, so the colors guide you.',
          correct: false,
          reveal: 'That short-circuits the training. The point is to make the read first and verify after.',
        },
        {
          id: 'B',
          text: 'After your own attempt at labeling roles, to check the structure.',
          correct: true,
          reveal:
            'Yes. Attempt → X-Ray → calibrate. The reveal is teaching, not a shortcut.',
        },
        {
          id: 'C',
          text: 'Only on questions you are timing yourself on.',
          correct: false,
          reveal:
            'Timed practice and X-Ray verification serve different purposes. Use the X-Ray during untimed review.',
        },
      ],
    },
  },
  {
    slug: 'trap-master',
    internalId: 'NT-Trap-Master',
    name: 'Trap Master',
    what_it_does:
      'A diagnostic system that tags every wrong answer in the Simulator with one of seven recurring trap traits (Too Strong, Out of Scope, Stay Narrow, Reverse, Partial-List, Tense Shift, Wrong Direction).',
    when_to_use:
      'In the Question Simulator, on every miss. The trap trait is the diagnostic — not the wrong answer itself.',
    prevents:
      'Treating each wrong answer as a one-off. Trait tagging surfaces patterns: "I keep falling for Too Strong on causal stimuli."',
    try_it: {
      kind: 'pick',
      prompt:
        'Stimulus says "may discourage some applicants." Answer says "will discourage all applicants." Which trap is this?',
      options: [
        {
          id: 'A',
          text: 'Tense Shift.',
          correct: false,
          reveal: 'Tense is preserved (both future). The shift is in modal strength and quantifier.',
        },
        {
          id: 'B',
          text: 'Too Strong.',
          correct: true,
          reveal: 'Yes. "May" → "will" and "some" → "all" both escalate. Too Strong covers both.',
        },
        {
          id: 'C',
          text: 'Wrong Direction.',
          correct: false,
          reveal: 'Direction is preserved. The trap is strength, not direction.',
        },
      ],
    },
  },
];

export function getTool(slug: string): ToolCard | null {
  return TOOL_LAB.find((t) => t.slug === slug) ?? null;
}

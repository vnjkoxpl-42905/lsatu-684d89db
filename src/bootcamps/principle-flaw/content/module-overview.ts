// Internal study walkthrough used by Overview (Start Here) and the Profile downloads.
// Mirrors the source pack's video-overview guidance. No LSAC text. No external links.

export interface ModuleConfig {
  moduleOverviewVideoUrl?: string;
}

export const moduleConfig: ModuleConfig = {
  // Set this to a hosted video URL later if you want a Module Overview video to surface
  // inside Start Here. Leave undefined to keep the text overview only.
  moduleOverviewVideoUrl: undefined,
};

export interface OverviewSection {
  heading: string;
  body: string[];
}

export const moduleOverviewSections: OverviewSection[] = [
  {
    heading: "What this module is",
    body: [
      "A two-week study portal for three Logical Reasoning question families: Flaw, Principle (Strengthen, Conform, Application), and Parallel Flaw.",
      "You open your PrepTest PDFs separately. The app handles the path: what to read, what to do, what to review, and what to write down.",
    ],
  },
  {
    heading: "The student goal",
    body: [
      "Move from \"this looks bad\" to diagnosing what went wrong, in plain English.",
      "By Day 14, you should be able to name the flaw style of any answer choice from its language alone, map any principle stimulus to the four-pillar frame, and run the 4-step method without thinking about the steps.",
    ],
  },
  {
    heading: "Why the plan alternates Flaw and Principle",
    body: [
      "Flaw teaches you to diagnose what is broken in an argument.",
      "Principle teaches you to apply, match, or supply rules. They use overlapping skills, so practicing them in alternation reinforces both at once and surfaces blind spots faster.",
    ],
  },
  {
    heading: "How to use the app each day",
    body: [
      "Open Today: it shows the day's plan in five steps — Open, Read, Do, Review, Write.",
      "Read: the relevant Learn section.",
      "Do: the Practice set referenced. Open your PT alongside the app, run the 4-step method on every question, predict before you check.",
      "Review: every miss gets a Review Log entry using the template.",
      "Write: a one-sentence \"next time I'll notice\" that you'll actually act on.",
    ],
  },
  {
    heading: "How to use the Practice sets",
    body: [
      "The app shows PT, Section, and Question. You read the actual stimulus from your PrepTest.",
      "Mark each question Correct or Review. Mark Redo on anything you want to come back to in 24 hours.",
      "Use the Review Log button on a missed question to log it without retyping the reference.",
    ],
  },
  {
    heading: "How to use the Review Log",
    body: [
      "Use the type-specific template. For Flaw: Conclusion, Evidence, Assumption, Plain-English Flaw. For Principle: Rule, Trigger, Application, Outcome.",
      "Always add a one-sentence \"why my answer was tempting\" and a one-sentence \"next time I notice ___\".",
      "Mark Redo if you'd miss it again tomorrow.",
    ],
  },
  {
    heading: "How to use the flashcards",
    body: [
      "Active recall, not recognition. Read the front; say the answer aloud before flipping.",
      "Press Got it (1) only when you said the full answer. Press Review again (2) otherwise.",
      "The deck reorders so cards you graded Review again resurface sooner. There is no streak game; consistency is the win.",
    ],
  },
  {
    heading: "The 24-hour redo rule",
    body: [
      "Wait at least 24 hours before redoing a missed question. Doing it immediately tests memory, not logic.",
      "When you redo, work the question cold and write the review template fresh. If you'd still miss it, keep it in the queue.",
    ],
  },
  {
    heading: "Why review beats volume",
    body: [
      "Forty questions worked carelessly teach you nothing. Five questions reviewed with the template build pattern recognition that compounds.",
      "If you have one hour, spend half on questions and half on review. If you only have thirty minutes, review beats new questions every time.",
    ],
  },
  {
    heading: "Final daily checklist",
    body: [
      "1. Today plan opened.",
      "2. Notes for the day's focus read.",
      "3. Practice set worked from PT, with predictions before checking.",
      "4. Every miss logged in the Review Log with the template.",
      "5. Anything still shaky added to the Redo queue.",
      "6. Five to ten flashcards reviewed before closing the app.",
    ],
  },
];

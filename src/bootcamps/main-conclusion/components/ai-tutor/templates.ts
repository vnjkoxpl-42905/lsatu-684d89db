/**
 * AI Tutor templates — v1 is template-routed, NOT LLM-backed.
 * Each surface registers a list of suggested questions and pre-authored answers.
 * Stub fallback when no template matches: "Try one of these instead" with chips.
 *
 * Voice: Register 1 (procedural). LLM swap point lives in src/lib/ai-templates/tutor.ts at v1.5.
 */

export interface TutorTemplate {
  q: string;
  a: string; // pre-authored answer; voice locked to Register 1
}

export interface SurfaceTemplates {
  surface_id: string; // matches lesson/drill/reference id
  questions: TutorTemplate[];
}

export const TUTOR_REGISTRY: SurfaceTemplates[] = [
  {
    surface_id: 'MC-LSN-1.1',
    questions: [
      {
        q: 'What is a main conclusion?',
        a: 'The author’s load-bearing claim. Two tests: (1) Does it sound like the author’s opinion? (2) Is it supported by at least one explicit claim in the stimulus? Both must be yes.',
      },
      {
        q: 'How is this different from school definitions?',
        a: 'School often teaches the conclusion goes last. The LSAT inverts that — in over 90% of Main Conclusion questions, the conclusion is NOT the final claim. Treat the Upside-Down Argument as the rule.',
      },
    ],
  },
  {
    surface_id: 'MC-DRL-3.4',
    questions: [
      {
        q: 'Why does this drill gate the Simulator?',
        a: 'Drills 3.1–3.3 train the parts (indicators, sentence-picking, first-sentence reading). Drill 3.4 trains the integration: family recognition. The Simulator only trains well after that integration locks. Hence the architectural gate.',
      },
      {
        q: 'What if I keep failing Stage 1?',
        a: 'Re-read MC-REF-2.D (Stimulus Tendencies) and MC-REF-2.F (Rebuttal Structure). Then run Drill 3.3 (First-Sentence Reading) until Stage 1 there is a clean pass. Drill 3.4 builds on it.',
      },
    ],
  },
  {
    surface_id: 'MC-DRL-3.6',
    questions: [
      {
        q: 'Why whimsical premises?',
        a: 'Real-world premises let you cheat — your prior knowledge fills the gap and you don’t notice the inference. Whimsical premises (dragons, brooms) strip prior knowledge. You can only conclude what the premises license.',
      },
      {
        q: 'What does "Misses the premises entirely" mean?',
        a: 'Your conclusion uses concepts not in the premises. The keyword-overlap evaluator caught it — fewer than 30% of your tokens matched the premise tokens. Restate the premises before drawing the conclusion.',
      },
    ],
  },
  {
    surface_id: 'MC-SIM-Q1',
    questions: [
      {
        q: 'Why is the answer the first sentence?',
        a: 'The vision-test stimulus is canonical First-sentence family. The author states the recommendation immediately, then supports it with three claims about night vision and accident statistics. Family recognition gives you the answer before you read the choices.',
      },
    ],
  },
];

export function findTemplates(surfaceId: string | null | undefined): TutorTemplate[] {
  if (!surfaceId) return [];
  return TUTOR_REGISTRY.find((s) => s.surface_id === surfaceId)?.questions ?? [];
}

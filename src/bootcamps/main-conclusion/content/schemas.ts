/**
 * Zod schemas for every generated content kind.
 * Per architecture-plan.md §4 + JOSHUA DIRECTIVE 2026-04-30 (Rec #2 scope split):
 *   Pipeline GENERATES: named-tools, references, indicator-vault, simulator, traps, manifest.
 *   Pipeline DOES NOT generate: lessons (hand-authored). Pipeline parity-verifies them.
 */

import { z } from 'zod';

// ─── Named tools (15 per rules/named_tools_lexicon.md) ──────────────────────
export const NamedToolEntry = z.object({
  id: z.string().regex(/^NT-/),
  name: z.string(),
  what: z.string(),
  where: z.array(z.string()),
  source: z.string(),
});
export type NamedToolEntryT = z.infer<typeof NamedToolEntry>;
export const NamedToolList = z.array(NamedToolEntry);

// ─── Indicator vault (6 categories) ─────────────────────────────────────────
export const IndicatorCategory = z.object({
  id: z.string().regex(/^IND-/),
  name: z.string(),
  color_token: z.string(), // e.g. '--role-conclusion'
  description: z.string(),
  words: z.array(z.string()).min(1),
  example: z.string(),
});
export type IndicatorCategoryT = z.infer<typeof IndicatorCategory>;
export const IndicatorVault = z.array(IndicatorCategory);

// ─── Trap traits (7 per spec §4.3) ──────────────────────────────────────────
export const TrapTraitId = z.enum(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']);
export const TrapTrait = z.object({
  id: TrapTraitId,
  name: z.string(),
  what: z.string(),
  why_trap: z.string(),
  fingerprint: z.string(),
  defense: z.string(),
  pt_example_label: z.string().optional(),
  source: z.string(),
});
export type TrapTraitT = z.infer<typeof TrapTrait>;
export const TrapTraitList = z.array(TrapTrait).length(7);

// ─── References (M2 sections) ───────────────────────────────────────────────
export const ReferenceBlock = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('p'), text: z.string() }),
  z.object({ kind: z.literal('h2'), text: z.string() }),
  z.object({ kind: z.literal('callout'), label: z.string(), body: z.string() }),
  z.object({ kind: z.literal('list'), ordered: z.boolean().optional(), items: z.array(z.string()) }),
  z.object({ kind: z.literal('example'), label: z.string(), body: z.string() }),
  z.object({
    kind: z.literal('table'),
    columns: z.array(z.string()),
    rows: z.array(z.array(z.string())),
  }),
]);
export type ReferenceBlockT = z.infer<typeof ReferenceBlock>;

export const ReferenceSection = z.object({
  id: z.string().regex(/^MC-REF-/),
  title: z.string(),
  route: z.string(),
  voice_register: z.union([z.literal(1), z.literal(2), z.literal('mixed')]),
  source: z.string(),
  status: z.enum(['placeholder', 'authored']),
  hook: z.string().optional(),
  blocks: z.array(ReferenceBlock).optional(),
});
export type ReferenceSectionT = z.infer<typeof ReferenceSection>;
export const ReferenceList = z.array(ReferenceSection);

// ─── Simulator (canonical 20) ───────────────────────────────────────────────
export const SimulatorQuestion = z.object({
  id: z.string().regex(/^MC-SIM-Q\d+$/),
  number: z.number().int().min(1).max(20),
  title: z.string(),
  structure_family: z.enum(['First-sentence', 'Rebuttal']),
  stimulus: z.string().optional(), // populated when MCFIRST OCR completes; undefined for now
  main_conclusion: z.string().optional(),
  why: z.string().optional(),
  structure_map: z.string().optional(),
  follow_up_answer: z.string().optional(),
  source_anchor: z.object({
    primary: z.string(),
    secondary: z.string(),
    tertiary: z.string(),
    spec_ref: z.string(),
  }),
  ocr_status: z.enum(['captured', 'pending']),
});
export type SimulatorQuestionT = z.infer<typeof SimulatorQuestion>;
export const SimulatorBank = z.array(SimulatorQuestion).length(20);

// ─── Manifest ───────────────────────────────────────────────────────────────
export const ManifestEntry = z.object({
  id: z.string(),
  kind: z.enum(['named-tool', 'indicator', 'trap', 'reference', 'simulator-question', 'lesson', 'calibration', 'voice-passage', 'worked-example']),
  source_paths: z.array(z.string()),
  source_hashes: z.record(z.string(), z.string()),
  importer_version: z.string(),
  generated_at: z.string(),
  output_path: z.string(),
  parity_status: z.enum(['imported', 'parity-verified', 'pending']),
});
export type ManifestEntryT = z.infer<typeof ManifestEntry>;
export const Manifest = z.object({
  generator_version: z.string(),
  generated_at: z.string(),
  entries: z.array(ManifestEntry),
  parity_check_summary: z.object({
    lessons_verified: z.number().int().min(0),
    verbatim_assets_verified: z.number().int().min(0),
    drift_warnings: z.array(z.string()),
  }),
});

// ─── Lesson (NOT generated; parity-verified only) ───────────────────────────
// Schema lives here so the parity-verifier can validate hand-authored lessons.
export const ProseBlock = z.union([
  z.object({ kind: z.literal('p'), text: z.string() }),
  z.object({ kind: z.literal('callout'), label: z.string(), body: z.string() }),
  z.object({ kind: z.literal('example'), tag: z.string(), body: z.string() }),
  z.object({ kind: z.literal('visual-spec'), component: z.string(), caption: z.string() }),
]);
export const Lesson = z.object({
  id: z.string().regex(/^MC-LSN-/),
  number: z.string(),
  title: z.string(),
  hook: z.string(),
  prose_blocks: z.array(ProseBlock),
  named_tool_callouts: z.array(z.object({ tool_id: z.string().regex(/^NT-/), appears_in_paragraph: z.number().int() })),
  reference_callouts: z.array(z.object({ reference_id: z.string().regex(/^MC-REF-/), label: z.string() })),
  checkpoint: z.object({
    prompt: z.string(),
    options: z.array(z.object({
      id: z.string(),
      text: z.string(),
      correct: z.boolean(),
      reveal: z.string(),
    })).min(2),
  }),
  sources: z.array(z.string()).min(1),
});
export const LessonList = z.array(Lesson);

// ─── Calibration item (parity-verified only) ────────────────────────────────
export const CalibrationItem = z.object({
  id: z.string().regex(/^MC-CAL-/),
  calibration_only: z.literal(true),
  calibration_module: z.enum(['M1', 'M5']),
  trait_target: z.string(),
  source_anchor: z.record(z.unknown()),
}).passthrough();

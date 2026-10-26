import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Authored LSAT Lab explanations, read from the `lr_*` tables.
 *
 * These are transcribed verbatim from the source and verified against LSAT
 * Lab's own API (see `ai-os/wiki/explanations/COVERAGE-AUDIT.md`). Nothing here
 * is generated: if a field is null the source did not provide it, and the UI
 * must render that absence honestly rather than filling it in.
 *
 * Coverage is deliberately partial. Roughly 350 of the ~3,770 ingested
 * questions have no authored prose at all — LSAT Lab published only a video
 * for them. `hasAuthored` is the flag callers should branch on. It is computed
 * by `hasAuthoredProse`, the same predicate `scripts/missing-explanations-census.mjs`
 * uses; `src/lib/explanationProse.fixtures.test.ts` holds both to one fixture set.
 */

export type LrStyleKey = 'single' | 'standard' | 'brief' | 'another_way';

export const LR_STYLE_LABELS: Record<LrStyleKey, string> = {
  single: 'Explanation',
  standard: 'Standard',
  brief: 'Brief',
  another_way: 'Another Way',
};

/** Display order for the style selector; mirrors LSAT Lab's own ordering. */
const STYLE_ORDER: LrStyleKey[] = ['standard', 'brief', 'another_way', 'single'];

export interface LrChoice {
  letter: string;
  text: string;
  /** Wrong-answer type, e.g. "Out of Scope". Null when the source had none. */
  tag: string | null;
  /** Percent of students who picked this choice. Null when not published. */
  studentPercent: number | null;
  isCorrect: boolean;
}

export interface LrStep {
  position: number;
  label: string;
  body: string;
}

export interface LrStyle {
  style: LrStyleKey;
  label: string;
  /** Ordered argument-breakdown steps. Empty when the source had none. */
  steps: LrStep[];
  /** Per-choice prose, keyed by letter. A letter may legitimately be absent. */
  notesByLetter: Record<string, string>;
}

export interface LrExplanationData {
  questionId: string;
  preptest: number;
  section: number;
  questionNumber: number;
  questionType: string;
  correctChoice: string | null;
  choices: LrChoice[];
  styles: LrStyle[];
  /**
   * True when at least one style carries real prose — a breakdown step or a
   * per-choice note. Tags and percentages alone do not count: a question can
   * have every choice tagged and still have no authored explanation.
   */
  hasAuthored: boolean;
}

/** The shape both runtimes' predicate reads: a list of styles, each with step and note bodies. */
export interface ProseStyle {
  steps?: Array<{ body?: string | null }> | null;
  notes?: Array<{ body?: string | null }> | null;
}

function isProse(body: unknown): boolean {
  return typeof body === 'string' && body.trim().length > 0;
}

/**
 * True when at least one style carries real prose: a breakdown step or a
 * per-choice note whose body is non-empty after trim(). Tags and percentages
 * never count. Mirrors `scripts/explanation-prose.mjs` exactly.
 */
export function hasAuthoredProse(styles: ProseStyle[] | null | undefined): boolean {
  if (!Array.isArray(styles)) return false;
  return styles.some(
    (style) =>
      (style?.steps ?? []).some((row) => isProse(row?.body)) ||
      (style?.notes ?? []).some((row) => isProse(row?.body)),
  );
}

/**
 * Which steps to show for the active style. Where a non-Standard style carries
 * no steps, the source said "(same as Standard)" and did not repeat the text.
 * The ingest stored zero step rows for that style rather than the literal
 * phrase (checked 2026-09-12: `fetchLrExplanation` only ever builds steps from
 * `lr_explanation_steps` rows). Rendering nothing would misrepresent that, so
 * Standard's breakdown is borrowed and labelled. The absence only ever means
 * "identical to Standard", never "none exists".
 */
export function resolveBreakdownSteps(
  data: LrExplanationData | null | undefined,
  activeStyle: LrStyleKey | null,
): { current: LrStyle | undefined; steps: LrStep[]; borrowsStandard: boolean } {
  const styles = data?.styles ?? [];
  const current = styles.find((s) => s.style === activeStyle) ?? styles[0];
  const standardSteps = styles.find((s) => s.style === 'standard')?.steps ?? [];
  const borrowsStandard =
    current != null &&
    current.style !== 'standard' &&
    current.steps.length === 0 &&
    standardSteps.length > 0;
  return { current, steps: borrowsStandard ? standardSteps : current?.steps ?? [], borrowsStandard };
}

export interface LrExplanationQuery {
  pt?: number | null;
  section?: number | null;
  questionNumber?: number | null;
}

function toStyleKey(value: string): LrStyleKey {
  return (STYLE_ORDER as string[]).includes(value) ? (value as LrStyleKey) : 'single';
}

export async function fetchLrExplanation({
  pt,
  section,
  questionNumber,
}: LrExplanationQuery): Promise<LrExplanationData | null> {
  if (pt == null || section == null || questionNumber == null) return null;

  const { data: question, error: qErr } = await supabase
    .from('lr_questions')
    .select('id, preptest, section, question_number, question_type, correct_choice')
    .eq('preptest', pt)
    .eq('section', section)
    .eq('question_number', questionNumber)
    .maybeSingle();

  if (qErr) throw qErr;
  if (!question) return null;

  const [choicesRes, explRes] = await Promise.all([
    supabase
      .from('lr_answer_choices')
      .select('letter, choice_text, tag, student_percent, is_correct')
      .eq('question_id', question.id)
      .order('letter'),
    supabase
      .from('lr_explanations')
      .select('id, style')
      .eq('question_id', question.id),
  ]);

  if (choicesRes.error) throw choicesRes.error;
  if (explRes.error) throw explRes.error;

  const explanationRows = explRes.data ?? [];
  const explanationIds = explanationRows.map((row) => row.id);

  // Steps and notes are fetched for every style at once, then grouped, so the
  // style selector switches without another round trip.
  const [stepsRes, notesRes] = explanationIds.length
    ? await Promise.all([
        supabase
          .from('lr_explanation_steps')
          .select('explanation_id, position, label, body')
          .in('explanation_id', explanationIds)
          .order('position'),
        supabase
          .from('lr_explanation_choice_notes')
          .select('explanation_id, letter, body')
          .in('explanation_id', explanationIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (stepsRes.error) throw stepsRes.error;
  if (notesRes.error) throw notesRes.error;

  const styles: LrStyle[] = explanationRows
    .map((row) => {
      const key = toStyleKey(row.style);
      const steps = (stepsRes.data ?? [])
        .filter((s) => s.explanation_id === row.id)
        .map((s) => ({ position: s.position, label: s.label, body: s.body }))
        .sort((a, b) => a.position - b.position);
      const notesByLetter: Record<string, string> = {};
      for (const note of notesRes.data ?? []) {
        if (note.explanation_id === row.id) notesByLetter[note.letter] = note.body;
      }
      return { style: key, label: LR_STYLE_LABELS[key], steps, notesByLetter };
    })
    .sort((a, b) => STYLE_ORDER.indexOf(a.style) - STYLE_ORDER.indexOf(b.style));

  const choices: LrChoice[] = (choicesRes.data ?? []).map((c) => ({
    letter: c.letter,
    text: c.choice_text,
    tag: c.tag,
    studentPercent: c.student_percent,
    isCorrect: c.is_correct,
  }));

  const hasAuthored = hasAuthoredProse(
    styles.map((s) => ({
      steps: s.steps,
      notes: Object.values(s.notesByLetter).map((body) => ({ body })),
    })),
  );

  return {
    questionId: question.id,
    preptest: question.preptest,
    section: question.section,
    questionNumber: question.question_number,
    questionType: question.question_type,
    correctChoice: question.correct_choice,
    choices,
    styles,
    hasAuthored,
  };
}

export function useLrExplanation(query: LrExplanationQuery, enabled = true) {
  const { pt, section, questionNumber } = query;
  return useQuery({
    queryKey: ['lr-explanation', pt, section, questionNumber],
    queryFn: () => fetchLrExplanation(query),
    enabled: enabled && pt != null && section != null && questionNumber != null,
    staleTime: Infinity, // authored content is immutable between ingests
  });
}

// Shared types + pure logic for the post-session intelligence learning bundle
// (Phase 2/3). The bundle is stored in `ai_ta_drafts.draft_json` for a row of
// `draft_type='classroom_update_bundle'`.
//
// Per build-spec §5: per-part approval lives in draft_json; the row's coarse
// `status` only rolls up to 'approved' when every INCLUDED part is approved.
// Never mark the row approved on a single-part approval.

export type PartKey =
  | 'session_note'
  | 'homework'
  | 'quiz'
  | 'weakness_tags'
  | 'drill_recs'
  | 'next_agenda'
  | 'private_note';

export const STUDENT_PART_KEYS: PartKey[] = ['session_note', 'homework', 'quiz'];
export const ADMIN_PART_KEYS: PartKey[] = ['weakness_tags', 'drill_recs', 'next_agenda', 'private_note'];

export const PART_LABELS: Record<PartKey, string> = {
  session_note: 'Session note',
  homework: 'Homework checklist',
  quiz: 'Quiz / mini-drill',
  weakness_tags: 'Weakness tags',
  drill_recs: 'Drill recommendations',
  next_agenda: 'Next-session agenda',
  private_note: 'Private tutor note',
};

export interface QuizItem {
  prompt: string;
  answer: string;
  why?: string;
}

export interface DrillRec {
  skill: string;
  reason?: string;
}

export interface BundlePart {
  include: boolean;
  approved: boolean;
  posted: boolean;
  audience: 'student' | 'admin';
  title?: string;
  body_markdown?: string;
  items?: string[] | QuizItem[];
  tags?: string[];
  /** Set by the publish step once this part is materialized to Classroom. */
  classroom_item_id?: string;
}

export interface SessionBundle {
  version: number;
  source: {
    ledger_id?: string | null;
    session_id?: string | null;
    transcript_context_id?: string | null;
    doc_name?: string | null;
    model?: string;
    truncated?: boolean;
    synthesized_at?: string;
  };
  parts: Partial<Record<PartKey, BundlePart>>;
}

/** A draft_json object is a session bundle if it carries a parts map. */
export function isSessionBundle(json: unknown): json is SessionBundle {
  return !!json && typeof json === 'object' && 'parts' in (json as Record<string, unknown>);
}

/** Parts that are included and meant for the student (publishable). */
export function publishableParts(bundle: SessionBundle): PartKey[] {
  return STUDENT_PART_KEYS.filter((k) => bundle.parts[k]?.include);
}

/** Every included part, student + admin, in display order. */
export function includedParts(bundle: SessionBundle): PartKey[] {
  return [...STUDENT_PART_KEYS, ...ADMIN_PART_KEYS].filter((k) => bundle.parts[k]?.include);
}

/**
 * Row-status rollup (build-spec §5): the bundle is fully approved only when
 * every included part is approved. The private note is admin-only and never
 * blocks the rollup nor gets published, but it still counts once reviewed —
 * we treat it as auto-satisfied so it never blocks approval.
 */
export function allIncludedApproved(bundle: SessionBundle): boolean {
  const parts = includedParts(bundle).filter((k) => k !== 'private_note');
  if (parts.length === 0) return false;
  return parts.every((k) => bundle.parts[k]?.approved === true);
}

export function approvedPublishableParts(bundle: SessionBundle): PartKey[] {
  return publishableParts(bundle).filter((k) => bundle.parts[k]?.approved === true);
}

export function unpublishedApprovedParts(bundle: SessionBundle): PartKey[] {
  return approvedPublishableParts(bundle).filter((k) => bundle.parts[k]?.posted !== true);
}

/** Immutably patch one part. */
export function patchPart(
  bundle: SessionBundle,
  key: PartKey,
  patch: Partial<BundlePart>,
): SessionBundle {
  const current = bundle.parts[key];
  if (!current) return bundle;
  return { ...bundle, parts: { ...bundle.parts, [key]: { ...current, ...patch } } };
}

/** Render a student-facing part to markdown for materializing into Classroom. */
export function partToMarkdown(key: PartKey, part: BundlePart): string {
  if (part.body_markdown) return part.body_markdown.trim();
  if (key === 'homework' && Array.isArray(part.items)) {
    return (part.items as string[]).map((it) => `- [ ] ${it}`).join('\n');
  }
  if (key === 'quiz' && Array.isArray(part.items)) {
    return (part.items as QuizItem[])
      .map((q, i) => `**${i + 1}. ${q.prompt}**\n\n_Answer:_ ${q.answer}${q.why ? `\n\n${q.why}` : ''}`)
      .join('\n\n');
  }
  return '';
}

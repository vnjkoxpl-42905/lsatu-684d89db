import { supabase } from "@/integrations/supabase/client";
import type { AttemptRow, RecapRow } from "./attempts";
import { loadPassageProgress, type PassageProgressRow } from "./passageProgress";

export interface SelectionHistory { attempts: AttemptRow[]; recaps: RecapRow[]; passageProgress?: PassageProgressRow[] }
export type ParagraphCountsByVersion = Record<number, Partial<Record<1 | 2, number>>>;
export interface SelectionProgress {
  state: "ready" | "in_progress" | "completed";
  completedParagraphs: number;
  totalParagraphs: number | null;
  attempt: AttemptRow | null;
  startedAt: string | null;
  completedAt: string | null;
  hasPriorPractice: boolean;
}

/** Picker state covers all owner history, independently of the paged history panel. */
export async function loadSelectionProgress(studentId: string): Promise<SelectionHistory> {
  const readAll = async <T,>(name: string): Promise<T[]> => {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await (supabase as any).from(name).select("*")
        .eq("student_id", studentId).order("id").range(offset, offset + 999);
      if (error) throw error;
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) return rows;
    }
  };
  const [attempts, recaps, passageProgress] = await Promise.all([
    readAll<AttemptRow>("rc_recall_attempts"), readAll<RecapRow>("rc_recall_recaps"),
    loadPassageProgress(studentId),
  ]);
  return { attempts, recaps, passageProgress };
}

/** A reset's ended, incomplete attempt suppresses earlier active/completed state.
 * Saved history survives; only an explicit subsequent Start creates active state. */
export function getSelectionProgress(input: SelectionHistory & {
  passageIds: number[];
  paragraphCountsByVersion?: ParagraphCountsByVersion;
  /** Render a specific unfinished session rather than the newest picker state. */
  attemptId?: string;
}): SelectionProgress {
  const ids = [...new Set(input.passageIds)];
  const relevant = input.attempts.filter(a => ids.length > 0 && ids.every(id => a.passage_ids.includes(id)))
    .sort((a, b) => b.started_at.localeCompare(a.started_at) || b.id.localeCompare(a.id));
  const attempt = (input.attemptId ? relevant.find(a => a.id === input.attemptId) : relevant[0]) ?? null;
  const version = attempt?.segmentation_version ?? 2;
  const counts = ids.map(id => input.paragraphCountsByVersion?.[id]?.[attempt ? (attempt.segmentation_version ?? 1) : version]);
  const totalParagraphs = counts.every(n => Number.isInteger(n) && n! > 0) && ids.length > 0
    ? counts.reduce((sum, n) => sum + n!, 0) : null;
  const base = { completedParagraphs: 0, totalParagraphs, attempt, startedAt: null, completedAt: null, hasPriorPractice: relevant.length > 0 };
  if (!attempt || (attempt.finished_at && !attempt.completed)) return { ...base, state: "ready" };
  const saved = new Set<string>();
  for (const recap of input.recaps) {
    if (recap.attempt_id !== attempt.id || recap.student_id !== attempt.student_id || recap.kind !== "recall") continue;
    if (!(recap.recording_state === "saved" || (recap.voice === "silent" && recap.recording_state === "not_recorded"))) continue;
    const match = /^p([1-4])-para([1-9]\d*)-recall$/.exec(recap.recap_key);
    if (!match || Number(match[1]) !== recap.passage_position) continue;
    const passageId = attempt.passage_ids[recap.passage_position - 1];
    const count = input.paragraphCountsByVersion?.[passageId]?.[attempt.segmentation_version ?? 1];
    if (!ids.includes(passageId) || !count || Number(match[2]) > count) continue;
    saved.add(`${passageId}:${match[2]}`);
  }
  // A server-finalized successful attempt is authoritative, including legacy
  // attempts whose old recap rows are unavailable. Never infer it from reading.
  if (attempt.completed && attempt.finished_at) return { ...base, state: "completed", completedParagraphs: totalParagraphs ?? saved.size, completedAt: attempt.finished_at };
  const completedPassages = ids.map(id => input.passageProgress?.find(row => row.attempt_id === attempt.id
    && row.student_id === attempt.student_id && row.passage_id === id
    && attempt.passage_ids[row.passage_position - 1] === id && row.completed && row.completed_at));
  if (completedPassages.length > 0 && completedPassages.every(Boolean)) {
    return { ...base, state: "completed", completedParagraphs: totalParagraphs ?? saved.size,
      completedAt: completedPassages.map(row => row!.completed_at!).sort().reverse()[0] };
  }
  return { ...base, state: "in_progress", completedParagraphs: saved.size, startedAt: attempt.started_at };
}

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClassId } from "@/hooks/useClassId";
import { getNotesForClass, upsertNote, type WAJNote } from "@/lib/wajNotesService";
import { listFlagged, unflag, type FlaggedQuestionRow } from "@/lib/flaggedService";
import { questionBank } from "@/lib/questionLoader";

/**
 * A question's Journal note and Bookmark, from the student's account.
 *
 * Notes are the Wrong Answer Journal note (`wrong_answer_journal_notes`, one
 * per class and question): the free note is `student_note`, the template is
 * wrong / correct reasoning, trap and lesson. Bookmarks are the saved-question
 * list (`flagged_questions`), the same list the Flag button and blind review
 * write, so a bookmark shows up everywhere a flag does. Nothing new is stored.
 */

export type NoteFields = Pick<WAJNote, "student_note" | "wrong_reasoning" | "correct_reasoning" | "trap_pattern" | "lesson">;

const TEXT_FIELDS: Array<keyof NoteFields> = ["student_note", "wrong_reasoning", "correct_reasoning", "trap_pattern", "lesson"];

export function noteHasContent(note?: Partial<NoteFields> | null): boolean {
  return !!note && TEXT_FIELDS.some((f) => (note[f] ?? "").trim().length > 0);
}

export function useQuestionStudyMarks() {
  const { user } = useAuth();
  const { classId } = useClassId();
  const [notes, setNotes] = React.useState<Map<string, WAJNote>>(new Map());
  const [flags, setFlags] = React.useState<Map<string, FlaggedQuestionRow>>(new Map());
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!classId) return;
    let live = true;
    getNotesForClass(classId).then((m) => { if (live) setNotes(m); }, () => { if (live) setError("Notes could not be loaded."); });
    return () => { live = false; };
  }, [classId]);

  React.useEffect(() => {
    if (!user?.id) return;
    let live = true;
    listFlagged(user.id).then(
      (rows) => { if (live) setFlags(new Map(rows.map((r) => [r.qid, r]))); },
      () => { if (live) setError("Bookmarks could not be loaded."); },
    );
    return () => { live = false; };
  }, [user?.id]);

  const saveNote = React.useCallback(async (qid: string, fields: Partial<NoteFields>) => {
    if (!classId) throw new Error("No class");
    const q = questionBank.getQuestion(qid);
    const saved = await upsertNote({
      class_id: classId,
      qid,
      ...fields,
      title: notes.get(qid)?.title ?? (q ? `PT${q.pt}.S${q.section}.Q${q.qnum}` : null),
    });
    setNotes((prev) => new Map(prev).set(qid, saved));
    return saved;
  }, [classId, notes]);

  const toggleBookmark = React.useCallback(async (qid: string) => {
    if (!user?.id) return;
    const existing = flags.get(qid);
    if (existing) {
      await unflag(existing.id);
      setFlags((prev) => { const next = new Map(prev); next.delete(qid); return next; });
      return;
    }
    const q = questionBank.getQuestion(qid);
    if (!q) return;
    const { data, error: err } = await supabase
      .from("flagged_questions")
      .insert({
        qid, pt: q.pt, section: q.section, qnum: q.qnum, qtype: q.qtype, level: q.difficulty,
        class_id: classId || ((user.user_metadata as { class_id?: string } | null)?.class_id ?? user.id),
        user_id: user.id,
      })
      .select("*")
      .single();
    if (err) throw err;
    setFlags((prev) => new Map(prev).set(qid, data as FlaggedQuestionRow));
  }, [user, flags, classId]);

  return {
    ready: !!classId,
    error,
    notes,
    note: (qid: string) => notes.get(qid) ?? null,
    hasNote: (qid: string) => noteHasContent(notes.get(qid)),
    isBookmarked: (qid: string) => flags.has(qid),
    saveNote,
    toggleBookmark,
  };
}

export type StudyMarks = ReturnType<typeof useQuestionStudyMarks>;

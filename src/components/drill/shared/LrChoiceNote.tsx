import { useLrExplanation } from "@/hooks/useLrExplanation";

/**
 * One choice's Choice Note, read from the `lr_*` tables. Every Choice Note on
 * the review pages comes from here, so a database correction reaches students
 * everywhere at once. Each choice shares the question's cached query.
 */
export function LrChoiceNote({ pt, section, qnum, letter, className }: {
  pt: number; section: number; qnum: number; letter: string; className?: string;
}) {
  const { data } = useLrExplanation({ pt, section, questionNumber: qnum });
  const note = data?.styles[0]?.notesByLetter[letter];
  return note ? <p className={className}>{note}</p> : null;
}

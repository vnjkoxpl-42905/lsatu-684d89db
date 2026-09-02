/**
 * Verbatim-overlap measurement, re-exported from where the grader can reach it.
 *
 * The real file is `supabase/functions/_shared/rrcOverlap.ts`. Same reason as
 * `grading.ts`: the Reciting check runs server-side in the grader, and a Deno
 * function cannot import out of `src/`, but the v1 recall session that has used
 * this since before the grader existed lives here. One file, two doors.
 */
export * from "../../../../supabase/functions/_shared/rrcOverlap";

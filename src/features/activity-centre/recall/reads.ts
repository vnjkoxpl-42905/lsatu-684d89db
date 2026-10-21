/**
 * Read-stripping, re-exported from where the grader can reach it.
 *
 * Same arrangement, and the same reason, as `grading.ts` and `overlap.ts`: the
 * real file is under `supabase/functions/_shared/` because a Deno function
 * cannot import out of `src/`, and Vitest only looks inside `src/`. One file,
 * two doors, never two copies.
 */
export * from "../../../../supabase/functions/_shared/rrcReads";

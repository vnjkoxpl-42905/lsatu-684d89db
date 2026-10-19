/**
 * The judge's pure logic, re-exported from where the edge function can reach it.
 *
 * The real file is `supabase/functions/_shared/rrcGrading.ts`. It has to live
 * under `supabase/functions/` because Supabase bundles a function from that
 * directory and a Deno function cannot import out of `src/`. It has to be
 * reachable from `src/` because that is the only place Vitest looks.
 *
 * So there is ONE file and this is a pointer to it, rather than two copies and
 * a drift check. A grader that scores a student differently from the harness
 * that validated it would be the worst kind of bug here: silent, and only
 * visible as slightly wrong numbers.
 */
export * from "../../../../supabase/functions/_shared/rrcGrading";

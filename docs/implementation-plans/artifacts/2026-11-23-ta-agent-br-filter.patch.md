# Draft Edge Function Patch: Exclude Blind Review Rows in `ta-agent` (Finding F9)

> Status: **NOT APPLIED / NOT DEPLOYED** (Edge functions require explicit deploy permission and are out of client PR #291 diff scope per instructions).
> Authoritative source target: `supabase/functions/ta-agent/index.ts` lines 975-978.

## Why this patch is needed

Historic blind review rows sit in `public.attempts` with `br_selected = true` (Audit F4). Client readers in `src/` exclude them via `excludeBlindReviewAttempts` (`src/lib/attemptsFilter.ts`), but `buildStudentContext` in `supabase/functions/ta-agent/index.ts` reads up to 200 recent `attempts` rows without `.not("br_selected", "is", true)`, inflating overall accuracy and per-qtype attempt stats fed to the TA agent for students with pre-rebuild blind reviews.

## Exact unified diff for `supabase/functions/ta-agent/index.ts`

```diff
--- a/supabase/functions/ta-agent/index.ts
+++ b/supabase/functions/ta-agent/index.ts
@@ -973,7 +973,8 @@ async function buildStudentContext(
   studentName: string,
 ): Promise<string> {
   const [attemptsRes, wajRes, asgRes] = await Promise.all([
-    admin.from("attempts").select("qtype, correct").eq("class_id", studentId)
+    admin.from("attempts").select("qtype, correct")
+      .not("br_selected", "is", true)
+      .eq("class_id", studentId)
       .order("timestamp_iso", { ascending: false }).limit(200),
     admin.from("wrong_answer_journal").select("qtype").eq("class_id", studentId).limit(50),
     admin.from("ta_assignments").select("title, status").eq("student_id", studentId)
```

## Notes for Edge Function review / deploy

Other Edge Functions that query `public.attempts` without `.not("br_selected", "is", true)` (discovered via search; verify per-function intent before deploying):
- `supabase/functions/ta-chat/index.ts:300` (`admin.from("attempts").select("qtype, section, correct, timestamp_iso").eq("class_id", studentId)`)
- `supabase/functions/tutor-chat/index.ts:439` and `:471` (`post-answer` verification and `recentWrong` memory context)
- `supabase/functions/admin-manage-users/index.ts:161` and `:165` (global `attempts` counts)

Remember: Lovable Cloud Edge Functions deploy through the Lovable agent after Joshua's explicit confirmation, not via Supabase CLI.

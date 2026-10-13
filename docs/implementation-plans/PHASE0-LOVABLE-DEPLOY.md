# Phase 0 — Lovable Execution Prompt (edge functions)

This covers the parts of `COMPREHENSIVEAUDIT.md` Phase 0 that **only Lovable can execute**: deploying two edge functions and setting one secret. The app-code fixes (C145, C1, C2, C3, H10) are already done in the repo by Claude Code and ship with the normal Lovable sync. This file is what you paste to Lovable / act on inside Lovable.

Source edits are already committed. Lovable needs to (a) redeploy the two functions so the source changes take effect, and (b) do the H18 auth hardening which requires a new secret + caller updates that must deploy together.

---

## Task 1 — Redeploy `gemini-proxy` (H17: semantic search dimension fix)

**Why:** The content index stores `vector(3072)` (from `gemini-embedding-001`), but `gemini-proxy` was hardcoded to `text-embedding-004` (768 dims), so every semantic search silently failed a dimension check and fell back to keyword/route search. The source is now fixed to honor the requested model, default to `gemini-embedding-001`, and pass `outputDimensionality: 3072`.

**What Lovable does:**
1. Deploy the `gemini-proxy` edge function (the updated `supabase/functions/gemini-proxy/index.ts` is in the repo).
2. Confirm the `GEMINI_API_KEY` secret is set for the project (the function reads `GEMINI_API_KEY`, falling back to `GeminiFreetier` / `GEMINIFREETIER` / `GEMINI_FREETIER`). If the free-tier key does not support `gemini-embedding-001`, set a paid `GEMINI_API_KEY`.

**Live verification (do this after deploy):**
1. In the SQL editor, embed a test query through the proxy path used by `teacher-link-search` and call `match_lsatu_content(query_embedding, ...)`. Confirm **no** `different vector dimensions` error appears in the function logs.
2. Run one teacher link-search / "find link" in the app and confirm it returns semantic matches, not just keyword/route fallbacks.
3. Check `gemini-proxy` logs: the previous `console.warn` about dimension mismatch should be gone.

---

## Task 2 — Redeploy `tutor-chat` (H19: analytics event now actually writes)

**Why:** The `events` insert for `coaching_request` was a lazy builder that was never awaited, so the row was never written and all tutor-usage analytics from that path were silently missing. Source now wraps it in the existing `runInBackground(...)` helper with error logging.

**What Lovable does:**
1. Deploy the `tutor-chat` edge function (updated `supabase/functions/tutor-chat/index.ts` is in the repo).

**Live verification:**
1. As a test student, run one tutor request.
2. Confirm a new row appears in `events` with `event_type = 'coaching_request'`.

---

## Task 3 — H18: Lock down `gemini-proxy` auth (NOT yet done in source — decide first)

**Status:** Claude Code intentionally did NOT change this yet, because it needs a new secret plus a coordinated update to ~12 internal callers, all deployed together, and it cannot be verified without the live project. Confirm you want this, then either have Lovable do it or have Claude Code write the caller diffs for a follow-up deploy.

**Why:** `config.toml` sets `verify_jwt = false` for `gemini-proxy` and the function does no auth of its own. Anyone who finds the public URL can run unlimited Gemini generations/embeddings on your API key (unbounded cost).

**The change (must ship atomically):**
1. Add a new secret `EDGE_INTERNAL_KEY` (a long random string) to the Supabase project.
2. In `gemini-proxy` `serve()`, before doing any work, require a header (e.g. `X-Internal-Key`) equal to `EDGE_INTERNAL_KEY` using constant-time comparison; return `401` otherwise. Keep `verify_jwt = false` (callers use non-JWT credentials).
3. Update EVERY internal caller to send `X-Internal-Key: <EDGE_INTERNAL_KEY>` on its request to `gemini-proxy`:
   `tutor-chat`, `ta-chat`, `study-chat`, `teacher-operator-chat`, `teacher-link-search`, `activity-coach`, `analyze-stem-response`, `motivation-engine`, `parse-drill-request`, `polish-message`, `voice-coach-respond`, `synthesize-session-bundle`.
4. Deploy `gemini-proxy` and all updated callers **together** (deploying the guard before the callers would break every AI feature).

**Live verification:**
1. A direct `curl` to the proxy URL without the header returns `401`.
2. Every AI feature (tutor chat, TA chat, study chat, teacher operator chat, link search, voice coach, stem analysis, motivation, drill parse) still works in the app.

> Recommendation: do Tasks 1 and 2 now (low risk, immediate value). Do Task 3 as its own focused pass with a rollback plan, since a header mismatch takes down all AI features at once.

---

## Task 3 — exact changes (pre-written, ready to apply + deploy)

Apply ALL of these, then deploy `gemini-proxy` **and all 13 callers together** in one shot. Order does not matter as long as they deploy in the same batch; if the guard deploys alone, every AI feature 401s until the callers follow.

### Step A — set the secret

Add a Supabase project secret:
- `EDGE_INTERNAL_KEY` = a long random string (e.g. 48+ hex chars). Generate once, reuse for all functions (they read it from env, so you only set it in one project-wide place).

### Step B — add the guard to `gemini-proxy/index.ts`

At the very top of the `serve(async (req) => { ... })` handler, AFTER the `OPTIONS` short-circuit and BEFORE reading the API key / doing any work, insert:

```ts
  // Internal-only: reject anything without the shared secret (constant-time compare).
  const expectedInternalKey = Deno.env.get("EDGE_INTERNAL_KEY") ?? "";
  const providedInternalKey = req.headers.get("X-Internal-Key") ?? "";
  if (
    !expectedInternalKey ||
    providedInternalKey.length !== expectedInternalKey.length ||
    !timingSafeEqual(
      new TextEncoder().encode(providedInternalKey),
      new TextEncoder().encode(expectedInternalKey),
    )
  ) {
    return new Response(
      JSON.stringify({ error: { message: "Unauthorized" } }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
```

Add this import near the top of `gemini-proxy/index.ts` (Deno std, already used elsewhere in the repo):

```ts
import { timingSafeEqual } from "https://deno.land/std@0.224.0/crypto/timing_safe_equal.ts";
```

(If a different `std` version is already pinned elsewhere in `supabase/functions`, match that version instead.)

Keep `verify_jwt = false` in `config.toml` — callers authenticate with this header, not a JWT.

### Step C — add the header to every caller's fetch to gemini-proxy

In each file below, find the `fetch(...)` that targets the gemini-proxy URL (line numbers are current as of this writing) and add ONE line to its `headers` object:

```ts
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
```

Place it alongside the existing `Authorization` / `Lovable-API-Key` / `Content-Type` headers. Do not remove any existing header.

| Caller file | fetch line(s) to gemini-proxy |
|---|---|
| `activity-coach/index.ts` | 72 |
| `motivation-engine/index.ts` | 94 |
| `polish-message/index.ts` | 132 |
| `teacher-operator-chat/index.ts` | 1117, 1666 |
| `teacher-link-search/index.ts` | 196 |
| `study-chat/index.ts` | 88 |
| `synthesize-session-bundle/index.ts` | 209 (fetch to `GATEWAY_URL`) |
| `tutor-chat/index.ts` | 700, 767 |
| `voice-coach-respond/index.ts` | 82 |
| `analyze-stem-response/index.ts` | 37 |
| `ta-chat/index.ts` | 436 |
| `parse-drill-request/index.ts` | 58 |
| `parse-external-work/index.ts` | 230 |

Note: `teacher-operator-chat` and `tutor-chat` each hit the proxy twice (chat + embeddings) — add the header to BOTH fetches in those files.

### Step D — deploy + verify

1. Deploy `gemini-proxy` + all 13 callers in the same batch.
2. `curl -X POST https://<ref>.supabase.co/functions/v1/gemini-proxy/chat/completions` with no `X-Internal-Key` → expect **401**.
3. In the app, exercise each AI feature and confirm it still works: tutor chat, TA chat, study chat, teacher operator chat, teacher link search, voice coach, stem analysis, motivation, drill parse, activity coach, polish message, external-work parse, session-bundle synthesis.
4. Rollback plan: if any feature 401s, the cause is a missing/mismatched `X-Internal-Key` on that caller or an unset `EDGE_INTERNAL_KEY`. Re-deploy the affected caller with the header; the guard itself is fine.

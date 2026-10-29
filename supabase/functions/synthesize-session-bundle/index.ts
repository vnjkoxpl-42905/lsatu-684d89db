// Post-Session Intelligence Pipeline — Phase 2 (synthesis).
//
// Admin-only. Given a STORED session ingestion (transcript already attached to a
// matched student in Phase 1), build a reviewable, per-part-approvable learning
// bundle and write it to `ai_ta_drafts` as a `classroom_update_bundle`.
//
// HARD RULES (build-spec §1, §4):
//   - Approval-first. This writes a DRAFT only. Nothing is student-visible.
//   - Never expose source labels to the student. The draft keeps full source
//     metadata admin-side; the publish step (Phase 3) strips it.
//   - Generate a part ONLY when the transcript clearly supports it. No forced
//     sections, no invented content.
//   - Student-facing copy follows the LSAT U coaching voice
//     (Obsidian wiki/concepts/teaching-voice.md): quiet authority, specific not
//     generic, honest about the work + gentle about the person, no hype, no em
//     dashes.
//
// Model is behind a single indirection (SYNTHESIS_MODEL) so synthesis can later
// swap from the Lovable Gateway (Gemini) to Claude without touching the flow.
//
// Input:  { ledger_id }                       (preferred — resolves session + student)
//      |  { session_id, student_class_id }     (direct, when there is no ledger row)
//      |  { regenerate: true, ... }            (replace an existing draft for the session)
//
// NOT deployed. Deploying requires Joshua's explicit OK (needs LOVABLE_API_KEY).

import { createClient } from "npm:@supabase/supabase-js@2";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { BUCKET, resolveStudentAuthId } from "../_shared/sessionIngestCore.ts";
import { userFromRequest } from "../_shared/authClaims.ts";
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Model config indirection (build-spec decision 1) ──────────────────────────
const SYNTHESIS_MODEL = Deno.env.get("SESSION_SYNTHESIS_MODEL") ?? "gemini-3.8-flash";
const GATEWAY_URL = `${LSATU_GEMINI_PROXY_URL}/chat/completions`;

// Cap how much transcript we feed the model so a giant Doc cannot blow the
// context window. The full transcript stays canonical in the bucket.
const MAX_TRANSCRIPT_CHARS = 60_000;

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are the LSAT U teaching assistant preparing a post-session learning bundle for ONE student, to be reviewed and approved by Joshua (the instructor) before anything reaches the student.

VOICE (all student-facing copy):
- Quiet authority. State the value and let it land. Never oversell or perform enthusiasm.
- Specific, never generic. Reference the student's actual moves from this session, not platitudes. Praise names the exact skill.
- Honest about the work, gentle about the person. The LSAT is hard; say so. Point bluntness at the material, warmth at the student.
- Plain professional diction. No startup hype ("unlock", "crush", "level up", "game-changer"). Contractions are fine. Exclamation points are rare.
- Forward-looking. End on the next step.
- NO em dashes, ever. Use periods, colons, and the middot (·) as a separator.

HARD RULES:
- Use ONLY what the transcript supports. Do not invent scores, drills, or events. If the transcript does not clearly support a part, set its "include" to false and leave it empty.
- Never mention the transcript, "Gemini Notes", "Google Doc", AI, or any source label in student-facing copy.
- Student-facing parts: session_note, homework, quiz. Admin-only planning parts (never shown to the student): weakness_tags, drill_recs, next_agenda, private_note.

Return STRICT JSON ONLY (no prose, no code fences) matching exactly:
{
  "parts": {
    "session_note":  { "include": boolean, "title": string, "body_markdown": string },
    "homework":      { "include": boolean, "title": string, "items": string[] },
    "quiz":          { "include": boolean, "title": string, "items": [{ "prompt": string, "answer": string, "why": string }] },
    "weakness_tags": { "include": boolean, "tags": string[] },
    "drill_recs":    { "include": boolean, "items": [{ "skill": string, "reason": string }] },
    "next_agenda":   { "include": boolean, "title": string, "body_markdown": string },
    "private_note":  { "include": boolean, "body_markdown": string }
  }
}
The session_note is a clean, concise, Notion-style recap with short sections and checklists where useful. Omit any part you cannot ground in the transcript.`;

interface BundlePart {
  include: boolean;
  approved: boolean;
  posted: boolean;
  audience: "student" | "admin";
  [k: string]: unknown;
}

const STUDENT_PARTS = ["session_note", "homework", "quiz"] as const;
const ADMIN_PARTS = ["weakness_tags", "drill_recs", "next_agenda", "private_note"] as const;

async function verifyAdmin(req: Request, admin: SupabaseClient) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const caller = await userFromRequest(req);
  if (!caller) return null;
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", caller.id).eq("role", "admin").maybeSingle();
  return roleRow ? caller : null;
}

/** Read the transcript: inline content_text when present, else the bucket object. */
async function loadTranscript(
  admin: SupabaseClient,
  ctx: { content_text: string | null; file_path: string | null },
): Promise<string> {
  if (ctx.content_text && ctx.content_text.trim()) return ctx.content_text;
  if (!ctx.file_path) throw new Error("transcript_has_no_source");
  const { data, error } = await admin.storage.from(BUCKET).download(ctx.file_path);
  if (error || !data) throw new Error(`transcript_download_failed: ${error?.message ?? "no data"}`);
  return await data.text();
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

/** Normalize raw model parts into stored parts carrying review/publish flags. */
function buildParts(raw: Record<string, any>): Record<string, BundlePart> {
  const out: Record<string, BundlePart> = {};
  const set = (key: string, audience: "student" | "admin") => {
    const p = raw?.[key] ?? {};
    out[key] = {
      ...p,
      include: p.include === true,
      approved: false,
      posted: false,
      audience,
    };
  };
  for (const k of STUDENT_PARTS) set(k, "student");
  for (const k of ADMIN_PARTS) set(k, "admin");
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ ok: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const caller = await verifyAdmin(req, admin);
  if (!caller) return jsonRes({ ok: false, error: "forbidden" }, 403);
  if (!LOVABLE_API_KEY) return jsonRes({ ok: false, error: "LOVABLE_API_KEY not configured" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const regenerate: boolean = body.regenerate === true;

    // ── Resolve the session + matched student, fail closed ──
    let sessionId: string | null = (body.session_id ?? "").trim() || null;
    let studentAuthId: string | null = null;
    let transcriptContextId: string | null = null;
    let ledgerId: string | null = (body.ledger_id ?? "").trim() || null;
    let docName: string | null = null;

    if (ledgerId) {
      const { data: row, error } = await admin
        .from("session_ingestions").select("*").eq("id", ledgerId).maybeSingle();
      if (error) throw error;
      if (!row) return jsonRes({ ok: false, error: "ledger_row_not_found" }, 404);
      if (row.status !== "stored" && row.status !== "drafted" && row.status !== "published") {
        return jsonRes({ ok: false, error: "ledger_not_stored", status: row.status }, 422);
      }
      if (!row.matched_student_id || !row.session_id || !row.transcript_context_id) {
        return jsonRes({ ok: false, error: "ledger_incomplete" }, 422);
      }
      if (row.draft_id && !regenerate) {
        return jsonRes({ ok: true, already_drafted: true, draft_id: row.draft_id, status: row.status });
      }
      sessionId = row.session_id;
      studentAuthId = row.matched_student_id;
      transcriptContextId = row.transcript_context_id;
      docName = (row.raw_meta as any)?.resolved_doc?.name ?? row.raw_subject ?? null;
    } else {
      // Direct path: session + student id, no ledger row (manual session log).
      if (!sessionId) return jsonRes({ ok: false, error: "ledger_id or session_id required" }, 400);
      const resolved = await resolveStudentAuthId(admin, (body.student_class_id ?? "").trim());
      if (!resolved.ok) return jsonRes({ ok: false, error: resolved.reason }, 422);
      studentAuthId = resolved.authId;
    }

    // ── Load the session + transcript ──
    const { data: session, error: sErr } = await admin
      .from("student_sessions").select("*").eq("id", sessionId!).maybeSingle();
    if (sErr) throw sErr;
    if (!session) return jsonRes({ ok: false, error: "session_not_found" }, 404);
    transcriptContextId = transcriptContextId ?? session.transcript_id;
    if (!transcriptContextId) return jsonRes({ ok: false, error: "session_has_no_transcript" }, 422);

    const { data: ctx, error: cErr } = await admin
      .from("student_context").select("id, content_text, file_path, title, metadata")
      .eq("id", transcriptContextId).maybeSingle();
    if (cErr) throw cErr;
    if (!ctx) return jsonRes({ ok: false, error: "transcript_context_not_found" }, 404);
    docName = docName ?? ctx.title ?? null;

    const transcriptFull = await loadTranscript(admin, ctx);
    const transcript = transcriptFull.slice(0, MAX_TRANSCRIPT_CHARS);
    const truncated = transcriptFull.length > MAX_TRANSCRIPT_CHARS;

    // ── Synthesize via the gateway (model behind indirection) ──
    const gwRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json", "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "" },
      body: JSON.stringify({
        model: SYNTHESIS_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              `Session transcript for one tutoring session${truncated ? " (truncated to the first part)" : ""}:\n\n` +
              transcript,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!gwRes.ok) {
      if (gwRes.status === 429) throw new Error("rate_limited");
      if (gwRes.status === 402) throw new Error("out_of_credits");
      const t = await gwRes.text();
      throw new Error(`gateway_${gwRes.status}: ${t.slice(0, 200)}`);
    }
    const gw = await gwRes.json();
    const content: string = gw?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(stripFences(content));
    } catch {
      throw new Error("synthesis_returned_unparseable_json");
    }

    const parts = buildParts(parsed?.parts ?? {});
    const includedStudentParts = STUDENT_PARTS.filter((k) => parts[k]?.include).length;

    const draftJson = {
      version: 1,
      source: {
        ledger_id: ledgerId,
        session_id: sessionId,
        transcript_context_id: transcriptContextId,
        doc_name: docName,
        model: SYNTHESIS_MODEL,
        truncated,
        synthesized_at: new Date().toISOString(),
      },
      parts,
    };

    // ── Write / replace the draft (admin-only ai_ta_drafts; created_by set) ──
    let draftId: string;
    const { data: existingDraftId } = ledgerId
      ? await admin.from("session_ingestions").select("draft_id").eq("id", ledgerId).maybeSingle()
      : { data: null };

    if (regenerate && existingDraftId?.draft_id) {
      const { data: upd, error: uErr } = await admin
        .from("ai_ta_drafts")
        .update({ draft_json: draftJson, status: "draft", approved_by: null, approved_at: null })
        .eq("id", existingDraftId.draft_id)
        .select("id").single();
      if (uErr) throw uErr;
      draftId = upd.id;
    } else {
      const { data: ins, error: iErr } = await admin
        .from("ai_ta_drafts")
        .insert({
          student_id: studentAuthId,
          created_by: caller.id,
          draft_type: "classroom_update_bundle",
          prompt: null,
          draft_json: draftJson,
          input_snapshot_json: { session_id: sessionId, transcript_context_id: transcriptContextId },
          status: "draft",
        })
        .select("id").single();
      if (iErr) throw iErr;
      draftId = ins.id;
    }

    const wasNewDraft = !(regenerate && existingDraftId?.draft_id);
    if (ledgerId) {
      const { error: ledgerErr } = await admin
        .from("session_ingestions")
        .update({ draft_id: draftId, status: "drafted", last_attempt_at: new Date().toISOString() })
        .eq("id", ledgerId);
      if (ledgerErr) {
        console.error("synthesize-session-bundle: ledger update failed", { ledgerId, draftId, ledgerErr });
        if (wasNewDraft) {
          const { error: delErr } = await admin.from("ai_ta_drafts").delete().eq("id", draftId);
          if (delErr) console.error("synthesize-session-bundle: orphan draft delete failed", { draftId, delErr });
        }
        throw ledgerErr;
      }
    }

    return jsonRes({
      ok: true,
      draft_id: draftId,
      student_id: studentAuthId,
      session_id: sessionId,
      included_student_parts: includedStudentParts,
      regenerated: regenerate && !!existingDraftId?.draft_id,
    });
  } catch (e) {
    console.error("synthesize-session-bundle error", e);
    return jsonRes({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

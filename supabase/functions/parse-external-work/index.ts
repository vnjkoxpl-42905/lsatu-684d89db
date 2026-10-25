import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;
const BUCKET = "external-work-uploads";
// Parses at or above this confidence auto-apply into analytics; below routes
// to the admin review queue.
const AUTO_APPLY_THRESHOLD = 0.75;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Instruction tailored to the kind of artifact the student uploaded. */
function extractionGuidance(uploadType: string): string {
  switch (uploadType) {
    case "7sage_analytics":
      return "This is a 7Sage analytics screenshot/PDF. Extract overall accuracy, accuracy by question type, and average time per question type where shown.";
    case "pt_result":
      return "This is a practice test (PT) result. Extract the PT number, the scaled score, and per-section scores/accuracy if shown.";
    case "score_report":
      return "This is an LSAT score report. Extract the scaled score and any section breakdowns.";
    case "lr_section":
    case "rc_section":
    case "drill_result":
      return "This is a section or drill result. Extract overall accuracy, accuracy by question type, and average time per type where shown.";
    default:
      return "Extract whatever LSAT performance metrics are visible: overall accuracy, accuracy by question type, timing, PT scores, section scores.";
  }
}

const SYSTEM_PROMPT = `You are a precise data-extraction engine for LSAT study analytics. You are shown an image or PDF of a student's work done on an outside platform (e.g. 7Sage, LawHub). Extract only the metrics that are actually visible. Never invent numbers. Respond with a SINGLE JSON object and nothing else, in this exact shape:
{
  "overall_accuracy": number|null,          // percent 0-100
  "accuracy_by_type": [ { "question_type": string, "accuracy": number, "sample_size": number|null } ],
  "timing_by_type": [ { "question_type": string, "avg_time_ms": number } ],
  "pt_scores": [ { "pt_number": string, "scaled_score": number|null } ],
  "section_scores": [ { "section": string, "accuracy": number|null, "scaled_score": number|null } ],
  "captured_at": string|null,               // ISO date if a date is visible, else null
  "confidence": number,                     // 0-1: how sure you are the extraction is correct and complete
  "notes": string                           // one short sentence, e.g. what was unreadable
}
Use [] for arrays with no data and null for missing scalars. Percentages are 0-100 numbers. Times are milliseconds.`;

interface ParsedPayload {
  overall_accuracy?: number | null;
  accuracy_by_type?: { question_type: string; accuracy: number; sample_size?: number | null }[];
  timing_by_type?: { question_type: string; avg_time_ms: number }[];
  pt_scores?: { pt_number: string; scaled_score?: number | null }[];
  section_scores?: { section: string; accuracy?: number | null; scaled_score?: number | null }[];
  captured_at?: string | null;
  confidence?: number;
  notes?: string;
}

/** Pull the first balanced {...} JSON object out of an LLM text response. */
function extractJsonObject(text: string): ParsedPayload | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as ParsedPayload;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Flatten the parsed payload into normalized student_external_metrics rows. */
function toMetricRows(
  p: ParsedPayload,
  studentId: string,
  uploadId: string,
  sourcePlatform: string | null,
) {
  const capturedAt = p.captured_at ?? null;
  const base = {
    student_id: studentId,
    source_upload_id: uploadId,
    source_platform: sourcePlatform,
    captured_at: capturedAt,
  };
  const rows: Record<string, unknown>[] = [];

  if (typeof p.overall_accuracy === "number") {
    rows.push({ ...base, metric_kind: "overall_accuracy", first_accuracy: p.overall_accuracy });
  }
  for (const a of p.accuracy_by_type ?? []) {
    if (!a?.question_type || typeof a.accuracy !== "number") continue;
    rows.push({
      ...base,
      metric_kind: "accuracy_by_type",
      question_type: a.question_type,
      first_accuracy: a.accuracy,
      sample_size: typeof a.sample_size === "number" ? a.sample_size : null,
    });
  }
  for (const t of p.timing_by_type ?? []) {
    if (!t?.question_type || typeof t.avg_time_ms !== "number") continue;
    rows.push({
      ...base,
      metric_kind: "timing_by_type",
      question_type: t.question_type,
      avg_time_ms: Math.round(t.avg_time_ms),
    });
  }
  for (const pt of p.pt_scores ?? []) {
    if (!pt?.pt_number) continue;
    rows.push({
      ...base,
      metric_kind: "pt_score",
      pt_number: pt.pt_number,
      scaled_score: typeof pt.scaled_score === "number" ? pt.scaled_score : null,
    });
  }
  for (const s of p.section_scores ?? []) {
    if (!s?.section) continue;
    rows.push({
      ...base,
      metric_kind: "section_score",
      period_label: s.section,
      first_accuracy: typeof s.accuracy === "number" ? s.accuracy : null,
      scaled_score: typeof s.scaled_score === "number" ? s.scaled_score : null,
    });
  }
  return rows;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: au, error: aerr } = await anon.auth.getUser();
    if (aerr || !au?.user) return json({ error: "Unauthorized" }, 401);
    const caller = au.user;

    const { uploadId, forceApply } = await req.json();
    if (!uploadId) return json({ error: "Missing uploadId" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: upload, error: upErr } = await admin
      .from("external_work_uploads")
      .select("*")
      .eq("id", uploadId)
      .single();
    if (upErr || !upload) return json({ error: "Upload not found" }, 404);

    // Authorize: owning student or an admin.
    const isOwner = upload.student_id === caller.id;
    let isAdmin = false;
    if (!isOwner) {
      const { data: roleOk } = await admin.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
      });
      isAdmin = roleOk === true;
    }
    if (!isOwner && !isAdmin) return json({ error: "Forbidden" }, 403);

    // Admin approval of an already-parsed, low-confidence upload: skip the LLM,
    // flatten the stored parsed_json, and apply the metrics.
    if (forceApply) {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      const stored = upload.parsed_json as ParsedPayload | null;
      if (!stored) return json({ error: "No parsed data to apply" }, 400);
      const rows = toMetricRows(stored, upload.student_id, uploadId, upload.source_platform);
      await admin.from("student_external_metrics").delete().eq("source_upload_id", uploadId);
      if (rows.length) {
        const { error: insErr } = await admin.from("student_external_metrics").insert(rows);
        if (insErr) throw new Error(`metrics_insert_failed: ${insErr.message}`);
      }
      await admin
        .from("external_work_uploads")
        .update({
          applied_to_analytics: rows.length > 0,
          processing_status: "parsed",
          reviewed_by: caller.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", uploadId);
      return json({ ok: true, status: "parsed", metricsApplied: rows.length });
    }

    await admin
      .from("external_work_uploads")
      .update({ processing_status: "processing" })
      .eq("id", uploadId);

    // Download the file and build a base64 data URL for the vision model.
    const uploadBucket = (upload as { storage_bucket?: string | null }).storage_bucket || BUCKET;
    const { data: blob, error: dlErr } = await admin.storage
      .from(uploadBucket)
      .download(upload.storage_path);
    if (dlErr || !blob) throw new Error(`file_download_failed: ${dlErr?.message ?? "no data"}`);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mime = upload.file_type || "application/octet-stream";
    const dataUrl = `data:${mime};base64,${encodeBase64(bytes)}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: extractionGuidance(upload.upload_type) },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("gemini-proxy error:", response.status, t);
      await admin
        .from("external_work_uploads")
        .update({ processing_status: "failed" })
        .eq("id", uploadId);
      if (response.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI parsing failed" }, 502);
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJsonObject(raw);

    if (!parsed) {
      await admin
        .from("external_work_uploads")
        .update({ processing_status: "failed", extracted_text: raw })
        .eq("id", uploadId);
      return json({ ok: false, status: "failed", error: "Could not read metrics from file" }, 200);
    }

    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const rows = toMetricRows(parsed, upload.student_id, uploadId, upload.source_platform);
    const hasMetrics = rows.length > 0;
    const apply = confidence >= AUTO_APPLY_THRESHOLD && hasMetrics;

    await admin
      .from("external_work_uploads")
      .update({
        extracted_text: raw,
        parsed_json: parsed,
        confidence_score: confidence,
        applied_to_analytics: apply,
        processing_status: apply ? "parsed" : "needs_review",
      })
      .eq("id", uploadId);

    if (apply) {
      // Idempotent re-apply: clear prior rows for this upload first.
      await admin.from("student_external_metrics").delete().eq("source_upload_id", uploadId);
      const { error: insErr } = await admin.from("student_external_metrics").insert(rows);
      if (insErr) throw new Error(`metrics_insert_failed: ${insErr.message}`);
    }

    return json({
      ok: true,
      status: apply ? "parsed" : "needs_review",
      confidence,
      metricsApplied: apply ? rows.length : 0,
    });
  } catch (e) {
    console.error("parse-external-work error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

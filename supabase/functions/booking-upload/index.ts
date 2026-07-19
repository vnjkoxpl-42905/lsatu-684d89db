// Anonymous booking-time file uploads for per-student links (/book/<slug>).
// NO login. The slug is the bearer credential — same contract as public-booking:
// identity comes ONLY from the pass the slug resolves to, Authorization is never
// read. Config: [functions.booking-upload] verify_jwt = false.
//
// Files ride multipart/form-data (they cannot fit public-booking's tight JSON
// body). This function validates the slug, enforces the file policy, and writes
// with the SERVICE ROLE — so storage/table RLS (which is keyed on auth.uid())
// is bypassed and name/email-only passes with no student_id still work.
//
// Files stage under external-work-uploads/booking/<pass_id>/<idempotency_key>/,
// and external_work_uploads rows are inserted with redemption_id NULL. The book
// call (public-booking → bookSession) backfills redemption_id by matching
// (booking_pass_id, booking_idempotency_key). If the student never completes the
// booking, the rows stay orphaned (redemption_id NULL) and can be swept later.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 20 * 1024 * 1024;   // 20 MB / file
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;  // 60 MB / request (belt-and-suspenders)
const BUCKET = "external-work-uploads";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Keep a safe leaf name; the storage path prefix carries all the routing.
function safeName(name: string): string {
  const cleaned = (name || "file").normalize("NFKD").replace(/[^\w.\- ]+/g, "_").trim();
  return (cleaned || "file").slice(0, 180);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const form = await req.formData();
    const slug = String(form.get("slug") || "");
    const idem = String(form.get("idempotency_key") || "");
    if (!slug || slug.length < 3 || slug.length > 128) return json({ error: "invalid_link" }, 404);
    if (!idem || idem.length < 8 || idem.length > 200) return json({ error: "invalid_request" }, 400);

    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return json({ error: "no_files" }, 400);
    if (files.length > MAX_FILES) return json({ error: "too_many_files", max: MAX_FILES }, 400);

    let total = 0;
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) return json({ error: "file_too_large", max_mb: 20, name: f.name }, 413);
      total += f.size;
    }
    if (total > MAX_TOTAL_BYTES) return json({ error: "payload_too_large" }, 413);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Identity from the slug only.
    const { data: pass } = await supabase.rpc("resolve_booking_link_full", { _slug: slug });
    if (!pass) return json({ error: "invalid_link" }, 404);

    // Cap total files ever staged for this (pass, idempotency_key) at MAX_FILES,
    // so repeated calls can't blow past the limit.
    const { count: existing } = await supabase
      .from("external_work_uploads")
      .select("id", { count: "exact", head: true })
      .eq("booking_pass_id", pass.id)
      .eq("booking_idempotency_key", idem);
    if ((existing ?? 0) + files.length > MAX_FILES) {
      return json({ error: "too_many_files", max: MAX_FILES }, 400);
    }

    const uploaded: { file_name: string; storage_path: string }[] = [];
    for (const f of files) {
      const path = `booking/${pass.id}/${idem}/${crypto.randomUUID()}-${safeName(f.name)}`;
      const bytes = new Uint8Array(await f.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: f.type || "application/octet-stream", upsert: false });
      if (upErr) {
        console.error("storage upload failed", upErr);
        return json({ error: "upload_failed" }, 500);
      }
      const { error: rowErr } = await supabase.from("external_work_uploads").insert({
        student_id: pass.student_id,           // may be null (name/email-only pass)
        uploaded_by: pass.student_id,           // no auth identity for anon booking
        file_name: safeName(f.name),
        file_type: f.type || null,
        storage_path: path,
        source_platform: "booking",
        upload_type: "booking_submission",
        processing_status: "uploaded",
        booking_pass_id: pass.id,
        booking_idempotency_key: idem,
      });
      if (rowErr) {
        console.error("row insert failed", rowErr);
        return json({ error: "upload_failed" }, 500);
      }
      uploaded.push({ file_name: safeName(f.name), storage_path: path });
    }

    return json({ ok: true, uploaded: uploaded.length, files: uploaded.map((u) => u.file_name) });
  } catch (e) {
    console.error("booking-upload error", e);
    return json({ error: "server_error" }, 500);
  }
});

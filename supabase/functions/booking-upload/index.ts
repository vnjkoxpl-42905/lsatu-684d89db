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
const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "rtf", "doc", "docx", "png", "jpg", "jpeg", "heic", "webp"]);
const BLOCKED_MIME_PREFIXES = ["text/html", "application/javascript", "text/javascript", "application/x-sh", "application/x-msdownload"];

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

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function allowedFile(file: File): boolean {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  return ALLOWED_EXTENSIONS.has(ext) && !BLOCKED_MIME_PREFIXES.some((mime) => file.type.toLowerCase().startsWith(mime));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Resolve pass identity from either a slug (anonymous) or a JWT
    // (authenticated in-app booking). Returns { pass, mode } or a Response error.
    async function resolvePass(slug: string): Promise<
      | { pass: any; mode: "slug" | "jwt"; userId: string | null }
      | Response
    > {
      if (slug) {
        const { data: pass } = await supabase.rpc("resolve_booking_link_full", { _slug: slug });
        // A non-resolving slug comes back as an all-NULL composite, which is
        // truthy over PostgREST. Check the id, not the object.
        if (!pass?.id) return json({ error: "invalid_link" }, 404);
        return { pass, mode: "slug", userId: null };
      }
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);
      const jwt = authHeader.slice(7);
      // Verify via getClaims, NOT the legacy getUser(jwt): the new asymmetric
      // signing-keys system breaks getUser with "missing sub claim" and returns a
      // 401 here (surfaced to the client as a generic non-2xx). student-booking
      // already carries this exact fix; booking-upload had been left behind.
      const authClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(jwt);
      if (claimsErr || !claimsData?.claims?.sub) return json({ error: "unauthorized" }, 401);
      const userId = claimsData.claims.sub as string;
      const { data: pass } = await supabase
        .from("booking_passes").select("*")
        .eq("student_id", userId).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!pass) return json({ error: "no_active_pass" }, 404);
      return { pass, mode: "jwt", userId };
    }

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body.action === "discard") {
        const slug = String(body.slug || "");
        const idem = String(body.idempotency_key || "");
        const clientUploadId = String(body.client_upload_id || "");
        const resolved = await resolvePass(slug);
        if (resolved instanceof Response) return resolved;
        const { pass } = resolved;
        const { data: row, error: rowErr } = await supabase.from("external_work_uploads")
          .select("id,storage_path,redemption_id").eq("booking_pass_id", pass.id)
          .eq("booking_idempotency_key", idem).eq("client_upload_id", clientUploadId).maybeSingle();
        if (rowErr) throw rowErr;
        if (!row) return json({ ok: true, discarded: false });
        if (row.redemption_id) return json({ error: "upload_already_linked" }, 409);
        const { error: removeErr } = await supabase.storage.from(BUCKET).remove([row.storage_path]);
        if (removeErr) throw removeErr;
        const { error: deleteErr } = await supabase.from("external_work_uploads").delete().eq("id", row.id);
        if (deleteErr) throw deleteErr;
        return json({ ok: true, discarded: true });
      }
      const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const internal = req.headers.get("X-Internal-Key") || "";
      if (bearer !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") && internal !== Deno.env.get("EDGE_INTERNAL_KEY")) {
        return json({ error: "unauthorized" }, 401);
      }
      if (body.action !== "cleanup") return json({ error: "unknown_action" }, 400);
      const { data: doomed, error } = await supabase.rpc("take_abandoned_booking_uploads", {
        _older_than: "24 hours", _limit: 250,
      });
      if (error) throw error;
      const paths = (doomed ?? []).map((row: { storage_path: string }) => row.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: removeErr } = await supabase.storage.from(BUCKET).remove(paths);
        if (removeErr) {
          await supabase.from("external_work_uploads").update({ cleanup_claimed_at: null })
            .in("id", (doomed ?? []).map((row: { id: string }) => row.id));
          throw removeErr;
        }
        const { error: deleteErr } = await supabase.from("external_work_uploads").delete()
          .in("id", (doomed ?? []).map((row: { id: string }) => row.id));
        if (deleteErr) throw deleteErr;
      }
      return json({ ok: true, removed: paths.length });
    }

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_TOTAL_BYTES + 256 * 1024) return json({ error: "payload_too_large" }, 413);
    const form = await req.formData();
    const slug = String(form.get("slug") || "");
    const idem = String(form.get("idempotency_key") || "");
    if (slug && (slug.length < 3 || slug.length > 128)) return json({ error: "invalid_link" }, 404);
    if (!idem || idem.length < 8 || idem.length > 200) return json({ error: "invalid_request" }, 400);

    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const clientIds = form.getAll("client_upload_ids").map(String);
    if (files.length === 0) return json({ error: "no_files" }, 400);
    if (files.length > MAX_FILES) return json({ error: "too_many_files", max: MAX_FILES }, 400);
    if (clientIds.length !== files.length || clientIds.some((id) => id.length < 8 || id.length > 100)) {
      return json({ error: "invalid_client_upload_ids" }, 400);
    }

    let total = 0;
    for (const f of files) {
      if (f.size > MAX_FILE_BYTES) return json({ error: "file_too_large", max_mb: 20, name: f.name }, 413);
      if (!allowedFile(f)) return json({ error: "file_type_not_allowed", name: f.name }, 415);
      total += f.size;
    }
    if (total > MAX_TOTAL_BYTES) return json({ error: "payload_too_large" }, 413);

    // Identity from slug OR JWT.
    const resolved = await resolvePass(slug);
    if (resolved instanceof Response) return resolved;
    const { pass, mode, userId } = resolved;
    if (pass.status !== "active" || pass.used_credits >= pass.total_credits) {
      return json({ error: "pass_not_bookable" }, 409);
    }

    // Rate-limit: only the anonymous slug path (guards slug enumeration / abuse
    // by non-authed callers). Authed callers already require a valid session
    // and an active pass, so slug-style rate-limiting doesn't apply — and
    // bump_booking_hit's composite PK assumes a real slug, so passing a
    // synthetic "authed:<uuid>" was throwing and turning into a 500.
    if (mode === "slug") {
      const rateKey = await sha256Hex((req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown");
      const { data: uploadHits, error: hitErr } = await supabase.rpc("bump_booking_hit", {
        _ip_hash: rateKey, _slug: slug, _action: "upload",
      });
      if (hitErr) throw hitErr;
      if ((uploadHits ?? 0) > 5) return json({ error: "rate_limited" }, 429);
    }

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

    const uploaded: { client_upload_id: string; file_name: string; storage_path: string; adopted: boolean }[] = [];
    const createdRows: string[] = [];
    const createdPaths: string[] = [];
    for (let index = 0; index < files.length; index++) {
      const f = files[index];
      const clientUploadId = clientIds[index];
      const { data: existingRow, error: existingErr } = await supabase.from("external_work_uploads")
        .select("id,file_name,storage_path").eq("booking_pass_id", pass.id)
        .eq("booking_idempotency_key", idem).eq("client_upload_id", clientUploadId).maybeSingle();
      if (existingErr) throw existingErr;
      if (existingRow) {
        uploaded.push({ client_upload_id: clientUploadId, file_name: existingRow.file_name, storage_path: existingRow.storage_path, adopted: true });
        continue;
      }
      const path = `booking/${pass.id}/${idem}/${clientUploadId}-${safeName(f.name)}`;
      const bytes = new Uint8Array(await f.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from(BUCKET).upload(path, bytes, { contentType: f.type || "application/octet-stream", upsert: true });
      if (upErr) {
        console.error("storage upload failed", upErr);
        if (createdPaths.length) await supabase.storage.from(BUCKET).remove(createdPaths);
        if (createdRows.length) await supabase.from("external_work_uploads").delete().in("id", createdRows);
        return json({ error: "upload_failed" }, 500);
      }
      createdPaths.push(path);
      const { data: inserted, error: rowErr } = await supabase.from("external_work_uploads").insert({
        student_id: mode === "jwt" ? userId : pass.student_id, // JWT gives us a real auth id
        uploaded_by: mode === "jwt" ? userId : pass.student_id, // anon has no auth identity
        file_name: safeName(f.name),
        file_type: f.type || null,
        storage_path: path,
        source_platform: "booking",
        upload_type: "booking_submission",
        processing_status: "uploaded",
        booking_pass_id: pass.id,
        booking_idempotency_key: idem,
        client_upload_id: clientUploadId,
      }).select("id").single();
      if (rowErr) {
        console.error("row insert failed", rowErr);
        await supabase.storage.from(BUCKET).remove(createdPaths);
        if (createdRows.length) await supabase.from("external_work_uploads").delete().in("id", createdRows);
        return json({ error: "upload_failed" }, 500);
      }
      createdRows.push(inserted.id);
      uploaded.push({ client_upload_id: clientUploadId, file_name: safeName(f.name), storage_path: path, adopted: false });
    }

    return json({ ok: true, uploaded: uploaded.length, files: uploaded });
  } catch (e) {
    console.error("booking-upload error", e);
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: "server_error", detail: msg }, 500);
  }
});

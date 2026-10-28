// Admin-only booking pass management: create / list / revoke / rotate.
// Every issued link uses the strong /book/:slug public route.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { generateBookingSlug, validateNewPassInput } from "../_shared/bookingPassLinks.ts";
import { deleteEvent } from "../_shared/googleCalendar.ts";
import { findAuthUserIdByEmail } from "../_shared/linkPassToAccount.ts";

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function genToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://lsatprep.study";

function bookingUrl(slug: string): string {
  return `${APP_ORIGIN}/book/${slug}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice(7);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    // Validate the caller JWT with the anon client: getClaims() supports the
    // asymmetric signing-keys system, unlike getUser() on a service-role client.
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claimsRes } = await authClient.auth.getClaims(token);
    const user = claimsRes?.claims?.sub ? { id: String(claimsRes.claims.sub) } : null;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (roleError) throw roleError;
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    const singleSessionDto = (row: any, association?: "verified_account" | "possible_match_unverified_email") => ({
      source: "single_session" as const,
      id: row.id,
      start_at: row.start_at,
      end_at: row.end_at,
      status: row.status,
      meet_url: row.status === "booked" ? row.meet_url ?? null : null,
      name: row.name ?? null,
      email: row.email ?? null,
      user_id: row.user_id ?? null,
      created_at: row.created_at,
      ...(association ? { association } : {}),
    });

    if (["home_get", "home_create", "home_revoke", "home_reactivate"].includes(action)) {
      const studentId = String(body.student_id || "");
      const { data: student, error: studentError } = await supabase.from("profiles").select("class_id,display_name,archived_at").eq("class_id", studentId).maybeSingle();
      const { data: adminTarget, error: adminError } = await supabase.from("user_roles").select("role").eq("user_id", studentId).eq("role", "admin").maybeSingle();
      if (studentError || adminError) throw studentError || adminError;
      if (!student || student.archived_at || adminTarget) return json({ error: "ineligible_student" }, 400);
      let pass: any = null;
      let created = false;
      if (action === "home_create") {
        const slug = generateBookingSlug(student.display_name, null);
        const { data, error } = await supabase.rpc("teacher_home_create_pass", {
          _actor: user.id, _student: studentId, _credits: body.credits,
          _slug: slug, _token_hash: await sha256Hex(genToken()),
          _session_minutes: body.session_minutes ?? 70, _expires_at: body.expires_at ?? null,
        });
        if (error) return json({ error: error.message }, error.message === "forbidden" ? 403 : 409);
        pass = data?.pass; created = data?.created === true;
      } else if (action === "home_reactivate") {
        if (body.confirmed !== true) return json({ error: "confirmation_required" }, 400);
        const result = await supabase.rpc("teacher_home_reactivate_pass", { _actor: user.id, _student: studentId, _pass: body.pass_id });
        if (result.error) return json({ error: result.error.message }, result.error.message === "forbidden" ? 403 : 409);
        pass = result.data;
      } else if (action === "home_revoke") {
        if (body.confirmed !== true) return json({ error: "confirmation_required" }, 400);
        const result = await supabase.rpc("teacher_home_revoke_pass", { _actor: user.id, _student: studentId, _pass: body.pass_id });
        if (result.error) throw result.error;
        pass = result.data;
      } else {
        const { data, error } = await supabase.from("booking_passes").select("*").eq("student_id", studentId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        pass = data;
      }
      if (pass && pass.student_id !== studentId) return json({ error: "pass_verification_failed" }, 500);
      return json({ created, pass: pass ? { ...pass, credits_remaining: Math.max(0, pass.total_credits-pass.used_credits),
        booking_url: pass.booking_slug ? bookingUrl(pass.booking_slug) : null } : null });
    }

    if (action === "home_add_credits" || action === "home_resolve_add") {
      const { data, error } = await supabase.rpc("teacher_home_add_credits", {
        _actor: user.id, _student: body.student_id, _pass: body.pass_id,
        _operation: body.operation_key, _delta: body.credits, _apply: action === "home_add_credits",
      });
      if (error) return json({ error: error.message }, error.message === "forbidden" ? 403 : 409);
      if (action === "home_add_credits" && data?.cancelled === true) return json({ error: "operation_cancelled: This pending add was resolved without applying credits. Start a new intentional add." }, 409);
      const pass = data?.pass;
      if (!pass || pass.student_id !== body.student_id || pass.id !== body.pass_id) return json({ error: "pass_verification_failed" }, 500);
      return json({ ...data, pass: { ...pass,
        credits_remaining: Math.max(0, pass.total_credits - pass.used_credits),
        booking_url: pass.booking_slug ? bookingUrl(pass.booking_slug) : null,
      } });
    }

    if (action === "single_sessions_global") {
      const { data, error } = await supabase.from("single_session_bookings")
        .select("id,start_at,end_at,status,meet_url,name,email,user_id,created_at")
        .order("start_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return json({ bookings: (data ?? []).map((row: any) => singleSessionDto(row)) });
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("booking_passes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ passes: data ?? [] });
    }

    if (action === "history") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const { data, error } = await supabase
        .from("booking_pass_redemptions")
        .select("*")
        .eq("booking_pass_id", passId)
        .order("start_at", { ascending: false });
      if (error) throw error;
      return json({ redemptions: data ?? [] });
    }

    if (action === "list_students") {
      // Every real student account, for the New Pass picker. Admins excluded.
      const { data: profiles, error: pErr } = await supabase
        .from("profiles").select("class_id, display_name");
      if (pErr) throw pErr;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin");
      const adminIds = new Set((roles ?? []).map((r: { user_id: string }) => r.user_id));
      const { data: authRes, error: aErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (aErr) throw aErr;
      const emailMap = new Map(authRes.users.map((u: { id: string; email?: string }) => [u.id, u.email ?? null]));
      const students = (profiles ?? [])
        .filter((p: { class_id: string }) => !adminIds.has(p.class_id))
        .map((p: { class_id: string; display_name: string | null }) => ({
          id: p.class_id,
          name: p.display_name || null,
          email: emailMap.get(p.class_id) ?? null,
        }))
        .sort((a, b) => (a.name || a.email || "").localeCompare(b.name || b.email || ""));
      return json({ students });
    }

    if (action === "create") {
      const validated = validateNewPassInput({
        totalCredits: body.total_credits,
        sessionLengthMinutes: body.session_length_minutes,
        expiresAt: body.expires_at,
      });
      if (!validated.ok) return json({ error: validated.error }, 400);
      const { totalCredits, sessionLengthMinutes: sessionLen, expiresAt } = validated.value;
      const raw = genToken();
      const hash = await sha256Hex(raw);

      // Passes created by name/email only are invisible to the signed-in
      // surfaces (in-app booking page, uploads, schedule history). If the email
      // matches a real account, attach it now so both doors agree.
      if (!body.student_id && body.student_email) {
        body.student_id = await findAuthUserIdByEmail(supabase, body.student_email);
      }

      // When granting to a real student account, go through grant_booking_access
      // so any prior active pass is atomically revoked (one-active-per-student)
      // AND the public booking slug is created in the same transaction.
      if (body.student_id) {
        // Generate slug + retry on the (rare) unique collision.
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const slug = generateBookingSlug(body.student_name, body.student_email);
          const { data, error } = await supabase.rpc("grant_booking_access", {
            _student_id: body.student_id,
            _student_name: body.student_name || null,
            _student_email: body.student_email || null,
            _total_credits: totalCredits,
            _session_length_minutes: sessionLen,
            _expires_at: expiresAt,
            _created_by: user.id,
            _token_hash: hash,
            _booking_slug: slug,
          });
          if (!error) return json({ pass: data, booking_url: bookingUrl(slug) });
          const msg = String(error.message || "");
          if (msg.includes("student_id_required")) return json({ error: "student_id_required" }, 400);
          if ((error as { code?: string }).code === "23505") { lastErr = error; continue; } // slug collision → retry
          throw error;
        }
        console.error("booking slug collision", lastErr);
        return json({ error: "slug_collision" }, 409);
      }

      // Manual passes use the same strong public-link path as account-backed passes.
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = generateBookingSlug(body.student_name, body.student_email);
        const { data, error } = await supabase.rpc("create_manual_booking_pass", {
          _student_name: body.student_name || null,
          _student_email: body.student_email || null,
          _total_credits: totalCredits,
          _session_length_minutes: sessionLen,
          _expires_at: expiresAt,
          _notes: body.notes || null,
          _created_by: user.id,
          _token_hash: hash,
          _booking_slug: slug,
        });
        if (!error) return json({ pass: data, booking_url: bookingUrl(slug) });
        if ((error as { code?: string }).code === "23505") { lastErr = error; continue; }
        throw error;
      }
      console.error("booking slug collision", lastErr);
      return json({ error: "slug_collision" }, 409);
    }

    if (action === "get_availability") {
      const { data, error } = await supabase.rpc("get_booking_availability");
      if (error) throw error;
      return json(data ?? { timezone: "America/Toronto", ranges: [] });
    }

    if (action === "set_availability") {
      const { data, error } = await supabase.rpc("set_booking_availability", {
        _timezone: body.timezone || null,
        _ranges: body.ranges ?? [],
      });
      if (error) throw error;
      return json(data ?? { timezone: "America/Toronto", ranges: [] });
    }

    if (action === "get_for_student") {
      const studentId = String(body.student_id || "");
      if (!studentId) return json({ error: "student_id_required" }, 400);
      const { data, error } = await supabase
        .from("booking_passes")
        .select("id,total_credits,used_credits,session_length_minutes,status,expires_at,created_at,booking_slug")
        .eq("student_id", studentId)
        .in("status", ["active", "paused", "exhausted", "expired"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const { data: verifiedRows, error: verifiedError } = await supabase.from("single_session_bookings")
        .select("id,start_at,end_at,status,meet_url,name,email,user_id,created_at")
        .eq("user_id", studentId)
        .order("start_at", { ascending: false });
      if (verifiedError) throw verifiedError;
      const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(studentId);
      if (authUserError) throw authUserError;
      let possibleRows: any[] = [];
      if (authUser?.user?.email) {
        const { data: emailRows, error: emailError } = await supabase.from("single_session_bookings")
          .select("id,start_at,end_at,status,meet_url,name,email,user_id,created_at")
          .ilike("email", authUser.user.email.trim())
          .order("start_at", { ascending: false });
        if (emailError) throw emailError;
        possibleRows = (emailRows ?? []).filter((row: any) => row.user_id !== studentId);
      }
      const associations = {
        single_session_bookings: (verifiedRows ?? []).map((row: any) => singleSessionDto(row, "verified_account")),
        single_session_possible_matches: possibleRows.map((row: any) => singleSessionDto(row, "possible_match_unverified_email")),
      };
      if (!data) return json({ pass: null, ...associations });
      return json({
        pass: {
          id: data.id,
          total_credits: data.total_credits,
          used_credits: data.used_credits,
          credits_remaining: Math.max(0, data.total_credits - data.used_credits),
          session_length_minutes: data.session_length_minutes,
          status: data.status,
          expires_at: data.expires_at,
          booking_url: data.booking_slug ? bookingUrl(data.booking_slug) : null,
        },
        ...associations,
      });
    }

    if (action === "regenerate_link") {
      const studentId = String(body.student_id || "");
      if (!studentId) return json({ error: "student_id_required" }, 400);
      // Rotate slug + token_hash atomically; retry on the rare slug collision.
      let lastErr: unknown = null;
      // Need the current name/email for a nice slug prefix.
      const { data: cur } = await supabase
        .from("booking_passes").select("student_name,student_email")
        .eq("student_id", studentId).in("status", ["active", "paused"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = generateBookingSlug(cur?.student_name, cur?.student_email);
        const newHash = await sha256Hex(genToken());
        const { data, error } = await supabase.rpc("regenerate_booking_link", {
          _student_id: studentId, _new_slug: slug, _new_token_hash: newHash,
        });
        if (!error) return json({ booking_url: bookingUrl(String(data)) });
        const msg = String(error.message || "");
        if (msg.includes("no_active_pass") || msg.includes("no_resumable_pass")) {
          return json({ error: "no_resumable_pass" }, 404);
        }
        if ((error as { code?: string }).code === "23505") { lastErr = error; continue; }
        throw error;
      }
      console.error("booking slug collision", lastErr);
      return json({ error: "slug_collision" }, 409);
    }

    if (action === "update") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const { data: cur, error: curErr } = await supabase
        .from("booking_passes").select("*").eq("id", passId).single();
      if (curErr) throw curErr;

      let requestedRemaining: number | null = null;
      if (body.total_credits !== undefined) {
        const total = Number(body.total_credits);
        if (!Number.isInteger(total) || total < 1 || total > 50) return json({ error: "invalid_credits" }, 400);
        requestedRemaining = Math.max(0, total - cur.used_credits);
      }
      let requestedSessionLength: number | null = null;
      if (body.session_length_minutes !== undefined) {
        const sessionLen = Number(body.session_length_minutes);
        if (!Number.isInteger(sessionLen) || sessionLen < 15 || sessionLen > 480) {
          return json({ error: "invalid_session_length" }, 400);
        }
        requestedSessionLength = sessionLen;
      }
      let requestedExpiry: string | null = null;
      let clearExpiry = false;
      if (body.expires_at !== undefined) {
        if (body.expires_at === null || body.expires_at === "") {
          clearExpiry = true;
        } else if (typeof body.expires_at !== "string" || !Number.isFinite(Date.parse(body.expires_at))) {
          return json({ error: "invalid_expiry" }, 400);
        } else {
          requestedExpiry = new Date(Date.parse(body.expires_at)).toISOString();
        }
      }
      let pass = cur;
      if (requestedRemaining !== null) {
        const { data, error } = await supabase.rpc("manage_booking_pass", {
          _pass_id: passId,
          _action: "set_terms_and_remaining",
          _credits: requestedRemaining,
          _session_length_minutes: requestedSessionLength,
          _expires_at: requestedExpiry,
          _clear_expiry: clearExpiry,
        });
        if (error) throw error;
        pass = data;
      } else if (requestedSessionLength !== null || body.expires_at !== undefined) {
        const { data, error } = await supabase.rpc("manage_booking_pass", {
          _pass_id: passId,
          _action: "update_terms",
          _session_length_minutes: requestedSessionLength,
          _expires_at: requestedExpiry,
          _clear_expiry: clearExpiry,
        });
        if (error) throw error;
        pass = data;
      }
      if (body.notes !== undefined) {
        const { data, error } = await supabase.from("booking_passes")
          .update({ notes: body.notes || null }).eq("id", passId).select().single();
        if (error) throw error;
        pass = data;
      }
      return json({ pass });
    }

    if (action === "set_paused") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const { data, error } = await supabase.rpc("manage_booking_pass", {
        _pass_id: passId, _action: body.paused ? "pause" : "resume",
      });
      if (error) throw error;
      return json({ pass: data });
    }

    if (action === "list_bookings") {
      const { data, error } = await supabase
        .from("booking_pass_redemptions")
        .select("*, booking_passes(id, student_name, student_email, student_id, session_length_minutes), external_work_uploads(id, file_name)")
        .order("start_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      // Flatten to an upload_count so the client doesn't ship file lists it
      // won't render until the row is expanded (files are fetched on demand).
      const bookings = (data ?? []).map((b: any) => ({
        ...b,
        upload_count: Array.isArray(b.external_work_uploads) ? b.external_work_uploads.length : 0,
        external_work_uploads: undefined,
      }));
      return json({ bookings });
    }

    if (action === "get_booking_health") {
      const { data, error } = await supabase.rpc("get_booking_health");
      if (error) throw error;
      return json(data);
    }

    // Files a student attached to a specific booking, with short-lived signed
    // download URLs (private bucket). Admin-only; RLS is bypassed by the service
    // role, so the admin gate above is the access control.
    if (action === "get_booking_uploads") {
      const redemptionId = String(body.redemption_id || "");
      if (!redemptionId) return json({ error: "redemption_id_required" }, 400);
      const { data: rows, error } = await supabase
        .from("external_work_uploads")
        .select("id, file_name, file_type, storage_path, created_at")
        .eq("redemption_id", redemptionId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const uploads = [];
      for (const r of rows ?? []) {
        const { data: signed } = await supabase.storage
          .from("external-work-uploads")
          .createSignedUrl(r.storage_path, 600); // 10 min
        uploads.push({
          id: r.id, file_name: r.file_name, file_type: r.file_type,
          created_at: r.created_at, url: signed?.signedUrl ?? null,
        });
      }
      return json({ uploads });
    }

    if (action === "cancel_booking") {
      const redemptionId = String(body.redemption_id || "");
      if (!redemptionId) return json({ error: "redemption_id_required" }, 400);
      const { data: result, error } = await supabase.rpc("cancel_booking_redemption", {
        _redemption_id: redemptionId, _refund: true, _actor_id: user.id,
      });
      if (error) throw error;
      const redemption = result?.redemption;
      if (redemption?.calendar_action === "delete" && redemption.google_event_id) {
        const { data: state, error: stateErr } = await supabase.from("gcal_sync_state")
          .select("calendar_id").eq("id", 1).maybeSingle();
        if (stateErr) throw stateErr;
        try {
          await deleteEvent(state?.calendar_id || "primary", redemption.google_event_id, { sendUpdates: "all" });
          const { error: persistErr } = await supabase.from("booking_pass_redemptions").update({
            calendar_action: "none", calendar_status: "synced", calendar_error: null,
            calendar_last_synced_at: new Date().toISOString(), needs_gcal_sync: false,
            gcal_state: "synced", gcal_error: null,
          }).eq("id", redemptionId);
          if (persistErr) throw persistErr;
          redemption.calendar_action = "none";
          redemption.calendar_status = "synced";
        } catch (calendarError) {
          const message = calendarError instanceof Error ? calendarError.message : String(calendarError);
          const { error: persistErr } = await supabase.from("booking_pass_redemptions").update({
            calendar_action: "delete", calendar_status: "pending", calendar_error: message,
            needs_gcal_sync: true, gcal_state: "pending", gcal_error: message,
          }).eq("id", redemptionId);
          if (persistErr) throw persistErr;
          redemption.calendar_status = "pending";
        }
      }
      return json({ ...result, redemption });
    }

    if (action === "mark_no_show") {
      const redemptionId = String(body.redemption_id || "");
      if (!redemptionId) return json({ error: "redemption_id_required" }, 400);
      const { data, error } = await supabase
        .from("booking_pass_redemptions")
        .update({ status: "no_show" })
        .eq("id", redemptionId)
        .eq("status", "booked")
        .select().single();
      if (error) throw error;
      return json({ redemption: data });
    }

    if (action === "rotate") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const { data: cur, error: curErr } = await supabase
        .from("booking_passes").select("*").eq("id", passId).single();
      if (curErr) throw curErr;

      // The slug is the bearer link, so every pass rotates through a slug RPC.
      // This also upgrades legacy manual passes that never received a slug.
      if (!cur.student_id) {
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const slug = generateBookingSlug(cur.student_name, cur.student_email);
          const newHash = await sha256Hex(genToken());
          const { data, error } = await supabase.rpc("regenerate_manual_booking_link", {
            _pass_id: passId, _new_slug: slug, _new_token_hash: newHash,
          });
          if (!error) return json({ booking_url: bookingUrl(String(data)) });
          const msg = String(error.message || "");
          if (msg.includes("no_resumable_pass")) return json({ error: "no_resumable_pass" }, 404);
          if ((error as { code?: string }).code === "23505") { lastErr = error; continue; }
          throw error;
        }
        console.error("booking slug collision", lastErr);
        return json({ error: "slug_collision" }, 409);
      }
      if (cur.student_id) {
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const slug = generateBookingSlug(cur.student_name, cur.student_email);
          const newHash = await sha256Hex(genToken());
          const { data, error } = await supabase.rpc("regenerate_booking_link", {
            _student_id: cur.student_id, _new_slug: slug, _new_token_hash: newHash,
          });
          if (!error) return json({ booking_url: bookingUrl(String(data)) });
          const msg = String(error.message || "");
          if (msg.includes("no_resumable_pass")) return json({ error: "no_resumable_pass" }, 404);
          if ((error as { code?: string }).code === "23505") { lastErr = error; continue; }
          throw error;
        }
        console.error("booking slug collision", lastErr);
        return json({ error: "slug_collision" }, 409);
      }
      return json({ error: "no_resumable_pass" }, 404);
    }

    if (action === "revoke") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const { data, error } = await supabase.rpc("manage_booking_pass", {
        _pass_id: passId, _action: "revoke",
      });
      if (error) throw error;
      return json({ pass: data });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("booking-pass-admin error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

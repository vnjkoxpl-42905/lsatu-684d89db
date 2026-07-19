// Admin-only booking pass management: create / list / revoke / rotate.
// Returns the raw token exactly once on create/rotate.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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
    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

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

    if (action === "create") {
      const totalCredits = Math.max(1, Math.min(50, Number(body.total_credits) || 0));
      if (!totalCredits) return json({ error: "invalid_credits" }, 400);
      const sessionLen = Math.max(15, Math.min(240, Number(body.session_length_minutes) || 60));
      const raw = genToken();
      const hash = await sha256Hex(raw);

      // When granting to a real student account, go through grant_booking_access
      // so any prior active pass is atomically revoked (one-active-per-student).
      if (body.student_id) {
        const { data, error } = await supabase.rpc("grant_booking_access", {
          _student_id: body.student_id,
          _student_name: body.student_name || null,
          _student_email: body.student_email || null,
          _total_credits: totalCredits,
          _session_length_minutes: sessionLen,
          _expires_at: body.expires_at || null,
          _created_by: user.id,
          _token_hash: hash,
        });
        if (error) {
          const msg = String(error.message || "");
          if (msg.includes("student_id_required")) return json({ error: "student_id_required" }, 400);
          throw error;
        }
        return json({ pass: data, raw_token: raw });
      }

      // Name/email-only pass (no student account): plain insert, unchanged.
      const { data, error } = await supabase.from("booking_passes").insert({
        token_hash: hash,
        student_id: null,
        student_email: body.student_email || null,
        student_name: body.student_name || null,
        total_credits: totalCredits,
        session_length_minutes: sessionLen,
        expires_at: body.expires_at || null,
        notes: body.notes || null,
        created_by: user.id,
      }).select().single();
      if (error) throw error;
      return json({ pass: data, raw_token: raw });
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
        .select("id,total_credits,used_credits,session_length_minutes,status,expires_at,created_at")
        .eq("student_id", studentId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return json({ pass: null });
      return json({
        pass: {
          id: data.id,
          total_credits: data.total_credits,
          used_credits: data.used_credits,
          credits_remaining: Math.max(0, data.total_credits - data.used_credits),
          session_length_minutes: data.session_length_minutes,
          status: data.status,
          expires_at: data.expires_at,
        },
      });
    }

    if (action === "rotate") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const raw = genToken();
      const hash = await sha256Hex(raw);
      const { data, error } = await supabase
        .from("booking_passes")
        .update({ token_hash: hash })
        .eq("id", passId)
        .select().single();
      if (error) throw error;
      return json({ pass: data, raw_token: raw });
    }

    if (action === "revoke") {
      const passId = String(body.pass_id || "");
      if (!passId) return json({ error: "pass_id_required" }, 400);
      const { data, error } = await supabase
        .from("booking_passes")
        .update({ status: "revoked" })
        .eq("id", passId)
        .select().single();
      if (error) throw error;
      return json({ pass: data });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("booking-pass-admin error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

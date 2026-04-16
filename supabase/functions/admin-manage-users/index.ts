import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_FLAGS = [
  "has_bootcamp_access",
  "has_classroom_access",
  "has_analytics_access",
  "has_schedule_access",
  "has_practice_access",
  "has_drill_access",
  "has_waj_access",
  "has_flagged_access",
  "has_chat_access",
  "has_export_access",
];

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing auth");

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await anonClient.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Forbidden");

  return { admin, callerId: user.id };
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin } = await verifyAdmin(req);

    // ── GET: list users + analytics ──
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("mode");

      // Analytics mode
      if (mode === "analytics") {
        const { data: profiles } = await admin
          .from("profiles")
          .select("class_id, last_seen_at, " + ALL_FLAGS.join(", "));

        const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });

        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const { data: roles } = await admin.from("user_roles").select("user_id, role");
        const adminCount = (roles || []).filter((r: any) => r.role === "admin").length;

        const activeToday = (profiles || []).filter((p: any) =>
          p.last_seen_at && new Date(p.last_seen_at) > dayAgo
        ).length;

        const activeWeek = (profiles || []).filter((p: any) =>
          p.last_seen_at && new Date(p.last_seen_at) > weekAgo
        ).length;

        // Feature adoption counts
        const adoption: Record<string, number> = {};
        for (const flag of ALL_FLAGS) {
          adoption[flag] = (profiles || []).filter((p: any) => p[flag] === true).length;
        }

        // Recent attempts stats
        const { count: totalAttempts } = await admin
          .from("attempts")
          .select("id", { count: "exact", head: true });

        const { count: weekAttempts } = await admin
          .from("attempts")
          .select("id", { count: "exact", head: true })
          .gte("timestamp_iso", weekAgo.toISOString());

        return jsonRes({
          total_users: authUsers?.length || 0,
          active_today: activeToday,
          active_week: activeWeek,
          admin_count: adminCount,
          feature_adoption: adoption,
          total_attempts: totalAttempts || 0,
          week_attempts: weekAttempts || 0,
        });
      }

      // Default: list users
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("class_id, display_name, last_seen_at, " + ALL_FLAGS.join(", "));
      if (pErr) throw pErr;

      const { data: { users: authUsers }, error: aErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (aErr) throw aErr;

      const emailMap = new Map(authUsers.map((u: any) => [u.id, u.email]));

      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string>();
      for (const r of roles || []) {
        roleMap.set(r.user_id, r.role);
      }

      const result = (profiles || []).map((p: any) => ({
        ...p,
        email: emailMap.get(p.class_id) || "unknown",
        role: roleMap.get(p.class_id) || "user",
      }));

      return jsonRes(result);
    }

    // ── POST: toggle flag, bulk actions, role management ──
    if (req.method === "POST") {
      const body = await req.json();
      const { action } = body;

      // Toggle single flag
      if (!action || action === "toggle") {
        const { class_id, field, value } = body;
        if (!class_id || !ALL_FLAGS.includes(field) || typeof value !== "boolean") {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        const { error } = await admin
          .from("profiles")
          .update({ [field]: value })
          .eq("class_id", class_id);
        if (error) throw error;
        return jsonRes({ success: true });
      }

      // Bulk grant/revoke all flags for a user
      if (action === "bulk_user") {
        const { class_id, value } = body;
        if (!class_id || typeof value !== "boolean") {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        const updates: Record<string, boolean> = {};
        for (const flag of ALL_FLAGS) updates[flag] = value;
        const { error } = await admin
          .from("profiles")
          .update(updates)
          .eq("class_id", class_id);
        if (error) throw error;
        return jsonRes({ success: true });
      }

      // Set role
      if (action === "set_role") {
        const { user_id, role } = body;
        if (!user_id || !["admin", "user"].includes(role)) {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        if (role === "admin") {
          await admin
            .from("user_roles")
            .upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
        } else {
          await admin
            .from("user_roles")
            .delete()
            .eq("user_id", user_id)
            .eq("role", "admin");
        }
        return jsonRes({ success: true });
      }

      return jsonRes({ error: "Unknown action" }, 400);
    }

    return jsonRes({ error: "Method not allowed" }, 405);
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg === "Forbidden" ? 403 : msg === "Unauthorized" || msg === "Missing auth" ? 401 : 500;
    return jsonRes({ error: msg }, status);
  }
});

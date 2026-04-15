import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role using service role client
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: list all users with their access flags
    if (req.method === "GET") {
      // Get all profiles
      const { data: profiles, error: pErr } = await admin
        .from("profiles")
        .select("class_id, display_name, has_bootcamp_access, has_classroom_access, has_analytics_access, has_schedule_access");

      if (pErr) throw pErr;

      // Get all auth users for emails
      const { data: { users: authUsers }, error: aErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (aErr) throw aErr;

      const emailMap = new Map(authUsers.map((u: any) => [u.id, u.email]));

      const result = (profiles || []).map((p: any) => ({
        ...p,
        email: emailMap.get(p.class_id) || "unknown",
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: toggle a user's access flag
    if (req.method === "POST") {
      const { class_id, field, value } = await req.json();

      const allowedFields = [
        "has_bootcamp_access",
        "has_classroom_access",
        "has_analytics_access",
        "has_schedule_access",
      ];

      if (!class_id || !allowedFields.includes(field) || typeof value !== "boolean") {
        return new Response(JSON.stringify({ error: "Invalid params" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: uErr } = await admin
        .from("profiles")
        .update({ [field]: value })
        .eq("class_id", class_id);

      if (uErr) throw uErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

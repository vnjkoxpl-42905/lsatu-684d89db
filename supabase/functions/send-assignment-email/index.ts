import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  studentId: string;
  title: string;
  description?: string;
  route: string;
  assignmentType?: string;
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing auth");

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error } = await anonClient.auth.getUser();
  if (error || !userData?.user) throw new Error("Unauthorized");

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleData) throw new Error("Forbidden");

  return { admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin } = await verifyAdmin(req);

    const body = (await req.json()) as Payload;
    const { studentId, title, description, route } = body;
    if (!studentId || !title || !route) {
      return jsonRes({ ok: false, error: "missing required fields" });
    }

    // Service-role lookup of student email. The client never sees PII.
    const { data: userResp, error: lookupErr } = await admin.auth.admin.getUserById(studentId);
    if (lookupErr) {
      return jsonRes({ ok: false, error: `lookup failed: ${lookupErr.message}` });
    }
    const email = userResp?.user?.email;
    if (!email) {
      return jsonRes({ ok: false, error: "no email on file" });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return jsonRes({ ok: false, error: "email provider not configured" });
    }
    const from = Deno.env.get("FROM_EMAIL");
    if (!from) {
      return jsonRes({ ok: false, error: "FROM_EMAIL not configured" });
    }
    const appBase = Deno.env.get("APP_BASE_URL") ?? "";
    const link = appBase ? `${appBase}${route}` : route;

    const text =
      `Joshua assigned new work in LSAT U.\n\n` +
      `${title}\n` +
      (description ? `${description}\n\n` : `\n`) +
      `Open your Classroom:\n${link}\n`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: `New LSAT U assignment: ${title}`,
        text,
      }),
    });

    if (!r.ok) {
      // Read response body for diagnostics but don't echo it back to the
      // client — keep the surface narrow.
      let detail = "";
      try {
        detail = await r.text();
      } catch {
        // ignore
      }
      console.error("[send-assignment-email] resend failed", {
        status: r.status,
        detail,
      });
      return jsonRes({ ok: false, error: `resend ${r.status}` });
    }

    return jsonRes({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Forbidden") return jsonRes({ error: msg }, 403);
    if (msg === "Unauthorized" || msg === "Missing auth") return jsonRes({ error: msg }, 401);
    console.error("[send-assignment-email] error", err);
    return jsonRes({ ok: false, error: msg }, 200);
  }
});

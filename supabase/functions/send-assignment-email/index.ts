import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { sendAppEmail } from "../_shared/sendAppEmail.ts";

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

  return { admin, authHeader };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin, authHeader } = await verifyAdmin(req);

    const body = (await req.json()) as Payload;
    const { studentId, title, description, route, assignmentType } = body;
    if (!studentId || !title || !route) {
      return jsonRes({ ok: false, error: "missing required fields" });
    }

    // Service-role lookup of student email + name. The client never sees PII.
    const { data: userResp, error: lookupErr } = await admin.auth.admin.getUserById(studentId);
    if (lookupErr) {
      return jsonRes({ ok: false, error: `lookup failed: ${lookupErr.message}` });
    }
    const email = userResp?.user?.email;
    if (!email) {
      return jsonRes({ ok: false, error: "no email on file" });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("class_id", studentId)
      .maybeSingle();
    const studentName = (profile as { display_name?: string } | null)?.display_name ?? undefined;

    const appBase = Deno.env.get("APP_BASE_URL") ?? "https://lsatprep.study";
    const link = `${appBase}${route}`;

    // Send through Lovable's managed email delivery.
    try {
      const result = await sendAppEmail("assignment-notification", email, {
        idempotencyKey: `assign-${studentId}-${route}-${title}`.slice(0, 200),
        templateData: {
          studentName,
          itemTitle: title,
          itemType: assignmentType ?? "assignment",
          assignedBy: "Joshua",
          link,
        },
      });
      if (!result.sent) {
        return jsonRes({ ok: false, error: "recipient_suppressed" });
      }
    } catch (mailErr) {
      const detail = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error("[send-assignment-email] send failed", { detail });
      return jsonRes({ ok: false, error: "email send failed" });
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

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendAppEmail } from "../_shared/sendAppEmail.ts";
import {
  buildOnboardingMarkdown,
  type OnboardingProfile,
} from "../_shared/onboardingMarkdown.ts";

// Emails Joshua one Markdown summary when a student finishes the intake.
//
// Two ways in, one outcome:
//   - the student's own browser calls this right after the completing save;
//   - an admin calls it with { action: "sweep" } to catch anyone whose tab
//     closed before that call landed.
// Both stamp profiles.onboarding_notified_at, so nobody is ever mailed twice.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROFILE_COLUMNS =
  "class_id, display_name, onboarding, onboarding_completed_at, onboarding_notified_at";

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function callerId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth");
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data, error } = await anon.auth.getClaims(authHeader.slice("Bearer ".length));
  if (error || !data?.claims?.sub) throw new Error("Unauthorized");
  return data.claims.sub as string;
}

/** Sends for one profile and stamps it. Returns false when nothing was owed. */
async function notify(
  admin: ReturnType<typeof adminClient>,
  row: Record<string, unknown>,
): Promise<boolean> {
  if (!row.onboarding_completed_at) return false;
  if (row.onboarding_notified_at) return false;

  const classId = row.class_id as string;
  const { data: authUser } = await admin.auth.admin.getUserById(classId);
  const profile: OnboardingProfile = {
    class_id: classId,
    display_name: (row.display_name as string) ?? null,
    email: authUser?.user?.email ?? null,
    onboarding: (row.onboarding as Record<string, unknown>) ?? null,
    onboarding_completed_at: row.onboarding_completed_at as string,
  };

  const markdown = buildOnboardingMarkdown(profile);
  await sendAppEmail("onboarding-intake", "", {
    // Same key for the same student forever, so a retry cannot double-send.
    idempotencyKey: `onboarding-intake:${classId}`,
    replyTo: profile.email ?? undefined,
    templateData: {
      studentName: profile.display_name || profile.email || "Unknown student",
      studentEmail: profile.email ?? "",
      markdown,
    },
  });

  // Stamped only after a send that did not throw. A failed send leaves the
  // profile owed, and the next sweep retries it.
  const { error } = await admin
    .from("profiles")
    .update({ onboarding_notified_at: new Date().toISOString() })
    .eq("class_id", classId);
  if (error) throw error;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = adminClient();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    if (body?.action === "sweep") {
      const uid = await callerId(req);
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) return jsonRes({ error: "Forbidden" }, 403);

      const { data: owed, error } = await admin
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .not("onboarding_completed_at", "is", null)
        .is("onboarding_notified_at", null);
      if (error) throw error;

      let sent = 0;
      const failed: string[] = [];
      for (const row of owed ?? []) {
        // One student's bad address must not strand the rest of the queue.
        try {
          if (await notify(admin, row as Record<string, unknown>)) sent += 1;
        } catch (err) {
          console.error("sweep: send failed", { class_id: row.class_id, err });
          failed.push(row.class_id as string);
        }
      }
      return jsonRes({ success: true, sent, failed });
    }

    // Default: the student who just finished, notifying about themselves.
    const uid = await callerId(req);
    const { data: row, error } = await admin
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("class_id", uid)
      .maybeSingle();
    if (error) throw error;
    if (!row) return jsonRes({ error: "No profile" }, 404);

    const sent = await notify(admin, row as Record<string, unknown>);
    return jsonRes({ success: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("onboarding-intake-notify failed", message);
    const status = message === "Unauthorized" || message === "Missing auth" ? 401 : 500;
    return jsonRes({ error: message }, status);
  }
});

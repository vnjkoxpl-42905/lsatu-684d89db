import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The primary admin account can never be demoted, so the system always retains
// at least one admin and can never be locked out of role management.
const PRIMARY_ADMIN_EMAIL = "contact@aspiringattorneys.com";

// The twelve switches a tier sets. has_waj_access is retired (the journal reads
// has_journal_access alone) and stays in ALL_FLAGS only so that revoking and
// archiving still clear it.
const TIER_FLAGS = [
  "has_drill_access",
  "has_practice_access",
  "has_activity_access",
  "has_bootcamp_access",
  "has_journal_access",
  "has_flagged_access",
  "has_analytics_access",
  "has_export_access",
  "has_classroom_access",
  "has_chat_access",
  "has_schedule_access",
  "has_ta_access",
];
const FLOOR_FLAGS = ["has_chat_access", "has_schedule_access"];
const TIERS = ["tier_1", "tier_2", "tier_3"];

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
  "has_ta_access",
  "has_journal_access",
  "has_activity_access",
];

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing auth");
  const token = authHeader.slice("Bearer ".length);

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: claimsData, error } = await anonClient.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) throw new Error("Unauthorized");
  const user = { id: claimsData.claims.sub as string };

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: roleData, error: roleLookupError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleLookupError) {
    console.error("verifyAdmin: role lookup failed", {
      user_id: user.id,
      error: roleLookupError,
    });
    throw new Error("Forbidden");
  }
  if (!roleData) throw new Error("Forbidden");

  return { admin, callerId: user.id };
}

// Admin accounts are out of scope for archive, restore and deletion: the
// People page manages students, and an administrator removed by one of these
// actions could lock the whole platform out of its own role management.
async function assertNotAdminAccount(
  admin: Awaited<ReturnType<typeof verifyAdmin>>["admin"],
  class_id: string,
  email: string,
) {
  if (email && email.toLowerCase() === PRIMARY_ADMIN_EMAIL) {
    return "The primary admin account cannot be modified here.";
  }
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", class_id)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw error;
  if (data) return "Administrator accounts cannot be archived, restored or deleted.";
  return null;
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
    const { admin, callerId } = await verifyAdmin(req);

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
        .select("class_id, display_name, last_seen_at, archived_at, archived_reason, access_tier, " + ALL_FLAGS.join(", "));
      if (pErr) throw pErr;

      const { data: { users: authUsers }, error: aErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (aErr) throw aErr;

      const emailMap = new Map(authUsers.map((u: any) => [u.id, u.email]));
      const createdMap = new Map(authUsers.map((u: any) => [u.id, u.created_at]));

      const { data: roles } = await admin.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string>();
      for (const r of roles || []) {
        roleMap.set(r.user_id, r.role);
      }

      const result = (profiles || []).map((p: any) => ({
        ...p,
        email: emailMap.get(p.class_id) || "unknown",
        created_at: createdMap.get(p.class_id) || null,
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
        // Return the row we actually wrote. A filter that matches nothing is
        // not an error in PostgREST, so without this the dashboard would show
        // a successful toggle that never landed and then snap back on reload.
        const { data: updated, error } = await admin
          .from("profiles")
          .update({ [field]: value })
          .eq("class_id", class_id)
          .select("class_id, " + field);
        if (error) throw error;
        if (!updated || updated.length === 0) {
          console.error("toggle: no profile matched", { class_id, field, value });
          return jsonRes({ error: "No profile matched that class_id" }, 404);
        }
        return jsonRes({ success: true, profile: updated[0] });
      }

      // Apply a template (explicit flag map) to a user. One DB update so
      // the user never sits in a partially-applied state.
      if (action === "apply_template") {
        const { class_id, flags } = body;
        if (!class_id || !flags || typeof flags !== "object") {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        const updates: Record<string, boolean> = {};
        for (const flag of ALL_FLAGS) {
          if (typeof flags[flag] === "boolean") {
            updates[flag] = flags[flag];
          }
        }
        if (Object.keys(updates).length === 0) {
          return jsonRes({ error: "No valid flags" }, 400);
        }
        const { error } = await admin
          .from("profiles")
          .update(updates)
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

      // Put an account back to the state a brand-new signup is in: no intake
      // answers, no name, the intake email re-armed, and every paid door shut.
      // Built for testing the signup path end to end without hand-written SQL,
      // and for the case where a student needs to answer the intake again.
      //
      // Deliberately does not touch auth: the account, its password and its
      // work all survive. Nothing here deletes a student's practice history.
      if (action === "reset_onboarding") {
        const { class_id, lock = true } = body;
        if (!class_id) return jsonRes({ error: "Invalid params" }, 400);

        const updates: Record<string, unknown> = {
          onboarding: null,
          onboarding_completed_at: null,
          onboarding_notified_at: null,
          display_name: null,
        };
        if (lock) {
          for (const flag of ALL_FLAGS) updates[flag] = false;
          // Communication and booking remain open on an undecided account.
          updates.has_chat_access = true;
          updates.has_schedule_access = true;
          updates.access_tier = null;
        }

        const { data: reset, error } = await admin
          .from("profiles")
          .update(updates)
          .eq("class_id", class_id)
          .select("class_id, display_name, onboarding_completed_at, onboarding_notified_at");
        if (error) throw error;
        if (!reset || reset.length === 0) {
          console.error("reset_onboarding: no profile matched", { class_id });
          return jsonRes({ error: "No profile matched that class_id" }, 404);
        }
        return jsonRes({ success: true, profile: reset[0] });
      }

      // Apply a tier. A tier is a template: Tier 1 turns all twelve switches
      // on, Tier 3 leaves the floor (Classroom, Messages, Schedule) and turns
      // the other nine off, Tier 2 keeps whatever switches are there and only
      // changes the label. One update, so the student never sits half-applied.
      if (action === "set_home_tier" || action === "set_custom_access") {
        if ((action === "set_home_tier" && !["tier_1", "tier_3"].includes(body.tier)) ||
            (action === "set_custom_access" && body.tier !== "tier_2")) return jsonRes({ error: "invalid_tier" }, 400);
        const { data, error } = await admin.rpc("teacher_home_set_access", {
          _actor: callerId, _student: body.class_id, _expected_tier: body.expected_tier,
          _expected_flags: body.expected_flags, _tier: body.tier, _flags: body.flags ?? null,
        });
        if (error) return jsonRes({ error: error.message }, error.message === "forbidden" ? 403 : /conflict|ineligible/.test(error.message) ? 409 : error.message === "access_verification_failed" ? 500 : 400);
        if (!data || data.class_id !== body.class_id) return jsonRes({ error: "access_verification_failed" }, 500);
        return jsonRes({ profile: data });
      }

      if (action === "set_tier") {
        const { class_id, tier } = body;
        if (!class_id || !TIERS.includes(tier)) {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        const updates: Record<string, unknown> = { access_tier: tier };
        for (const flag of ALL_FLAGS) updates[flag] = false;
        for (const flag of ["has_drill_access", "has_practice_access", "has_classroom_access", ...FLOOR_FLAGS]) {
          updates[flag] = tier === "tier_1" || FLOOR_FLAGS.includes(flag) ||
            (tier === "tier_2" && flag === "has_classroom_access");
        }
        for (const flag of ["has_journal_access", "has_flagged_access", "has_analytics_access"]) {
          updates[flag] = tier === "tier_1";
        }
        const { data: updated, error } = await admin
          .from("profiles")
          .update(updates)
          .eq("class_id", class_id)
          .select("class_id, access_tier, " + ALL_FLAGS.join(", "));
        if (error) throw error;
        if (!updated || updated.length === 0) {
          console.error("set_tier: no profile matched", { class_id, tier });
          return jsonRes({ error: "No profile matched that class_id" }, 404);
        }
        return jsonRes({ success: true, profile: updated[0] });
      }

      // Assign one PrepTest sitting. Opens that sitting and nothing else, and
      // puts it on the student's Assigned work like any other assignment.
      if (action === "assign_practice_test") {
        const { class_id, pt, unlock_at = null } = body;
        const ptNum = Number(pt);
        if (!class_id || !Number.isInteger(ptNum) || ptNum <= 0) {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        const { data: assignment, error } = await admin
          .from("practice_test_assignments")
          .upsert(
            {
              student_id: class_id,
              pt: ptNum,
              assigned_by: callerId,
              assigned_at: new Date().toISOString(),
              unlock_at,
              status: "assigned",
            },
            { onConflict: "student_id,pt" },
          )
          .select("id, student_id, pt, status, unlock_at")
          .single();
        if (error) throw error;

        const sourceId = `practice_test:${ptNum}`;
        const { data: existing } = await admin
          .from("classroom_items")
          .select("id")
          .eq("student_id", class_id)
          .eq("type", "practice_test")
          .eq("source_id", sourceId)
          .maybeSingle();
        if (existing) {
          await admin
            .from("classroom_items")
            .update({ status: "assigned", unlock_at, visible_to_student: true })
            .eq("id", existing.id);
        } else {
          const { error: itemError } = await admin.from("classroom_items").insert({
            student_id: class_id,
            created_by: callerId,
            type: "practice_test",
            title: `PrepTest ${ptNum}`,
            description: "A full practice test: three scored sections, in order, with a break.",
            source_table: "practice_test_assignments",
            source_id: sourceId,
            status: "assigned",
            unlock_at,
            visible_to_student: true,
            metadata_json: { pt: ptNum, href: "/testing" },
          });
          if (itemError) throw itemError;
        }
        return jsonRes({ success: true, assignment });
      }

      if (action === "unassign_practice_test") {
        const { class_id, pt } = body;
        const ptNum = Number(pt);
        if (!class_id || !Number.isInteger(ptNum)) return jsonRes({ error: "Invalid params" }, 400);
        const { error } = await admin
          .from("practice_test_assignments")
          .update({ status: "archived" })
          .eq("student_id", class_id)
          .eq("pt", ptNum);
        if (error) throw error;
        await admin
          .from("classroom_items")
          .update({ status: "archived" })
          .eq("student_id", class_id)
          .eq("type", "practice_test")
          .eq("source_id", `practice_test:${ptNum}`);
        return jsonRes({ success: true });
      }

      // Set role
      if (action === "set_role") {
        const { user_id, role } = body;
        if (!user_id || !["admin", "user"].includes(role)) {
          return jsonRes({ error: "Invalid params" }, 400);
        }
        // Protect the primary admin: it can never be demoted, by anyone
        // (including itself). This guarantees the system keeps at least one
        // admin and cannot be locked out.
        if (role === "user") {
          const { data: target } = await admin.auth.admin.getUserById(user_id);
          if ((target?.user?.email || "").toLowerCase() === PRIMARY_ADMIN_EMAIL) {
            return jsonRes({ error: "The primary admin account cannot be demoted." }, 403);
          }
        }
        if (role === "admin") {
          const { error: upsertError } = await admin
            .from("user_roles")
            .upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
          if (upsertError) {
            console.error("set_role: upsert failed", { user_id, error: upsertError });
            throw upsertError;
          }
        } else {
          const { error: deleteError } = await admin
            .from("user_roles")
            .delete()
            .eq("user_id", user_id)
            .eq("role", "admin");
          if (deleteError) {
            console.error("set_role: delete failed", { user_id, error: deleteError });
            throw deleteError;
          }
        }
        return jsonRes({ success: true });
      }

      // Archive: the everyday way to remove someone from the People page.
      // Every door shut, stamped archived, nothing destroyed. Reversible.
      if (action === "archive_student") {
        const { class_id, reason = null } = body;
        if (!class_id) return jsonRes({ error: "Invalid params" }, 400);

        const { data: target } = await admin.auth.admin.getUserById(class_id);
        const blocked = await assertNotAdminAccount(admin, class_id, target?.user?.email || "");
        if (blocked) return jsonRes({ error: blocked }, 403);
        if (class_id === callerId) {
          return jsonRes({ error: "You cannot archive your own account." }, 403);
        }

        // Undecided again: bringing them back is a fresh decision, made from
        // the signup queue, not a silent return to the old tier.
        const updates: Record<string, unknown> = {
          archived_at: new Date().toISOString(),
          archived_reason: reason,
          access_tier: null,
        };
        for (const flag of ALL_FLAGS) updates[flag] = false;

        const { data: archived, error } = await admin
          .from("profiles")
          .update(updates)
          .eq("class_id", class_id)
          .select("class_id, display_name, archived_at");
        if (error) throw error;
        if (!archived || archived.length === 0) {
          console.error("archive_student: no profile matched", { class_id });
          return jsonRes({ error: "No profile matched that class_id" }, 404);
        }

        // Ban sign-in too, so the account cannot come back through the front
        // door. A ban is a property of the auth user, not a deletion: lifting
        // it in unarchive_student restores the account exactly as it was.
        const { error: banError } = await admin.auth.admin.updateUserById(class_id, {
          ban_duration: "876000h",
        });
        if (banError) {
          console.error("archive_student: ban failed", { class_id, error: banError });
          return jsonRes({ error: "Archived, but sign-in could not be blocked." }, 500);
        }

        // An open tab closes on its own as well: the profiles row is in the
        // realtime publication, so useUserPermissions sees archived_at and
        // signs the student out on the next event.
        return jsonRes({ success: true, profile: archived[0] });
      }

      // Unarchive puts them back in the list. Access stays off on purpose:
      // coming back is a decision about which doors to reopen, and silently
      // restoring all thirteen would be a bigger act than the button implies.
      if (action === "unarchive_student") {
        const { class_id } = body;
        if (!class_id) return jsonRes({ error: "Invalid params" }, 400);

        const { data: unarchiveTarget } = await admin.auth.admin.getUserById(class_id);
        const restoreBlocked = await assertNotAdminAccount(
          admin,
          class_id,
          unarchiveTarget?.user?.email || "",
        );
        if (restoreBlocked) return jsonRes({ error: restoreBlocked }, 403);

        // Lift the sign-in ban; feature flags stay off until regranted.
        const { error: unbanError } = await admin.auth.admin.updateUserById(class_id, {
          ban_duration: "none",
        });
        if (unbanError) {
          console.error("unarchive_student: unban failed", { class_id, error: unbanError });
          return jsonRes({ error: "Could not restore sign-in for that account." }, 500);
        }

        const { data: restored, error } = await admin
          .from("profiles")
          .update({ archived_at: null, archived_reason: null })
          .eq("class_id", class_id)
          .select("class_id, display_name, archived_at");
        if (error) throw error;
        if (!restored || restored.length === 0) {
          return jsonRes({ error: "No profile matched that class_id" }, 404);
        }
        return jsonRes({ success: true, profile: restored[0] });
      }

      // Hard delete. Removes the auth user, which cascades to roughly sixty
      // tables. Session records and booking/payment rows are detached rather
      // than destroyed by the snapshot_deleted_student trigger.
      //
      // Guarded three ways, because this cannot be undone: the caller must
      // name the account by email exactly, the primary admin is untouchable,
      // and an admin cannot delete themselves.
      if (action === "delete_student") {
        const { class_id, confirm_email } = body;
        if (!class_id || typeof confirm_email !== "string") {
          return jsonRes({ error: "Invalid params" }, 400);
        }

        const { data: target, error: lookupError } = await admin.auth.admin.getUserById(class_id);
        if (lookupError || !target?.user) {
          return jsonRes({ error: "No account matched that id" }, 404);
        }
        const email = (target.user.email || "").toLowerCase();

        const deleteBlocked = await assertNotAdminAccount(admin, class_id, email);
        if (deleteBlocked) return jsonRes({ error: deleteBlocked }, 403);
        if (class_id === callerId) {
          return jsonRes({ error: "You cannot delete your own account." }, 403);
        }
        if (email !== confirm_email.trim().toLowerCase()) {
          return jsonRes({ error: "The typed email does not match that account." }, 400);
        }

        // Stamp who did it before the row goes; the trigger fills in the rest.
        const { error: deleteError } = await admin.auth.admin.deleteUser(class_id);
        if (deleteError) {
          console.error("delete_student: delete failed", { class_id, error: deleteError });
          throw deleteError;
        }

        // Legacy student-work tables key off class_id with no foreign key, so
        // nothing cascades them. Sweep them only now that the account is gone.
        const { error: purgeError } = await admin.rpc("purge_student_account_data", {
          p_class_id: class_id,
        });
        if (purgeError) {
          console.error("delete_student: purge failed", { class_id, error: purgeError });
        }

        const { error: stampError } = await admin
          .from("deleted_students")
          .update({ deleted_by: callerId })
          .eq("user_id", class_id);
        if (stampError) {
          console.warn("delete_student: could not stamp deleted_by", { class_id, error: stampError.message });
        }

        return jsonRes({ success: true, deleted_email: email });
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

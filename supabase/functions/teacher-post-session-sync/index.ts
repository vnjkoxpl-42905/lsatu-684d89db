import { invalidateDeskRoster, readDesk } from "./desk.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getAccessToken,
  getEvent,
  listEvents,
} from "../_shared/googleCalendar.ts";
import {
  type CalendarEvent,
  classify,
  consultationSource,
  normalizeEmail,
  recordSyncAttempt,
  runWorker,
  type Student,
} from "./model.ts";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-client-info",
  "Content-Type": "application/json",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const owner = Deno.env.get("TEACHER_HOME_OWNER_ID")?.toLowerCase(),
    googleEmail = Deno.env.get("TEACHER_HOME_GOOGLE_EMAIL");
  if (!owner || !googleEmail) {
    return json({ error: "owner_not_configured" }, 503);
  }
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let lease: string | undefined, settings: any;
  let authenticated = false;
  let requestAction: string | undefined = "invalid";
  const startedAt = new Date().toISOString();
  let failureCode = "sync_failed_retry_pending";
  async function rpc(name: string, args: Record<string, unknown>) {
    const r = await db.rpc(name, args);
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  async function rows(table: string) {
    const all: any[] = [];
    for (let offset = 0;; offset += 1000) {
      let query = db.from(table).select("*");
      if (table === "user_roles") query = query.eq("role", "admin");
      const r = await query.order(
        table === "profiles"
          ? "class_id"
          : table === "user_roles"
          ? "user_id"
          : "student_id",
      ).range(offset, offset + 999);
      if (r.error) throw r.error;
      all.push(...r.data);
      if (r.data.length < 1000) return all;
    }
  }
  try {
    const body = await req.json();
    requestAction = body.action;
    if (
      !["sync", "import_folders", "status", "folder_links", "agenda", "email"]
        .includes(
          body.action ?? "sync",
        )
    ) {
      return json({ error: "unknown_action" }, 400);
    }
    if (body.ticket) {
      if (body.action && body.action !== "sync") {
        return json({ error: "ticket_action_denied" }, 403);
      }
      if (
        await rpc("teacher_worker_consume", { _ticket: body.ticket }) !== owner
      ) return json({ error: "invalid_ticket" }, 403);
    } else {
      const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
      if (!token) return json({ error: "unauthorized" }, 401);
      const { data, error } = await db.auth.getUser(token);
      if (error || data.user?.id !== owner) {
        return json({ error: "forbidden" }, 403);
      }
      const role = await db.from("user_roles").select("user_id").eq(
        "user_id",
        owner,
      ).eq("role", "admin").maybeSingle();
      if (role.error || !role.data) return json({ error: "forbidden" }, 403);
    }
    // Read-only areas are isolated from ALL worker health/lease writes, including failures.
    if (body.action === "agenda" || body.action === "email") {
      if (body.ticket) return json({ error: "forbidden" }, 403);
      return json(await readDesk(body, owner, googleEmail, db));
    }
    authenticated = true;
    await recordSyncAttempt(
      requestAction,
      () =>
        rpc("teacher_post_session_attempt", {
          _owner: owner,
          _started: startedAt,
        }),
    );
    const r = await db.from("teacher_post_session_settings").select("*").eq(
      "owner_id",
      owner,
    ).maybeSingle();
    if (r.error) throw r.error;
    settings = r.data;
    // Identity check uses the selected calendar, never the first calendar-list result.
    const cal = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      { headers: { Authorization: `Bearer ${await getAccessToken()}` } },
    );
    if (!cal.ok) {
      failureCode = "primary_calendar_identity_unavailable";
      throw new Error(failureCode);
    }
    const calendar = await cal.json();
    if (
      normalizeEmail(calendar.id ?? "") !== normalizeEmail(googleEmail) ||
      (settings &&
        normalizeEmail(settings.calendar_id) !== normalizeEmail(googleEmail))
    ) {
      failureCode = "calendar_owner_mismatch";
      throw new Error(failureCode);
    }
    if (body.action === "folder_links") {
      if (body.ticket) return json({ error: "forbidden" }, 403);
      const folders: {
        student_id: string;
        local_slug: string;
        folder_id: string;
      }[] = [];
      for (let offset = 0;; offset += 1000) {
        const result = await db.from("teacher_student_folders").select(
          "student_id,local_slug,folder_id",
        ).eq("owner_id", owner).order("local_slug").range(offset, offset + 999);
        if (result.error) throw result.error;
        folders.push(...result.data);
        if (result.data.length < 1000) break;
      }
      return json({
        ok: true,
        drive_root_id: settings?.drive_root_id ?? null,
        folders: folders.map((f) => ({
          student_id: f.student_id,
          slug: f.local_slug,
          folder_id: f.folder_id,
        })),
      });
    }
    const roster: Student[] = [];
    const profiles = await rows("profiles"), roles = await rows("user_roles");
    for (let page = 1;; page++) {
      const r = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (r.error) throw r.error;
      for (const u of r.data.users) {
        const p = profiles.find((p) => p.class_id === u.id);
        roster.push({
          id: u.id,
          email: u.email ?? "",
          name: p?.display_name ?? u.email ?? "Student",
          archived: !p || Boolean(p.archived_at),
          admin: roles.some((r) => r.user_id === u.id && r.role === "admin"),
        });
      }
      if (r.data.users.length < 1000) break;
    }
    if (body.action === "import_folders") {
      if (body.ticket) return json({ error: "forbidden" }, 403);
      if (
        !Array.isArray(body.folders) ||
        !/^[A-Za-z0-9_-]{10,200}$/.test(body.drive_root_id ?? "")
      ) return json({ error: "invalid_manifest" }, 400);
      const linked: any[] = [], unresolved: any[] = [];
      const matches = body.folders.map((f: any) => ({
        f,
        students: roster.filter((s) =>
          !s.admin && !s.archived &&
          (f.emails ?? []).some((e: string) =>
            normalizeEmail(e) === normalizeEmail(s.email)
          )
        ),
      }));
      for (const { f, students } of matches) {
        if (
          students.length !== 1 ||
          (f.student_id && f.student_id !== students[0]?.id) ||
          matches.filter((m: { students: Student[] }) =>
              m.students.some((s: Student) => s.id === students[0]?.id)
            ).length !== 1 ||
          !/^[a-z0-9][a-z0-9_-]{0,100}$/.test(f.slug ?? "") ||
          !/^[A-Za-z0-9_-]{10,200}$/.test(f.folder_id ?? "")
        ) {
          unresolved.push({
            slug: f.slug,
            reason: "missing_or_ambiguous_identity_or_invalid_folder",
          });
          continue;
        }
        // Do not introduce unverified aliases from manifest. Only live account email is trusted.
        linked.push({
          owner_id: owner,
          student_id: students[0].id,
          local_slug: f.slug,
          folder_id: f.folder_id,
          aliases: [normalizeEmail(students[0].email)],
        });
      }
      const result = await rpc("teacher_post_session_import_folders", {
        _owner: owner,
        _calendar: calendar.id,
        _root: body.drive_root_id,
        _folders: linked,
        _dry_run: Boolean(body.dry_run),
      });
      invalidateDeskRoster(owner);
      return json({
        ...result,
        unresolved: [...unresolved, ...result.unresolved],
      });
    }
    if (body.action === "status") {
      return json({
        configured: Boolean(settings),
        enabled: settings?.enabled ?? false,
      });
    }
    if (!settings?.enabled) return json({ status: "disabled" });
    const claimed = await rpc("teacher_post_session_claim", { _owner: owner });
    if (!claimed) return json({ status: "busy_or_disabled" });
    settings = claimed;
    lease = claimed.lease_token;
    const links = (await rows("teacher_student_folders")).filter((f) =>
      f.owner_id === owner
    );
    roster.forEach((s) => {
      s.aliases = links.find((f) => f.student_id === s.id)?.aliases ?? [];
    });
    const now = new Date().toISOString();
    const renew = () =>
      rpc("teacher_post_session_renew", { _owner: owner, _lease: lease });
    const labels: { event_id: string; kind: string }[] = [];
    for (let offset = 0;; offset += 1000) {
      const r = await db.from("teacher_calendar_labels").select("event_id,kind")
        .eq("owner_id", owner).eq("calendar_id", settings.calendar_id).order(
          "event_id",
        ).range(offset, offset + 999);
      if (r.error) throw r.error;
      labels.push(...r.data);
      if (r.data.length < 1000) break;
    }
    const save = async (event: CalendarEvent) => {
      const label = labels.find((l: any) => l.event_id === event.id);
      if (label?.kind === "consultation") {
        await rpc("teacher_home_consultation_source", {
          _owner: owner,
          _lease: lease,
          _event: event.id,
          _source: consultationSource(
            event,
            googleEmail,
            new Date().toISOString(),
          ),
        });
        return;
      }
      if (label?.kind === "general") return;
      const r = await db.from("teacher_post_session_tasks").select(
        "id,starts_at,ends_at",
      ).eq("owner_id", owner).eq("calendar_id", settings.calendar_id).eq(
        "event_id",
        event.id,
      ).maybeSingle();
      if (r.error) throw r.error;
      const source = classify(
        event,
        roster,
        googleEmail,
        settings.activation_cutoff,
        now,
        Boolean(r.data),
        label?.kind === "session",
      );
      if (
        source && r.data && source.source_state === "ended" &&
        (Date.parse(source.starts_at ?? "") !== Date.parse(r.data.starts_at) ||
          Date.parse(source.ends_at ?? "") !== Date.parse(r.data.ends_at))
      ) source.source_state = "rescheduled";
      if (source) {
        await rpc("teacher_post_session_source", {
          _owner: owner,
          _lease: lease,
          _event: event.id,
          _source: source,
        });
      }
    };
    await runWorker(
      {
        renew,
        list: (params) => listEvents("primary", params),
        save,
        get: (id) => getEvent("primary", id),
        revisits: async () => {
          const r = await db.from("teacher_post_session_tasks").select(
            "event_id",
          ).eq("owner_id", owner).is("handled_at", null).order(
            "source_checked_at",
          ).limit(20);
          if (r.error) throw r.error;
          const consultations = await db.from("teacher_home_manual").select(
            "event_id",
          ).eq("owner_id", owner).eq("kind", "consultation").is(
            "handled_at",
            null,
          ).order("source_checked_at").limit(20);
          if (consultations.error) throw consultations.error;
          return [...r.data, ...consultations.data];
        },
        unavailable: (id) =>
          labels.some((l: any) =>
              l.event_id === id && l.kind === "consultation"
            )
            ? rpc("teacher_home_consultation_source", {
              _owner: owner,
              _lease: lease,
              _event: id,
              _source: { source_state: "unavailable" },
            })
            : rpc("teacher_post_session_source", {
              _owner: owner,
              _lease: lease,
              _event: id,
              _source: { source_state: "unavailable", source_updated_at: now },
            }),
        finish: (covered, updated, catchingUp) =>
          rpc("teacher_post_session_finish", {
            _owner: owner,
            _lease: lease,
            _expected: settings.covered_through,
            _covered: covered,
            _updated: updated,
            _catching: catchingUp,
          }),
      },
      settings,
      now,
    );
    return json({ status: "synced" });
  } catch (e) {
    // Provider details can contain event titles or credentials. Store only a bounded operational code.
    if (lease) {
      await rpc("teacher_post_session_finish", {
        _owner: owner,
        _lease: lease,
        _expected: settings.covered_through,
        _covered: null,
        _updated: null,
        _catching: false,
        _error: "sync_failed_retry_pending",
      }).catch(() => undefined);
    }
    if (authenticated && !lease) {
      await recordSyncAttempt(
        requestAction,
        () =>
          rpc("teacher_post_session_attempt", {
            _owner: owner,
            _started: startedAt,
            _error: failureCode,
          }),
      ).catch(() => undefined);
    }
    console.error(
      "teacher_post_session_sync_failed",
      e instanceof Error ? e.name : "Error",
    );
    return json(
      { error: failureCode },
      failureCode === "calendar_owner_mismatch" ? 403 : 500,
    );
  }
});

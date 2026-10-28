import { getAccessToken } from "../_shared/googleCalendar.ts";
import { matchStudent, normalizeEmail, type Student } from "./model.ts";
type Cursor = {
  owner: string;
  calendar: string;
  start: string;
  end: string;
  token: string;
  expires: number;
  area?: string;
};
const bytes = (s: string) => new TextEncoder().encode(s);
const encode = (a: Uint8Array) =>
  btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/, "");
const decode = (s: string) =>
  Uint8Array.from(
    atob(s.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
async function signingKey() {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("cursor_signing_not_configured");
  return crypto.subtle.importKey(
    "raw",
    bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function signCursor(c: Cursor) {
  const payload = encode(bytes(JSON.stringify(c)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    bytes(payload),
  );
  return payload + "." + encode(new Uint8Array(sig));
}
export async function verifyCursor(
  value: string,
  owner: string,
  calendar: string,
  area = "agenda",
): Promise<Cursor> {
  try {
    if (value.length > 16000) throw new Error();
    const [payload, sig, extra] = value.split(".");
    if (
      extra || !payload || !sig ||
      !await crypto.subtle.verify(
        "HMAC",
        await signingKey(),
        decode(sig),
        bytes(payload),
      )
    ) throw new Error();
    const c = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (
      c.owner !== owner || c.calendar !== calendar ||
      (c.area ?? "agenda") !== area || c.expires < Date.now() ||
      !Number.isFinite(Date.parse(c.start)) ||
      !Number.isFinite(Date.parse(c.end)) || typeof c.token !== "string"
    ) throw new Error();
    return c;
  } catch {
    throw new Error("agenda_cursor_expired");
  }
}
async function response(url: string, token: string) {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error("provider_unavailable");
  return r.json();
}
// Preserve local wall time across daylight-saving changes in the selected Calendar zone.
export function sevenCalendarDays(start: string, zone: string): string {
  const parts = (date: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date).map((p) => [p.type, p.value]),
    );
  const p = parts(new Date(start));
  const wall = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day + 7,
    +p.hour,
    +p.minute,
    +p.second,
  );
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const q = parts(new Date(guess));
    const offset =
      Date.UTC(+q.year, +q.month - 1, +q.day, +q.hour, +q.minute, +q.second) -
      guess;
    guess = wall - offset;
  }
  return new Date(guess).toISOString();
}
export async function readDesk(
  body: any,
  owner: string,
  email: string,
  db: any,
  tokenReader: () => Promise<string> = getAccessToken,
) {
  const fetched_at = new Date().toISOString();
  try {
    if (body.action === "email") {
      const r = await db.rpc("teacher_home_roster", { _owner: owner });
      if (r.error) throw r.error;
      return await emailRead(owner, email, r.data ?? [], fetched_at);
    }
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const token = await Promise.race([
      tokenReader(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("provider_timeout")),
          12000,
        );
      }),
    ]).finally(() => clearTimeout(timeout));
    const calendar = await response(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
      token,
    );
    if (normalizeEmail(calendar.id ?? "") !== normalizeEmail(email)) {
      throw new Error("calendar_owner_mismatch");
    }
    const setting = await db.from("teacher_post_session_settings").select(
      "calendar_id",
    ).eq("owner_id", owner).maybeSingle();
    if (setting.error) throw setting.error;
    if (
      setting.data &&
      normalizeEmail(setting.data.calendar_id) !== normalizeEmail(email)
    ) throw new Error("calendar_owner_mismatch");
    // A fresh selected-field lookup also invalidates access/archive/alias changes across isolates.
    const rosterResult = await db.rpc("teacher_home_roster", { _owner: owner });
    if (rosterResult.error) throw new Error("identity_check_unavailable");
    const roster = { rows: rosterResult.data ?? [] };
    let start = fetched_at,
      end = sevenCalendarDays(start, calendar.timeZone ?? "UTC"),
      pageToken = "";
    if (body.cursor) {
      const c = await verifyCursor(body.cursor, owner, calendar.id);
      ({ start, end, token: pageToken } = c);
    }
    const q = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: start,
      timeMax: end,
      maxResults: "20",
      ...(pageToken ? { pageToken } : {}),
    });
    const page = await response(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" + q,
      token,
    );
    const raw = page.items ?? [];
    const candidates = [
      ...new Set(raw.flatMap((e: any) => {
        const s = matchStudent(e, roster!.rows, email);
        return s ? [s.id] : [];
      })),
    ];
    const profiles = candidates.length
      ? await db.from("profiles").select("class_id,archived_at").in(
        "class_id",
        candidates,
      )
      : { data: [] };
    const roles = candidates.length
      ? await db.from("user_roles").select("user_id").eq("role", "admin").in(
        "user_id",
        candidates,
      )
      : { data: [] };
    if (profiles.error || roles.error) {
      throw new Error("identity_check_unavailable");
    }
    const labels = raw.length
      ? await db.from("teacher_calendar_labels").select(
        "event_id,kind,revision",
      ).eq("owner_id", owner).eq("calendar_id", calendar.id).in(
        "event_id",
        raw.map((e: any) => e.id),
      )
      : { data: [] };
    if (labels.error) throw labels.error;
    const events = raw.map((e: any) => {
      let s = matchStudent(e, roster!.rows, email);
      if (
        s &&
        (!profiles.data.some((p: any) =>
          p.class_id === s!.id && !p.archived_at
        ) || roles.data.some((r: any) => r.user_id === s!.id))
      ) s = null;
      const l = labels.data.find((l: any) => l.event_id === e.id);
      return {
        id: e.id,
        title: e.summary ?? "Calendar event",
        starts_at: e.start?.dateTime ?? e.start?.date,
        ends_at: e.end?.dateTime ?? e.end?.date,
        status: e.status ?? "confirmed",
        calendar_url:
          /^https:\/\/calendar\.google\.com\//.test(e.htmlLink ?? "")
            ? e.htmlLink
            : "https://calendar.google.com/calendar/u/0/r",
        student_id: s?.id ?? null,
        student_name: s?.name ?? null,
        label_kind: l?.kind ?? null,
        label_revision: l?.revision ?? 0,
      };
    });
    const next_cursor = page.nextPageToken
      ? await signCursor({
        owner,
        calendar: calendar.id,
        start,
        end,
        token: page.nextPageToken,
        expires: Date.now() + 10 * 60000,
      })
      : null;
    return {
      ok: true,
      events,
      next_cursor,
      fetched_at,
      time_zone: calendar.timeZone ?? "UTC",
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error &&
          [
            "calendar_owner_mismatch",
            "email_owner_mismatch",
            "agenda_cursor_expired",
            "identity_check_unavailable",
            "provider_timeout",
            "email_scope_too_large",
            "email_page_token_repeated",
          ].includes(e.message)
        ? e.message
        : "provider_unavailable",
      fetched_at,
      setup_required: false,
    };
  }
}
async function emailRead(
  _owner: string,
  expectedEmail: string,
  roster: Student[],
  fetched_at: string,
) {
  const client_id = Deno.env.get("GMAIL_CLIENT_ID"),
    client_secret = Deno.env.get("GMAIL_CLIENT_SECRET"),
    refresh_token = Deno.env.get("GMAIL_REFRESH_TOKEN"),
    label = Deno.env.get("TEACHER_HOME_ENQUIRY_LABEL") ??
      "LSAT U/Tutoring enquiries";
  if (!client_id || !client_secret || !refresh_token) {
    return {
      ok: false,
      setup_required: true,
      error: "student_email_setup_required",
      fetched_at,
    };
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(12000),
  });
  const auth = await r.json();
  if (!r.ok || !auth.access_token) throw new Error("email_oauth_unavailable");
  const base = "https://gmail.googleapis.com/gmail/v1/users/me";
  const profile = await response(base + "/profile", auth.access_token);
  if (
    normalizeEmail(profile.emailAddress ?? "") !== normalizeEmail(expectedEmail)
  ) throw new Error("email_owner_mismatch");
  const labels = await response(base + "/labels", auth.access_token);
  const enquiry = labels.labels?.find((l: any) =>
    l.id === label || l.name === label
  );
  const addresses = [
    ...new Set(
      roster.filter((s) => !s.archived && !s.admin).flatMap(
        (s) => [s.email, ...(s.aliases ?? [])],
      ).map(normalizeEmail).filter((e) =>
        /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+$/i.test(e)
      ),
    ),
  ];
  // Server-side exact sender query, then verify each returned sender. No read/modify endpoints.
  if (!addresses.length && !enquiry) {
    return {
      ok: true,
      threads: [],
      count: 0,
      fetched_at,
      setup_required: true,
      enquiries_configured: false,
      error: "enquiry_label_missing",
    };
  }
  const query = `is:unread {${addresses.map((e) => "from:" + e).join(" ")}${
    enquiry ? ' label:"' + enquiry.name.replace(/["\\]/g, "") + '"' : ""
  }}`;
  if (query.length > 12000) throw new Error("email_scope_too_large");
  const messages: any[] = [];
  let pageToken: string | undefined;
  let hasMore = false;
  const seen = new Set<string>();
  // Bound provider work to 100 messages per request; explicitly report a lower bound if more exist.
  for (let pageNumber = 0; pageNumber < 5; pageNumber++) {
    const listed = await response(
      base + "/messages?" +
        new URLSearchParams({
          q: query,
          maxResults: "20",
          ...(pageToken ? { pageToken } : {}),
        }),
      auth.access_token,
    );
    const batch = await Promise.all(
      (listed.messages ?? []).map((m: any) =>
        response(
          base + "/messages/" + encodeURIComponent(m.id) +
            "?format=metadata&metadataHeaders=From&metadataHeaders=Subject",
          auth.access_token,
        )
      ),
    );
    messages.push(...batch);
    pageToken = listed.nextPageToken;
    hasMore = Boolean(pageToken);
    if (!pageToken) break;
    if (seen.has(pageToken)) throw new Error("email_page_token_repeated");
    seen.add(pageToken);
  }
  const threads = messages.flatMap((m) => {
    const headers = m.payload?.headers ?? [];
    const from = headers.find((h: any) =>
      h.name.toLowerCase() === "from"
    )?.value ?? "";
    const sender = normalizeEmail(/<([^>]+)>/.exec(from)?.[1] ?? from);
    const isStudent = addresses.includes(sender),
      isEnquiry = enquiry && m.labelIds?.includes(enquiry.id);
    if (!isStudent && !isEnquiry) return [];
    return [{
      id: m.threadId,
      subject: headers.find((h: any) =>
        h.name.toLowerCase() === "subject"
      )?.value ?? "(No subject)",
      sender,
      snippet: m.snippet ?? "",
      received_at: new Date(Number(m.internalDate)).toISOString(),
      url: "https://mail.google.com/mail/u/0/#all/" +
        encodeURIComponent(m.threadId),
      kind: isStudent ? "student" : "enquiry",
    }];
  });
  const unique = [...new Map(threads.map((t) => [t.id, t])).values()];
  return {
    ok: true,
    threads: unique.slice(0, 3),
    count: unique.length,
    count_is_lower_bound: hasMore,
    scanned_messages: messages.length,
    scan_limit: 100,
    fetched_at,
    setup_required: !enquiry,
    enquiries_configured: Boolean(enquiry),
    ...(!enquiry ? { error: "enquiry_label_missing" } : {}),
  };
}
// Kept for callers; roster reads are now fresh across every isolate.
export function invalidateDeskRoster(_owner: string) {}

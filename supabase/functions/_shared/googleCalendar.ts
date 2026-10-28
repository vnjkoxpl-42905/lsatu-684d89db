// Direct Google Calendar client (no Lovable connector gateway).
// Auth: OAuth refresh-token exchange, same pattern as ta-agent's direct Gmail path.
// Secrets: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_CALENDAR_REFRESH_TOKEN.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_CALENDAR_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("google_calendar_oauth_not_configured");
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`google_oauth_failed: ${detail}`);
  }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

const TRANSIENT = new Set([429, 500, 502, 503, 504]);

async function gfetch(
  path: string,
  init: RequestInit = {},
  query: Record<string, string> = {},
): Promise<Response> {
  const token = await getAccessToken();
  const qs = new URLSearchParams(query).toString();
  const url = `${CALENDAR_API}${path}${qs ? `?${qs}` : ""}`;
  let res: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!TRANSIENT.has(res.status)) return res;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  return res!;
}

async function jsonOrThrow(res: Response, op: string): Promise<any> {
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    const err = new Error(`gcal_${op}_failed: ${msg}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return body;
}

export interface EventWriteOpts {
  conferenceDataVersion?: 0 | 1;
  sendUpdates?: "all" | "externalOnly" | "none";
}

function writeQuery(opts: EventWriteOpts): Record<string, string> {
  const q: Record<string, string> = {};
  if (opts.conferenceDataVersion !== undefined) q.conferenceDataVersion = String(opts.conferenceDataVersion);
  if (opts.sendUpdates) q.sendUpdates = opts.sendUpdates;
  return q;
}

export async function insertEvent(calendarId: string, body: unknown, opts: EventWriteOpts = {}) {
  const res = await gfetch(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    { method: "POST", body: JSON.stringify(body) },
    writeQuery(opts),
  );
  return jsonOrThrow(res, "insert");
}

export async function patchEvent(calendarId: string, eventId: string, body: unknown, opts: EventWriteOpts = {}) {
  const res = await gfetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: JSON.stringify(body) },
    writeQuery(opts),
  );
  return jsonOrThrow(res, "patch");
}

export async function getEvent(calendarId: string, eventId: string) {
  const res = await gfetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  );
  return jsonOrThrow(res, "get");
}

export async function deleteEvent(calendarId: string, eventId: string, opts: EventWriteOpts = {}) {
  const res = await gfetch(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
    writeQuery(opts),
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    await jsonOrThrow(res, "delete");
  }
}

export async function listEvents(calendarId: string, params: Record<string, string>) {
  const res = await gfetch(`/calendars/${encodeURIComponent(calendarId)}/events`, {}, params);
  return jsonOrThrow(res, "list");
}

export async function listCalendars() {
  const res = await gfetch(`/users/me/calendarList`);
  return jsonOrThrow(res, "list_calendars");
}

export interface BusyInterval {
  start: string;
  end: string;
}

export async function freeBusy(
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
): Promise<Record<string, BusyInterval[]>> {
  const res = await gfetch(`/freeBusy`, {
    method: "POST",
    body: JSON.stringify({ timeMin, timeMax, items: calendarIds.map((id) => ({ id })) }),
  });
  const body = await jsonOrThrow(res, "freebusy");
  const out: Record<string, BusyInterval[]> = {};
  for (const [id, cal] of Object.entries(body.calendars ?? {})) {
    out[id] = ((cal as any).busy ?? []) as BusyInterval[];
  }
  return out;
}

// Extracts the Meet URL from an event's conferenceData, or null if absent/pending.
export function meetUrlFromEvent(event: any): string | null {
  const entry = event?.conferenceData?.entryPoints?.find?.((e: any) => e.entryPointType === "video");
  return entry?.uri ?? event?.hangoutLink ?? null;
}

// Teacher operator chat - streaming AI assistant for admins.
// Streams Lovable AI Gateway responses with tool calling so Joshua can
// run real teacher actions (find students, draft messages, draft homework,
// create AI TA drafts) from a single chat surface.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;

import {
  buildResourceQuery,
  inferKindHints,
  normalizeResolverText,
  pickBestResourceCandidate,
  resolveCommandIntent,
  resolveLatestResourceQuery,
  type ResourceCandidate,
} from "../_shared/platformResourceResolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const ROUTE_FALLBACKS = [
  { kind: "route", source_id: "/teacher", title: "Teacher Desk", subtitle: "Main assistant workspace", url: "/teacher", body: "teacher desk assistant today dashboard chat" },
  { kind: "route", source_id: "/teacher/library/activities", title: "Activity Center", subtitle: "Teacher activity library", url: "/teacher/library/activities", body: "activity centre activity center activities assign launch teacher library" },
  { kind: "route", source_id: "/activities", title: "Activity Centre", subtitle: "Student activity centre", url: "/activities", body: "activity centre activity center student activities assigned work" },
  { kind: "route", source_id: "/teacher/library/guided-drills", title: "Guided Drills", subtitle: "Teacher guided drill library", url: "/teacher/library/guided-drills", body: "guided drills guided drill library teacher assign launch" },
  { kind: "route", source_id: "/drill", title: "Smart Drill", subtitle: "Adaptive drilling surface", url: "/drill?drill=smart-drill", body: "smart drill drilling practice questions adaptive drill" },
  { kind: "route", source_id: "/teacher/students", title: "Students", subtitle: "Teacher student roster", url: "/teacher/students", body: "students roster profiles learners teacher" },
  { kind: "route", source_id: "/teacher/schedule", title: "Schedule", subtitle: "Teacher schedule", url: "/teacher/schedule", body: "schedule calendar sessions meetings teacher" },
  { kind: "route", source_id: "/teacher/whiteboard", title: "Whiteboard", subtitle: "Teacher smartboard", url: "/teacher/whiteboard", body: "whiteboard smartboard canvas teaching board" },
  { kind: "route", source_id: "/teacher/library", title: "Teacher Library", subtitle: "Assignments, recaps, uploads, bootcamps", url: "/teacher/library", body: "library assignments recaps uploads bootcamps teacher" },
  { kind: "route", source_id: "/teacher/insights", title: "Bootcamp Insights", subtitle: "Teacher bootcamp analytics", url: "/teacher/insights", body: "bootcamp insights analytics progress teacher" },
  { kind: "route", source_id: "/bootcamps", title: "Bootcamps", subtitle: "Student bootcamp index", url: "/bootcamps", body: "bootcamps lessons causation intro principle flaw abstraction" },
  { kind: "route", source_id: "/bootcamp/causation-station", title: "Causation Station", subtitle: "Bootcamp", url: "/bootcamp/causation-station", body: "causation station causal reasoning bootcamp" },
  { kind: "route", source_id: "/bootcamp/intro-to-lr", title: "Intro to LR", subtitle: "Bootcamp", url: "/bootcamp/intro-to-lr", body: "intro to logical reasoning main conclusion structure bootcamp" },
  { kind: "route", source_id: "/bootcamp/principle-flaw", title: "Principle and Flaw", subtitle: "Bootcamp", url: "/bootcamp/principle-flaw", body: "principle flaw bootcamp questions" },
  { kind: "route", source_id: "/bootcamp/fallacy-flaw", title: "Flaw and Famous Flaws", subtitle: "Bootcamp", url: "/bootcamp/fallacy-flaw", body: "fallacy flaw famous flaws bootcamp" },
  { kind: "route", source_id: "/journal", title: "Wrong Answer Journal", subtitle: "Journal", url: "/journal", body: "wrong answer journal waj review missed questions" },
] as const;

const SYSTEM_PROMPT = `You are Joshua's AI Teaching Operator for LSAT U.

You are not a chat bot - you are an operator. Joshua talks to you like a chief of staff.
He says things like "draft a recap for Maya from yesterday's session", "assign 10 flaw
questions to Alex due Friday", "message everyone in cohort B about Saturday's review".
You do those things by calling the tools available to you.

Operating principles:
- Be concise. Reply in a few sentences max unless he asks for detail.
- Keep continuity across turns. Resolve pronouns and short replies ("yes", "that", "open it") from the prior messages and tool results before asking a new question.
- Always confirm scope before destructive actions. Never message students or post to
  classrooms without his explicit go-ahead - create a draft and let him approve.
- When he names a student, call find_students first to resolve the id. Don't guess.
- After running a tool, briefly tell him what you did and what's pending his approval.
- If a request is ambiguous (which student? which week? how many questions?), ask one
  short clarifying question instead of guessing.
- Use markdown sparingly: bold names and counts, short bullet lists when listing.
- Whenever he asks you to draft a reply, message, or email, ALWAYS use create_draft so it
  renders as an editable draft card he can approve - never paste the draft as plain chat text.
  Use channel 'email' (with to/subject when known) for emails, otherwise the student message
  channel. Keep your own chat reply to one short line; the draft lives in the card.
- If he asks for multiple versions (e.g. cleaner, warmer, more concise), call create_draft once
  per version, each with a distinct variant_label.

Universal link retrieval:
- LSAT U has thousands of addressable surfaces: guided drills, individual drill questions
  (PT###-S#-Q##), activities, bootcamp days/lessons, concepts, student pages, routes.
- WHENEVER Joshua asks for "the link to", "open", "show me", "find", "where is", or refers
  to any specific content by name (e.g. "negation station", "causation day 3", "PT159 S1 Q5",
  "dakota's profile") — call find_link with a focused query. Do NOT guess URLs.
- After find_link returns, reply in one short line ("Here it is:") and let the link card
  render. Never paste raw URLs inline if the card will render — the user already sees Open/New tab buttons.
- If the user confirms a suggestion with "yes", reuse the prior corrected title/query and call find_link again.
- If find_link returns no good match, use the tool note to explain whether the live content index is empty, then offer the closest built-in route if one exists.

Assignments:
- If Joshua says to "send", "assign", "give", or "drop" an activity, drill, bootcamp, page,
  link, or resource to a student, this means create an ASSIGNMENT notification, not a free-form
  message. Do not ask "what message should I send?"
- For assignment requests: call find_students for the student, call find_link for the resource,
  then call create_assignment_offer with the resolved student and best student-facing resource.
  The UI will render Confirm/Deny; no assignment is created until Joshua confirms the card.
- If Joshua corrects you with "it's not a message" or similar, immediately switch to the
  assignment flow above using the named/latest resource and student from conversation memory.

Tone: warm, sharp, efficient. You are his right hand.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "find_students",
      description:
        "Search the student roster by partial name or email. Returns matching students with their ids. Always call this before any per-student action.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name or email fragment" },
          limit: { type: "number", default: 10 },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_recent_students",
      description:
        "List students recently active or recently messaged. Use when Joshua says 'my students' without naming anyone.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", default: 10 } },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_draft",
      description:
        "Create a pending draft (a reply, recap, message, next-assignment recommendation, classroom announcement, or email) that renders as an inline draft card on the Teacher Desk for Joshua to edit and approve. Nothing is sent automatically. Use this whenever Joshua asks you to draft a reply, message, or email. To offer multiple versions, call this once per version, each with a distinct variant_label.",
      parameters: {
        type: "object",
        properties: {
          student_id: {
            type: "string",
            description: "The student this draft is for. Required for channel 'student_message'; omit for channel 'email'.",
          },
          draft_type: {
            type: "string",
            enum: [
              "session_recap",
              "next_assignment",
              "next_session_plan",
              "message",
              "classroom_update_bundle",
            ],
          },
          channel: {
            type: "string",
            enum: ["student_message", "email"],
            description:
              "Where this draft is headed. 'student_message' (default) sends in the 1:1 student thread; 'email' sends via Gmail. Use 'email' when Joshua asks to draft an email.",
          },
          variant_label: {
            type: "string",
            description:
              "Short label for this version when offering alternatives, e.g. 'Clean version', 'Slightly warmer', 'More concise'. Omit for a single draft.",
          },
          to: {
            type: "string",
            description: "Email recipient address. Only for channel 'email' when known.",
          },
          subject: {
            type: "string",
            description: "Email subject line. Only for channel 'email'.",
          },
          prompt: {
            type: "string",
            description: "What Joshua asked you to draft (1 line).",
          },
          draft_markdown: {
            type: "string",
            description:
              "The actual draft body. Markdown. Address the recipient by name when relevant.",
          },
        },
        required: ["draft_type", "draft_markdown"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description:
        "Send a message immediately to a student in the existing 1:1 thread between Joshua and that student. Only call this when Joshua explicitly says to send (not draft).",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string" },
          body: { type: "string" },
        },
        required: ["student_id", "body"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_student",
      description:
        "Pull the latest signals for one student: recent sessions, last few drill answers, current proficiency snapshot.",
      parameters: {
        type: "object",
        properties: { student_id: { type: "string" } },
        required: ["student_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_link",
      description:
        "Semantic search across every addressable surface in LSAT U: guided drills, individual drill questions (PT###-S#-Q##), activities, bootcamp days and lessons, concepts, student pages, top-level routes, teaching assets. Returns up to N results, each with title, kind, url, and a short snippet. Call this WHENEVER the user asks for, refers to, or wants to open any specific thing in the app. Prefer specific queries ('negation station guided drill', 'PT159 section 1 question 5', 'causation station day 3', 'dakota profile') over vague ones.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What the user is looking for, in their own words." },
          limit: { type: "number", description: "Max results (default 5, max 10)" },
          kinds: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional filter: 'guided_drill' | 'drill_question' | 'activity' | 'bootcamp_day' | 'bootcamp_lesson' | 'concept' | 'question_type_strategy' | 'tactical_pattern' | 'student' | 'teaching_asset' | 'route'.",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_assignment_offer",
      description:
        "Prepare a confirm/deny assignment card for sending an activity, guided drill, bootcamp, page, or resource to a student. This does NOT send a message and does NOT create the assignment; the UI asks Joshua to confirm.",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string", description: "Resolved student auth/class id from find_students." },
          student_name: { type: "string", description: "Student display name, if known." },
          resource_title: { type: "string", description: "Resolved assignment/resource title." },
          resource_kind: { type: "string", description: "activity | guided_drill | bootcamp_module | drill_question | route | link | other" },
          source_id: { type: "string", description: "Resource source_id from find_link when available." },
          url: { type: "string", description: "Student-facing URL/path from find_link when available." },
          subtitle: { type: "string", description: "Short subtitle/description from find_link when available." },
        },
        required: ["student_id", "resource_title"],
        additionalProperties: false,
      },
    },
  },
];

interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface DeskContext {
  surface?: string;
  taskId?: string;
  mode?: string;
  studentId?: string;
  sourceKind?: string;
  sourceId?: string;
  sourcePreview?: string;
  driveConnector?: boolean;
  gmailConnector?: boolean;
  calendarConnector?: boolean;
  model?: string;
}

const DEFAULT_MODEL = "gemini-3.8-flash";
const CHEAP_MODEL = "gemini-3.8-flash";
const SMART_MODEL = "gemini-3.8-flash";
// Only real Gemini models — gemini-proxy calls Google directly with GEMINI_API_KEY.
const ALLOWED_MODELS = new Set<string>([
  "gemini-3.8-flash",
  "gemini-3.8-flash",
  "gemini-3.8-flash",
]);

/**
 * Auto routing: pick the cheapest model likely to satisfy the task.
 * - Image inputs or large context → multimodal/strong model
 * - Long input or "reasoning" cues → SMART_MODEL
 * - Tools enabled (Drive/Gmail/Calendar) → DEFAULT_MODEL (good tool calling, fast)
 * - Trivial short prompts → CHEAP_MODEL
 */
function pickAutoModel(opts: {
  text: string;
  hasImages: boolean;
  toolsEnabled: boolean;
  totalChars: number;
}): string {
  const t = opts.text.toLowerCase();
  if (opts.hasImages) return "gemini-3.8-flash";
  if (opts.totalChars > 12000) return SMART_MODEL;
  const reasoningCues = /\b(analy[sz]e|reason|prove|why|explain in depth|step[- ]by[- ]step|plan|strategi[sz]e|compare|critique|rubric|grade|debug|refactor|architect|derive)\b/;
  if (reasoningCues.test(t) || opts.text.length > 1500) return SMART_MODEL;
  if (opts.toolsEnabled) return DEFAULT_MODEL;
  return CHEAP_MODEL;
}

const GDRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

const SEARCH_GDRIVE_TOOL = {
  type: "function",
  function: {
    name: "search_google_drive",
    description:
      "Search the connected Google Drive for files. Returns file id, name, mimeType, modifiedTime, and webViewLink. You can return names and shareable links to the user, but you CANNOT read file contents yet — say so if asked to summarize a file.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Optional name fragment to search. Leave empty to list the most recently modified files.",
        },
        pageSize: { type: "number", description: "Max results (default 10, max 25)" },
      },
      additionalProperties: false,
    },
  },
} as const;

async function searchGoogleDrive(args: ToolArgs): Promise<ToolResult> {
  const key = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!key) {
    return {
      ok: false,
      error:
        "Google Drive connector is not linked to this workspace. Ask the admin to link Google Drive in Lovable connectors.",
    };
  }
  const q = typeof args.query === "string" ? args.query.trim() : "";
  const pageSize = Math.min(Math.max(Number(args.pageSize ?? 10) || 10, 1), 25);
  const params = new URLSearchParams();
  params.set("pageSize", String(pageSize));
  params.set("orderBy", "modifiedTime desc");
  params.set(
    "fields",
    "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,owners(displayName,emailAddress))",
  );
  if (q) params.set("q", `name contains '${q.replace(/'/g, "\\'")}' and trashed = false`);
  else params.set("q", "trashed = false");

  const r = await fetch(`${GDRIVE_GATEWAY}/files?${params}`, {
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": key,
    },
  });
  const txt = await r.text();
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      return { ok: false, error: "Google Drive connector not authorized — ask the admin to relink it." };
    }
    return { ok: false, error: `Google Drive error ${r.status}: ${txt.slice(0, 200)}` };
  }
  let data: { files?: Array<Record<string, unknown>> } = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch { /* ignore */ }
  const files = (data.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));
  return { ok: true, data: { files, note: "File contents are not readable yet; only metadata + links are available." } };
}

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const GCAL_GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const SEARCH_GMAIL_TOOL = {
  type: "function",
  function: {
    name: "search_gmail",
    description:
      "Search the connected Gmail inbox. Returns recent messages with From, Subject, Date, and snippet. Use Gmail search operators in `query` (e.g. `from:`, `is:unread`, `subject:`, `newer_than:7d`).",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Gmail search query. Empty = most recent inbox messages." },
        maxResults: { type: "number", description: "Max messages to return (default 10, max 20)" },
      },
      additionalProperties: false,
    },
  },
} as const;

const LIST_GCAL_TOOL = {
  type: "function",
  function: {
    name: "list_calendar_events",
    description:
      "List upcoming events on the connected Google Calendar (primary calendar). Returns event id, summary, start/end, location, and htmlLink.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional free-text search across events." },
        timeMin: { type: "string", description: "RFC3339 lower bound. Defaults to now." },
        timeMax: { type: "string", description: "RFC3339 upper bound. Defaults to 14 days from now." },
        maxResults: { type: "number", description: "Max events (default 10, max 25)" },
      },
      additionalProperties: false,
    },
  },
} as const;

async function searchGmail(args: ToolArgs): Promise<ToolResult> {
  const key = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!key) {
    return {
      ok: false,
      error: "Gmail connector is not linked to this workspace. Ask the admin to link Gmail in Lovable connectors.",
    };
  }
  const q = typeof args.query === "string" ? args.query.trim() : "";
  const maxResults = Math.min(Math.max(Number(args.maxResults ?? 10) || 10, 1), 20);
  const params = new URLSearchParams();
  params.set("maxResults", String(maxResults));
  if (q) params.set("q", q);

  const listRes = await fetch(`${GMAIL_GATEWAY}/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": key },
  });
  const listTxt = await listRes.text();
  if (!listRes.ok) {
    if (listRes.status === 401 || listRes.status === 403) {
      return { ok: false, error: "Gmail connector not authorized — ask the admin to relink it." };
    }
    return { ok: false, error: `Gmail error ${listRes.status}: ${listTxt.slice(0, 200)}` };
  }
  let listData: { messages?: Array<{ id: string }> } = {};
  try { listData = listTxt ? JSON.parse(listTxt) : {}; } catch { /* ignore */ }
  const ids = (listData.messages ?? []).slice(0, maxResults).map((m) => m.id).filter(Boolean);

  const messages = await Promise.all(
    ids.map(async (id) => {
      const metaParams = new URLSearchParams();
      metaParams.set("format", "metadata");
      ["From", "Subject", "Date", "To"].forEach((h) => metaParams.append("metadataHeaders", h));
      const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${id}?${metaParams}`, {
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": key },
      });
      if (!r.ok) return null;
      const m = await r.json() as { id?: string; snippet?: string; payload?: { headers?: Array<{ name: string; value: string }> } };
      const headers = m.payload?.headers ?? [];
      const h = (n: string) => headers.find((x) => x.name?.toLowerCase() === n.toLowerCase())?.value ?? "";
      return {
        id: m.id,
        from: h("From"),
        to: h("To"),
        subject: h("Subject"),
        date: h("Date"),
        snippet: m.snippet ?? "",
      };
    }),
  );

  return { ok: true, data: { messages: messages.filter(Boolean) } };
}

async function listCalendarEvents(args: ToolArgs): Promise<ToolResult> {
  const key = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!key) {
    return {
      ok: false,
      error: "Google Calendar connector is not linked to this workspace. Ask the admin to link Google Calendar in Lovable connectors.",
    };
  }
  const q = typeof args.query === "string" ? args.query.trim() : "";
  const now = new Date();
  const defaultMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const timeMin = typeof args.timeMin === "string" && args.timeMin ? args.timeMin : now.toISOString();
  const timeMax = typeof args.timeMax === "string" && args.timeMax ? args.timeMax : defaultMax.toISOString();
  const maxResults = Math.min(Math.max(Number(args.maxResults ?? 10) || 10, 1), 25);

  const params = new URLSearchParams();
  params.set("singleEvents", "true");
  params.set("orderBy", "startTime");
  params.set("timeMin", timeMin);
  params.set("timeMax", timeMax);
  params.set("maxResults", String(maxResults));
  if (q) params.set("q", q);

  const r = await fetch(`${GCAL_GATEWAY}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": key },
  });
  const txt = await r.text();
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) {
      return { ok: false, error: "Google Calendar connector not authorized — ask the admin to relink it." };
    }
    return { ok: false, error: `Google Calendar error ${r.status}: ${txt.slice(0, 200)}` };
  }
  let data: { items?: Array<Record<string, unknown>> } = {};
  try { data = txt ? JSON.parse(txt) : {}; } catch { /* ignore */ }
  const events = (data.items ?? []).map((e) => ({
    id: e.id,
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: e.start,
    end: e.end,
    htmlLink: e.htmlLink,
    attendees: e.attendees,
  }));
  return { ok: true, data: { events } };
}

type ToolArgs = Record<string, unknown>;
type DbRow = Record<string, unknown>;
// content is a string for most turns, or an array of OpenAI-style multimodal
// parts ({ type: "text" } | { type: "image_url", image_url: { url } }) when the
// user attaches screenshots. The Lovable gateway forwards both to Gemini.
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | ContentPart[];
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

// Cap a single inbound image data URL. ~7MB of base64 ≈ ~5MB binary, matching
// the client-side limit. Anything larger is rejected, never silently dropped.
const MAX_IMAGE_DATA_URL_CHARS = 7_500_000;
const MAX_IMAGE_PARTS = 4;

function sanitizeContent(raw: unknown): string | ContentPart[] | { error: string } {
  if (typeof raw === "string") return raw;
  if (!Array.isArray(raw)) return asString(raw);
  const parts: ContentPart[] = [];
  let imageCount = 0;
  for (const part of raw) {
    if (!isRecord(part)) continue;
    if (part.type === "text") {
      const text = asString(part.text);
      if (text.length > 20_000) return { error: "Message text too large (max 20000 chars)" };
      parts.push({ type: "text", text });
    } else if (part.type === "image_url") {
      const url = isRecord(part.image_url) ? asString(part.image_url.url) : "";
      if (!url.startsWith("data:image/") && !url.startsWith("https://")) {
        return { error: "Unsupported image source" };
      }
      if (url.length > MAX_IMAGE_DATA_URL_CHARS) return { error: "Attached image is too large (max ~5MB)" };
      if (++imageCount > MAX_IMAGE_PARTS) return { error: "Too many images (max 4)" };
      parts.push({ type: "image_url", image_url: { url } });
    }
  }
  return parts;
}
type ToolCall = {
  id: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type SupabaseAdminClient = ReturnType<typeof createClient>;

function table(name: string) {
  return name as never;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeSearchText(value: string) {
  return normalizeResolverText(value);
}

function looksLikeAssignmentRequest(text: string) {
  return resolveCommandIntent(text) === "assign";
}

function extractResourceQueryFromAssignment(text: string, studentName?: string | null) {
  return buildResourceQuery(text, studentName);
}

function pickStudentFacingResult(results: DbRow[], query = "") {
  const candidates = results.map(toResourceCandidate);
  const picked = query ? pickBestResourceCandidate(candidates, query, inferKindHints(query)) : null;
  return picked
    ? fromResourceCandidate(picked)
    : results.find((r) => !asString(r.url).startsWith("/teacher/") && !asString(r.url).startsWith("/admin/"))
    ?? results[0]
    ?? null;
}

function toResourceCandidate(row: DbRow): ResourceCandidate {
  return {
    id: asString(row.id) || `${asString(row.kind)}:${asString(row.source_id)}`,
    kind: asString(row.kind),
    source_id: asString(row.source_id),
    title: asString(row.title, "(untitled)"),
    subtitle: asString(row.subtitle) || null,
    url: asString(row.url) || null,
    snippet: asString(row.snippet) || null,
    score: typeof row.score === "number"
      ? row.score
      : typeof row.similarity === "number"
        ? row.similarity
        : typeof row.rank === "number"
          ? row.rank
          : null,
  };
}

function fromResourceCandidate(candidate: ResourceCandidate): DbRow {
  return {
    id: candidate.id,
    kind: candidate.kind,
    source_id: candidate.source_id,
    title: candidate.title,
    subtitle: candidate.subtitle ?? null,
    url: candidate.url ?? null,
    snippet: candidate.snippet ?? null,
    score: candidate.score ?? null,
  };
}

async function findDirectAssignableResource(
  admin: SupabaseAdminClient,
  query: string,
): Promise<DbRow | null> {
  const slug = normalizeSearchText(query).replace(/\s+/g, "-");
  const { data: activity, error: activityError } = await admin
    .from(table("activities"))
    .select("id, slug, title, subtitle")
    .or(`slug.eq.${slug},title.ilike.%${query.replace(/[%_,]/g, "")}%`)
    .limit(1)
    .maybeSingle();
  if (activityError) console.warn("direct activity lookup failed", activityError.message);
  if (activity) {
    const row = activity as DbRow;
    return {
      id: asString(row.id),
      kind: "activity",
      source_id: asString(row.id),
      title: asString(row.title),
      subtitle: asString(row.subtitle) || "Activity Centre",
      url: "/activities",
      snippet: "Student-facing activity assignment",
      score: 100,
    };
  }

  const { data: drill, error: drillError } = await admin
    .from(table("guided_drills"))
    .select("id, slug, title, category")
    .or(`slug.eq.${slug},title.ilike.%${query.replace(/[%_,]/g, "")}%`)
    .limit(1)
    .maybeSingle();
  if (drillError) console.warn("direct guided drill lookup failed", drillError.message);
  if (drill) {
    const row = drill as DbRow;
    return {
      id: asString(row.id),
      kind: "guided_drill",
      source_id: asString(row.id),
      title: asString(row.title),
      subtitle: asString(row.category) || "Guided drill",
      url: "/guided",
      snippet: "Student-facing guided drill assignment",
      score: 100,
    };
  }

  return null;
}

async function findExactIndexedResources(
  admin: SupabaseAdminClient,
  query: string,
  limit: number,
  kinds: string[] | null,
): Promise<DbRow[]> {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const slug = normalized.replace(/\s+/g, "-");
  const safeQuery = query.replace(/[%_,]/g, "").trim();
  const filters = [
    `source_id.eq.${slug}`,
    `source_id.eq.${query}`,
    `title.ilike.${safeQuery}`,
    `title.ilike.%${safeQuery}%`,
    `url.ilike.%${slug}%`,
  ];

  let builder = admin
    .from(table("lsatu_content_index"))
    .select("id, kind, source_id, title, subtitle, url, metadata, body")
    .or(filters.join(","))
    .limit(Math.max(1, Math.min(limit, 10)));
  if (kinds?.length) builder = builder.in("kind", kinds);

  const { data, error } = await builder;
  if (error) {
    console.warn("exact content index lookup failed", error.message);
    return [];
  }

  return ((data ?? []) as DbRow[]).map((row) => ({
    id: asString(row.id),
    kind: asString(row.kind),
    source_id: asString(row.source_id),
    title: asString(row.title, asString(row.source_id)),
    subtitle: asString(row.subtitle) || null,
    url: asString(row.url) || null,
    snippet: asString(row.body).slice(0, 400) || null,
    score: 100,
  }));
}

function textOfMessage(message: ChatMessage) {
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join(" ");
  }
  return "";
}

async function buildAssignmentOfferFromHistory(opts: {
  admin: SupabaseAdminClient;
  validMessages: ChatMessage[];
}): Promise<{ content: string; tool_results: Array<{ name: string; arguments: ToolArgs; result: ToolResult }> } | null> {
  const userTexts = opts.validMessages.filter((m) => m.role === "user").map(textOfMessage).filter(Boolean);
  const lastUserText = userTexts[userTexts.length - 1] ?? "";
  if (!looksLikeAssignmentRequest(lastUserText)) return null;

  const allUserText = userTexts.slice(-6).join(" \n ");
  const { data: students } = await opts.admin
    .from(table("profiles"))
    .select("class_id, display_name")
    .limit(200);
  const normalizedAll = normalizeSearchText(allUserText);
  const student = ((students ?? []) as DbRow[])
    .filter((s) => {
      const name = normalizeSearchText(asString(s.display_name));
      const tokens = name.split(/\s+/).filter((token) => token.length > 1);
      return tokens.length > 0 && tokens.some((token) => normalizedAll.includes(token));
    })
    .sort((a, b) => normalizeSearchText(asString(b.display_name)).length - normalizeSearchText(asString(a.display_name)).length)[0];

  if (!student) return null;
  const studentName = asString(student.display_name);
  let resourceQuery = extractResourceQueryFromAssignment(lastUserText, studentName);
  if (!resourceQuery || resourceQuery.length < 3) {
    resourceQuery = resolveLatestResourceQuery(userTexts, studentName);
  }
  if (!resourceQuery || resourceQuery.length < 3) return null;

  const kindHints = inferKindHints(`${lastUserText} ${resourceQuery}`);
  const linkArgs = { query: resourceQuery, limit: 5, kinds: kindHints.length ? kindHints : undefined };
  const directResource = await findDirectAssignableResource(opts.admin, resourceQuery);
  const linkResult = directResource
    ? { ok: true, data: { query: resourceQuery, results: [directResource] } }
    : await findLink(linkArgs, opts.admin);
  const results = isRecord(linkResult.data) && Array.isArray(linkResult.data.results)
    ? (linkResult.data.results as DbRow[])
    : [];
  const resource = pickStudentFacingResult(results, resourceQuery);
  if (!resource) return null;

  const offer = {
    id: crypto.randomUUID(),
    student_id: asString(student.class_id),
    student_name: studentName || null,
    resource: {
      title: asString(resource.title, resourceQuery),
      kind: asString(resource.kind, "resource"),
      source_id: asString(resource.source_id) || null,
      url: asString(resource.url) || null,
      subtitle: asString(resource.subtitle) || asString(resource.snippet) || null,
    },
  };

  return {
    content: `Confirm this assignment for **${studentName || "the student"}**.`,
    tool_results: [
      {
        name: "find_students",
        arguments: { query: studentName || asString(student.class_id), limit: 10 },
        result: { ok: true, data: { students: [{ id: asString(student.class_id), name: studentName }] } },
      },
      { name: "find_link", arguments: linkArgs, result: linkResult },
      { name: "create_assignment_offer", arguments: {}, result: { ok: true, data: { assignment_offer: offer } } },
    ],
  };
}

function routeFallbacks(query: string, limit: number, kinds: string[] | null) {
  if (kinds?.length && !kinds.includes("route")) return [];
  const q = normalizeSearchText(query);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter((token) => token.length > 1);
  return ROUTE_FALLBACKS.map((route) => {
    const haystack = normalizeSearchText(`${route.title} ${route.subtitle} ${route.url} ${route.body}`);
    let score = 0;
    if (haystack.includes(q)) score += 8;
    for (const token of tokens) {
      if (haystack.includes(token)) score += token.length >= 5 ? 3 : 1;
    }
    return { ...route, score };
  })
    .filter((route) => route.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((route) => ({
      id: route.source_id,
      kind: route.kind,
      source_id: route.source_id,
      title: route.title,
      subtitle: route.subtitle,
      url: route.url,
      snippet: route.body,
      score: route.score,
    }));
}

async function loadConversationMemory(
  admin: SupabaseAdminClient,
  adminId: string,
  conversationId: string | null,
): Promise<ChatMessage | null> {
  if (!conversationId) return null;
  const { data: conversation, error: convError } = await admin
    .from(table("operator_conversations"))
    .select("id, title, updated_at")
    .eq("id", conversationId)
    .eq("admin_id", adminId)
    .maybeSingle();
  if (convError || !conversation) return null;

  const { data: recent } = await admin
    .from(table("operator_messages"))
    .select("role, content, tool_results, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

  const lines = ((recent ?? []) as DbRow[])
    .reverse()
    .map((m) => {
      const role = asString(m.role, "message");
      const content = asString(m.content).replace(/\s+/g, " ").trim().slice(0, 700);
      const toolResults = Array.isArray(m.tool_results) ? m.tool_results : [];
      const links = toolResults
        .filter((tr) => isRecord(tr) && tr.name === "find_link")
        .flatMap((tr) => {
          const result = isRecord(tr.result) ? tr.result : null;
          const data = result && isRecord(result.data) ? result.data : null;
          return Array.isArray(data?.results) ? data.results : [];
        })
        .filter(isRecord)
        .slice(0, 3)
        .map((r) => `${asString(r.title)} → ${asString(r.url)}`)
        .filter(Boolean);
      return `- ${role}: ${content}${links.length ? ` [links: ${links.join("; ")}]` : ""}`;
    })
    .filter((line) => line.trim().length > 12);

  return {
    role: "system" as const,
    content: [
      "CONVERSATION MEMORY:",
      `- active saved chat: ${asString((conversation as DbRow).title, "New conversation")}`,
      "- Use this to understand follow-ups, corrections, confirmations, and pronouns. Do not say you lack memory unless asked about another chat.",
      ...lines,
    ].join("\n"),
  };
}

async function runTool(
  name: string,
  args: ToolArgs,
  ctx: { adminId: string; admin: SupabaseAdminClient; context?: DeskContext | null },
): Promise<ToolResult> {
  const { admin, adminId } = ctx;
  try {
    switch (name) {
      case "find_students": {
        const q = String(args.query ?? "").trim();
        const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
        if (!q) return { ok: true, data: { students: [] } };
        const { data, error } = await admin
          .from(table("profiles"))
          .select("class_id, display_name")
          .ilike("display_name", `%${q}%`)
          .limit(limit);
        if (error) throw error;
        return {
          ok: true,
          data: {
            students: ((data ?? []) as DbRow[]).map((r) => ({
              id: r.class_id,
              name: r.display_name,
            })),
          },
        };
      }
      case "list_recent_students": {
        const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
        const { data, error } = await admin
          .from(table("profiles"))
          .select("class_id, display_name, last_seen_at")
          .order("last_seen_at", { ascending: false, nullsFirst: false })
          .limit(limit);
        if (error) throw error;
        return {
          ok: true,
          data: {
            students: ((data ?? []) as DbRow[]).map((r) => ({
              id: r.class_id,
              name: r.display_name,
            })),
          },
        };
      }
      case "create_draft": {
        const channel = args.channel === "email" ? "email" : "student_message";
        // Echo the card-only fields back so the desk renders labels/recipient
        // without needing new ai_ta_drafts columns.
        const extras = {
          channel,
          variant_label: asString(args.variant_label) || undefined,
          to: asString(args.to) || undefined,
          subject: asString(args.subject) || undefined,
        };
        // Email drafts are headed to Gmail, not a student thread, so they are not
        // persisted as student drafts — just rendered inline and sent on approval.
        if (channel === "email") {
          return {
            ok: true,
            data: {
              draft: {
                id: crypto.randomUUID(),
                draft_type: asString(args.draft_type, "message"),
                draft_markdown: asString(args.draft_markdown),
                prompt: asString(args.prompt) || null,
                ...extras,
              },
            },
          };
        }
        const { data, error } = await admin
          .from(table("ai_ta_drafts"))
          .insert({
            student_id: args.student_id,
            created_by: adminId,
            draft_type: args.draft_type,
            prompt: args.prompt ?? null,
            draft_markdown: args.draft_markdown,
            input_snapshot_json: { source: "operator_chat", context: ctx.context ?? null },
            status: "draft",
          })
          // Return the full draft body inline so the Teacher Desk can render the
          // editable approval card in place (no punt to /teacher/command).
          .select("id, draft_type, student_id, draft_markdown, prompt")
          .single();
        if (error) throw error;
        return { ok: true, data: { draft: { ...data, ...extras } } };
      }
      case "send_message": {
        // Find or create the 1:1 conversation between admin and student.
        const studentId = String(args.student_id);
        const { data: existing } = await admin
          .from(table("conversation_participants"))
          .select("conversation_id")
          .eq("user_id", adminId);
        const adminConvIds = ((existing ?? []) as DbRow[])
          .map((r) => asString(r.conversation_id))
          .filter(Boolean);
        let convId: string | null = null;
        if (adminConvIds.length) {
          const { data: shared } = await admin
            .from(table("conversation_participants"))
            .select("conversation_id")
            .eq("user_id", studentId)
            .in("conversation_id", adminConvIds);
          if (shared && shared.length) convId = asString((shared[0] as DbRow).conversation_id, "");
        }
        if (!convId) {
          const { data: newConv, error: cErr } = await admin
            .from(table("conversations"))
            .insert({ created_by: adminId })
            .select("id")
            .single();
          if (cErr) throw cErr;
          convId = asString((newConv as DbRow).id, "");
          const { error: pErr } = await admin.from(table("conversation_participants")).insert([
            { conversation_id: convId, user_id: adminId },
            { conversation_id: convId, user_id: studentId },
          ]);
          if (pErr) throw pErr;
        }
        const { data: msg, error: mErr } = await admin
          .from(table("messages"))
          .insert({
            conversation_id: convId,
            sender_id: adminId,
            body: String(args.body ?? ""),
          })
          .select("id")
          .single();
        if (mErr) throw mErr;
        return { ok: true, data: { conversation_id: convId, message_id: (msg as DbRow).id } };
      }
      case "summarize_student": {
        const sid = String(args.student_id);
        const { data: student } = await admin
          .from(table("profiles"))
          .select("class_id, display_name")
          .eq("class_id", sid)
          .maybeSingle();
        const { data: sessions } = await admin
          .from(table("student_sessions"))
          .select("id, occurred_at, notes")
          .eq("student_id", sid)
          .order("occurred_at", { ascending: false })
          .limit(3);
        return {
          ok: true,
          data: { student, recent_sessions: sessions ?? [] },
        };
      }
      case "find_link":
        return await findLink(args, ctx.admin);
      case "create_assignment_offer": {
        const studentId = asString(args.student_id).trim();
        const resourceTitle = asString(args.resource_title).trim();
        if (!studentId || !resourceTitle) return { ok: false, error: "student_id and resource_title are required" };
        return {
          ok: true,
          data: {
            assignment_offer: {
              id: crypto.randomUUID(),
              student_id: studentId,
              student_name: asString(args.student_name) || null,
              resource: {
                title: resourceTitle,
                kind: asString(args.resource_kind) || "resource",
                source_id: asString(args.source_id) || null,
                url: asString(args.url) || null,
                subtitle: asString(args.subtitle) || null,
              },
            },
          },
        };
      }
      case "search_google_drive":
        return await searchGoogleDrive(args);
      case "search_gmail":
        return await searchGmail(args);
      case "list_calendar_events":
        return await listCalendarEvents(args);
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e: unknown) {
    console.error("tool error", name, e);
    return { ok: false, error: errorMessage(e, "tool failure") };
  }
}

async function findLink(
  args: ToolArgs,
  admin: SupabaseAdminClient,
): Promise<ToolResult> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return { ok: false, error: "query is required" };
  const limit = Math.min(Math.max(Number(args.limit ?? 5) || 5, 1), 10);
  const explicitKinds = Array.isArray(args.kinds)
    ? (args.kinds.filter((k) => typeof k === "string") as string[])
    : null;
  const inferredKinds = inferKindHints(query);
  const kinds = explicitKinds && explicitKinds.length ? explicitKinds : inferredKinds.length ? inferredKinds : null;

  const exactRows: DbRow[] = [];
  const directResource = await findDirectAssignableResource(admin, query);
  if (directResource && (!kinds?.length || kinds.includes(asString(directResource.kind)))) {
    exactRows.push(directResource);
  }
  exactRows.push(...(await findExactIndexedResources(admin, query, limit, kinds)));
  exactRows.push(...(routeFallbacks(query, limit, kinds) as DbRow[]));

  // 1) Embed the query via Lovable AI Gateway.
  let queryEmbedding: number[] | null = null;
  try {
    const er = await fetch(`${LSATU_GEMINI_PROXY_URL}/embeddings`, {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "edge-function",
        "Content-Type": "application/json",
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({ model: "gemini-embedding-001", input: query }),
    });
    if (er.ok) {
      const ej = (await er.json()) as { data?: Array<{ embedding?: number[] }> };
      queryEmbedding = ej.data?.[0]?.embedding ?? null;
    } else {
      console.warn("embedding failed", er.status, await er.text());
    }
  } catch (e) {
    console.warn("embedding threw", e);
  }

  type MatchRow = {
    id: string;
    kind: string;
    source_id: string;
    title: string | null;
    subtitle: string | null;
    url: string | null;
    metadata: Record<string, unknown> | null;
    snippet: string | null;
    similarity?: number;
    rank?: number;
  };

  let rows: MatchRow[] = [];

  if (queryEmbedding) {
    const { data, error } = await admin.rpc(table("match_lsatu_content") as never, {
      query_embedding: queryEmbedding as unknown,
      match_count: limit,
      kind_filter: kinds && kinds.length ? kinds : null,
    } as never);
    if (error) console.warn("match_lsatu_content error", error.message);
    rows = (data as MatchRow[] | null) ?? [];
  }

  // 2) FTS fallback (or supplement) when semantic returned nothing.
  if (!rows.length) {
    const { data, error } = await admin.rpc(table("fts_lsatu_content") as never, {
      q: query,
      match_count: limit,
      kind_filter: kinds && kinds.length ? kinds : null,
    } as never);
    if (error) console.warn("fts_lsatu_content error", error.message);
    rows = (data as MatchRow[] | null) ?? [];
  }

  const dbResults = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    source_id: r.source_id,
    title: r.title ?? "(untitled)",
    subtitle: r.subtitle ?? null,
    url: r.url ?? null,
    snippet: r.snippet ?? null,
    score: r.similarity ?? r.rank ?? null,
  }));
  const exactCandidates = exactRows.map(toResourceCandidate);
  const bestExact = pickBestResourceCandidate(exactCandidates, query, kinds ?? inferredKinds);
  const seen = new Set<string>();
  const orderedExact = bestExact
    ? [fromResourceCandidate(bestExact), ...exactRows.filter((r) => `${asString(r.kind)}:${asString(r.source_id)}` !== `${bestExact.kind}:${bestExact.source_id}`)]
    : exactRows;
  const results = [...orderedExact, ...dbResults]
    .filter((r) => {
      const key = `${r.kind}:${r.source_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);

  return {
    ok: true,
    data: {
      query,
      results,
      diagnostics: {
        resolver: "platform_resource_resolver_v1",
        inferred_kinds: inferredKinds,
        exact_candidates: exactRows.slice(0, 5).map((r) => ({
          kind: asString(r.kind),
          source_id: asString(r.source_id),
          title: asString(r.title),
          url: asString(r.url) || null,
        })),
        selected: results[0]
          ? {
              kind: results[0].kind,
              source_id: results[0].source_id,
              title: results[0].title,
              url: results[0].url ?? null,
            }
          : null,
      },
      note: results.length
        ? dbResults.length || exactRows.length ? undefined : "The semantic content index is empty or had no match; returned the closest built-in route fallback."
        : "Index is empty or no match. The content index may not be populated yet.",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Durable Memory & Skills — save commands + recall injection.
// "save memory:" / "remember:"  → semantic memory
// "save instruction:"           → procedural memory
// "save skill:"                 → procedural memory tagged "skill" w/ structured payload
// All scoped to the operator namespace for the current admin. Service-role
// queries only; never exposed to students.
// ─────────────────────────────────────────────────────────────────────────────

type SaveKind = "memory" | "instruction" | "skill";

function parseSaveCommand(text: string): { kind: SaveKind; body: string } | null {
  const t = text.trimStart();
  const m = t.match(/^(save\s+memory|remember|save\s+instruction|save\s+skill)\s*:\s*([\s\S]+)$/i);
  if (!m) return null;
  const head = m[1].toLowerCase().replace(/\s+/g, " ");
  const body = m[2].trim();
  if (!body) return null;
  if (head === "save skill") return { kind: "skill", body };
  if (head === "save instruction") return { kind: "instruction", body };
  return { kind: "memory", body };
}

function titleFromBody(body: string): string {
  const firstLine = body.split(/\n/)[0] ?? body;
  const words = firstLine.trim().split(/\s+/).slice(0, 8).join(" ");
  return words.length > 80 ? words.slice(0, 77) + "…" : (words || "Saved note");
}

function buildSkillStructured(body: string): Record<string, unknown> {
  const firstLine = body.split(/\n/)[0]?.trim() ?? "";
  return {
    type: "skill",
    trigger: firstLine.slice(0, 200),
    instruction: body,
  };
}

async function handleSaveCommand(
  userClient: ReturnType<typeof createClient>,
  admin: SupabaseAdminClient,
  adminId: string,
  parsed: { kind: SaveKind; body: string },
): Promise<{ content: string }> {
  // 1. Ensure the operator namespace exists (auth.uid() = adminId via userClient).
  const { data: nsData, error: nsErr } = await userClient.rpc("memory_ensure_namespace", {
    p_owner_type: "operator",
    p_owner_id: adminId,
  });
  if (nsErr) throw nsErr;
  const namespaceId = typeof nsData === "string" ? nsData : asString(nsData);
  if (!namespaceId) throw new Error("Could not resolve memory namespace");

  const kindMemory = parsed.kind === "memory" ? "semantic" : "procedural";
  const title = titleFromBody(parsed.body);

  // 2. Write via the existing memory_write function.
  const { data: writeData, error: writeErr } = await userClient.rpc("memory_write", {
    p_namespace_id: namespaceId,
    p_kind: kindMemory,
    p_title: title,
    p_content: parsed.body,
    p_embedding: null,
    p_source: "teacher_desk",
    p_source_authority: "teacher_approved",
    p_source_refs: [],
    p_subject_user_id: null,
    p_visibility: "admin_only",
    p_claim_key: null,
    p_confidence: 1.0,
    p_importance: 0.8,
  });
  if (writeErr) throw writeErr;
  const writeRow = Array.isArray(writeData) ? (writeData[0] as DbRow | undefined) : (writeData as DbRow | undefined);
  const memoryId = writeRow ? asString(writeRow.memory_id) : "";

  // 3. For instructions/skills, attach tags + structured payload via service role.
  if (memoryId) {
    const patch: Record<string, unknown> = {};
    if (parsed.kind === "skill") {
      patch.tags = ["skill"];
      patch.structured = buildSkillStructured(parsed.body);
    } else if (parsed.kind === "instruction") {
      patch.tags = ["instruction"];
    }
    if (Object.keys(patch).length) {
      await admin.from("memory_items").update(patch).eq("id", memoryId);
    }
  }

  if (parsed.kind === "skill") return { content: "Saved as a skill." };
  if (parsed.kind === "instruction") return { content: "Saved as an instruction." };
  return { content: "Saved to memory." };
}

async function loadDurableMemoryNote(
  admin: SupabaseAdminClient,
  adminId: string,
): Promise<ChatMessage | null> {
  const { data: ns } = await admin
    .from("memory_namespaces")
    .select("id")
    .eq("owner_type", "operator")
    .eq("owner_id", adminId)
    .maybeSingle();
  const namespaceId = ns ? asString((ns as DbRow).id) : "";
  if (!namespaceId) return null;

  const { data: rows } = await admin
    .from("memory_items")
    .select("id, kind, title, content, tags, structured, pinned, importance, updated_at")
    .eq("namespace_id", namespaceId)
    .eq("status", "active")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(40);
  const items = (rows ?? []) as DbRow[];
  if (!items.length) return null;

  const isSkill = (m: DbRow) => {
    const tags = Array.isArray(m.tags) ? (m.tags as unknown[]) : [];
    if (tags.some((t) => typeof t === "string" && t.toLowerCase() === "skill")) return true;
    const s = isRecord(m.structured) ? m.structured : null;
    return s?.type === "skill";
  };
  const isInstruction = (m: DbRow) => {
    if (m.kind === "procedural" && !isSkill(m)) return true;
    const tags = Array.isArray(m.tags) ? (m.tags as unknown[]) : [];
    return tags.some((t) => typeof t === "string" && t.toLowerCase() === "instruction");
  };

  const pinned = items.filter((m) => m.pinned === true);
  const skills = items.filter((m) => isSkill(m) && !pinned.includes(m));
  const instructions = items.filter((m) => isInstruction(m) && !pinned.includes(m) && !skills.includes(m));
  const semantic = items.filter(
    (m) => !pinned.includes(m) && !skills.includes(m) && !instructions.includes(m) && m.kind === "semantic",
  );

  const fmt = (m: DbRow) => {
    const title = asString(m.title).trim();
    const content = asString(m.content).replace(/\s+/g, " ").trim().slice(0, 300);
    return title ? `- ${title}: ${content}` : `- ${content}`;
  };

  const skillBlock = [...skills, ...pinned.filter(isSkill)].slice(0, 12).map(fmt);
  const instructionBlock = [...instructions, ...pinned.filter((m) => isInstruction(m) && !isSkill(m))]
    .slice(0, 12)
    .map(fmt);
  const memoryBlock = [
    ...pinned.filter((m) => !isSkill(m) && !isInstruction(m)),
    ...semantic,
  ]
    .slice(0, 16)
    .map(fmt);

  if (!skillBlock.length && !instructionBlock.length && !memoryBlock.length) return null;

  const parts: string[] = ["DURABLE MEMORY AND SKILLS"];
  if (skillBlock.length) {
    parts.push(
      "",
      "SKILLS",
      "These are reusable procedural playbooks. Apply them when the user's request matches the trigger or use case.",
      ...skillBlock,
    );
  }
  if (instructionBlock.length) {
    parts.push("", "INSTRUCTIONS", ...instructionBlock);
  }
  if (memoryBlock.length) {
    parts.push(
      "",
      "MEMORIES",
      "These are saved facts, preferences, and instructions.",
      ...memoryBlock,
    );
  }
  return { role: "system", content: parts.join("\n") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminId = userData.user.id;

    // Confirm admin role.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as {
      messages?: unknown;
      context?: unknown;
      conversation_id?: unknown;
      action?: unknown;
      student_id?: unknown;
      body?: unknown;
    };

    // Direct action: the Teacher Desk draft card sends the exact, user-approved
    // body to the student. Reuses the proven send_message tool logic (find-or-
    // create the 1:1 thread, insert) with no AI in the loop, so the body is sent
    // verbatim. Confirmation already happened client-side on the card.
    if (asString(payload.action) === "send_student_message") {
      const studentId = asString(payload.student_id);
      const messageBody = asString(payload.body);
      if (!studentId || !messageBody.trim()) {
        return new Response(JSON.stringify({ error: "student_id and body are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await runTool(
        "send_message",
        { student_id: studentId, body: messageBody },
        { adminId, admin, context: null },
      );
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = payload.messages ?? [];
    const context = payload.context ?? null;
    const conversationId = asString(payload.conversation_id) || null;
    const deskContext: DeskContext | null = isRecord(context) ? (context as DeskContext) : null;
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages (max 50)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const validMessages: ChatMessage[] = [];
    for (const m of messages) {
      if (!isRecord(m) || !["user", "assistant", "tool", "system"].includes(asString(m.role))) {
        return new Response(JSON.stringify({ error: "Invalid message role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof m.content === "string" && m.content.length > 20_000) {
        return new Response(JSON.stringify({ error: "Message content too large (max 20000 chars)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const content = sanitizeContent(m.content);
      if (isRecord(content) && typeof content.error === "string") {
        return new Response(JSON.stringify({ error: content.error }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      validMessages.push({
        role: asString(m.role) as ChatMessage["role"],
        content: content as string | ContentPart[],
      });
    }

    // Intercept explicit save commands ("save memory:", "remember:", "save instruction:",
    // "save skill:") BEFORE any AI call so they never leak into the model and so the
    // memory is persisted by the existing Memory OS functions. The client persists the
    // user message + our returned `content` into operator_messages, so the transcript
    // stays coherent.
    const lastValidUser = [...validMessages].reverse().find((m) => m.role === "user");
    const lastUserCmdText = typeof lastValidUser?.content === "string"
      ? lastValidUser.content
      : Array.isArray(lastValidUser?.content)
        ? (lastValidUser!.content as ContentPart[])
            .filter((p): p is { type: "text"; text: string } => p?.type === "text")
            .map((p) => p.text ?? "")
            .join(" ")
        : "";
    const saveCmd = parseSaveCommand(lastUserCmdText);
    if (saveCmd) {
      try {
        const result = await handleSaveCommand(userClient, admin, adminId, saveCmd);
        return new Response(JSON.stringify({ content: result.content, tool_results: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        console.error("save command failed", e);
        return new Response(
          JSON.stringify({ content: `⚠️ Couldn't save: ${errorMessage(e, "unknown error")}`, tool_results: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const deterministicAssignmentOffer = await buildAssignmentOfferFromHistory({ admin, validMessages });
    if (deterministicAssignmentOffer) {
      return new Response(JSON.stringify(deterministicAssignmentOffer), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tool-using loop. We use non-streaming first to handle tool calls cleanly,
    // then stream the final assistant message back to the client.
    // Typed per-task scope from the Teacher Desk. The desk renders create_draft
    // output as an inline approval card, so for reply/assign seeds the model
    // should DRAFT (create_draft), never send_message - Joshua approves the card.
    const contextNote =
      deskContext?.surface === "teacher_desk"
        ? {
            role: "system" as const,
            content: [
              "DESK CONTEXT (the user seeded this from the Teacher Desk; your create_draft output renders as an inline approval card the user edits/approves):",
              `- task mode: ${deskContext.mode ?? "unknown"}`,
              deskContext.studentId ? `- student_id: ${deskContext.studentId}` : "",
              deskContext.sourceKind ? `- source: ${deskContext.sourceKind}` : "",
              deskContext.sourcePreview ? `- source preview: ${deskContext.sourcePreview}` : "",
              "For a 'reply' task, draft the reply with create_draft (draft_type 'message') addressed to the student - do NOT send_message.",
              "For an 'assign' task, draft a short rationale with create_draft (draft_type 'next_assignment'); the desk attaches the actual drill.",
              "For a 'review' task the desk already holds the existing draft; reply with one short line, no new draft.",
              "The student is already resolved above, so you can skip find_students.",
            ]
              .filter(Boolean)
              .join("\n"),
          } satisfies ChatMessage
        : null;

    const driveConnectorOn = deskContext?.driveConnector === true;
    const driveKeyPresent = Boolean(Deno.env.get("GOOGLE_DRIVE_API_KEY"));
    const driveNote = driveConnectorOn
      ? {
          role: "system" as const,
          content: driveKeyPresent
            ? "Google Drive connector is ENABLED for this turn. When the user asks about Drive files or workspace documents, call search_google_drive to find them. You can return real names, ids, mimeTypes, and webViewLinks. You CANNOT read file contents yet — if asked to summarize a file, say you can only return names and links for now."
            : "The user enabled the Google Drive connector chip, but no Google Drive connection is linked in this workspace. Tell the user to link Google Drive in Lovable connectors before you can search Drive.",
        }
      : null;

    const gmailConnectorOn = deskContext?.gmailConnector === true;
    const gmailKeyPresent = Boolean(Deno.env.get("GOOGLE_MAIL_API_KEY"));
    const gmailNote = gmailConnectorOn
      ? {
          role: "system" as const,
          content: gmailKeyPresent
            ? "Gmail connector is ENABLED for this turn. When the user asks about email, the inbox, or messages from specific people, call search_gmail (Gmail search operators like `from:`, `is:unread`, `subject:`, `newer_than:7d` work in `query`). You return From, Subject, Date, and snippet. You CANNOT read full message bodies, send, or modify mail."
            : "The user enabled the Gmail connector chip, but no Gmail connection is linked in this workspace. Tell the user to link Gmail in Lovable connectors before you can search email.",
        }
      : null;

    const calendarConnectorOn = deskContext?.calendarConnector === true;
    const calendarKeyPresent = Boolean(Deno.env.get("GOOGLE_CALENDAR_API_KEY"));
    const calendarNote = calendarConnectorOn
      ? {
          role: "system" as const,
          content: calendarKeyPresent
            ? "Google Calendar connector is ENABLED for this turn. When the user asks about upcoming events, schedule, or meetings, call list_calendar_events. You return event summary, start/end, location, and link. You CANNOT create or modify events."
            : "The user enabled the Google Calendar connector chip, but no Google Calendar connection is linked in this workspace. Tell the user to link Google Calendar in Lovable connectors before you can list events.",
        }
      : null;

    const memoryNote = await loadConversationMemory(admin, adminId, conversationId);
    const durableNote = await loadDurableMemoryNote(admin, adminId);

    const baseMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(durableNote ? [durableNote] : []),
      ...(memoryNote ? [memoryNote] : []),
      ...(contextNote ? [contextNote] : []),
      ...(driveNote ? [driveNote] : []),
      ...(gmailNote ? [gmailNote] : []),
      ...(calendarNote ? [calendarNote] : []),
      ...validMessages,
    ];
    const activeTools = [
      ...TOOLS,
      ...(driveConnectorOn && driveKeyPresent ? [SEARCH_GDRIVE_TOOL] : []),
      ...(gmailConnectorOn && gmailKeyPresent ? [SEARCH_GMAIL_TOOL] : []),
      ...(calendarConnectorOn && calendarKeyPresent ? [LIST_GCAL_TOOL] : []),
    ];
    const toolResultsForClient: Array<{
      name: string;
      arguments: ToolArgs;
      result: ToolResult;
    }> = [];

    // Resolve model: explicit allow-listed pick, "auto" heuristic, or default.
    const requestedModel = typeof deskContext?.model === "string" ? deskContext.model : null;
    const lastUserMsg = [...validMessages].reverse().find((m) => m.role === "user");
    const lastUserText = typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.filter((p): p is { type: "text"; text: string } => p.type === "text").map((p) => p.text ?? "").join(" ")
        : "";
    const hasImageInput = validMessages.some((m) =>
      Array.isArray(m.content) && m.content.some((p: { type?: string }) => p?.type === "image_url"),
    );
    const totalChars = validMessages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
    const toolsEnabled = activeTools.length > TOOLS.length;

    let chatModel: string;
    if (requestedModel === "auto" || !requestedModel) {
      chatModel = pickAutoModel({ text: lastUserText, hasImages: hasImageInput, toolsEnabled, totalChars });
    } else if (ALLOWED_MODELS.has(requestedModel)) {
      chatModel = requestedModel;
    } else {
      chatModel = DEFAULT_MODEL;
    }

    let iter = 0;
    while (iter++ < 4) {
      const r = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Lovable-AIG-SDK": "edge-function",
          "Content-Type": "application/json",
          "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
        },
        body: JSON.stringify({
          model: chatModel,
          messages: baseMessages,
          tools: activeTools,
          tool_choice: "auto",
        }),
      });

      if (!r.ok) {
        if (r.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit reached. Try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (r.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Top up in Lovable Cloud settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const t = await r.text();
        console.error("gateway error", r.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const j = (await r.json()) as {
        choices?: Array<{
          message?: ChatMessage;
        }>;
      };
      const choice = j.choices?.[0];
      const message = choice?.message;
      const toolCalls = message?.tool_calls;

      if (toolCalls && toolCalls.length) {
        baseMessages.push(message);
        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          let parsedArgs: ToolArgs = {};
          try {
            const parsed = JSON.parse(tc.function?.arguments ?? "{}") as unknown;
            parsedArgs = isRecord(parsed) ? parsed : {};
          } catch (parseError) {
            console.warn("tool arguments parse failed", parseError);
          }
          const result = await runTool(asString(fnName, "unknown"), parsedArgs, { adminId, admin, context: deskContext });
          toolResultsForClient.push({
            name: asString(fnName, "unknown"),
            arguments: parsedArgs,
            result,
          });
          baseMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue; // loop again so the model can react to tool results
      }

      // Final assistant content.
      const finalText = message?.content ?? "";
      return new Response(
        JSON.stringify({
          content: finalText,
          tool_results: toolResultsForClient,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        content: "I hit my reasoning loop limit. Try rephrasing the request.",
        tool_results: toolResultsForClient,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    console.error("operator-chat fatal", e);
    return new Response(
      JSON.stringify({ error: errorMessage(e, "Unknown error") }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

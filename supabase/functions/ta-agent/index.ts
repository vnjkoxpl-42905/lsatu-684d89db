// ta-agent — admin-only action agent for the corner chat.
//
// Extends the ta-chat pattern (admin verification, persistence
// to ta_interactions) with the ability to PROPOSE real platform actions that
// the admin confirms with one click on the client:
//   - assign a guided drill
//   - assign a homework set
//   - assign a bootcamp module
//   - draft + assign a note
//
// Two routing lanes:
//   1. Deterministic (no LLM): an explicit "assign <resource> to <name>"
//      command is resolved directly against the DB. Free + instant.
//   2. AI (tool calling): anything ambiguous or generative (note copy, fuzzy
//      intent) goes to the Lovable AI gateway with a tool schema; the model picks a tool,
//      the function resolves targets server-side.
//
// Assignment/note actions never mutate student data here. They only resolve
// targets and return a structured ActionProposal (or a disambiguation). The
// client executes those mutations after the admin clicks Confirm. The explicit
// "email <student>: <message>" command is a deterministic send-side effect.
//
// Modes:
//   - student_id present  -> per-student thread (default target + context).
//   - student_id absent    -> global thread (student_id IS NULL). Target is
//     resolved by name from the message.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
const GATEWAY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const TA_AGENT_MODEL = Deno.env.get("TA_AGENT_GEMINI_MODEL") ?? "google/gemini-3.1-flash-lite";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const GMAIL_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DIRECT_GMAIL_NOT_CONFIGURED =
  "Direct Gmail sending is not configured. This command cannot send email without Gmail OAuth credentials.";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionKind =
  | "guided_drill"
  | "homework"
  | "bootcamp_module"
  | "note"
  | "activity"
  | "message";

interface ResolvedStudent {
  id: string;
  name: string;
}

interface ResolvedStudentWithEmail extends ResolvedStudent {
  email: string;
}

interface ResolvedResource {
  id?: string;
  title: string;
  kind: string;
  route?: string;
}

interface ActionProposal {
  type: "action";
  kind: ActionKind;
  student: ResolvedStudent;
  resource?: ResolvedResource;
  params?: { unlock_at?: string };
  generated_html?: string;
  summary: string;
}

interface Disambiguation {
  type: "disambiguation";
  field: "student" | "resource";
  query: string;
  candidates: Array<{ id: string; label: string }>;
  summary: string;
}

type Proposal = ActionProposal | Disambiguation;

interface InteractionRow {
  role: "admin" | "assistant";
  message: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sanitizeHeaderValue(s: string): string {
  return s.replace(/[\r\n]/g, " ").trim();
}

function buildPlainEmail(args: { to: string; subject: string; text: string }): string {
  return b64urlEncode([
    `To: ${sanitizeHeaderValue(args.to)}`,
    `Subject: ${sanitizeHeaderValue(args.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    args.text,
  ].join("\r\n"));
}

async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing auth");

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error,
  } = await anonClient.auth.getUser();
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

// ---------- Target resolution ----------

async function resolveStudent(
  admin: SupabaseClient,
  query: string,
): Promise<ResolvedStudent[]> {
  const q = query.trim().replace(/^@+/, "");
  if (!q) return [];
  // profiles.class_id IS the auth user id (== ta_interactions.student_id).
  const { data } = await admin
    .from("profiles")
    .select("class_id, display_name")
    .ilike("display_name", `%${q}%`)
    .limit(10);
  const rows = (data ?? []) as Array<{ class_id: string; display_name: string | null }>;
  // Prefer an exact (case-insensitive) name match if one exists — "Sam" should
  // not be ambiguous against "Samantha" when an exact "Sam" is present.
  const exact = rows.filter(
    (r) => (r.display_name ?? "").trim().toLowerCase() === q.toLowerCase(),
  );
  const chosen = exact.length > 0 ? exact : rows;
  return chosen
    .filter((r) => !!r.display_name)
    .map((r) => ({ id: r.class_id, name: r.display_name as string }));
}

async function resolveStudentWithEmail(
  admin: SupabaseClient,
  query: string,
): Promise<{ student?: ResolvedStudentWithEmail; disambiguation?: Disambiguation; error?: string }> {
  const matches = await resolveStudent(admin, query);
  if (matches.length !== 1) {
    return { disambiguation: disambiguateStudent(query, matches) };
  }

  const student = matches[0];
  const { data, error } = await admin.auth.admin.getUserById(student.id);
  if (error) {
    console.error("Failed to load student auth user:", error);
    return { error: `Could not look up an email address for ${student.name}.` };
  }

  const email = data?.user?.email?.trim();
  if (!email) {
    return {
      error:
        `No email address is available for ${student.name}. ` +
        "The profiles row resolves to an auth user, but that auth user has no email.",
    };
  }

  return { student: { ...student, email } };
}

interface ResourceMatch {
  id: string;
  title: string;
  kind: ActionKind;
}

async function searchTable(
  admin: SupabaseClient,
  table: "guided_drills" | "homework_sets" | "activities",
  kind: ActionKind,
  query: string,
): Promise<ResourceMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const { data } = await admin
    .from(table)
    .select("id, title")
    .ilike("title", `%${q}%`)
    .limit(10);
  const rows = (data ?? []) as Array<{ id: string; title: string }>;
  const exact = rows.filter((r) => r.title.trim().toLowerCase() === q.toLowerCase());
  const chosen = exact.length > 0 ? exact : rows;
  return chosen.map((r) => ({ id: r.id, title: r.title, kind }));
}

// Resolve a resource by kind. For "auto" (deterministic lane) we probe guided
// drills, then homework, then activities, and use the first table that yields a
// single confident match.
async function resolveResource(
  admin: SupabaseClient,
  kind: ActionKind | "auto",
  query: string,
): Promise<{ unique?: ResourceMatch; candidates: ResourceMatch[] }> {
  if (kind === "guided_drill") {
    const m = await searchTable(admin, "guided_drills", "guided_drill", query);
    return m.length === 1 ? { unique: m[0], candidates: m } : { candidates: m };
  }
  if (kind === "homework") {
    const m = await searchTable(admin, "homework_sets", "homework", query);
    return m.length === 1 ? { unique: m[0], candidates: m } : { candidates: m };
  }
  if (kind === "activity") {
    const m = await searchTable(admin, "activities", "activity", query);
    return m.length === 1 ? { unique: m[0], candidates: m } : { candidates: m };
  }
  // auto: probe in priority order.
  for (const [table, k] of [
    ["guided_drills", "guided_drill"],
    ["homework_sets", "homework"],
    ["activities", "activity"],
  ] as Array<["guided_drills" | "homework_sets" | "activities", ActionKind]>) {
    const m = await searchTable(admin, table, k, query);
    if (m.length === 1) return { unique: m[0], candidates: m };
    if (m.length > 1) return { candidates: m };
  }
  return { candidates: [] };
}

function disambiguateStudent(query: string, matches: ResolvedStudent[]): Disambiguation {
  return {
    type: "disambiguation",
    field: "student",
    query,
    candidates: matches.map((m) => ({ id: m.id, label: m.name })),
    summary: matches.length
      ? `More than one student matches "${query}". Which one?`
      : `No student matches "${query}".`,
  };
}

function disambiguateResource(query: string, matches: ResourceMatch[]): Disambiguation {
  return {
    type: "disambiguation",
    field: "resource",
    query,
    candidates: matches.map((m) => ({ id: m.id, label: m.title })),
    summary: matches.length
      ? `More than one resource matches "${query}". Which one?`
      : `No resource matches "${query}".`,
  };
}

// Build an assign-* proposal (drill / homework / bootcamp). Returns null when
// the resource cannot be found at all in "auto" mode, so the caller can fall
// through to the AI lane (it might be a note or bootcamp path).
async function buildAssignProposal(input: {
  admin: SupabaseClient;
  kind: ActionKind | "auto";
  studentQuery: string;
  resourceQuery: string;
  selectedStudent: ResolvedStudent | null;
  unlock_at?: string;
}): Promise<Proposal | null> {
  const { admin, kind, studentQuery, resourceQuery, selectedStudent, unlock_at } = input;

  // Student: an explicit query wins; otherwise fall back to the selected student.
  let student: ResolvedStudent;
  if (studentQuery.trim()) {
    const matches = await resolveStudent(admin, studentQuery);
    if (matches.length !== 1) return disambiguateStudent(studentQuery, matches);
    student = matches[0];
  } else if (selectedStudent) {
    student = selectedStudent;
  } else {
    return disambiguateStudent("", []);
  }

  const { unique, candidates } = await resolveResource(admin, kind, resourceQuery);
  if (!unique) {
    if (kind === "auto" && candidates.length === 0) return null; // let AI lane try
    return disambiguateResource(resourceQuery, candidates);
  }

  const resolvedKind = unique.kind;
  const verb =
    resolvedKind === "homework"
      ? "Assign homework"
      : resolvedKind === "activity"
        ? "Assign activity"
        : "Assign guided drill";
  return {
    type: "action",
    kind: resolvedKind,
    student,
    resource: { id: unique.id, title: unique.title, kind: resolvedKind },
    params: unlock_at ? { unlock_at } : undefined,
    summary: `${verb} "${unique.title}" to ${student.name}`,
  };
}

// ---------- Deterministic lane ----------

const ASSIGN_RE = /^\s*assign\s+(.+?)\s+to\s+(.+?)\s*$/i;
const GIVE_RE = /^\s*give\s+(@?\S+)\s+(.+?)\s*$/i;
const EMAIL_RE = /^\s*email\s+([^:]+?)\s*:\s*([\s\S]+?)\s*$/i;

interface EmailCommand {
  studentQuery: string;
  message: string;
}

interface EmailSendResult {
  id?: string;
  threadId?: string;
}

interface GmailOAuthTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

function parseEmailCommand(message: string): EmailCommand | null {
  const m = message.match(EMAIL_RE);
  if (!m) return null;
  const studentQuery = m[1].trim();
  const emailMessage = m[2].trim();
  if (!studentQuery || !emailMessage) return null;
  return { studentQuery, message: emailMessage };
}

async function sendGmailMessage(args: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailSendResult> {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) throw new Error(DIRECT_GMAIL_NOT_CONFIGURED);

  const tokenResponse = await fetch(GMAIL_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = (await tokenResponse.json().catch(() => ({}))) as GmailOAuthTokenResponse;
  if (!tokenResponse.ok || !tokenData.access_token) {
    const detail = tokenData.error_description ?? tokenData.error ?? `HTTP ${tokenResponse.status}`;
    throw new Error(`Direct Gmail OAuth failed: ${detail}`);
  }

  const raw = buildPlainEmail(args);
  const response = await fetch(`${GMAIL_API}/users/me/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Direct Gmail OAuth is not authorized for sending email.");
    }
    throw new Error(`Gmail send failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return (data ?? {}) as EmailSendResult;
}

async function persistTurns(input: {
  admin: SupabaseClient;
  studentId: string | null;
  callerId: string;
  adminMessage: string;
  assistantMessage: string;
  actionProposal?: Proposal | null;
  actionStatus?: string | null;
}): Promise<string> {
  const {
    admin,
    studentId,
    callerId,
    adminMessage,
    assistantMessage,
    actionProposal = null,
    actionStatus = null,
  } = input;
  const { error: adminErr } = await admin.from("ta_interactions").insert({
    student_id: studentId,
    role: "admin",
    message: adminMessage,
    created_by: callerId,
  });
  if (adminErr) console.error("Failed to write admin turn:", adminErr);

  const { data: assistantRow, error: assistantErr } = await admin
    .from("ta_interactions")
    .insert({
      student_id: studentId,
      role: "assistant",
      message: assistantMessage,
      action_proposal: actionProposal,
      action_status: actionStatus,
    })
    .select("id")
    .single();
  if (assistantErr) {
    console.error("Failed to write assistant turn:", assistantErr);
    throw new Error("Response generated but failed to persist.");
  }
  return (assistantRow as { id: string }).id;
}

async function tryDeterministic(
  admin: SupabaseClient,
  message: string,
  selectedStudent: ResolvedStudent | null,
): Promise<Proposal | null> {
  const m = message.match(ASSIGN_RE);
  if (m) {
    const resourceQuery = m[1].trim();
    const studentQuery = m[2].trim();
    return buildAssignProposal({
      admin,
      kind: "auto",
      studentQuery,
      resourceQuery,
      selectedStudent,
    });
  }

  const give = message.match(GIVE_RE);
  if (give) {
    const studentQuery = give[1].trim();
    const resourceQuery = give[2].trim();
    return buildAssignProposal({
      admin,
      kind: "auto",
      studentQuery,
      resourceQuery,
      selectedStudent,
    });
  }

  return null;
}

// ---------- AI lane (tool calling) ----------

const SYSTEM_PROMPT = `You are the teaching assistant for LSAT U, an LSAT prep course run by Joshua. You are admin-only: you work for Joshua, on his students, with full read access to his platform and the ability to propose any action on it.

LOOK THINGS UP BEFORE YOU ANSWER. You have read tools. Use them freely and repeatedly in one turn — never guess a name, a title, a score, or a message, and never say you cannot see something before you have queried for it.

READ TOOLS (run server-side, results come back to you, nothing is shown to Joshua):
- find_students(query?) — roster, or students matching a name/email fragment. Returns ids and names.
- student_snapshot(student) — one student's whole picture: accuracy overall and per question type, wrong-answer journal, recent assignments and their status, Read Recall Colour section grades, last activity, access flags.
- list_library(kind, query?) — what exists to assign. kind is guided_drills | homework_sets | activities | bootcamps.
- read_messages(student?, limit?) — recent platform inbox messages, newest first; omit student for everyone.
- platform_overview() — roster size, library counts, unanswered messages, recent activity across the platform.

ACTION TOOLS (each returns a card Joshua confirms with one click; nothing happens until he does):
- assign_guided_drill(student, drill, unlock_at?)
- assign_homework(student, set)
- assign_activity(student, activity) — activities include the Read, Recall, Colour sections.
- assign_bootcamp_module(student, module) — a path like "/bootcamps/causation-station" when known, otherwise the name.
- draft_and_assign_note(student, title, body_html) — a note/instruction that lands in the student's Classroom. body_html is safe inline HTML, no scripts, no external resources.
- send_message(student, text) — a message from Joshua in the student's 1:1 platform inbox thread.
- answer(text) — no action; answer Joshua, report what you found, or ask one clarifying question.

WHERE THINGS LIVE (student side): /classroom is their work list, /classroom/:assignmentId a homework set, /guided/:assignmentId a guided drill, /activities and /activities/:assignmentId activities, /activities/sections the Read Recall Colour sections, /drill practice, /rc reading comprehension, /bootcamps the bootcamps, /waj the wrong answer journal, /foyer the home page.
WHERE THINGS LIVE (Joshua's side): /teacher/today, /teacher/inbox, /teacher/library, /teacher/insights, /teacher/students, /teacher/assistant (you).

RULES:
1. "student" is the name as Joshua wrote it. When a student is already selected and he does not name one, pass an empty string and the selected student is used.
2. Chain read tools before acting: check the roster or the library when a name or title is fuzzy, and check the snapshot when the request depends on how the student is doing.
3. Never invent a student, drill, set, activity, score, or message. If a lookup comes back empty, say so plainly.
4. Write in Joshua's voice to students: direct, encouraging, no filler, no em-dashes, tight.
5. One action tool per turn, after any number of read tools. You never execute anything yourself; Joshua confirms every card.
6. You remember this thread. Prior turns are in your history, so follow-ups like "assign that to her too" resolve against what was just discussed.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "assign_guided_drill",
      description: "Propose assigning a guided drill to a student.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
          drill: { type: "string", description: "Name of the guided drill." },
          unlock_at: { type: "string", description: "Optional ISO date when the drill unlocks." },
        },
        required: ["student", "drill"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_homework",
      description: "Propose assigning a homework set to a student.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
          set: { type: "string", description: "Name of the homework set." },
        },
        required: ["student", "set"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_bootcamp_module",
      description: "Propose assigning a bootcamp module to a student.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
          module: { type: "string", description: "Bootcamp module path (e.g. /bootcamp/intro-lr) or name." },
        },
        required: ["student", "module"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_and_assign_note",
      description: "Write a short note for the student and propose assigning it.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
          title: { type: "string", description: "Short note title." },
          body_html: { type: "string", description: "Safe inline HTML body for the student." },
        },
        required: ["student", "title", "body_html"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assign_activity",
      description:
        "Propose assigning an activity (including Read, Recall, Colour sections) to a student.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
          activity: { type: "string", description: "Name of the activity or section." },
        },
        required: ["student", "activity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description:
        "Propose sending a message from Joshua in the student's 1:1 platform inbox thread.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
          text: { type: "string", description: "The message text, in Joshua's voice." },
        },
        required: ["student", "text"],
      },
    },
  },
  // ---- Read tools: executed server-side, results returned to the model. ----
  {
    type: "function",
    function: {
      name: "find_students",
      description: "List the roster, or the students matching a name or email fragment.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional name fragment. Empty for the whole roster." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "student_snapshot",
      description:
        "Everything known about one student: accuracy, weak question types, wrong answer journal, assignments, section grades, access, last activity.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Student name, or empty to use the selected student." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_library",
      description: "List assignable material.",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            description: "guided_drills | homework_sets | activities | bootcamps",
          },
          query: { type: "string", description: "Optional title fragment." },
        },
        required: ["kind"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_messages",
      description: "Recent platform inbox messages, newest first. Omit student for everyone.",
      parameters: {
        type: "object",
        properties: {
          student: { type: "string", description: "Optional student name." },
          limit: { type: "string", description: "Optional count, default 20, max 60." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "platform_overview",
      description:
        "Platform-wide picture: roster size, library counts, recent messages awaiting a reply, recent student activity.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "answer",
      description: "Answer Joshua or ask a clarifying question. No action proposed.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
];

const READ_TOOLS = new Set([
  "find_students",
  "student_snapshot",
  "list_library",
  "read_messages",
  "platform_overview",
]);

interface ToolCallMsg {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

// One chat turn in OpenAI format. The gateway returns OpenRouter-style
// reasoning details on Gemini tool-call turns; the assistant message is
// echoed back verbatim (this field included) so the follow-up turn stays
// valid.
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: ToolCallMsg[];
  tool_call_id?: string;
  reasoning_details?: unknown;
}

interface GatewayChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: ToolCallMsg[];
      reasoning_details?: unknown;
    };
  }>;
  error?: { message?: string };
}

function parseToolArgs(raw: string | undefined): Record<string, string> {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value == null) continue;
    normalized[key] = typeof value === "string" ? value : String(value);
  }
  return normalized;
}

async function callModelWithTools(input: {
  apiKey: string;
  systemPrompt: string;
  contextHeader: string | null;
  history: InteractionRow[];
  message: string;
  toolTurns?: ChatMessage[];
}): Promise<{
  text: string;
  functionCall: { name: string; args: Record<string, string> } | null;
  assistantMessage: ChatMessage;
}> {
  const systemText = input.contextHeader
    ? `${input.systemPrompt}\n\n${input.contextHeader}`
    : input.systemPrompt;
  const messages: ChatMessage[] = [{ role: "system", content: systemText }];
  for (const h of input.history) {
    messages.push({
      role: h.role === "admin" ? "user" : "assistant",
      content: h.message,
    });
  }
  messages.push({ role: "user", content: input.message });
  for (const turn of input.toolTurns ?? []) messages.push(turn);

  const response = await fetch(GATEWAY_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "ta-agent",
    },
    body: JSON.stringify({
      model: TA_AGENT_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });

  const rawText = await response.text();
  let data: GatewayChatResponse | null = null;
  try {
    data = rawText ? JSON.parse(rawText) as GatewayChatResponse : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error?.message || rawText.slice(0, 300) || `HTTP ${response.status}`;
    console.error("Model API error:", response.status, detail);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`The model rejected the request: ${detail}`);
    }
    if (response.status === 429) throw new Error("The model rate limited the request. Try again in a moment.");
    throw new Error(`Model request failed (${response.status}): ${detail}`);
  }

  const choice = data?.choices?.[0]?.message;
  const text = (choice?.content ?? "").trim();
  const toolCallMsg = choice?.tool_calls?.[0];
  const assistantMessage: ChatMessage = {
    role: "assistant",
    content: choice?.content ?? null,
  };
  if (choice?.tool_calls?.length) assistantMessage.tool_calls = choice.tool_calls;
  if (choice?.reasoning_details !== undefined) {
    assistantMessage.reasoning_details = choice.reasoning_details;
  }

  if (toolCallMsg?.function?.name) {
    return {
      text,
      functionCall: {
        name: toolCallMsg.function.name,
        args: parseToolArgs(toolCallMsg.function.arguments),
      },
      assistantMessage,
    };
  }

  return { text, functionCall: null, assistantMessage };
}

async function buildNoteProposal(
  admin: SupabaseClient,
  studentQuery: string,
  selectedStudent: ResolvedStudent | null,
  title: string,
  bodyHtml: string,
): Promise<Proposal> {
  let student: ResolvedStudent;
  if (studentQuery.trim()) {
    const matches = await resolveStudent(admin, studentQuery);
    if (matches.length !== 1) return disambiguateStudent(studentQuery, matches);
    student = matches[0];
  } else if (selectedStudent) {
    student = selectedStudent;
  } else {
    return disambiguateStudent("", []);
  }
  return {
    type: "action",
    kind: "note",
    student,
    resource: { title, kind: "note" },
    generated_html: bodyHtml,
    summary: `Send note "${title}" to ${student.name}`,
  };
}

async function buildMessageProposal(
  admin: SupabaseClient,
  studentQuery: string,
  selectedStudent: ResolvedStudent | null,
  text: string,
): Promise<Proposal> {
  let student: ResolvedStudent;
  if (studentQuery.trim()) {
    const matches = await resolveStudent(admin, studentQuery);
    if (matches.length !== 1) return disambiguateStudent(studentQuery, matches);
    student = matches[0];
  } else if (selectedStudent) {
    student = selectedStudent;
  } else {
    return disambiguateStudent("", []);
  }
  return {
    type: "action",
    kind: "message",
    student,
    resource: { title: "Inbox message", kind: "message" },
    generated_html: text,
    summary: `Message ${student.name}: "${text.length > 80 ? text.slice(0, 80) + "…" : text}"`,
  };
}

async function buildBootcampProposal(
  admin: SupabaseClient,
  studentQuery: string,
  selectedStudent: ResolvedStudent | null,
  moduleRef: string,
): Promise<Proposal> {
  let student: ResolvedStudent;
  if (studentQuery.trim()) {
    const matches = await resolveStudent(admin, studentQuery);
    if (matches.length !== 1) return disambiguateStudent(studentQuery, matches);
    student = matches[0];
  } else if (selectedStudent) {
    student = selectedStudent;
  } else {
    return disambiguateStudent("", []);
  }
  const route = moduleRef.startsWith("/") ? moduleRef : "/bootcamps";
  const title = moduleRef.startsWith("/")
    ? moduleRef.replace(/^\/bootcamps?\//, "").replace(/[-/]/g, " ").trim() || "Bootcamp module"
    : moduleRef;
  return {
    type: "action",
    kind: "bootcamp_module",
    student,
    resource: { title, kind: "bootcamp_module", route },
    summary: `Assign bootcamp module "${title}" to ${student.name}`,
  };
}

// ---------- Per-student context (preserves ta-chat awareness) ----------

interface AttemptRow {
  qtype: string | null;
  correct: boolean | null;
}

function clamp(str: string, n: number): string {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function summarizeAnalytics(
  attempts: AttemptRow[],
  waj: Array<{ qtype: string | null }>,
  asg: Array<{ title: string; status: string }>,
): string {
  if (!attempts.length && !waj.length && !asg.length) {
    return "No analytics yet — this student has not attempted questions.";
  }
  const byType = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const k = a.qtype || "unknown";
    const agg = byType.get(k) ?? { total: 0, correct: 0 };
    agg.total += 1;
    if (a.correct) agg.correct += 1;
    byType.set(k, agg);
  }
  const perType = [...byType.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([k, v]) => `  - ${k}: ${v.correct}/${v.total} (${Math.round((v.correct / v.total) * 100)}%)`)
    .join("\n");
  const correct = attempts.filter((a) => a.correct).length;
  const overall = attempts.length
    ? `${correct}/${attempts.length} (${Math.round((correct / attempts.length) * 100)}%)`
    : "no attempts";
  const wajLine = waj.length ? `${waj.length} unresolved WAJ items` : "WAJ empty";
  const asgLine = asg.length
    ? asg.slice(0, 5).map((a) => `  - "${clamp(a.title, 80)}" (${a.status})`).join("\n")
    : "No prior assignments.";
  return `Overall: ${overall}\nPer question type:\n${perType}\n${wajLine}\nRecent assignments:\n${asgLine}`;
}

async function buildStudentContext(
  admin: SupabaseClient,
  studentId: string,
  studentName: string,
): Promise<string> {
  const [attemptsRes, wajRes, asgRes] = await Promise.all([
    admin.from("attempts").select("qtype, correct").eq("class_id", studentId)
      .order("timestamp_iso", { ascending: false }).limit(200),
    admin.from("wrong_answer_journal").select("qtype").eq("class_id", studentId).limit(50),
    admin.from("ta_assignments").select("title, status").eq("student_id", studentId)
      .order("assigned_at", { ascending: false }).limit(10),
  ]);
  const analytics = summarizeAnalytics(
    (attemptsRes.data as AttemptRow[] | null) ?? [],
    (wajRes.data as Array<{ qtype: string | null }> | null) ?? [],
    (asgRes.data as Array<{ title: string; status: string }> | null) ?? [],
  );
  return `SELECTED STUDENT: ${studentName} (id: ${studentId})\n\nANALYTICS:\n${analytics}`;
}

// ---------- Read tools (server-side lookups fed back to the model) ----------

async function resolveStudentForRead(
  admin: SupabaseClient,
  query: string,
  selectedStudent: ResolvedStudent | null,
): Promise<ResolvedStudent | null> {
  const q = (query ?? "").trim();
  if (!q) return selectedStudent;
  const matches = await resolveStudent(admin, q);
  if (matches.length === 1) return matches[0];
  return null;
}

async function runReadTool(
  admin: SupabaseClient,
  name: string,
  args: Record<string, string>,
  selectedStudent: ResolvedStudent | null,
): Promise<Record<string, unknown>> {
  if (name === "find_students") {
    const q = (args.query ?? "").trim();
    let query = admin
      .from("profiles")
      .select("class_id, display_name, last_seen_at, has_classroom_access, has_activity_access, has_chat_access")
      .order("last_seen_at", { ascending: false })
      .limit(q ? 15 : 60);
    if (q) query = query.ilike("display_name", `%${q}%`);
    const { data, error } = await query;
    if (error) return { error: error.message };
    return { students: data ?? [] };
  }

  if (name === "student_snapshot") {
    const student = await resolveStudentForRead(admin, args.student ?? "", selectedStudent);
    if (!student) return { error: `No single student matches "${args.student ?? ""}". Call find_students first.` };
    const [analytics, gradesRes, activityRes, profileRes] = await Promise.all([
      buildStudentContext(admin, student.id, student.name),
      admin
        .from("activity_section_grades")
        // Only columns this table actually has, and only this student's runs.
        .select("assignment_id, attempt_no, section, source_section, grader_version, stimuli, graded_at")
        .eq("student_id", student.id)
        .order("graded_at", { ascending: false })
        .limit(10),
      admin
        .from("activity_assignments")
        .select("id, title, status, assigned_at, completed_at")
        .eq("student_id", student.id)
        .order("assigned_at", { ascending: false })
        .limit(10),
      admin
        .from("profiles")
        .select("*")
        .eq("class_id", student.id)
        .maybeSingle(),
    ]);
    return {
      student,
      analytics,
      recent_activity_assignments: activityRes.data ?? [],
      recent_section_grades: gradesRes.data ?? [],
      profile: profileRes.data ?? null,
    };
  }

  if (name === "list_library") {
    const kind = (args.kind ?? "").trim();
    const q = (args.query ?? "").trim();
    const table =
      kind === "homework_sets"
        ? "homework_sets"
        : kind === "activities"
          ? "activities"
          : kind === "guided_drills"
            ? "guided_drills"
            : null;
    if (!table) {
      return {
        note:
          "Bootcamps are static routes, not a table. Known bootcamps live under /bootcamps (e.g. /bootcamps/intro-lr, /bootcamps/causation-station).",
      };
    }
    let query = admin.from(table).select("id, title").limit(40);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data, error } = await query;
    if (error) return { error: error.message };
    return { kind: table, items: data ?? [] };
  }

  if (name === "read_messages") {
    const limit = Math.min(Math.max(parseInt(args.limit ?? "20", 10) || 20, 1), 60);
    const student = (args.student ?? "").trim()
      ? await resolveStudentForRead(admin, args.student ?? "", selectedStudent)
      : null;
    let convIds: string[] | null = null;
    if (student) {
      const { data: parts } = await admin
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", student.id);
      convIds = (parts ?? []).map((p: { conversation_id: string }) => p.conversation_id);
      if (!convIds.length) return { messages: [], student };
    }
    let query = admin
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (convIds) query = query.in("conversation_id", convIds);
    const { data, error } = await query;
    if (error) return { error: error.message };
    return { student, messages: data ?? [] };
  }

  if (name === "platform_overview") {
    const [students, drills, sets, activities, messages] = await Promise.all([
      admin.from("profiles").select("class_id", { count: "exact", head: true }),
      admin.from("guided_drills").select("id", { count: "exact", head: true }),
      admin.from("homework_sets").select("id", { count: "exact", head: true }),
      admin.from("activities").select("id", { count: "exact", head: true }),
      admin
        .from("messages")
        .select("id, sender_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    return {
      students: students.count ?? 0,
      guided_drills: drills.count ?? 0,
      homework_sets: sets.count ?? 0,
      activities: activities.count ?? 0,
      recent_messages: messages.data ?? [],
    };
  }

  return { error: `Unknown read tool ${name}` };
}

async function buildPlatformContext(admin: SupabaseClient): Promise<string> {
  const overview = await runReadTool(admin, "platform_overview", {}, null);
  const o = overview as { students?: number; guided_drills?: number; homework_sets?: number; activities?: number };
  return `PLATFORM: ${o.students ?? 0} students, ${o.guided_drills ?? 0} guided drills, ${o.homework_sets ?? 0} homework sets, ${o.activities ?? 0} activities. No student is selected — resolve names with find_students before acting.`;
}

interface AiResult {
  content: string;
  proposal: Proposal | null;
}

async function runAiLane(
  admin: SupabaseClient,
  apiKey: string,
  history: InteractionRow[],
  message: string,
  selectedStudent: ResolvedStudent | null,
  contextHeader: string | null,
): Promise<AiResult> {
  const toolTurns: ChatMessage[] = [];
  let gemini = await callModelWithTools({
    apiKey,
    systemPrompt: SYSTEM_PROMPT,
    contextHeader,
    history,
    message,
    toolTurns,
  });

  // Read tools loop: the model may look things up several times before it
  // answers or proposes an action. Reads never mutate anything.
  for (let step = 0; step < 6; step += 1) {
    const call = gemini.functionCall;
    if (!call || !READ_TOOLS.has(call.name)) break;
    let result: Record<string, unknown>;
    try {
      result = await runReadTool(admin, call.name, call.args, selectedStudent);
    } catch (e) {
      result = { error: e instanceof Error ? e.message : "lookup failed" };
    }
    // Echo the model's own assistant turn back verbatim (tool_calls and
    // reasoning details included), then hand the tool result over as a
    // separate message — the pairing the gateway expects.
    const assistantMsg = gemini.assistantMessage;
    let toolCallId = assistantMsg.tool_calls?.[0]?.id;
    if (!toolCallId) {
      toolCallId = `call_read_${step}`;
      assistantMsg.tool_calls = [{
        id: toolCallId,
        type: "function",
        function: { name: call.name, arguments: JSON.stringify(call.args) },
      }];
    }
    toolTurns.push(assistantMsg);
    toolTurns.push({
      role: "tool",
      tool_call_id: toolCallId,
      content: JSON.stringify(result),
    });
    gemini = await callModelWithTools({
      apiKey,
      systemPrompt: SYSTEM_PROMPT,
      contextHeader,
      history,
      message,
      toolTurns,
    });
  }

  const toolCall = gemini.functionCall;

  if (!toolCall || READ_TOOLS.has(toolCall.name)) {
    return { content: gemini.text || "I'm not sure what to do here.", proposal: null };
  }

  const args = toolCall.args;
  const name = toolCall.name;
  const studentQuery = (args.student ?? "").trim();

  if (name === "answer") {
    return { content: (args.text ?? "").trim() || "Done.", proposal: null };
  }
  if (name === "assign_guided_drill") {
    const p = await buildAssignProposal({
      admin, kind: "guided_drill", studentQuery, resourceQuery: args.drill ?? "",
      selectedStudent, unlock_at: args.unlock_at,
    });
    return { content: p ? p.summary : "I couldn't find that drill.", proposal: p };
  }
  if (name === "assign_homework") {
    const p = await buildAssignProposal({
      admin, kind: "homework", studentQuery, resourceQuery: args.set ?? "", selectedStudent,
    });
    return { content: p ? p.summary : "I couldn't find that homework set.", proposal: p };
  }
  if (name === "assign_activity") {
    const p = await buildAssignProposal({
      admin, kind: "activity", studentQuery, resourceQuery: args.activity ?? "", selectedStudent,
    });
    return { content: p ? p.summary : "I couldn't find that activity.", proposal: p };
  }
  if (name === "send_message") {
    const p = await buildMessageProposal(admin, studentQuery, selectedStudent, args.text ?? "");
    return { content: p.summary, proposal: p };
  }
  if (name === "assign_bootcamp_module") {
    const p = await buildBootcampProposal(admin, studentQuery, selectedStudent, args.module ?? "");
    return { content: p.summary, proposal: p };
  }
  if (name === "draft_and_assign_note") {
    const p = await buildNoteProposal(
      admin, studentQuery, selectedStudent, args.title ?? "Note", args.body_html ?? "",
    );
    return { content: p.summary, proposal: p };
  }
  return { content: "Unsupported action.", proposal: null };
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let admin: SupabaseClient, callerId: string;
    try {
      ({ admin, callerId } = await verifyAdmin(req));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth failed";
      const status = msg === "Forbidden" ? 403 : 401;
      return json({ error: msg }, status);
    }

    const body = await req.json().catch(() => null);
    const message: string | undefined = body?.message;
    const studentId: string | null = body?.student_id ?? null;
    if (!message || typeof message !== "string" || message.length > 10_000) {
      return json({ error: "message required (≤10k chars)" }, 400);
    }

    const emailCommand = parseEmailCommand(message);
    if (emailCommand) {
      const resolved = await resolveStudentWithEmail(admin, emailCommand.studentQuery);
      if (resolved.disambiguation) {
        const content = resolved.disambiguation.summary;
        const interactionId = await persistTurns({
          admin,
          studentId,
          callerId,
          adminMessage: message,
          assistantMessage: content,
          actionProposal: resolved.disambiguation,
        });
        return json({
          content,
          action_proposal: resolved.disambiguation,
          interaction_id: interactionId,
        });
      }
      if (resolved.error) {
        return json({ error: resolved.error }, 400);
      }
      if (!resolved.student) {
        return json({ error: `No student matches "${emailCommand.studentQuery}".` }, 400);
      }

      await sendGmailMessage({
        to: resolved.student.email,
        subject: "Message from LSAT U",
        text: emailCommand.message,
      });

      const content = `Email sent to ${resolved.student.name} at ${resolved.student.email}.`;
      const interactionId = await persistTurns({
        admin,
        studentId: resolved.student.id,
        callerId,
        adminMessage: message,
        assistantMessage: content,
      });
      return json({
        content,
        action_proposal: null,
        interaction_id: interactionId,
      });
    }

    // Selected student (default target + name for the resolver).
    let selectedStudent: ResolvedStudent | null = null;
    if (studentId) {
      const { data } = await admin
        .from("profiles")
        .select("class_id, display_name")
        .eq("class_id", studentId)
        .maybeSingle();
      const row = data as { class_id: string; display_name: string | null } | null;
      if (row) selectedStudent = { id: row.class_id, name: row.display_name ?? "this student" };
    }

    // Load thread history (per-student or global).
    let historyQuery = admin
      .from("ta_interactions")
      .select("role, message")
      .order("created_at", { ascending: false })
      .limit(20);
    historyQuery = studentId
      ? historyQuery.eq("student_id", studentId)
      : historyQuery.is("student_id", null);
    const { data: historyData } = await historyQuery;
    const history = ((historyData as InteractionRow[] | null) ?? []).slice().reverse();

    // ---- Route ----
    let content: string;
    let proposal: Proposal | null = null;

    const deterministic = await tryDeterministic(admin, message, selectedStudent);
    if (deterministic) {
      proposal = deterministic;
      content = deterministic.summary;
    } else {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

      // Per-student mode keeps the analytics context ta-chat surfaced, so the
      // agent can reason and draft notes with awareness. Global mode has none.
      const contextHeader = selectedStudent
        ? await buildStudentContext(admin, selectedStudent.id, selectedStudent.name)
        : await buildPlatformContext(admin);
      const ai = await runAiLane(
        admin, LOVABLE_API_KEY, history, message, selectedStudent, contextHeader,
      );
      content = ai.content;
      proposal = ai.proposal;
    }

    // action_proposal column only carries something the client renders.
    const actionProposal = proposal;
    const actionStatus =
      proposal && proposal.type === "action" ? "pending" : null;

    // ---- Persist both turns ----
    const interactionId = await persistTurns({
      admin,
      studentId,
      callerId,
      adminMessage: message,
      assistantMessage: content,
      actionProposal,
      actionStatus,
    });

    return json({
      content,
      action_proposal: actionProposal,
      interaction_id: interactionId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ta-agent error:", msg);
    return json({ error: msg }, 500);
  }
});

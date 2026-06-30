// ta-agent — admin-only action agent for the corner chat.
//
// Extends the ta-chat pattern (admin verification, Lovable gateway, persistence
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
//      intent) goes to the gateway with a tool schema; the model picks a tool,
//      the function resolves targets server-side.
//
// The function NEVER mutates student data. It only resolves targets and returns
// a structured ActionProposal (or a disambiguation). The client executes the
// mutation through existing helpers after the admin clicks Confirm.
//
// Modes:
//   - student_id present  -> per-student thread (default target + context).
//   - student_id absent    -> global thread (student_id IS NULL). Target is
//     resolved by name from the message.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionKind = "guided_drill" | "homework" | "bootcamp_module" | "note";

interface ResolvedStudent {
  id: string;
  name: string;
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
  const q = query.trim();
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
  // auto: probe in priority order.
  for (const [table, k] of [
    ["guided_drills", "guided_drill"],
    ["homework_sets", "homework"],
    ["activities", "guided_drill"], // activities also assign via the drill path
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
    resolvedKind === "homework" ? "Assign homework" : "Assign guided drill";
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

async function tryDeterministic(
  admin: SupabaseClient,
  message: string,
  selectedStudent: ResolvedStudent | null,
): Promise<Proposal | null> {
  const m = message.match(ASSIGN_RE);
  if (!m) return null;
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

// ---------- AI lane (tool calling) ----------

const SYSTEM_PROMPT = `You are the action agent for LSAT U, an LSAT prep course run by Joshua. You are admin-only: you help Joshua take actions on students.

You can call exactly one tool per turn:
- assign_guided_drill(student, drill, unlock_at?) — assign a guided drill.
- assign_homework(student, set) — assign a homework set.
- assign_bootcamp_module(student, module) — assign a bootcamp module. "module" is a path like "/bootcamp/intro-lr" when known, otherwise the module name.
- draft_and_assign_note(student, title, body_html) — write a short note/guided instruction FOR THE STUDENT and propose assigning it. body_html is safe inline HTML (no scripts, no external resources).
- answer(text) — no action needed; answer Joshua's question or ask a clarifying question.

RULES:
1. "student" is the student's name as Joshua wrote it. If Joshua already has a student in context and does not name one, pass an empty string for "student" and the system will use the selected student.
2. Never invent a drill, set, or student that was not referenced. If unsure which action Joshua wants, call answer() and ask.
3. For draft_and_assign_note, write in Joshua's voice to the student: direct, encouraging, no filler, no em-dashes. Keep it tight.
4. Do not narrate tool calls. Pick the single best tool.
5. Every proposed action is shown to Joshua for one-click confirmation; you never execute anything yourself.`;

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
  is_correct: boolean | null;
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
    if (a.is_correct) agg.correct += 1;
    byType.set(k, agg);
  }
  const perType = [...byType.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([k, v]) => `  - ${k}: ${v.correct}/${v.total} (${Math.round((v.correct / v.total) * 100)}%)`)
    .join("\n");
  const correct = attempts.filter((a) => a.is_correct).length;
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
    admin.from("attempts").select("qtype, is_correct").eq("class_id", studentId)
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
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  if (contextHeader) messages.push({ role: "system", content: contextHeader });
  for (const h of history) {
    messages.push({ role: h.role === "admin" ? "user" : "assistant", content: h.message });
  }
  messages.push({ role: "user", content: message });

  const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limited. Try again in a moment.");
    if (response.status === 402) throw new Error("Out of credits. Add funds to continue.");
    console.error("AI gateway error:", response.status);
    throw new Error("The agent is having trouble connecting. Try again.");
  }

  const data = await response.json();
  const choice = data?.choices?.[0]?.message;
  const toolCall = choice?.tool_calls?.[0];

  if (!toolCall) {
    return { content: (choice?.content ?? "").trim() || "I'm not sure what to do here.", proposal: null };
  }

  let args: Record<string, string> = {};
  try {
    args = JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    return { content: "I couldn't parse that request. Try rephrasing.", proposal: null };
  }

  const name = toolCall.function.name as string;
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

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
      // Per-student mode keeps the analytics context ta-chat surfaced, so the
      // agent can reason and draft notes with awareness. Global mode has none.
      const contextHeader = selectedStudent
        ? await buildStudentContext(admin, selectedStudent.id, selectedStudent.name)
        : null;
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
    const { error: adminErr } = await admin.from("ta_interactions").insert({
      student_id: studentId,
      role: "admin",
      message,
      created_by: callerId,
    });
    if (adminErr) console.error("Failed to write admin turn:", adminErr);

    const { data: assistantRow, error: assistantErr } = await admin
      .from("ta_interactions")
      .insert({
        student_id: studentId,
        role: "assistant",
        message: content,
        action_proposal: actionProposal,
        action_status: actionStatus,
      })
      .select("id")
      .single();
    if (assistantErr) {
      console.error("Failed to write assistant turn:", assistantErr);
      return json({ error: "Response generated but failed to persist." }, 500);
    }

    return json({
      content,
      action_proposal: actionProposal,
      interaction_id: (assistantRow as { id: string }).id,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ta-agent error:", msg);
    return json({ error: msg }, 500);
  }
});

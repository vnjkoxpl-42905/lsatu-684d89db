// Platform Inspector — admin-only agentic auditor.
// Runs a tool-use loop over the Lovable AI gateway (Gemini Pro). The model is
// given READ-ONLY tools to explore the repo (GitHub API) and sample DB data
// (service role, PII-redacted), then must call submit_report with structured
// findings. There are NO write tools: the inspector reports and suggests only,
// it can never modify code or data.
//
// Auth mirrors ta-chat: admin-only via user_roles.role = 'admin'.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// GitHub repo this app mirrors to. Override via env if it ever changes.
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "vnjkoxpl-42905/lsatu-684d89db";

// Hard caps to protect the prompt budget and edge-function runtime.
const MAX_TOOL_ITERATIONS = 14;
const FILE_BYTES_CAP = 60_000;
const SAMPLE_ROWS_CAP = 10;
const SEARCH_RESULTS_CAP = 12;

// Column names whose values are redacted before any DB row reaches the model.
const PII_COLUMN_RE = /(email|phone|password|secret|token|api_?key|ip_?addr|address|ssn|dob|birth)/i;
// Tables the inspector may never sample, regardless of request.
const TABLE_DENYLIST = new Set([
  "user_roles",
  "auth",
  "secrets",
  "billing",
  "payments",
]);

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface GatewayMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
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

// ---- GitHub read helpers (all read-only) -----------------------------------

async function ghFetch(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "lsatu-inspector",
    },
  });
  return res;
}

async function toolListFiles(args: { path?: string }, token: string): Promise<string> {
  // Use the git tree API for a full recursive listing from a subtree, or the
  // contents API for a single directory. Default: recursive tree from root.
  const path = (args.path ?? "").replace(/^\/+|\/+$/g, "");
  if (!path) {
    const res = await ghFetch(`/repos/${GITHUB_REPO}/git/trees/HEAD?recursive=1`, token);
    if (!res.ok) return `error: list_files failed (${res.status})`;
    const data = await res.json();
    const paths = (data.tree ?? [])
      .filter((t: { type: string }) => t.type === "blob")
      .map((t: { path: string }) => t.path);
    return JSON.stringify({ truncated: data.truncated ?? false, files: paths });
  }
  const res = await ghFetch(
    `/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    token
  );
  if (!res.ok) return `error: list_files failed for "${path}" (${res.status})`;
  const data = await res.json();
  if (Array.isArray(data)) {
    return JSON.stringify(
      data.map((e: { path: string; type: string }) => ({ path: e.path, type: e.type }))
    );
  }
  return JSON.stringify({ path: data.path, type: data.type });
}

async function toolReadFile(args: { path: string }, token: string): Promise<string> {
  const path = (args.path ?? "").replace(/^\/+/, "");
  if (!path) return "error: read_file requires a path";
  const res = await ghFetch(
    `/repos/${GITHUB_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    token
  );
  if (!res.ok) return `error: read_file failed for "${path}" (${res.status})`;
  const data = await res.json();
  if (Array.isArray(data)) return `error: "${path}" is a directory; use list_files`;
  if (data.encoding !== "base64" || typeof data.content !== "string") {
    return `error: "${path}" is not a readable text blob`;
  }
  const decoded = atob(data.content.replace(/\n/g, ""));
  if (decoded.length > FILE_BYTES_CAP) {
    return decoded.slice(0, FILE_BYTES_CAP) + `\n\n…[truncated at ${FILE_BYTES_CAP} bytes]`;
  }
  return decoded;
}

async function toolSearchCode(args: { query: string }, token: string): Promise<string> {
  const q = (args.query ?? "").trim();
  if (!q) return "error: search_code requires a query";
  const res = await ghFetch(
    `/search/code?q=${encodeURIComponent(`${q} repo:${GITHUB_REPO}`)}&per_page=${SEARCH_RESULTS_CAP}`,
    token
  );
  if (!res.ok) return `error: search_code failed (${res.status})`;
  const data = await res.json();
  const hits = (data.items ?? []).map((it: { path: string }) => it.path);
  return JSON.stringify({ total: data.total_count ?? hits.length, paths: hits });
}

// ---- DB read helper (service role, read-only + redacted) -------------------

function redactRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = PII_COLUMN_RE.test(k) && v != null ? "[redacted]" : v;
  }
  return out;
}

async function toolSampleRows(
  args: { table: string; limit?: number },
  admin: ReturnType<typeof createClient>
): Promise<string> {
  const table = (args.table ?? "").trim();
  if (!table) return "error: sample_rows requires a table";
  if (TABLE_DENYLIST.has(table) || /\W/.test(table)) {
    return `error: table "${table}" is not inspectable`;
  }
  const limit = Math.min(Math.max(1, args.limit ?? 5), SAMPLE_ROWS_CAP);
  const { data, error } = await admin.from(table).select("*").limit(limit);
  if (error) return `error: sample_rows failed for "${table}": ${error.message}`;
  const rows = ((data as Record<string, unknown>[]) ?? []).map(redactRow);
  return JSON.stringify({ table, count: rows.length, rows });
}

// ---- Tool schemas exposed to the model -------------------------------------

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_files",
      description:
        "List files in the repo. Omit path for a full recursive listing from the root; pass a path to list one directory.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Optional subdirectory path." } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the full text contents of one source file in the repo.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Repo-relative file path." } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_code",
      description: "Search the repo's code for a string or symbol. Returns matching file paths.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sample_rows",
      description:
        "Read up to 10 sample rows from a public DB table (PII columns are redacted). Use to inspect real config/usage data. To learn the schema, read src/integrations/supabase/types.ts.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          limit: { type: "number", description: "1-10, default 5." },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_report",
      description: "Submit the final audit. Call this exactly once when the investigation is complete.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "2-4 sentence overview of what was inspected and the headline." },
          unitsExamined: { type: "array", items: { type: "string" }, description: "Files/tables/units actually examined." },
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                axis: { type: "string", enum: ["functional", "content", "pedagogy", "completeness"] },
                severity: { type: "string", enum: ["high", "medium", "low"] },
                location: { type: "string", description: "file:line or table.field" },
                issue: { type: "string" },
                suggestedFix: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["axis", "severity", "location", "issue", "suggestedFix", "confidence"],
            },
          },
        },
        required: ["summary", "unitsExamined", "findings"],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are the Platform Inspector for LSAT U, a React + Vite + TypeScript + Supabase ed-tech app. You audit any unit of the platform (drills, guided drills, activities, pages, edge functions, features) and report what is broken or missing.

You have READ-ONLY tools to explore the codebase (list_files, read_file, search_code) and to sample real database data (sample_rows). To understand the database schema, read src/integrations/supabase/types.ts. You CANNOT change anything — you report and suggest only.

Process:
1. Locate the requested target. Use search_code / list_files to find its source files, then read_file them. Read related files too (hooks, helpers, edge functions, types).
2. If the unit reads/writes the DB, identify its tables from the code and sample_rows them to check the real data matches the code's expectations.
3. Audit across all four axes:
   - functional: bugs, broken logic, dead code paths, error swallowing, missing error handling, wrong queries.
   - content: wrong answer keys, bad/missing explanations, typos, mislabeled data.
   - pedagogy: unclear instructions, poor difficulty calibration, weak feedback, missing scaffolding.
   - completeness: missing states (empty/loading/error), missing features the unit clearly implies, gaps vs. what good looks like.
4. Call submit_report exactly once with concrete findings. Each finding must cite a real location (file:line or table.field), describe the issue specifically, and propose an actionable fix. Do not invent issues; if a unit is solid, return few or no findings and say so in the summary.

Be specific and grounded in what you actually read. No filler, no em-dashes.`;

async function callGateway(messages: GatewayMessage[], apiKey: string) {
  // Lovable Cloud's gateway is primary; the direct Gemini key is only a
  // fallback for when the gateway key is unset.
  const directKey = Deno.env.get("GEMINI_API_KEY");
  const useDirect = !apiKey && !!directKey;
  const base = useDirect
    ? "https://generativelanguage.googleapis.com/v1beta/openai"
    : "https://ai.gateway.lovable.dev/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${useDirect ? directKey : apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: useDirect ? "gemini-3.1-flash-lite" : "google/gemini-3.1-flash-lite",
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });
  return res;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let admin;
    try {
      ({ admin } = await verifyAdmin(req));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth failed";
      return json({ error: msg }, msg === "Forbidden" ? 403 : 401);
    }

    const body = await req.json().catch(() => null);
    const target: string | undefined = body?.target;
    const question: string | undefined = body?.question;
    if ((!target || typeof target !== "string") && (!question || typeof question !== "string")) {
      return json({ error: "target or question required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    if (!GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN not configured" }, 500);

    const ask = [
      target ? `Target to inspect: ${target}` : "Target: broad sweep of the platform.",
      question ? `Specific question: ${question}` : "Run a full audit across all four axes.",
    ].join("\n");

    const messages: GatewayMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ask },
    ];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const res = await callGateway(messages, LOVABLE_API_KEY);
      if (!res.ok) {
        if (res.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
        if (res.status === 402) return json({ error: "Out of credits." }, 402);
        console.error("gateway error:", res.status, await res.text().catch(() => ""));
        return json({ error: "Inspector failed to connect to the model." }, 502);
      }
      const data = await res.json();
      const choice = data?.choices?.[0]?.message;
      if (!choice) return json({ error: "Model returned an empty response." }, 502);

      const toolCalls: ToolCall[] = choice.tool_calls ?? [];
      if (!toolCalls.length) {
        // Model answered in prose without submitting a report. Return it so the
        // caller still sees something rather than silently failing.
        return json({
          summary: choice.content ?? "Inspection completed without a structured report.",
          unitsExamined: [],
          findings: [],
          unstructured: true,
        });
      }

      // Record the assistant turn that requested the tools.
      messages.push({ role: "assistant", content: choice.content ?? null, tool_calls: toolCalls });

      for (const call of toolCalls) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsed = {};
        }

        if (call.function.name === "submit_report") {
          return json({
            summary: parsed.summary ?? "",
            unitsExamined: parsed.unitsExamined ?? [],
            findings: parsed.findings ?? [],
          });
        }

        let result: string;
        switch (call.function.name) {
          case "list_files":
            result = await toolListFiles(parsed, GITHUB_TOKEN);
            break;
          case "read_file":
            result = await toolReadFile(parsed as { path: string }, GITHUB_TOKEN);
            break;
          case "search_code":
            result = await toolSearchCode(parsed as { query: string }, GITHUB_TOKEN);
            break;
          case "sample_rows":
            result = await toolSampleRows(parsed as { table: string; limit?: number }, admin);
            break;
          default:
            result = `error: unknown tool ${call.function.name}`;
        }

        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }

    return json({ error: `Inspection did not converge within ${MAX_TOOL_ITERATIONS} steps.` }, 504);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("inspect error:", msg);
    return json({ error: msg }, 500);
  }
});

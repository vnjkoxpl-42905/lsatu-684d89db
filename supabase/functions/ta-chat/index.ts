// AI Teaching Assistant — admin-only chat backend.
// Mirrors tutor-chat patterns for CORS, LLM fetch, error handling. Differences:
// 1. Admin verification is required (students must never hit this surface).
// 2. Conversation history is loaded from ta_interactions, not passed by client.
// 3. The model is instructed to emit draft assignments inside a
//    <<<DRAFT>>>...<<<END>>> JSON block that the function parses, strips from
//    the visible message, and persists to ta_interactions.draft_content.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DRAFT_RE = /<<<DRAFT>>>([\s\S]*?)<<<END>>>/;

interface DraftPayload {
  title: string;
  content_html: string;
  asset_ids: string[];
}

interface AttemptRow {
  qtype: string | null;
  section: number | null;
  is_correct: boolean | null;
  timestamp_iso: string | null;
}

interface WAJRow {
  qid: string;
  qtype: string | null;
  last_status: string | null;
}

interface AssignmentRow {
  title: string;
  status: string;
  assigned_at: string;
}

interface InteractionRow {
  id: string;
  role: "admin" | "assistant";
  message: string;
  draft_content: DraftPayload | null;
  draft_status: string | null;
  created_at: string;
}

interface AssetMatch {
  id: string;
  title: string;
  description: string | null;
  asset_type: string;
  excerpt: string | null;
  rank: number;
}

const SYSTEM_PROMPT = `You are a Teaching Assistant for LSAT U, an LSAT prep course run by Joshua. You help Joshua prepare and assign work to individual students. You have access to the current student's performance data and a permanent teaching library.

RULES:
1. Only suggest assignments or study plans when Joshua explicitly asks.
2. Only create new content (questions, explanations, worksheets) when Joshua explicitly requests it.
3. Always present a draft and ask for approval before assigning anything to a student.
4. When you search the library, cite which assets you are pulling from by title.
5. Be direct and concise. No filler, no hedging, no em-dashes.
6. When proposing an assignment, emit the draft as JSON wrapped in <<<DRAFT>>>...<<<END>>> with keys "title" (string), "content_html" (safe inline HTML, no scripts or external resources), "asset_ids" (array of UUID strings for the assets you used). Always include a short plain-English explanation BEFORE the draft block so Joshua can skim.
7. If Joshua approves, rejects, or asks a question after a prior draft was shown, respond with plain text only — do not emit another draft block unless asked to revise or create a new one.
8. Never write content for the student to read; your audience is Joshua. Assignment content inside draft blocks IS for students and must be written accordingly.`;

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(str: string, n: number) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function summarizeAnalytics(attempts: AttemptRow[], waj: WAJRow[], asg: AssignmentRow[]) {
  if (!attempts.length && !waj.length && !asg.length) {
    return "No analytics yet — this student has not attempted questions.";
  }
  // Per-qtype accuracy from recent attempts.
  const byType = new Map<string, { total: number; correct: number }>();
  for (const a of attempts) {
    const k = a.qtype || "unknown";
    const agg = byType.get(k) ?? { total: 0, correct: 0 };
    agg.total += 1;
    if (a.is_correct) agg.correct += 1;
    byType.set(k, agg);
  }
  const perTypeLines = [...byType.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 12)
    .map(([k, v]) => `  - ${k}: ${v.correct}/${v.total} (${Math.round((v.correct / v.total) * 100)}%)`)
    .join("\n");

  const overall = attempts.length
    ? `${attempts.filter((a) => a.is_correct).length}/${attempts.length} (${Math.round(
        (attempts.filter((a) => a.is_correct).length / attempts.length) * 100
      )}%) over last ${attempts.length} attempts`
    : "no attempts";

  const wajLine = waj.length
    ? `${waj.length} unresolved WAJ items (top types: ${[
        ...new Set(waj.map((w) => w.qtype).filter(Boolean)),
      ]
        .slice(0, 5)
        .join(", ")})`
    : "WAJ is empty";

  const asgLine = asg.length
    ? `Recent TA assignments:\n${asg
        .slice(0, 5)
        .map((a) => `  - "${clamp(a.title, 80)}" (${a.status})`)
        .join("\n")}`
    : "No prior TA assignments.";

  return `Overall: ${overall}\nPer question type:\n${perTypeLines}\n${wajLine}\n${asgLine}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let admin, callerId;
    try {
      ({ admin, callerId } = await verifyAdmin(req));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth failed";
      const status = msg === "Forbidden" ? 403 : 401;
      return json({ error: msg }, status);
    }

    const body = await req.json().catch(() => null);
    const studentId: string | undefined = body?.student_id;
    const message: string | undefined = body?.message;
    if (!studentId || typeof studentId !== "string") {
      return json({ error: "student_id required" }, 400);
    }
    if (!message || typeof message !== "string" || message.length > 10_000) {
      return json({ error: "message required (≤10k chars)" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    // Parallel context loads.
    const [profileRes, attemptsRes, wajRes, asgRes, historyRes, libraryRes] =
      await Promise.all([
        admin
          .from("profiles")
          .select("display_name")
          .eq("class_id", studentId)
          .maybeSingle(),
        admin
          .from("attempts")
          .select("qtype, section, is_correct, timestamp_iso")
          .eq("class_id", studentId)
          .order("timestamp_iso", { ascending: false })
          .limit(200),
        admin
          .from("wrong_answer_journal")
          .select("qid, qtype, last_status")
          .eq("class_id", studentId)
          .limit(50),
        admin
          .from("ta_assignments")
          .select("title, status, assigned_at")
          .eq("student_id", studentId)
          .order("assigned_at", { ascending: false })
          .limit(10),
        admin
          .from("ta_interactions")
          .select("id, role, message, draft_content, draft_status, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(20),
        admin.rpc("search_teaching_assets", { q: message, max_rows: 5 }),
      ]);

    const studentName = (profileRes.data as { display_name?: string } | null)?.display_name ?? "this student";
    const analytics = summarizeAnalytics(
      (attemptsRes.data as AttemptRow[] | null) ?? [],
      (wajRes.data as WAJRow[] | null) ?? [],
      (asgRes.data as AssignmentRow[] | null) ?? []
    );

    // History is fetched desc; reverse to chronological.
    const history = ((historyRes.data as InteractionRow[] | null) ?? [])
      .slice()
      .reverse();

    const libraryMatches = (libraryRes.data as AssetMatch[] | null) ?? [];
    const libraryIdsCited = libraryMatches.map((m) => m.id);
    const libraryBlock = libraryMatches.length
      ? libraryMatches
          .map(
            (m) =>
              `- [${m.id}] ${m.title} (${m.asset_type})\n  ${clamp(
                m.description ?? m.excerpt ?? "",
                400
              )}`
          )
          .join("\n")
      : "No relevant library assets matched this query.";

    const contextHeader = `STUDENT: ${studentName} (id: ${studentId})\n\nANALYTICS:\n${analytics}\n\nRELEVANT LIBRARY ASSETS:\n${clamp(libraryBlock, 8000)}`;

    const messagesForModel: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextHeader },
      ...history.map((h) => ({
        role: h.role === "admin" ? ("user" as const) : ("assistant" as const),
        content: h.message,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: messagesForModel,
        }),
      }
    );

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      if (response.status === 429) {
        return json({ error: "Rate limited. Try again in a moment." }, 429);
      }
      if (response.status === 402) {
        return json({ error: "Out of credits. Add funds to continue." }, 402);
      }
      return json({ error: "TA is having trouble connecting. Try again." }, 500);
    }

    const data = await response.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    if (!raw) {
      return json({ error: "TA returned an empty response." }, 500);
    }

    // Parse the draft sentinel block if present.
    let draft: DraftPayload | null = null;
    let content = raw;
    let parse_error: "malformed_draft" | undefined;
    const match = raw.match(DRAFT_RE);
    if (match) {
      content = raw.replace(DRAFT_RE, "").trim();
      try {
        const parsed = JSON.parse(match[1].trim());
        if (
          typeof parsed?.title === "string" &&
          typeof parsed?.content_html === "string" &&
          Array.isArray(parsed?.asset_ids) &&
          parsed.asset_ids.every((x: unknown) => typeof x === "string")
        ) {
          draft = {
            title: parsed.title,
            content_html: parsed.content_html,
            asset_ids: parsed.asset_ids,
          };
        } else {
          parse_error = "malformed_draft";
        }
      } catch {
        parse_error = "malformed_draft";
      }
    }

    // Persist both turns via service role (bypasses RLS for logging).
    const { error: adminTurnError } = await admin.from("ta_interactions").insert({
      student_id: studentId,
      role: "admin",
      message,
      created_by: callerId,
    });
    if (adminTurnError) {
      console.error("Failed to write admin turn:", adminTurnError);
    }

    const { data: assistantRow, error: assistantTurnError } = await admin
      .from("ta_interactions")
      .insert({
        student_id: studentId,
        role: "assistant",
        message: content,
        draft_content: draft,
        draft_status: draft ? "pending" : null,
        asset_ids: libraryIdsCited,
      })
      .select("id")
      .single();
    if (assistantTurnError) {
      console.error("Failed to write assistant turn:", assistantTurnError);
      return json({ error: "Response generated but failed to persist." }, 500);
    }

    return json({
      content,
      draft,
      interaction_id: (assistantRow as { id: string }).id,
      ...(parse_error ? { parse_error } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ta-chat error:", msg);
    return json({ error: msg }, 500);
  }
});

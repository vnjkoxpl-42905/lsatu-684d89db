// Teacher operator chat — streaming AI assistant for admins.
// Streams Lovable AI Gateway responses with tool calling so Joshua can
// run real teacher actions (find students, draft messages, draft homework,
// create AI TA drafts) from a single chat surface.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const SYSTEM_PROMPT = `You are Joshua's AI Teaching Operator for LSAT U.

You are not a chat bot — you are an operator. Joshua talks to you like a chief of staff.
He says things like "draft a recap for Maya from yesterday's session", "assign 10 flaw
questions to Alex due Friday", "message everyone in cohort B about Saturday's review".
You do those things by calling the tools available to you.

Operating principles:
- Be concise. Reply in a few sentences max unless he asks for detail.
- Always confirm scope before destructive actions. Never message students or post to
  classrooms without his explicit go-ahead — create a draft and let him approve.
- When he names a student, call find_students first to resolve the id. Don't guess.
- After running a tool, briefly tell him what you did and what's pending his approval.
- If a request is ambiguous (which student? which week? how many questions?), ask one
  short clarifying question instead of guessing.
- Use markdown sparingly: bold names and counts, short bullet lists when listing.

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
        "Create a pending draft (recap, message, next-assignment recommendation, classroom announcement) for a single student. Joshua reviews and approves before anything is sent.",
      parameters: {
        type: "object",
        properties: {
          student_id: { type: "string" },
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
          prompt: {
            type: "string",
            description: "What Joshua asked you to draft (1 line).",
          },
          draft_markdown: {
            type: "string",
            description:
              "The actual draft body. Markdown. Address the student by name when relevant.",
          },
        },
        required: ["student_id", "draft_type", "draft_markdown"],
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
];

interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

async function runTool(
  name: string,
  args: Record<string, any>,
  ctx: { adminId: string; admin: ReturnType<typeof createClient> },
): Promise<ToolResult> {
  const { admin, adminId } = ctx;
  try {
    switch (name) {
      case "find_students": {
        const q = String(args.query ?? "").trim();
        const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
        if (!q) return { ok: true, data: { students: [] } };
        const { data, error } = await admin
          .from("profiles" as any)
          .select("class_id, display_name")
          .ilike("display_name", `%${q}%`)
          .limit(limit);
        if (error) throw error;
        return {
          ok: true,
          data: {
            students: (data ?? []).map((r: any) => ({
              id: r.class_id,
              name: r.display_name,
            })),
          },
        };
      }
      case "list_recent_students": {
        const limit = Math.min(Number(args.limit ?? 10) || 10, 25);
        const { data, error } = await admin
          .from("profiles" as any)
          .select("class_id, display_name, last_seen_at")
          .order("last_seen_at", { ascending: false, nullsFirst: false })
          .limit(limit);
        if (error) throw error;
        return {
          ok: true,
          data: {
            students: (data ?? []).map((r: any) => ({
              id: r.class_id,
              name: r.display_name,
            })),
          },
        };
      }
      case "create_draft": {
        const { data, error } = await admin
          .from("ai_ta_drafts" as any)
          .insert({
            student_id: args.student_id,
            created_by: adminId,
            draft_type: args.draft_type,
            prompt: args.prompt ?? null,
            draft_markdown: args.draft_markdown,
            input_snapshot_json: { source: "operator_chat" },
            status: "draft",
          })
          .select("id, draft_type, student_id")
          .single();
        if (error) throw error;
        return { ok: true, data: { draft: data } };
      }
      case "send_message": {
        // Find or create the 1:1 conversation between admin and student.
        const studentId = String(args.student_id);
        const { data: existing } = await admin
          .from("conversation_participants" as any)
          .select("conversation_id")
          .eq("user_id", adminId);
        const adminConvIds = (existing ?? []).map((r: any) => r.conversation_id);
        let convId: string | null = null;
        if (adminConvIds.length) {
          const { data: shared } = await admin
            .from("conversation_participants" as any)
            .select("conversation_id")
            .eq("user_id", studentId)
            .in("conversation_id", adminConvIds);
          if (shared && shared.length) convId = shared[0].conversation_id;
        }
        if (!convId) {
          const { data: newConv, error: cErr } = await admin
            .from("conversations" as any)
            .insert({ created_by: adminId })
            .select("id")
            .single();
          if (cErr) throw cErr;
          convId = newConv.id;
          await admin.from("conversation_participants" as any).insert([
            { conversation_id: convId, user_id: adminId },
            { conversation_id: convId, user_id: studentId },
          ]);
        }
        const { data: msg, error: mErr } = await admin
          .from("messages" as any)
          .insert({
            conversation_id: convId,
            sender_id: adminId,
            body: String(args.body ?? ""),
          })
          .select("id")
          .single();
        if (mErr) throw mErr;
        return { ok: true, data: { conversation_id: convId, message_id: msg.id } };
      }
      case "summarize_student": {
        const sid = String(args.student_id);
        const { data: student } = await admin
          .from("profiles" as any)
          .select("class_id, display_name")
          .eq("class_id", sid)
          .maybeSingle();
        const { data: sessions } = await admin
          .from("student_sessions" as any)
          .select("id, occurred_at, notes")
          .eq("student_id", sid)
          .order("occurred_at", { ascending: false })
          .limit(3);
        return {
          ok: true,
          data: { student, recent_sessions: sessions ?? [] },
        };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (e: any) {
    console.error("tool error", name, e);
    return { ok: false, error: e?.message ?? "tool failure" };
  }
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

    const { messages = [] } = await req.json();
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
    for (const m of messages) {
      if (!m || !["user", "assistant", "tool", "system"].includes(m.role)) {
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
    }

    // Tool-using loop. We use non-streaming first to handle tool calls cleanly,
    // then stream the final assistant message back to the client.
    const baseMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];
    const toolResultsForClient: Array<{
      name: string;
      arguments: any;
      result: ToolResult;
    }> = [];

    let iter = 0;
    while (iter++ < 4) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: baseMessages,
          tools: TOOLS,
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

      const j = await r.json();
      const choice = j.choices?.[0];
      const message = choice?.message;
      const toolCalls = message?.tool_calls;

      if (toolCalls && toolCalls.length) {
        baseMessages.push(message);
        for (const tc of toolCalls) {
          const fnName = tc.function?.name;
          let parsedArgs: any = {};
          try {
            parsedArgs = JSON.parse(tc.function?.arguments ?? "{}");
          } catch {}
          const result = await runTool(fnName, parsedArgs, { adminId, admin });
          toolResultsForClient.push({
            name: fnName,
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
  } catch (e: any) {
    console.error("operator-chat fatal", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

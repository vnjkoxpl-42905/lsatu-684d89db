import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Admin-only: caller must be authenticated and hold the 'admin' role.
async function verifyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing auth");

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await anonClient.auth.getUser();
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

const SYSTEM_PROMPT = `You polish a message draft for grammar, clarity, and flow. You do not rewrite it.

Rules:
1. Preserve the writer's voice, tone, and word choices wherever the draft is already clear. Edit minimally.
2. Keep length within ~10% of the original. Do not expand short messages into long ones.
3. Do not change the meaning, add new ideas, or insert facts that aren't in the draft.
4. Do not add greetings ("Hi …", "Hey …") or sign-offs ("Thanks", "— Joshua") that aren't already present.
5. Never use em dashes (—). Use commas, periods, or parentheses instead.
6. Keep paragraph and line-break structure as-is.
7. Return only the polished text. No preamble, no commentary, no quotes around it.`;

// Used when the caller passes an `instruction` (the Teacher Desk "Ask for Changes"
// selection toolbar). Here the text is an EXCERPT of a larger draft and the model
// should apply the instruction to just that excerpt, returning only the revision.
const REVISE_SYSTEM_PROMPT = `You revise an excerpt of a teacher's message according to an instruction.

The text you receive is a FRAGMENT selected from inside a larger message. Revise only this fragment.

Rules:
1. Apply the instruction to the excerpt and return ONLY the revised excerpt.
2. Because it is a fragment, do not add greetings ("Hi …") or sign-offs ("Thanks", "— Joshua"), and do not pull in context that belongs to the surrounding text.
3. Keep it roughly the same length unless the instruction explicitly asks to expand or shorten.
4. Preserve any markdown markers that are part of the excerpt (**bold**, *italic*, [links](url)).
5. Never use em dashes (—). Use commas, periods, or parentheses instead.
6. Return only the revised text. No preamble, no commentary, no quotes around it.`;

interface PolishRequest {
  text: string;
  conversationId?: string;
  instruction?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin, callerId } = await verifyAdmin(req);

    if (req.method !== "POST") {
      return jsonRes({ error: "Method not allowed" }, 405);
    }

    const body = (await req.json()) as PolishRequest;
    const text = typeof body?.text === "string" ? body.text : "";
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;
    const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
    const revising = instruction.length > 0;

    if (text.length < 1 || text.length > 5000) {
      return jsonRes({ error: "Text must be between 1 and 5000 characters" }, 400);
    }
    if (instruction.length > 500) {
      return jsonRes({ error: "Instruction must be 500 characters or fewer" }, 400);
    }

    // Optional voice-matching: pull the caller's recent messages in this thread
    // as style examples. Newest first, capped at 10. Best-effort — failure here
    // does not block polishing. Skipped in revise mode (the excerpt + instruction
    // already say what to do; voice samples just add noise to a scoped edit).
    let styleExamples: string[] = [];
    if (conversationId && !revising) {
      const { data: recent } = await admin
        .from("messages")
        .select("body")
        .eq("conversation_id", conversationId)
        .eq("sender_id", callerId)
        .order("created_at", { ascending: false })
        .limit(10);
      styleExamples = ((recent ?? []) as Array<{ body?: string }>)
        .map((m) => (typeof m.body === "string" ? m.body.trim() : ""))
        .filter((s) => s.length > 0);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = revising ? REVISE_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const userContent = revising
      ? `Excerpt to revise:\n${text}\n\nInstruction: ${instruction}`
      : styleExamples.length > 0
        ? `Recent messages from this writer (for voice reference, do not copy phrasing):\n${styleExamples.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDraft to polish:\n${text}`
        : `Draft to polish:\n${text}`;

    const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Polish AI error:", response.status);
      if (response.status === 429) {
        return jsonRes({ error: "Polish is busy. Try again in a moment." }, 429);
      }
      if (response.status === 402) {
        return jsonRes({ error: "Polish requires credits. Please add funds." }, 402);
      }
      return jsonRes({ error: "Polish couldn't connect. Please try again." }, 500);
    }

    const data = await response.json();
    const polished = data.choices?.[0]?.message?.content;
    if (typeof polished !== "string" || polished.trim().length === 0) {
      throw new Error("Empty polish response");
    }

    return jsonRes({ polished: polished.trim() });
  } catch (err) {
    const msg = (err as Error).message;
    const status = msg === "Forbidden"
      ? 403
      : msg === "Unauthorized" || msg === "Missing auth"
        ? 401
        : 500;
    return jsonRes({ error: msg }, status);
  }
});

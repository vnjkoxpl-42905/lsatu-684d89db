import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

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

interface PolishRequest {
  text: string;
  conversationId?: string;
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

    if (text.length < 1 || text.length > 5000) {
      return jsonRes({ error: "Text must be between 1 and 5000 characters" }, 400);
    }

    // Optional voice-matching: pull the caller's recent messages in this thread
    // as style examples. Newest first, capped at 10. Best-effort — failure here
    // does not block polishing.
    let styleExamples: string[] = [];
    if (conversationId) {
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

    const userContent = styleExamples.length > 0
      ? `Recent messages from this writer (for voice reference, do not copy phrasing):\n${styleExamples.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nDraft to polish:\n${text}`
      : `Draft to polish:\n${text}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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

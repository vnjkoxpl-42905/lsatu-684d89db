// OpenAI-compatible proxy that forwards traffic to the Lovable AI Gateway.
// Since the Gateway is already OpenAI-compatible, this is a thin pass-through
// that (a) normalizes model ids so unprefixed / legacy names still route to a
// supported Gateway model and (b) preserves streaming + tool calling for the
// 13 internal callers (tutor-chat, ta-chat, study-chat, teacher-operator-chat, …).
//
// Routes:
//   POST /chat/completions  — OpenAI chat completions (streaming + tools)
//   POST /embeddings        — OpenAI embeddings (3072-dim)
//   POST /                  — same as /chat/completions (back-compat)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, lovable-api-key, x-lovable-aig-sdk",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

// Supported Lovable AI chat models (vendor/model form). Unknown ids are
// normalized to a nearest supported equivalent so old callers keep working.
const SUPPORTED_CHAT = new Set([
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.5-flash",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-5.5",
]);

function mapChatModel(model: string | undefined): string {
  if (!model) return "google/gemini-2.5-flash";
  const raw = model.trim();
  if (SUPPORTED_CHAT.has(raw)) return raw;
  const lower = raw.toLowerCase();
  // Strip vendor prefix for pattern matching
  const bare = lower.replace(/^google\//, "").replace(/^openai\//, "");
  // Google Gemini families
  if (bare.startsWith("gemini")) {
    if (bare.includes("embedding")) return "google/gemini-2.5-flash"; // wrong route; caller error
    if (bare.includes("3-flash-preview")) return "google/gemini-3-flash-preview";
    if (bare.includes("3.1-flash-lite") || bare.includes("3.1-lite")) return "google/gemini-3.1-flash-lite";
    if (bare.includes("3.5-flash")) return "google/gemini-3.5-flash";
    if (bare.includes("3.1-pro")) return "google/gemini-3.1-pro-preview";
    if (bare.includes("2.5-pro") || bare.includes("pro-latest")) return "google/gemini-2.5-pro";
    if (bare.includes("2.5-flash-lite") || bare.includes("flash-lite")) return "google/gemini-2.5-flash-lite";
    if (bare.includes("2.5-flash") || bare.includes("flash-latest") || bare.includes("2.0-flash")) return "google/gemini-2.5-flash";
    if (bare.includes("pro")) return "google/gemini-2.5-pro";
    if (bare.includes("lite") || bare.includes("nano")) return "google/gemini-2.5-flash-lite";
    return "google/gemini-2.5-flash";
  }
  // OpenAI GPT families
  if (bare.startsWith("gpt-5.5")) return "openai/gpt-5.5";
  if (bare.startsWith("gpt-5.4")) {
    if (bare.includes("nano")) return "openai/gpt-5.4-nano";
    if (bare.includes("mini")) return "openai/gpt-5.4-mini";
    return "openai/gpt-5.4";
  }
  if (bare.startsWith("gpt-5.2")) return "openai/gpt-5.2";
  if (bare.startsWith("gpt-5")) {
    if (bare.includes("nano")) return "openai/gpt-5-nano";
    if (bare.includes("mini")) return "openai/gpt-5-mini";
    return "openai/gpt-5";
  }
  // Default fallback
  return "google/gemini-2.5-flash";
}

// Embeddings MUST be 3072-dim to match the DB vector(3072) columns
// (lsatu_content_index, match_lsatu_content, memory-OS tables).
// Both google/gemini-embedding-001 and openai/text-embedding-3-large default to 3072.
function mapEmbedModel(model: string | undefined): string {
  const raw = (model ?? "").trim();
  if (!raw) return "google/gemini-embedding-001";
  const lower = raw.toLowerCase();
  if (lower === "google/gemini-embedding-001" || lower === "google/gemini-embedding-2") return raw;
  if (lower === "openai/text-embedding-3-large") return raw;
  if (lower.includes("text-embedding-3-large")) return "openai/text-embedding-3-large";
  if (lower.includes("gemini-embedding-2")) return "google/gemini-embedding-2";
  // gemini-embedding-001, text-embedding-004 (legacy 768-dim), text-embedding-3-small,
  // ada, or anything else → default to the 3072-dim Gemini model.
  return "google/gemini-embedding-001";
}

async function forward(
  path: string,
  body: unknown,
  key: string,
  stream: boolean,
): Promise<Response> {
  const upstream = await fetch(`${GATEWAY_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "X-Lovable-AIG-SDK": "gemini-proxy",
    },
    body: JSON.stringify(body),
  });

  if (stream && upstream.ok && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

async function handleChat(req: Request, key: string): Promise<Response> {
  const body = await req.json().catch(() => ({} as any));
  body.model = mapChatModel(body.model);
  const stream = !!body.stream;
  return forward("/chat/completions", body, key, stream);
}

async function handleEmbeddings(req: Request, key: string): Promise<Response> {
  const body = await req.json().catch(() => ({} as any));
  body.model = mapEmbedModel(body.model);
  return forward("/embeddings", body, key, false);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: "LOVABLE_API_KEY is not configured" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/gemini-proxy/, "") || "/";
  try {
    if (path.endsWith("/embeddings")) return await handleEmbeddings(req, key);
    return await handleChat(req, key);
  } catch (e) {
    console.error("gemini-proxy fatal", e);
    return new Response(
      JSON.stringify({ error: { message: e instanceof Error ? e.message : "Proxy error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

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
    "authorization, x-client-info, apikey, content-type, lovable-api-key, x-lovable-aig-sdk, x-internal-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Constant-time string comparison — avoids leaking key length/prefix via timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ea = enc.encode(a);
  const eb = enc.encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}


const GOOGLE_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const GATEWAY_BASE = "https://ai.gateway.lovable.dev/v1";

// One model for every AI feature on the platform, run on Joshua's own
// GEMINI_API_KEY. Anything a caller asks for is normalised to it, so a legacy
// id left in an old function cannot quietly route somewhere else.
const CHAT_MODEL = "gemini-3.8-flash";
const EMBED_MODEL = "gemini-embedding-001";

function mapChatModel(_model: string | undefined): string {
  return CHAT_MODEL;
}

// Embeddings MUST be 3072-dim to match the DB vector(3072) columns.
function mapEmbedModel(_model: string | undefined): string {
  return EMBED_MODEL;
}

async function forward(
  path: string,
  body: unknown,
  stream: boolean,
): Promise<Response> {
  // Joshua's own Gemini key first: it is the platform's AI account. The Lovable
  // gateway stays as a fallback so nothing goes dark if the key is ever unset.
  const googleKey = Deno.env.get("GEMINI_API_KEY");
  const base = googleKey ? GOOGLE_BASE : GATEWAY_BASE;
  const key = googleKey ?? Deno.env.get("LOVABLE_API_KEY") ?? "";
  const upstream = await fetch(`${base}${path}`, {
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

// Recursively strip JSON-Schema keywords the Gemini schema subset rejects
// (additionalProperties, $schema). Safe to run on any tool params — OpenAI
// accepts JSON Schema without these too.
const UNSUPPORTED_SCHEMA_KEYS = new Set(["additionalProperties", "$schema"]);
function stripUnsupportedSchemaKeys(node: any): any {
  if (Array.isArray(node)) return node.map(stripUnsupportedSchemaKeys);
  if (node && typeof node === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) {
      if (UNSUPPORTED_SCHEMA_KEYS.has(k)) continue;
      out[k] = stripUnsupportedSchemaKeys(v);
    }
    return out;
  }
  return node;
}

function sanitizeTools(body: any): void {
  if (!body || !Array.isArray(body.tools)) return;
  body.tools = body.tools.map((t: any) => {
    if (t?.function?.parameters) {
      t.function.parameters = stripUnsupportedSchemaKeys(t.function.parameters);
    }
    if (t?.parameters) t.parameters = stripUnsupportedSchemaKeys(t.parameters);
    return t;
  });
}

async function handleChat(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({} as any));
  body.model = mapChatModel(body.model);
  sanitizeTools(body);
  const stream = !!body.stream;
  return forward("/chat/completions", body, stream);
}

async function handleEmbeddings(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({} as any));
  body.model = mapEmbedModel(body.model);
  // The DB columns are vector(3072); ask for it explicitly so a provider
  // default change can never silently write short vectors.
  body.dimensions = 3072;
  return forward("/embeddings", body, false);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Internal-only endpoint — reject anything without the shared key.
  const internalKey = Deno.env.get("EDGE_INTERNAL_KEY") ?? "";
  const provided = req.headers.get("x-internal-key") ?? "";
  if (!internalKey || !timingSafeEqual(provided, internalKey)) {
    return new Response(
      JSON.stringify({ error: { message: "Unauthorized" } }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const key = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY");

  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: "GEMINI_API_KEY is not configured" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/gemini-proxy/, "") || "/";
  try {
    if (path.endsWith("/embeddings")) return await handleEmbeddings(req);
    return await handleChat(req);
  } catch (e) {
    console.error("gemini-proxy fatal", e);
    return new Response(
      JSON.stringify({ error: { message: e instanceof Error ? e.message : "Proxy error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

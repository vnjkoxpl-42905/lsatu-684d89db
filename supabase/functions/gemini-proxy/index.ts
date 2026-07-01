// OpenAI-compatible proxy that routes ALL AI traffic through Google Gemini
// using the user-supplied `GEMINI_API_KEY` (fallbacks: GeminiFreetier variants).
// Other Edge Functions call this proxy instead of the Lovable AI Gateway so
// every AI action uses the user's own Gemini key.
//
// Supports:
//   POST /chat/completions  — OpenAI chat-completions shape, streaming + JSON
//                              + OpenAI tool calling (translated to Gemini
//                              functionDeclarations / functionCall / functionResponse)
//   POST /embeddings        — OpenAI embeddings shape
//   POST /                  — same as /chat/completions (back-compat)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, lovable-api-key, x-lovable-aig-sdk",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Only expose real, publicly-callable Google Gemini models. Any incoming id
// (including Lovable-Gateway aliases or OpenAI ids) is normalised into one of
// these so the toggles in the Teacher Desk always map to something the API
// will accept with a plain GEMINI_API_KEY.
const REAL_GEMINI_MODELS = new Set([
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-flash-latest",
  "gemini-pro-latest",
]);

function mapModel(model: string | undefined): string {
  if (!model) return "gemini-2.5-flash";
  let m = model.toLowerCase().trim();
  if (m.startsWith("google/")) m = m.slice("google/".length);
  if (m.startsWith("openai/")) m = m.slice("openai/".length);
  if (REAL_GEMINI_MODELS.has(m)) return m;
  // Aliases → nearest real Gemini model
  if (m.includes("lite") || m.includes("nano") || m.includes("flash-lite")) return "gemini-2.5-flash-lite";
  if (m.includes("pro")) return "gemini-2.5-pro";
  if (m.includes("mini") || m.includes("flash")) return "gemini-2.5-flash";
  // gpt-5, gpt-5.x, gemini-3.x preview aliases from the Lovable catalog
  if (m.startsWith("gpt-5")) return m.includes("nano") ? "gemini-2.5-flash-lite" : m.includes("mini") ? "gemini-2.5-flash" : "gemini-2.5-pro";
  if (m.startsWith("gemini-3")) return m.includes("lite") ? "gemini-2.5-flash-lite" : m.includes("pro") ? "gemini-2.5-pro" : "gemini-2.5-flash";
  return "gemini-2.5-flash";
}

function mapEmbedModel(_model: string | undefined): string {
  return "text-embedding-004";
}

interface OpenAIToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}
interface OpenAIMessage {
  role: string;
  content?: unknown;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p: any) => (typeof p === "string" ? p : typeof p?.text === "string" ? p.text : ""))
      .join("\n");
  }
  return content == null ? "" : JSON.stringify(content);
}

function contentToParts(content: unknown): Array<Record<string, unknown>> {
  if (typeof content === "string") return content ? [{ text: content }] : [];
  if (Array.isArray(content)) {
    const parts: Array<Record<string, unknown>> = [];
    for (const p of content) {
      if (typeof p === "string") { parts.push({ text: p }); continue; }
      if (!p || typeof p !== "object") continue;
      if (p.type === "text" && typeof p.text === "string") { parts.push({ text: p.text }); continue; }
      if (p.type === "image_url") {
        const url: string = p.image_url?.url ?? "";
        const m = /^data:([^;]+);base64,(.*)$/.exec(url);
        if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
        continue;
      }
    }
    return parts;
  }
  return [];
}

function messagesToGemini(messages: OpenAIMessage[]) {
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

  // Track tool_call_id -> function name so we can map OpenAI role:"tool" replies
  // back onto Gemini functionResponse parts (which are keyed by name, not id).
  const toolCallNameById = new Map<string, string>();

  for (const m of messages || []) {
    if (m.role === "system") {
      const t = contentToText(m.content);
      if (t) systemParts.push(t);
      continue;
    }

    if (m.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      const text = contentToText(m.content);
      if (text) parts.push({ text });
      for (const tc of m.tool_calls ?? []) {
        const name = tc.function?.name ?? "unknown";
        let args: unknown = {};
        try { args = JSON.parse(tc.function?.arguments ?? "{}"); } catch { args = {}; }
        if (tc.id) toolCallNameById.set(tc.id, name);
        parts.push({ functionCall: { name, args } });
      }
      if (parts.length) contents.push({ role: "model", parts });
      continue;
    }

    if (m.role === "tool") {
      const name = (m.tool_call_id && toolCallNameById.get(m.tool_call_id)) || m.name || "unknown";
      let response: unknown;
      try { response = JSON.parse(contentToText(m.content)); } catch { response = { result: contentToText(m.content) }; }
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name, response: typeof response === "object" && response ? response : { result: response } } }],
      });
      continue;
    }

    // user (or unknown) role
    const parts = contentToParts(m.content);
    if (parts.length) contents.push({ role: "user", parts });
  }

  const systemInstruction = systemParts.length
    ? { role: "system", parts: [{ text: systemParts.join("\n\n") }] }
    : undefined;
  return { contents, systemInstruction };
}

function openAIToolsToGemini(tools: any[] | undefined) {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  const functionDeclarations = tools
    .filter((t) => t?.type === "function" && t?.function?.name)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description ?? "",
      parameters: t.function.parameters ?? { type: "object", properties: {} },
    }));
  if (!functionDeclarations.length) return undefined;
  return [{ functionDeclarations }];
}

function geminiToOpenAIChoice(geminiResp: any, model: string) {
  const cand = geminiResp?.candidates?.[0];
  const parts: any[] = cand?.content?.parts ?? [];
  let text = "";
  const toolCalls: OpenAIToolCall[] = [];
  for (const p of parts) {
    if (typeof p?.text === "string") text += p.text;
    if (p?.functionCall) {
      toolCalls.push({
        id: `call_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
        type: "function",
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args ?? {}),
        },
      });
    }
  }
  const message: Record<string, unknown> = { role: "assistant", content: text };
  if (toolCalls.length) message.tool_calls = toolCalls;
  return {
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message,
      finish_reason: toolCalls.length
        ? "tool_calls"
        : cand?.finishReason?.toLowerCase?.() === "stop" ? "stop" : (cand?.finishReason ?? "stop"),
    }],
    usage: geminiResp?.usageMetadata
      ? {
          prompt_tokens: geminiResp.usageMetadata.promptTokenCount ?? 0,
          completion_tokens: geminiResp.usageMetadata.candidatesTokenCount ?? 0,
          total_tokens: geminiResp.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined,
  };
}

async function handleChat(req: Request, key: string) {
  const body = await req.json().catch(() => ({}));
  const model = mapModel(body.model);
  const stream = !!body.stream;
  const { contents, systemInstruction } = messagesToGemini(body.messages || []);

  const generationConfig: Record<string, unknown> = {};
  if (typeof body.temperature === "number") generationConfig.temperature = body.temperature;
  if (typeof body.max_tokens === "number") generationConfig.maxOutputTokens = body.max_tokens;
  if (typeof body.top_p === "number") generationConfig.topP = body.top_p;
  if (body.response_format?.type === "json_object" || body.response_format?.type === "json_schema") {
    generationConfig.responseMimeType = "application/json";
    if (body.response_format?.json_schema?.schema) {
      generationConfig.responseSchema = body.response_format.json_schema.schema;
    }
  }

  const geminiBody: Record<string, unknown> = { contents };
  if (systemInstruction) geminiBody.systemInstruction = systemInstruction;
  if (Object.keys(generationConfig).length) geminiBody.generationConfig = generationConfig;

  const geminiTools = openAIToolsToGemini(body.tools);
  if (geminiTools) {
    geminiBody.tools = geminiTools;
    // Gemini tool config: AUTO / ANY / NONE
    const tc = body.tool_choice;
    let mode: string | undefined;
    if (tc === "auto") mode = "AUTO";
    else if (tc === "none") mode = "NONE";
    else if (tc === "required") mode = "ANY";
    else if (typeof tc === "object" && tc?.type === "function") mode = "ANY";
    if (mode) geminiBody.toolConfig = { functionCallingConfig: { mode } };
  }

  if (stream && !geminiTools) {
    // Streaming path (no tool calls). If tools are present, fall back to
    // non-streaming so we can reliably surface functionCall parts.
    const url = `${GEMINI_BASE}/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: { message: text || `Gemini error ${upstream.status}` } }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    const id = `chatcmpl-${crypto.randomUUID()}`;
    const out = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
            if (!text) continue;
            const chunk = {
              id,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          } catch { /* ignore parse errors on partial lines */ }
        }
      },
    });

    return new Response(out, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiBody),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    console.error("gemini-proxy upstream error", upstream.status, JSON.stringify(data).slice(0, 500));
    return new Response(
      JSON.stringify({ error: { message: data?.error?.message || `Gemini error ${upstream.status}`, model } }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return new Response(JSON.stringify(geminiToOpenAIChoice(data, model)), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleEmbeddings(req: Request, key: string) {
  const body = await req.json().catch(() => ({}));
  const model = mapEmbedModel(body.model);
  const inputs: string[] = Array.isArray(body.input) ? body.input.map(String) : [String(body.input ?? "")];

  const results: number[][] = [];
  for (const text of inputs) {
    const url = `${GEMINI_BASE}/models/${model}:embedContent?key=${encodeURIComponent(key)}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: { message: data?.error?.message || `Gemini embed error ${upstream.status}` } }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    results.push(data?.embedding?.values ?? []);
  }
  return new Response(
    JSON.stringify({
      object: "list",
      data: results.map((values, index) => ({ object: "embedding", index, embedding: values })),
      model,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = Deno.env.get("GEMINI_API_KEY")
    || Deno.env.get("GeminiFreetier")
    || Deno.env.get("GEMINIFREETIER")
    || Deno.env.get("GEMINI_FREETIER");
  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: "Gemini API key is not configured (set GEMINI_API_KEY)" } }),
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

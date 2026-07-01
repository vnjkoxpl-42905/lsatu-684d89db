// OpenAI-compatible proxy that routes ALL AI traffic through Google Gemini
// using the user-supplied `GeminiFreetier` secret. Other Edge Functions in this
// project call this proxy instead of the Lovable AI Gateway so every AI action
// uses the user's own free-tier key.
//
// Supports:
//   POST /chat/completions  — OpenAI chat-completions shape, streaming + JSON
//   POST /embeddings        — OpenAI embeddings shape
//   POST /                  — same as /chat/completions (back-compat)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, lovable-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function mapModel(model: string | undefined): string {
  if (!model) return "gemini-2.5-flash";
  const m = model.toLowerCase();
  if (m.startsWith("google/")) return m.slice("google/".length);
  // OpenAI alias → Gemini equivalent
  if (m.includes("gpt-5-nano") || m.includes("flash-lite")) return "gemini-2.5-flash-lite";
  if (m.includes("gpt-5-mini") || m.includes("flash")) return "gemini-2.5-flash";
  if (m.includes("gpt-5") || m.includes("pro")) return "gemini-2.5-pro";
  return "gemini-2.5-flash";
}

function mapEmbedModel(_model: string | undefined): string {
  return "text-embedding-004";
}

interface ChatMessage { role: string; content: unknown }

function messagesToGemini(messages: ChatMessage[]) {
  const systemParts: string[] = [];
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages || []) {
    const text = typeof m.content === "string"
      ? m.content
      : Array.isArray(m.content)
        ? m.content.map((p: any) => (typeof p === "string" ? p : p?.text ?? "")).join("\n")
        : JSON.stringify(m.content ?? "");
    if (m.role === "system") { systemParts.push(text); continue; }
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }
  const systemInstruction = systemParts.length
    ? { role: "system", parts: [{ text: systemParts.join("\n\n") }] }
    : undefined;
  return { contents, systemInstruction };
}

function geminiToOpenAIChoice(geminiResp: any) {
  const cand = geminiResp?.candidates?.[0];
  const text = cand?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
  return {
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: geminiResp?.modelVersion || "gemini",
    choices: [{
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: cand?.finishReason?.toLowerCase?.() === "stop" ? "stop" : (cand?.finishReason ?? "stop"),
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

  if (stream) {
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

    // Transform Gemini SSE → OpenAI chat.completion.chunk SSE
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
    return new Response(
      JSON.stringify({ error: { message: data?.error?.message || `Gemini error ${upstream.status}` } }),
      { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return new Response(JSON.stringify(geminiToOpenAIChoice(data)), {
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
  const key = Deno.env.get("GeminiFreetier")
    || Deno.env.get("GEMINIFREETIER")
    || Deno.env.get("GEMINI_FREETIER")
    || Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    return new Response(
      JSON.stringify({ error: { message: "Gemini API key is not configured (set GeminiFreetier or GEMINI_API_KEY)" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/gemini-proxy/, "") || "/";
  try {
    if (path.endsWith("/embeddings")) return await handleEmbeddings(req, key);
    return await handleChat(req, key);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: e instanceof Error ? e.message : "Proxy error" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

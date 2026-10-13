import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import rubrics from "./rubric.json" assert { type: "json" };
import { gradingMessages, readJudgment, readRequest } from "./grading.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return reply({ error: "Unauthorized" }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return reply({ error: "Unauthorized" }, 401);
    // Bound actual bytes, including chunked bodies whose length header is absent.
    const reader = req.body?.getReader();
    if (!reader) return reply({ error: "Invalid request" }, 400);
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) { await reader.cancel(); return reply({ error: "Request too large" }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply({ error: "Invalid request" }, 400); }
    const request = readRequest(parsed, rubrics);
    if (!request) return reply({ error: "Invalid request" }, 400);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const internalKey = Deno.env.get("EDGE_INTERNAL_KEY");
    if (!apiKey || !internalKey) return reply({ error: "Coach unavailable" }, 503);
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy/chat/completions`, {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Internal-Key": internalKey },
      body: JSON.stringify({ model: "google/gemini-3.1-flash-lite", messages: gradingMessages(request), response_format: { type: "json_object" }, temperature: 0.1 }),
    });
    if (!response.ok) return reply({ error: "Coach unavailable" }, 503);
    const output = await response.json();
    const judgment = readJudgment(JSON.parse(output?.choices?.[0]?.message?.content ?? "null"));
    if (!judgment) return reply({ error: "Coach unavailable" }, 503);
    return reply(judgment);
  } catch {
    console.error("abstract-choice-coach request failed");
    return reply({ error: "Coach unavailable" }, 503);
  }
});

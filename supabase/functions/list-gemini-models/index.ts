// Temporary probe: lists the Gemini models the configured GEMINI_API_KEY accepts.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "no key" }), { status: 500 });
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
  });
  const body = await res.json();
  const names = (body?.models ?? []).map((m: { name: string }) => m.name);
  return new Response(JSON.stringify({ status: res.status, names, raw: names.length ? undefined : body }), {
    headers: { "Content-Type": "application/json" },
  });
});

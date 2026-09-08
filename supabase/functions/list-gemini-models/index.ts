// Temporary probe: checks the configured GEMINI_API_KEY can run gemini-3.8-flash.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return new Response(JSON.stringify({ error: "no key" }), { status: 500 });
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-3.8-flash",
      messages: [{ role: "user", content: "Reply with the single word: ok" }],
    }),
  });
  const body = await res.json();
  return new Response(JSON.stringify({ status: res.status, body }).slice(0, 1500), {
    headers: { "Content-Type": "application/json" },
  });
});

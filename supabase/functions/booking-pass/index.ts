// RETIRED 2026-07-18. The anonymous token-based booking path
// (/schedule/pass/:token) has been replaced by per-student slug links
// (/book/<slug>) served by the `public-booking` function. This endpoint used
// to return student name/email to the browser (a PII leak) and resolved a
// raw token independently of the slug lifecycle. It is decommissioned; any
// stray call returns 410 Gone.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: "gone", message: "This booking link is no longer active." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } },
  );
});

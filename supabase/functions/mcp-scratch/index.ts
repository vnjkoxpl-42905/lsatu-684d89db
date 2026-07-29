// mcp-scratch v2 — multi-file, imports from ./_shared/util.ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { payload } from "./_shared/util.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify(payload()), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

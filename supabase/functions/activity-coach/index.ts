import { gradeCoachRequest } from "./grading.ts";
import { readBoundedBody, readCoachRequest } from "./request.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


// Source-bound grading. Admission receipts prevent ambiguous retries from making another paid call.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: _au, error: _aerr } = await _sb.auth.getUser();
    if (_aerr || !_au?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
    const raw = await readBoundedBody(req);
    const request = raw === null ? null : readCoachRequest(raw);
    if (!request) return reply({ error: "Update this page before requesting a judgment.", code: "update_required" }, 400);
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!serviceKey || !LOVABLE_API_KEY) return reply({ error: "Coach unavailable", code: "disabled" }, 503);
    const service = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const invoke = async (name: string, args: Record<string, unknown>) => {
      const { data, error } = await service.rpc(name, args);
      if (error || !data || typeof data !== "object") throw new Error("Receipt unavailable");
      return data;
    };
    const result = await gradeCoachRequest(request, _au.user.id, invoke, body => fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json", "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "" },
      body: JSON.stringify(body),
    }));
    return reply(result.body, result.status);

  } catch {
    console.error("activity-coach request failed");
    return new Response(JSON.stringify({ error: "Coach unavailable. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

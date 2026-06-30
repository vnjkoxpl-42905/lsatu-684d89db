import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


// Activity Centre Coach: judges a student's free-text response to an Activity
// item against the credited answer(s) and returns a structured verdict plus a
// short, supportive coaching message. Modeled on analyze-stem-response (Lovable
// AI gateway, google/gemini-2.5-flash, auth-guarded, 429/402 handling) but
// returns { verdict, feedback } rather than prose alone.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Verdict = "correct" | "partial" | "incorrect";

function clampVerdict(v: unknown): Verdict {
  return v === "correct" || v === "partial" || v === "incorrect" ? v : "incorrect";
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

    const { statement, studentResponse, creditedAnswers, explanation, attemptNo } = await req.json();

    if (!statement || !studentResponse || !Array.isArray(creditedAnswers) || creditedAnswers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const attempt = Number(attemptNo) || 1;

    const systemPrompt = [
      "You are a supportive LSAT coach running a statement-negation drill (the Negation Test used on Necessary Assumption questions).",
      "Negation rubric: a correct negation is the WEAKEST statement that contradicts the original, not its polar opposite.",
      "A polar opposite (e.g. 'No rivers flow north' to negate 'Every river flows north') is the signature trap this drill teaches: judge it as 'partial', not 'correct'.",
      "Judge the student's response against the credited answer(s) by MEANING, not wording. Equivalent phrasings are 'correct'.",
      "Return ONLY a strict JSON object: {\"verdict\":\"correct\"|\"partial\"|\"incorrect\",\"feedback\":\"...\"}.",
      "feedback is 2-3 supportive sentences. Name what they got right, then guide the fix.",
      attempt <= 1
        ? "This is their first attempt: do NOT reveal the credited answer. Nudge them toward it instead."
        : "This is a later attempt: you may be more explicit, but still encourage their own phrasing.",
    ].join(" ");

    const userPrompt = [
      `Original statement:\n"${statement}"`,
      `\nStudent's negation:\n"${studentResponse}"`,
      `\nCredited answer(s):\n${creditedAnswers.map((a: string) => `- ${a}`).join("\n")}`,
      explanation ? `\nWhy this is the negation:\n${explanation}` : "",
      `\nAttempt number: ${attempt}`,
      "\nReturn the JSON verdict object now.",
    ].join("\n");

    const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    let verdict: Verdict = "incorrect";
    let feedback = "";
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      verdict = clampVerdict(parsed?.verdict);
      feedback = typeof parsed?.feedback === "string" ? parsed.feedback : "";
    } catch (parseErr) {
      console.error("activity-coach: could not parse model JSON", parseErr, raw);
      // Surface the failure to the caller rather than guessing a verdict.
      return new Response(JSON.stringify({ error: "Coach response was malformed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!feedback) feedback = "Thanks, response received.";

    return new Response(JSON.stringify({ verdict, feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("activity-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

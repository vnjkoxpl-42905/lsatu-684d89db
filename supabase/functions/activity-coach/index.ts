import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


// Activity Centre Coach: judges a student's free-text response to an Activity
// item against the credited answer(s) and returns a structured verdict plus a
// short, supportive coaching message. Modeled on analyze-stem-response (Lovable
// AI gateway, gemini-3.8-flash on GEMINI_API_KEY, auth-guarded, 429/402 handling) but
// returns { verdict, feedback } rather than prose alone.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Verdict = "correct" | "partial" | "incorrect";

function clampVerdict(v: unknown): Verdict {
  return v === "correct" || v === "partial" || v === "incorrect" ? v : "incorrect";
}

/** One numbered thing the caller wants judged for coverage, not just credit. */
interface Idea {
  n: number;
  text: string;
}

/**
 * Callers that ask for coverage send a numbered checklist. Anything malformed
 * drops the whole request for coverage rather than half-asking for it, since a
 * partial checklist would read to the student as "these are all the ideas".
 */
function readIdeas(raw: unknown): Idea[] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const ideas: Idea[] = [];
  for (const item of raw) {
    const n = Number(item?.n);
    const text = item?.text;
    if (!Number.isInteger(n) || typeof text !== "string" || !text.trim()) return null;
    ideas.push({ n, text: text.trim() });
  }
  return ideas;
}

/**
 * Which checklist numbers the model says survived. Only numbers it was actually
 * given count: an invented number would tick an idea that does not exist, and a
 * non-array means the model ignored the instruction, which is not the same as
 * "nothing survived" and must stay undefined so the caller renders unjudged.
 */
function readCovered(raw: unknown, ideas: Idea[]): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const known = new Set(ideas.map((i) => i.n));
  const covered = [...new Set(raw.map(Number).filter((n) => known.has(n)))];
  return covered.sort((a, b) => a - b);
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

    const { statement, studentResponse, creditedAnswers, explanation, attemptNo, coach, category, ideas } =
      await req.json();

    if (!statement || !studentResponse || !Array.isArray(creditedAnswers) || creditedAnswers.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const attempt = Number(attemptNo) || 1;

    // Each Activity trains a different skill, so each carries its own judging
    // brief in `instructions.coach`. Activities authored before that field
    // existed (Negation Station) send nothing and get the original negation
    // rubric below, unchanged.
    const NEGATION_DEFAULT = {
      drill: "a statement-negation drill (the Negation Test used on Necessary Assumption questions)",
      rubric: [
        "A correct negation is the WEAKEST statement that contradicts the original, not its polar opposite.",
        "A polar opposite (e.g. 'No rivers flow north' to negate 'Every river flows north') is the signature trap this drill teaches.",
      ],
      partial_rule: "Judge a polar opposite as 'partial', not 'correct'.",
    };

    const brief =
      coach && typeof coach.drill === "string" && Array.isArray(coach.rubric) && coach.rubric.length
        ? coach
        : NEGATION_DEFAULT;

    // Summary drills need to know WHICH ideas survived, not just whether enough
    // did. That cannot be computed from the text (the checklist is written in
    // analytic language a summary never uses), so it is asked for here and
    // passed back. Drills that send no checklist are unaffected.
    const checklist = readIdeas(ideas);

    const systemPrompt = [
      `You are a supportive LSAT coach running ${brief.drill}.`,
      ...brief.rubric,
      brief.partial_rule ? `Partial rule: ${brief.partial_rule}` : "",
      "Judge the student's response against the credited answer(s) by MEANING, not wording. Equivalent phrasings are 'correct'.",
      "Never mark a response 'incorrect' for style, length, or phrasing alone. Judge the content only.",
      checklist
        ? "Return ONLY a strict JSON object: {\"verdict\":\"correct\"|\"partial\"|\"incorrect\",\"feedback\":\"...\",\"covered\":[numbers]}."
        : "Return ONLY a strict JSON object: {\"verdict\":\"correct\"|\"partial\"|\"incorrect\",\"feedback\":\"...\"}.",
      checklist
        ? "covered lists the numbers of the checklist ideas the student's response actually carries, by meaning. Include a number only if the idea is genuinely present; an idea merely gestured at is not carried. Use [] when none are. Never invent a number that is not on the checklist."
        : "",
      "feedback is 2-3 supportive sentences. Name what they got right, then guide the fix.",
      "Write plainly, in the second person. Do not use em-dashes.",
      attempt <= 1
        ? "This is their first attempt: do NOT reveal the credited answer. Nudge them toward it instead."
        : "This is a later attempt: you may be more explicit, but still encourage their own phrasing.",
    ]
      .filter(Boolean)
      .join(" ");

    const userPrompt = [
      `The item the student is working on:\n"${statement}"`,
      // The item's own Question Type ("Requirement word: unless", "Compound
      // condition: the only"). It names the form, not a difficulty band, and
      // tells the model which discrimination this item exists to teach.
      category ? `\nItem type: ${category}` : "",
      `\nStudent's response:\n"${studentResponse}"`,
      `\nCredited answer(s):\n${creditedAnswers.map((a: string) => `- ${a}`).join("\n")}`,
      explanation ? `\nAuthor's note on this item (traps, near misses, the teaching point):\n${explanation}` : "",
      checklist
        ? `\nThe ideas that must survive, numbered:\n${checklist.map((i) => `${i.n}. ${i.text}`).join("\n")}`
        : "",
      `\nAttempt number: ${attempt}`,
      "\nReturn the JSON verdict object now.",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        response_format: { type: "json_object" },
        // The rubric asks for a verdict and two to three sentences. Uncapped,
        // the call is roughly four seconds; capped it is roughly one, and the
        // cap is well clear of what the format actually needs.
        max_tokens: 220,
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
    let covered: number[] | undefined;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      verdict = clampVerdict(parsed?.verdict);
      feedback = typeof parsed?.feedback === "string" ? parsed.feedback : "";
      if (checklist) covered = readCovered(parsed?.covered, checklist);
    } catch (parseErr) {
      console.error("activity-coach: could not parse model JSON", parseErr, raw);
      // Surface the failure to the caller rather than guessing a verdict.
      return new Response(JSON.stringify({ error: "Coach response was malformed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!feedback) feedback = "Thanks, response received.";

    // `covered` is omitted rather than sent empty when nobody asked for it or
    // the model did not answer, so the caller can tell "none survived" from
    // "not judged".
    return new Response(JSON.stringify(covered ? { verdict, feedback, covered } : { verdict, feedback }), {
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

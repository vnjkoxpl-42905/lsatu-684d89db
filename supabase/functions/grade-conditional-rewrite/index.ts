import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { createRateLimiter, MODEL, parseGrade, SYSTEM_PROMPT, validRequest } from './core.ts';

const admit = createRateLimiter();

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization) return reply({ error: 'Sign in to check your answer.' }, 401);
  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return reply({ error: 'Sign in to check your answer.' }, 401);
    const raw = await req.text();
    if (raw.length > 12000) return reply({ error: 'Answer is too long.' }, 400);
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return reply({ error: 'Invalid answer request.' }, 400); }
    if (!validRequest(input)) return reply({ error: 'Invalid answer request.' }, 400);
    if (!admit(data.user.id)) return reply({ error: 'Please wait a minute before checking another answer.' }, 429);
    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return reply({ error: 'Answer checking is unavailable. Your answer has not been graded.' }, 503);
    // Direct gateway call preserves the explicitly selected low-cost model. The
    // shared Gemini proxy currently overrides all requested chat model IDs.
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: MODEL,
        reasoning_effort: 'minimal',
        max_completion_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ original: input.original, expected: input.expected,
            studentResponse: input.studentResponse, task: input.task, stagePrompt: input.stagePrompt }) },
        ],
      }),
    });
    if (!response.ok) {
      console.error('conditional_rewrite_provider_failure', { status: response.status });
      return reply({ error: 'Answer checking is unavailable. Please try again.' }, response.status === 429 ? 429 : 503);
    }
    const result = await response.json();
    return reply(parseGrade(result.choices?.[0]?.message?.content, { studentResponse: input.studentResponse, task: input.task, original: input.original }));
  } catch (error) {
    const allowed = new Set(['missing_grade', 'invalid_json', 'invalid_verdict', 'invalid_evidence', 'evidence_not_in_submission', 'invalid_issue']);
    const code = error instanceof Error && allowed.has(error.message) ? error.message : 'request_failed';
    console.error('conditional_rewrite_ungraded', { code });
    return reply({ error: 'Your answer has not been checked. Please try again.' }, 503);
  }
});

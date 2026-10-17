import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getTutorKb } from "./knowledge-base.ts";
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
interface QuestionInput {
  qid: string;
  pt: number;
  section: number;
  qnum: number;
  qtype: string;
  level: number;
  stimulus: string;
  questionStem: string;
  answerChoices: { [key: string]: string };
  correctAnswer: string;
  userAnswer: string;
  reasoningType?: string | string[];
  breakdown?: any;
  answerChoiceExplanations?: any;
  tutorContext?: {
    eliminatedAnswers?: string[];
    timeMs?: number | null;
    flagged?: boolean;
    answerRevealed?: boolean;
  };
}

interface MessageInput {
  role: 'user' | 'assistant';
  content: string;
}

function validateQuestion(q: any): q is QuestionInput {
  return (
    typeof q.qid === 'string' && q.qid.length > 0 && q.qid.length < 50 &&
    typeof q.pt === 'number' && q.pt >= 1 && q.pt <= 200 &&
    typeof q.section === 'number' && q.section >= 1 && q.section <= 4 &&
    typeof q.qnum === 'number' && q.qnum >= 1 && q.qnum <= 30 &&
    typeof q.qtype === 'string' && q.qtype.length > 0 && q.qtype.length < 100 &&
    typeof q.level === 'number' && q.level >= 1 && q.level <= 5 &&
    typeof q.stimulus === 'string' && q.stimulus.length < 10000 &&
    typeof q.questionStem === 'string' && q.questionStem.length < 1000 &&
    typeof q.answerChoices === 'object' &&
    typeof q.correctAnswer === 'string' &&
    typeof q.userAnswer === 'string'
  );
}

function validateMessages(messages: any[]): messages is MessageInput[] {
  if (!Array.isArray(messages) || messages.length > 50) {
    return false;
  }
  return messages.every(m => 
    (m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string' &&
    m.content.length > 0 &&
    m.content.length < 10000
  );
}

// Module-scope cache for coaching knowledge. Edge function isolates stay warm
// across requests, so a simple TTL Map keyed by qid avoids the 4-table lookup
// on every follow-up message. Coaching tables are near-static.
interface CachedKnowledge {
  value: {
    strategy: any;
    reasoning: any;
    patterns: any[];
    concepts: any[];
    resolvedReasoningType: string | null;
  };
  expires: number;
}
const knowledgeCache = new Map<string, CachedKnowledge>();
const KNOWLEDGE_TTL_MS = 10 * 60 * 1000;

const GEN_MODEL = "gemini-3.8-flash";

// Run a promise in the background without blocking the response. Deno Deploy /
// Supabase Edge keep the isolate alive via EdgeRuntime.waitUntil; fall back to a
// detached promise locally.
function runInBackground(p: Promise<unknown>) {
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(p);
  else p.catch(() => {});
}

// ── Reusable tutor content cache (question_tutor_cache) ──────────────────────
async function readTutorCache(
  supabase: any, qid: string, kind: 'preview' | 'explanation', picked: string,
): Promise<{ content_json: any; content_markdown: string | null } | null> {
  try {
    const { data } = await supabase
      .from('question_tutor_cache')
      .select('content_json, content_markdown, admin_markdown')
      .eq('qid', qid).eq('kind', kind).eq('picked_answer', picked || '')
      .maybeSingle();
    if (!data) return null;
    // An admin edit is the canonical served copy.
    return {
      content_json: data.content_json,
      content_markdown: data.admin_markdown || data.content_markdown,
    };
  } catch {
    return null;
  }
}

// Pull Joshua's top-rated / edited answers of this kind+qtype as style anchors
// so new generations match the voice he has blessed.
async function fetchToneExemplars(
  supabase: any, kind: 'preview' | 'explanation', qtype: string,
): Promise<string> {
  try {
    const { data } = await supabase
      .from('question_tutor_cache')
      .select('admin_markdown, content_markdown, rating')
      .eq('kind', kind).eq('qtype', qtype)
      .gte('rating', 4)
      .order('rating', { ascending: false })
      .limit(2);
    if (!data?.length) return '';
    const examples = data
      .map((r: any, i: number) => `EXAMPLE ${i + 1} (rated ${r.rating}/5):\n${r.admin_markdown || r.content_markdown}`)
      .join('\n\n');
    return `\n\nTONE EXEMPLARS — match the voice, structure, and concision of these admin-approved answers (do NOT copy their content, only their style):\n${examples}`;
  } catch {
    return '';
  }
}

async function writeTutorCache(supabase: any, row: {
  qid: string; kind: 'preview' | 'explanation'; picked_answer: string;
  qtype?: string; content_json?: any; content_markdown?: string | null; model: string;
}) {
  try {
    await supabase
      .from('question_tutor_cache')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'qid,kind,picked_answer' });
  } catch {
    console.error('tutor cache write failed');
  }
}

// ── Append-only interaction log (tutor_interaction_log) ──────────────────────
async function logTutorTurns(supabase: any, rows: Array<{
  user_id: string | null; qid: string; mode: string; picked_answer?: string | null;
  role: 'student' | 'tutor'; message?: string | null; content_json?: any;
}>) {
  if (!rows.length) return;
  try {
    await supabase.from('tutor_interaction_log').insert(rows);
  } catch {
    console.error('tutor log write failed');
  }
}

// Concatenate the content deltas out of an accumulated SSE body.
function parseSSEContent(raw: string): string {
  let out = '';
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const payload = t.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      const j = JSON.parse(payload);
      const d = j.choices?.[0]?.delta?.content;
      if (d) out += d;
    } catch {
      // partial / non-JSON keepalive line — skip
    }
  }
  return out;
}

async function drainStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let raw = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += dec.decode(value, { stream: true });
  }
  return raw;
}

// Emit a one-shot SSE stream carrying cached text, so a streaming client reads a
// cache hit exactly like a live generation.
function sseFromText(text: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunk = { choices: [{ delta: { content: text } }] };
      controller.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.enqueue(enc.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

// Parse model JSON that may arrive wrapped in ```json fences.
function safeParseJson(raw: string | null | undefined): any | null {
  if (!raw) return null;
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  try {
    return JSON.parse(s);
  } catch {
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { return JSON.parse(s.slice(first, last + 1)); } catch { /* fall through */ }
    }
    return null;
  }
}

// Render a preview breakdown object as the markdown the panel shows.
function previewMarkdown(b: any): string {
  if (!b || typeof b !== 'object') return '';
  const lines: string[] = [];
  if (b.conclusion) lines.push(`**Conclusion (therefore)**\n${b.conclusion}`);
  if (Array.isArray(b.evidence) && b.evidence.length) {
    lines.push(`**Evidence**\n${b.evidence.map((e: string) => `- ${e}`).join('\n')}`);
  }
  if (b.evaluate) lines.push(`**Evaluate**\n${b.evaluate}`);
  if (b.goal) lines.push(`**Goal**\n${b.goal}`);
  return lines.join('\n\n');
}

// Normalize the bank's raw questionType to the canonical form used as the
// coaching-table primary key. The bank has casing/punctuation drift
// ("Must be True" vs "Must Be True", "Principle Strengthen" vs "Principle-Strengthen",
// "Method" vs "Method of Reasoning"), so exact-match .eq() lookups miss ~100
// questions/session without this step. Mirrors src/lib/questionLoader.ts.
const CANONICAL_QTYPES = new Set([
  'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
  'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
  'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
  'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox',
]);
const QTYPE_SYNONYMS: Record<string, string> = {
  'Flaw in Reasoning': 'Flaw', 'Error in Reasoning': 'Flaw',
  'Assumption': 'Necessary Assumption',
  'Justify the Exception': 'Strengthen', 'Strengthen (EXCEPT)': 'Strengthen',
  'Strengthen/Explain': 'Strengthen', 'Strengthen/Explain EXCEPT': 'Strengthen',
  'Weaken EXCEPT': 'Weaken', 'Weaken/Counter': 'Weaken', 'Logical Counter': 'Weaken',
  'Principle Strengthen': 'Principle-Strengthen', 'Principle: Strengthen': 'Principle-Strengthen',
  'Principle: Justify': 'Principle-Strengthen', 'Principle-Identify': 'Principle-Strengthen',
  'Principle Conform': 'Principle-Conform', 'Principle: Conform': 'Principle-Conform',
  'Principle: Underlying': 'Principle-Conform', 'Principle Illustrated': 'Principle-Conform',
  'Inconsistent with Principle': 'Principle-Conform', 'Principle': 'Principle-Conform',
  'Evaluate the Argument': 'Evaluate',
  'Most Supported': 'Most Strongly Supported',
  'Main Point': 'Main Conclusion',
  'Must be True': 'Must Be True', 'Must Be True EXCEPT': 'Must Be True',
  'Must be False': 'Must Be False',
  'Point at Issue': 'Agree/Disagree', 'Point of Agreement': 'Agree/Disagree', 'Dispute': 'Agree/Disagree',
  'Method': 'Method of Reasoning',
  'Role in the Argument': 'Role',
  'Parallel': 'Parallel Reasoning', 'Complete the Argument': 'Parallel Reasoning',
  'Parallel Reasoning: Complete Argument': 'Parallel Reasoning',
  'Parallel Reasoning: Questionable': 'Parallel Reasoning',
  'Resolve the Paradox': 'Paradox', 'Resolve Paradox': 'Paradox', 'Explain the Discrepancy': 'Paradox',
};
function normalizeQtype(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (CANONICAL_QTYPES.has(trimmed)) return trimmed;
  return QTYPE_SYNONYMS[trimmed] || trimmed;
}

// Helper function to get coaching knowledge from database.
//
// Two-phase: strategy + tactical_patterns load in parallel first, then the
// reasoning-type-keyed lookups (guidance + concepts) run in a second parallel
// batch using either `question.reasoningType` or — as a fallback when the bank
// row lacks one — `strategy.related_reasoning_types[0]`. This preserves the
// original 4-query parallelism for tagged questions (one extra roundtrip only
// when the fallback path fires), and lets the guidance + concept blocks render
// for every question whose strategy row has a non-"All" related-type seeded.
async function getCoachingKnowledge(supabase: any, question: any) {
  try {
    const qtype = normalizeQtype(question.qtype) || question.qtype;

    const [strategyResult, patternsResult] = await Promise.all([
      supabase
        .from('question_type_strategies')
        .select('*')
        .eq('question_type', qtype)
        .maybeSingle(),
      supabase
        .from('tactical_patterns')
        .select('*')
        .contains('question_types', [qtype]),
    ]);

    const strategy = strategyResult.data;

    // Resolve the reasoning-type key: use the question's own tag first, then
    // fall back to the strategy row's first related reasoning type. Skip
    // umbrella values like "All" that don't correspond to a guidance row.
    // Map our authoritative labels to the DB guidance-table primary keys.
    const RT_DB_MAP: Record<string, string> = {
      'Conditional Reasoning': 'Conditional Logic',
      'Comparative Reasoning': 'Comparison',
      'Causation': 'Causation',
    };
    const rtRaw = question.reasoningType;
    const rtFirst = Array.isArray(rtRaw) ? rtRaw[0] : rtRaw;
    let reasoningKey: string | null = rtFirst ? (RT_DB_MAP[rtFirst] || rtFirst) : null;
    if (!reasoningKey && strategy?.related_reasoning_types?.length) {
      const candidate = strategy.related_reasoning_types.find(
        (t: string) => t && t !== 'All'
      );
      if (candidate) reasoningKey = candidate;
    }

    let reasoning: unknown = null;
    let concepts: unknown[] = [];
    if (reasoningKey) {
      const [reasoningResult, conceptsResult] = await Promise.all([
        supabase
          .from('reasoning_type_guidance')
          .select('*')
          .eq('reasoning_type', reasoningKey)
          .maybeSingle(),
        supabase
          .from('concept_library')
          .select('*')
          .eq('reasoning_type', reasoningKey),
      ]);
      reasoning = reasoningResult.data;
      concepts = conceptsResult.data || [];
    }

    return {
      strategy,
      reasoning,
      patterns: patternsResult.data || [],
      concepts,
      resolvedReasoningType: reasoningKey,
    };
  } catch (error) {
    console.error('Error fetching coaching knowledge');
    return {
      strategy: null,
      reasoning: null,
      patterns: [],
      concepts: [],
      resolvedReasoningType: null,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication to prevent AI credit abuse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = authData.user;

    // Parse and validate input
    const body = await req.json();
    const { question, messages, stream: wantsStream, mode: rawMode } = body;
    const tutorMode: 'pre-answer' | 'post-answer' | 'socratic' | 'preview' =
      rawMode === 'post-answer' ? 'post-answer'
      : rawMode === 'pre-answer' ? 'pre-answer'
      : rawMode === 'preview' ? 'preview'
      : 'socratic';

    if (!validateQuestion(question)) {
      return new Response(
        JSON.stringify({ error: 'Invalid question data' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!validateMessages(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages data (max 50 messages, max 10000 chars each)' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt verification moved below after phase detection (only required for phases >= 2)

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase service role key not configured");
    }

    // Initialize Supabase client with service role for knowledge base access
    const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY);

    if (tutorMode === 'post-answer') {
      const { data: savedAttempt, error: attemptError } = await supabase
        .from('attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('qid', question.qid)
        .eq('selected_answer', question.userAnswer)
        .limit(1)
        .maybeSingle();

      if (attemptError || !savedAttempt) {
        return new Response(
          JSON.stringify({ error: 'Post-answer tutoring requires a saved attempt.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Get coaching knowledge from database (cached per qid).
    const cacheKey = question.qid;
    const cached = knowledgeCache.get(cacheKey);
    let knowledge: CachedKnowledge['value'];
    if (cached && cached.expires > Date.now()) {
      knowledge = cached.value;
    } else {
      knowledge = await getCoachingKnowledge(supabase, question);
      knowledgeCache.set(cacheKey, { value: knowledge, expires: Date.now() + KNOWLEDGE_TTL_MS });
    }
    // Fetch student's recent wrong-answer history for this qtype (memory context).
    // Best-effort; failures must not break coaching.
    let pastMistakesContext = '';
    try {
      const qtypeNorm = normalizeQtype(question.qtype) || question.qtype;
      const { data: recentWrong } = await supabaseClient
        .from('attempts')
        .select('qid,qtype,selected_answer,timestamp_iso')
        .eq('user_id', user.id)
        .eq('correct', false)
        .eq('qtype', qtypeNorm)
        .order('timestamp_iso', { ascending: false })
        .limit(5);
      if (recentWrong && recentWrong.length > 0) {
        pastMistakesContext = `\nSTUDENT'S RECENT WRONG ANSWERS ON ${qtypeNorm} (most recent first):\n${recentWrong
          .map((a: any) => `- ${a.qid}: picked (${a.selected_answer})`)
          .join('\n')}\nUse this only to notice repeated patterns; don't lecture about history unless they ask.`;
      }
    } catch (_e) {
      // ignore — memory is optional
    }

    // Prepare concise inputs to avoid token limits
    const clamp = (s: string | null | undefined, n: number) => {
      if (!s) return '';
      return s.length > n ? s.slice(0, n) + '…' : s;
    };

    const stimulusShort = clamp(question.stimulus, 2000);
    const stemShort = clamp(question.questionStem, 600);

    // Log coaching session to database (only if we have a user)
    if (user && supabaseClient) {
      runInBackground(
        supabaseClient.from('events').insert({
          user_id: user.id,
          event_type: 'coaching_request',
          metadata: {
            message_count: messages.length,
            qid: question.qid,
            mode: tutorMode,
            stream: wantsStream === true,
          }
        }).then(({ error }) => {
          if (error) console.error('events insert failed', error);
        })
      );
    }

    // Build context strings
    const chosenAnswerText = question.userAnswer ? question.answerChoices?.[question.userAnswer] || '' : '';

    // Extract why the student's chosen answer is wrong (for coaching only)
    const wrongExpl = question.answerChoiceExplanations?.[question.userAnswer];
    const whyWrong = wrongExpl?.whyIncorrect || '';

    const breakdownText = question.breakdown
      ? `**Breakdown:**
- Conclusion: ${question.breakdown.conclusion}
- Simple conclusion: ${question.breakdown.conclusionSimple}
- Evidence: ${question.breakdown.evidence.join('; ')}
- Justification: ${question.breakdown.justification}
- Objection: ${question.breakdown.objection}
- Prediction: ${question.breakdown.prediction}
- Crucial insight: ${question.breakdown.crucialInsight}`
      : '';

    // Build knowledge base context
    let knowledgeContext = '';

    if (knowledge.strategy) {
      knowledgeContext += `\n**QUESTION TYPE STRATEGY (${question.qtype}):**
- Reading Strategy: ${knowledge.strategy.reading_strategy}
- Answer Strategy: ${knowledge.strategy.answer_strategy}
- Correct Answer Patterns: ${knowledge.strategy.correct_answer_patterns}
- Wrong Answer Patterns: ${knowledge.strategy.wrong_answer_patterns}
${knowledge.strategy.prephrase_goal ? `- Prephrase Goal: ${knowledge.strategy.prephrase_goal}` : ''}
`;
    }

    if (knowledge.reasoning) {
      knowledgeContext += `\n**REASONING TYPE GUIDANCE (${knowledge.resolvedReasoningType}):**
- Description: ${knowledge.reasoning.description}
- Key Indicators: ${knowledge.reasoning.key_indicators?.join(', ')}
- Common Flaws: ${knowledge.reasoning.common_flaws?.join(', ')}
- Strengthen Tactics: ${knowledge.reasoning.strengthen_tactics}
- Weaken Tactics: ${knowledge.reasoning.weaken_tactics}
`;
    }

    if (knowledge.patterns.length > 0) {
      knowledgeContext += `\n**RELEVANT TACTICAL PATTERNS:**
${knowledge.patterns.map((p: any) => `- ${p.pattern_name} (${p.pattern_type}): ${p.description}
  Formula: ${p.formula || 'N/A'}
  Application: ${p.application || 'N/A'}`).join('\n')}
`;
    }

    if (knowledge.concepts.length > 0) {
      knowledgeContext += `\n**RELEVANT CONCEPTS:**
${knowledge.concepts.map((c: any) => `- ${c.concept_name}: ${c.explanation}
  Keywords: ${c.keywords?.join(', ')}
  Application: ${c.application || 'N/A'}`).join('\n')}
`;
    }

    // Inject curated tutor knowledge base sourced from
    // LR-Strategies.pdf + LSAT_LAB_BREAKDOWN.pdf (Joshua's source-of-truth).
    const kbText = getTutorKb(question.qtype);
    if (kbText) {
      knowledgeContext += `\n**JOSHUA'S TUTOR KNOWLEDGE BASE (${question.qtype}):**\n${kbText}\n`;
    }

    // Truncate heavy sections to stay within model limits
    const breakdownTextShort = clamp(breakdownText, 1500);
    const knowledgeContextShort = clamp(knowledgeContext, 12000);

    // Keep roughly the last 10 turns so the tutor remembers the student's line of argument.
    // The model rejects the whole request (400) when a turn carries an empty
    // or non-string content, or an unknown role. Drop those instead of
    // forwarding them, so one stray turn cannot kill the conversation.
    const messagesForModel = (messages || [])
      .filter(
        (m: any) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0,
      )
      .map((m: any) => ({ role: m.role, content: m.content }))
      .slice(-20);

    const isFirstMessage = messages.length === 0;

    const correctAnswerText = question.answerChoices?.[question.correctAnswer] || '';
    const correctExpl = question.answerChoiceExplanations?.[question.correctAnswer];
    const whyCorrect = correctExpl?.whyCorrect || '';

    // Tone propagation: steer the cacheable generations (preview breakdown,
    // post-answer explanation) toward the admin-blessed voice.
    const toneExemplars =
      tutorMode === 'preview' ? await fetchToneExemplars(supabase, 'preview', question.qtype)
      : tutorMode === 'post-answer' ? await fetchToneExemplars(supabase, 'explanation', question.qtype)
      : '';

    const sharedContext = `QUESTION CONTEXT:
- Type: ${question.qtype}${knowledge.resolvedReasoningType ? ` (${knowledge.resolvedReasoningType})` : ''}
- Stimulus: ${stimulusShort || 'N/A'}
- Stem: ${stemShort}
- Student picked: ${question.userAnswer ? `(${question.userAnswer}) "${clamp(chosenAnswerText, 400)}"` : 'no answer selected yet'}
- Student state: elapsed ${typeof question.tutorContext?.timeMs === 'number' ? `${Math.round(question.tutorContext.timeMs / 1000)}s` : 'unknown'}, eliminated ${question.tutorContext?.eliminatedAnswers?.length ? question.tutorContext.eliminatedAnswers.join(', ') : 'none'}, flagged ${question.tutorContext?.flagged ? 'yes' : 'no'}, answer revealed ${question.tutorContext?.answerRevealed ? 'yes' : 'no'}
${whyWrong ? `\nWHY (${question.userAnswer}) IS WRONG:\n${whyWrong}` : ''}
${question.breakdown?.crucialInsight ? `\nCRUCIAL INSIGHT: ${question.breakdown.crucialInsight}` : ''}
${breakdownTextShort ? `\nARGUMENT BREAKDOWN:\n${breakdownTextShort}` : ''}
${knowledgeContextShort ? `\nCOACHING KNOWLEDGE:\n${knowledgeContextShort}` : ''}${pastMistakesContext}`;

    const preAnswerPrompt = `You are Joshua, a sharp LSAT tutor who sounds like a smart friend, not an academic. The student has not selected an answer yet. Be concise, specific, and direct.

${sharedContext}

ABSOLUTE RULES:
1. Never reveal the correct answer letter.
2. Never say whether any specific answer choice is correct.
3. Do not walk through all answer choices.
4. If asked for the answer, reply: "I can't give that away — use the hint, then take your shot."

COACHING STYLE:
- Help them read the argument and stem better before choosing.
- Point them toward the key task, gap, or scope issue in this question.
- Default to 2-3 short sentences.
- End with a concrete next move.`;

    const socraticPrompt = `You are Joshua, a sharp LSAT tutor who sounds like a smart friend, not an academic. Be concise, specific, and direct. No hedging, no padding, no em-dashes, no phrases like "the stimulus states" or "the argument exhibits." Plain English, real person.

${sharedContext}

ABSOLUTE RULES:
1. Never reveal the correct answer letter or confirm/deny whether a specific choice is correct.
2. Never explain why the correct answer is correct. Never contrast the wrong answer with the correct one.
3. Never list or explain answer choices the student hasn't specifically asked about.
4. If asked "what is the correct answer?" or "is it (X)?", reply: "I can't give that away — go back and try again. You've got this."

COACHING STYLE:
- Your job is to help them THINK. Guide their reasoning, point out flaws in their logic, nudge them toward the right approach.
- Stay specific to THIS question. Quote a few key words from the stimulus or their pick.
- Default to 2-3 short, punchy sentences.
- Always end by encouraging them to return to the question and try again.

${isFirstMessage
  ? `FIRST TURN: Diagnose why (${question.userAnswer}) is wrong using the WHY block. Name the trap phrase, explain why it doesn't hold up, nudge toward what to look for. 2-3 sentences.`
  : `FOLLOW-UP: Answer using the coaching style above. If they seem stuck, give a small nudge — never the correct answer.`}`;

    const postAnswerPrompt = `You are Joshua, a sharp LSAT tutor. The student already revealed the answer — they want to understand WHY they got it wrong. Be surgical, specific, and concise. No hedging, no padding, no em-dashes, no phrases like "the stimulus states." Plain English.

${sharedContext}

CORRECT ANSWER (${question.correctAnswer}): "${clamp(correctAnswerText, 400)}"
${whyCorrect ? `\nWHY (${question.correctAnswer}) IS CORRECT:\n${whyCorrect}` : ''}

FORMAT (post-answer mode):
- You MAY name the correct answer letter and contrast it with the student's pick.
- Use light markdown: **bold** for the trap and the key move, line breaks between sentences.

TEACH, DON'T JUST LABEL: be precise and directly specific about why (${question.userAnswer}) is wrong and why (${question.correctAnswer}) is right, but frame it so the student learns the repeatable pattern — not just this answer key.

${isFirstMessage
  ? `FIRST TURN — exactly 3 short sentences:
1) Why (${question.userAnswer}) is wrong: name the trap phrase in their pick, quote 2-4 words, say what it confuses.
2) What (${question.correctAnswer}) does that (${question.userAnswer}) doesn't — one precise structural move (e.g. "matches the scope of the conclusion," "addresses the necessary condition, not the sufficient one").
3) The takeaway pattern in 6-10 words — the thing they should look for next time. No fluff. No "great question." Get to it.`
  : `FOLLOW-UP: Answer the student's question precisely. You may discuss any choice, the correct answer, or the structural breakdown. Stay 2-4 sentences unless they ask for depth.`}${toneExemplars}`;

    // Pre-submission structural breakdown. Answer-blind: teach how to read and
    // attack the argument, never identify a choice. Returns JSON for the panel.
    const previewPrompt = `You are Joshua, a sharp LSAT tutor who sounds like a smart friend, not an academic. The student has NOT answered yet and wants to understand the argument's structure BEFORE choosing. No hedging, no padding, no em-dashes, no "the stimulus states." Plain English, real coaching voice.

${sharedContext}

ABSOLUTE RULES:
1. Stay answer-blind. Never reveal or hint at which answer choice is correct. Do not reference choices by letter.
2. Analyze the ARGUMENT, not the options. Teach them how to pressure-test it themselves.

Return ONLY valid JSON (no prose, no markdown fences) in exactly this shape:
{
  "conclusion": "the author's main conclusion in plain words (the 'therefore' of the argument)",
  "evidence": ["each premise or piece of support as its own short string"],
  "evaluate": "how to pressure-test this argument: what family it smells like and your angle of attack (1-3 sentences, real coaching voice)",
  "goal": "what the right answer will need to DO structurally and the method to use (e.g. the negation test) — WITHOUT identifying any specific choice"
}${toneExemplars}`;

    const systemPrompt =
      tutorMode === 'post-answer'
        ? postAnswerPrompt
        : tutorMode === 'pre-answer'
        ? preAnswerPrompt
        : socraticPrompt;

    // ── Preview: cache-first, JSON, non-streaming ────────────────────────────
    if (tutorMode === 'preview') {
      const hit = await readTutorCache(supabase, question.qid, 'preview', '');
      if (hit?.content_json) {
        return new Response(
          JSON.stringify({ content_json: hit.content_json, content_markdown: hit.content_markdown, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const pResp = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json", "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "" },
        body: JSON.stringify({
          model: GEN_MODEL,
          messages: [{ role: "system", content: previewPrompt }],
          stream: false,
        }),
      });

      if (!pResp.ok) {
        const msg = pResp.status === 429
          ? "Joshua is taking a breather. Try again in a moment."
          : pResp.status === 402
          ? "Coaching sessions require credits. Please add funds."
          : "Joshua is having trouble connecting. Please try again.";
        return new Response(JSON.stringify({ error: msg }), {
          status: pResp.status === 429 || pResp.status === 402 ? pResp.status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const pData = await pResp.json();
      const parsed = safeParseJson(pData.choices?.[0]?.message?.content);
      if (!parsed) {
        throw new Error("Joshua couldn't break down this question. Please try again.");
      }
      const md = previewMarkdown(parsed);
      runInBackground(writeTutorCache(supabase, {
        qid: question.qid, kind: 'preview', picked_answer: '', qtype: question.qtype,
        content_json: parsed, content_markdown: md, model: GEN_MODEL,
      }));
      runInBackground(logTutorTurns(supabase, [{
        user_id: user.id, qid: question.qid, mode: 'preview', role: 'tutor',
        message: md, content_json: parsed,
      }]));

      return new Response(
        JSON.stringify({ content_json: parsed, content_markdown: md, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Explanation cache (post-answer first turn) ───────────────────────────
    const isCacheableExplanation =
      tutorMode === 'post-answer' && isFirstMessage && !!question.userAnswer;
    if (isCacheableExplanation) {
      const hit = await readTutorCache(supabase, question.qid, 'explanation', question.userAnswer);
      if (hit?.content_markdown) {
        if (wantsStream === true) {
          return new Response(sseFromText(hit.content_markdown), {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
          });
        }
        return new Response(
          JSON.stringify({ content: hit.content_markdown, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Latest student message (for the interaction log).
    const lastStudentMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user')?.content || null;


    const useStream = wantsStream === true;

    const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Internal-Key": Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({
        model: GEN_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messagesForModel,
        ],
        stream: useStream,
      }),
    });

    if (!response.ok) {
      console.error("AI service error:", response.status);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Joshua is taking a breather. Try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Coaching sessions require credits. Please add funds." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Joshua is having trouble connecting. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Persist this turn (and cache it when it's a reusable explanation) once the
    // full reply text is known. Logs the student's message and the tutor reply.
    const persistTurn = (replyText: string) => {
      const turns: Array<any> = [];
      if (lastStudentMsg) {
        turns.push({
          user_id: user.id, qid: question.qid, mode: tutorMode,
          picked_answer: question.userAnswer || null, role: 'student', message: lastStudentMsg,
        });
      }
      if (replyText) {
        turns.push({
          user_id: user.id, qid: question.qid, mode: tutorMode,
          picked_answer: question.userAnswer || null, role: 'tutor', message: replyText,
        });
      }
      runInBackground(logTutorTurns(supabase, turns));
      if (isCacheableExplanation && replyText) {
        runInBackground(writeTutorCache(supabase, {
          qid: question.qid, kind: 'explanation', picked_answer: question.userAnswer,
          qtype: question.qtype, content_markdown: replyText, model: GEN_MODEL,
        }));
      }
    };

    // Streaming branch — tee the SSE: one side to the client, one accumulated in
    // the background to log + cache the full reply.
    if (useStream && response.body) {
      const [toClient, toCapture] = response.body.tee();
      runInBackground(
        drainStream(toCapture).then((raw) => persistTurn(parseSSEContent(raw))),
      );
      return new Response(toClient, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming branch (existing behavior, preserved for other callers).
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Joshua couldn't generate a response. Please try again.");
    }

    persistTurn(content);

    return new Response(
      JSON.stringify({ content }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

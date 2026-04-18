import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

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
  reasoningType?: string;
  breakdown?: any;
  answerChoiceExplanations?: any;
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
  };
  expires: number;
}
const knowledgeCache = new Map<string, CachedKnowledge>();
const KNOWLEDGE_TTL_MS = 10 * 60 * 1000;

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

// Helper function to get coaching knowledge from database
async function getCoachingKnowledge(supabase: any, question: any) {
  try {
    const qtype = normalizeQtype(question.qtype) || question.qtype;
    const [strategyResult, reasoningResult, patternsResult, conceptsResult] = await Promise.all([
      supabase
        .from('question_type_strategies')
        .select('*')
        .eq('question_type', qtype)
        .maybeSingle(),

      question.reasoningType
        ? supabase
            .from('reasoning_type_guidance')
            .select('*')
            .eq('reasoning_type', question.reasoningType)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      supabase
        .from('tactical_patterns')
        .select('*')
        .contains('question_types', [qtype]),

      question.reasoningType
        ? supabase
            .from('concept_library')
            .select('*')
            .eq('reasoning_type', question.reasoningType)
        : Promise.resolve({ data: [] })
    ]);

    return {
      strategy: strategyResult.data,
      reasoning: reasoningResult.data,
      patterns: patternsResult.data || [],
      concepts: conceptsResult.data || []
    };
  } catch (error) {
    console.error('Error fetching coaching knowledge');
    return {
      strategy: null,
      reasoning: null,
      patterns: [],
      concepts: []
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Optional authentication (phase 1 can be public)
    const authHeader = req.headers.get('Authorization') || null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create client with user's auth token only if provided
    let supabaseClient: any = null;
    let user: any = null;
    if (authHeader) {
      supabaseClient = createClient(
        supabaseUrl,
        supabaseAnonKey,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data, error: authError } = await supabaseClient.auth.getUser();
      if (!authError) user = data.user;
    }

    // Parse and validate input
    const body = await req.json();
    const { question, messages, stream: wantsStream } = body;

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

    // Prepare concise inputs to avoid token limits
    const clamp = (s: string | null | undefined, n: number) => {
      if (!s) return '';
      return s.length > n ? s.slice(0, n) + '…' : s;
    };

    const stimulusShort = clamp(question.stimulus, 2000);
    const stemShort = clamp(question.questionStem, 600);

    // Log coaching session to database (only if we have a user)
    if (user && supabaseClient) {
      supabaseClient.from('events').insert({
        user_id: user.id,
        event_type: 'coaching_request',
        metadata: {
          message_count: messages.length,
          qid: question.qid
        }
      }); // Fire and forget - don't await
    }

    // Build context strings
    const chosenAnswerText = question.answerChoices?.[question.userAnswer] || '';

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
      knowledgeContext += `\n**REASONING TYPE GUIDANCE (${question.reasoningType}):**
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

    // Truncate heavy sections to stay within model limits
    const breakdownTextShort = clamp(breakdownText, 1500);
    const knowledgeContextShort = clamp(knowledgeContext, 4000);

    // Keep roughly the last 10 turns so the tutor remembers the student's line of argument.
    const messagesForModel = (messages || []).slice(-20);

    const isFirstMessage = messages.length === 0;

    // Unified Socratic system prompt. Every imperative from the prior prompt
    // is preserved; duplicated first-turn / follow-up blocks are consolidated.
    const systemPrompt = `You are Joshua, a sharp LSAT tutor who sounds like a smart friend, not an academic. Be concise, specific, and direct. No hedging, no padding, no em-dashes, no phrases like "the stimulus states" or "the argument exhibits." Plain English, real person.

QUESTION CONTEXT:
- Type: ${question.qtype}${question.reasoningType ? ` (${question.reasoningType})` : ''}
- Stimulus: ${stimulusShort || 'N/A'}
- Stem: ${stemShort}
- Student picked (${question.userAnswer}): "${clamp(chosenAnswerText, 400)}"
${whyWrong ? `\nWHY (${question.userAnswer}) IS WRONG:\n${whyWrong}` : ''}
${question.breakdown?.crucialInsight ? `\nCRUCIAL INSIGHT: ${question.breakdown.crucialInsight}` : ''}
${breakdownTextShort ? `\nARGUMENT BREAKDOWN:\n${breakdownTextShort}` : ''}
${knowledgeContextShort ? `\nCOACHING KNOWLEDGE:\n${knowledgeContextShort}` : ''}

ABSOLUTE RULES:
1. Never reveal the correct answer letter or confirm/deny whether a specific choice is correct.
2. Never explain why the correct answer is correct. Never contrast the wrong answer with the correct one.
3. Never list or explain answer choices the student hasn't specifically asked about.
4. If asked "what is the correct answer?" or "is it (X)?", reply: "I can't give that away — go back and try again. You've got this."

COACHING STYLE:
- Your job is to help them THINK. Guide their reasoning, point out flaws in their logic, nudge them toward the right approach. Don't hand over conclusions.
- Stay specific to THIS question. Quote a few key words from the stimulus or their pick when it helps.
- Default to 2-3 short, punchy sentences. Go longer only if they ask for a deeper concept explanation.
- If they ask about a specific wrong answer, explain why that particular answer doesn't work.
- If they ask about strategy, draw from the coaching knowledge above.
- Nudge toward what to look for without naming the correct answer.
- Always end by encouraging them to return to the question and try again.

${isFirstMessage
  ? `FIRST TURN: Diagnose why (${question.userAnswer}) is wrong, using the WHY block above if provided. Name the specific phrase or idea in (${question.userAnswer}) that makes it tempting, explain concretely why it doesn't hold up (quote a few key words from the answer or stimulus), nudge toward what they should look for instead, then send them back to try again. 2-3 sentences.

GOOD: "(B) is tempting because it sounds like the author is questioning the method, but look at the last sentence: the author says the results 'clearly demonstrate' it works. (B) gets the author's attitude backwards. Look for an answer that matches what the author actually concludes. Go back and give it another shot."

BAD (too generic): "This answer doesn't align with the argument's main point."`
  : `FOLLOW-UP: Answer the student's question using the coaching style above. If they seem stuck, give a small nudge — never the correct answer.`}`;

    const useStream = wantsStream === true;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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

    // Streaming branch — forward SSE from Lovable straight to the client.
    if (useStream && response.body) {
      return new Response(response.body, {
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

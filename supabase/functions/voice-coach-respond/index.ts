import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
const LSATU_GEMINI_PROXY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gemini-proxy`;


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const _sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: _au, error: _aerr } = await _sb.auth.getUser();
    if (_aerr || !_au?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { transcript, question, selectedAnswer, showContrast } = await req.json();

    // Input validation
    if (!transcript || typeof transcript !== 'string' || transcript.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Invalid transcript (max 5000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!question || typeof question !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid question data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (question.stimulus && typeof question.stimulus === 'string' && question.stimulus.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Question stimulus too long (max 10000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!question.answerChoices || typeof question.answerChoices !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid question.answerChoices' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!selectedAnswer || typeof selectedAnswer !== 'string' || !(selectedAnswer in question.answerChoices)) {
      return new Response(
        JSON.stringify({ error: 'Invalid selectedAnswer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const systemPrompt = `You are a concise LSAT coach. Respond in exactly 2-3 plain English sentences. No jargon, no technical terms, no counts.

Your response MUST have exactly 3 parts:
1. Reflect: Acknowledge what the student said (1 sentence)
2. Pinpoint: Explain the specific mismatch with the stimulus (1 sentence)
3. Next step: Give ONE concrete action to take (1 sentence)

${showContrast ? '\nOptional 4th sentence: One-line contrast between their choice vs the correct answer.' : ''}

Rules:
- Use everyday language (12th grade level)
- No em-dashes, no semicolons
- No phrases like "In this case" or "Here's the thing"
- Be direct and supportive`;

    const userPrompt = `Question Type: ${question.qtype}
Stimulus: ${question.stimulus.slice(0, 500)}...
Question: ${question.questionStem}
Student chose: (${selectedAnswer}) ${question.answerChoices[selectedAnswer]}
Correct answer: (${question.correctAnswer}) ${question.answerChoices[question.correctAnswer]}

Student's reasoning (spoken): "${transcript}"

Generate your 2-3 sentence coaching response.`;

    const response = await fetch(`${LSATU_GEMINI_PROXY_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Internal-Key': Deno.env.get("EDGE_INTERNAL_KEY") ?? "",
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit reached',
            fallback: 'Your reasoning shows good effort. Look closely at what the stem is actually asking, then try the question again with fresh eyes.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const coachReply = data.choices[0]?.message?.content || 
      'Your reasoning shows good effort. Look closely at what the stem is actually asking, then try the question again with fresh eyes.';
    
    const replyId = crypto.randomUUID();
    
    return new Response(
      JSON.stringify({ 
        coachReply,
        replyId,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('voice-coach-respond error', error);
    return new Response(
      JSON.stringify({ error: 'Coach unavailable, try again' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

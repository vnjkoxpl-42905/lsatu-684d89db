import { supabase } from '@/integrations/supabase/client';

export interface ConditionalRewriteRequest {
  original: string;
  expected: string;
  studentResponse: string;
  task: 'rewrite' | 'contrapositive' | 'explanation';
  stagePrompt: string;
}

export interface ConditionalRewriteGrade {
  correct: boolean;
  feedback: string;
}

export async function gradeConditionalRewrite(request: ConditionalRewriteRequest): Promise<ConditionalRewriteGrade> {
  const { data, error } = await supabase.functions.invoke('grade-conditional-rewrite', { body: request });
  if (error || typeof data?.correct !== 'boolean' || typeof data?.feedback !== 'string' || !data.feedback.trim()) {
    throw new Error('Your answer has not been checked. Please try again.');
  }
  return { correct: data.correct, feedback: data.feedback };
}

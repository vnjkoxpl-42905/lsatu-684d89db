import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';

export interface GuidedDrillBankFilter {
  qtypes?: string[];
  features?: string[];
  reasoning_types?: string[];
  difficulty_min?: number | null;
  difficulty_max?: number | null;
  count?: number | null;
}

export interface GuidedDrill {
  id: string;
  slug: string;
  week: number;
  order_in_week: number;
  title: string;
  category: string | null;
  estimated_minutes: number | null;
  question_count: number | null;
  difficulty_min: number | null;
  difficulty_max: number | null;
  question_types: string[];
  question_features: string[];
  reasoning_types: string[];
  start_button_label: string;
  instruction_card: { left_md?: string; right_md?: string };
  bank_filter: GuidedDrillBankFilter;
  source_file?: string | null;
  is_published: boolean;
}

export interface GuidedDrillAssignment {
  id: string;
  guided_drill_id: string;
  student_id: string;
  class_id: string;
  assigned_by: string;
  assigned_at: string;
  scheduled_for: string | null;
  unlock_at: string | null;
  status: 'assigned' | 'read' | 'started' | 'completed';
  read_card_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  attempt_session_id: string | null;
}

export async function listGuidedDrills(): Promise<GuidedDrill[]> {
  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .order('week', { ascending: true })
    .order('order_in_week', { ascending: true });
  if (error) throw error;
  return (data || []) as GuidedDrill[];
}

export async function getGuidedDrill(id: string): Promise<GuidedDrill | null> {
  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as GuidedDrill) || null;
}

export async function getGuidedDrillBySlug(slug: string): Promise<GuidedDrill | null> {
  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as GuidedDrill) || null;
}

/**
 * Resolve the question pool for a guided drill from the in-memory question bank.
 * Filters by qtypes (any) ∩ features (any) ∩ reasoning_types (any) ∩ difficulty range.
 */
export function resolveGuidedDrillPool(filter: GuidedDrillBankFilter) {
  const all = questionBank.getAllQuestions();
  const qtypeSet = new Set((filter.qtypes || []).map((s) => s.toLowerCase()));
  const featSet = new Set((filter.features || []).map((s) => s.toLowerCase()));
  const rtSet = new Set((filter.reasoning_types || []).map((s) => s.toLowerCase()));
  const dmin = filter.difficulty_min ?? null;
  const dmax = filter.difficulty_max ?? null;
  return all.filter((q) => {
    if (qtypeSet.size > 0 && !qtypeSet.has((q.qtype || '').toLowerCase())) return false;
    if (featSet.size > 0) {
      const hit = (q.questionFeatures || []).some((f) => featSet.has(f.toLowerCase()));
      if (!hit) return false;
    }
    if (rtSet.size > 0) {
      const hit = (q.reasoningType || []).some((r) => rtSet.has(r.toLowerCase()));
      if (!hit) return false;
    }
    if (dmin != null && q.difficulty < dmin) return false;
    if (dmax != null && q.difficulty > dmax) return false;
    return true;
  });
}

export async function listAssignmentsForStudent(studentId: string) {
  const { data, error } = await supabase
    .from('guided_drill_assignments')
    .select('*, guided_drill:guided_drills(*)')
    .eq('student_id', studentId)
    .order('scheduled_for', { ascending: true, nullsFirst: false })
    .order('assigned_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAssignment(id: string) {
  const { data, error } = await supabase
    .from('guided_drill_assignments')
    .select('*, guided_drill:guided_drills(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAssignments(params: {
  guided_drill_ids: string[];
  student_ids: string[];
  scheduled_for?: string | null;
  unlock_at?: string | null;
  assigned_by: string;
}) {
  const rows = params.guided_drill_ids.flatMap((gd) =>
    params.student_ids.map((sid) => ({
      guided_drill_id: gd,
      student_id: sid,
      class_id: sid, // class_id mirrors student auth uid in this project
      assigned_by: params.assigned_by,
      scheduled_for: params.scheduled_for ?? null,
      unlock_at: params.unlock_at ?? null,
      status: 'assigned',
    }))
  );
  const { data, error } = await supabase
    .from('guided_drill_assignments')
    .insert(rows)
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function markCardRead(assignmentId: string) {
  const { error } = await supabase
    .from('guided_drill_assignments')
    .update({ read_card_at: new Date().toISOString(), status: 'read' })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function markStarted(assignmentId: string) {
  const { error } = await supabase
    .from('guided_drill_assignments')
    .update({ started_at: new Date().toISOString(), status: 'started' })
    .eq('id', assignmentId);
  if (error) throw error;
}

export async function markCompleted(assignmentId: string) {
  const { error } = await supabase
    .from('guided_drill_assignments')
    .update({ completed_at: new Date().toISOString(), status: 'completed' })
    .eq('id', assignmentId);
  if (error) throw error;
}

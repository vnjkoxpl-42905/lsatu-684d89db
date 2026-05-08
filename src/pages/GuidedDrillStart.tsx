import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAssignment, markCardRead, markStarted, resolveGuidedDrillPool, type GuidedDrill, type GuidedDrillAssignment } from '@/lib/guidedDrills';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import type { TypeDrillConfig } from '@/types/drill';

type AssignmentWithDrill = GuidedDrillAssignment & { guided_drill: GuidedDrill };

export default function GuidedDrillStart() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { isLoading: qbLoading } = useQuestionBank();
  const [assignment, setAssignment] = React.useState<AssignmentWithDrill | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [scrolledToEnd, setScrolledToEnd] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!assignmentId) return;
    getAssignment(assignmentId).then((a) => {
      setAssignment(a as AssignmentWithDrill | null);
      setLoading(false);
    }).catch((e: unknown) => {
      toast.error(e instanceof Error ? e.message : 'Failed to load assignment');
      setLoading(false);
    });
  }, [assignmentId]);

  React.useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const handler = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true);
    };
    el.addEventListener('scroll', handler);
    handler();
    return () => el.removeEventListener('scroll', handler);
  }, [assignment]);

  if (loading) return <div className="min-h-screen bg-background text-foreground p-8">Loading…</div>;
  if (!assignment) return <div className="min-h-screen bg-background text-foreground p-8">Assignment not found.</div>;

  const drill = assignment.guided_drill;
  const card = drill.instruction_card || {};

  const handleStart = async () => {
    if (qbLoading) { toast.info('Loading question bank…'); return; }
    const pool = resolveGuidedDrillPool(drill.bank_filter);
    if (pool.length === 0) {
      toast.error('No matching questions found for this drill.');
      return;
    }
    const want = drill.question_count ?? Math.min(pool.length, 10);
    // Random sample without replacement
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, want);
    await markCardRead(assignment.id);
    await markStarted(assignment.id);
    const config: TypeDrillConfig = {
      qtypes: drill.question_types || [],
      difficulties: [],
      pts: [],
      count: shuffled.length,
      selectedQids: shuffled.map((q) => q.qid),
      unseen_only: false,
    };
    navigate('/drill', { state: { mode: 'type-drill', config } });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Guided Drill · Week {drill.week}</div>
          <h1 className="text-4xl font-serif italic mt-1">{drill.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {drill.category && <Badge variant="outline">{drill.category}</Badge>}
            {drill.estimated_minutes && <Badge variant="outline">{drill.estimated_minutes} min</Badge>}
            {drill.question_count && <Badge variant="outline">{drill.question_count} questions</Badge>}
            {drill.question_types?.map((q: string) => <Badge key={q} variant="secondary">{q}</Badge>)}
            {drill.reasoning_types?.map((r: string) => <Badge key={r}>{r}</Badge>)}
          </div>
        </div>

        <div
          ref={cardRef}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto rounded-3xl border border-border bg-card p-6"
        >
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            <ReactMarkdown>{card.left_md || ''}</ReactMarkdown>
          </div>
          <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
            <ReactMarkdown>{card.right_md || ''}</ReactMarkdown>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {scrolledToEnd ? '✓ Card reviewed — ready to start.' : 'Read the full card before starting (scroll to the end to enable Start).'}
          </p>
          <Button size="lg" disabled={!scrolledToEnd || qbLoading} onClick={handleStart}>
            {drill.start_button_label || 'Start Drill'}
          </Button>
        </div>
      </div>
    </div>
  );
}

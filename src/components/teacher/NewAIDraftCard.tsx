import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import HubStudentList from '@/components/hub/HubStudentList';
import { useCreateAITADraft, type AITADraftType } from '@/hooks/useAITADrafts';

const DRAFT_TYPES: { value: AITADraftType; label: string }[] = [
  { value: 'session_recap', label: 'Session recap' },
  { value: 'next_assignment', label: 'Next assignment recommendation' },
  { value: 'next_session_plan', label: 'Next session plan (tutor-only)' },
  { value: 'message', label: 'Message draft' },
  { value: 'classroom_update_bundle', label: 'Classroom update bundle' },
];

/**
 * Self-contained "save a new AI TA draft" surface. Lets Joshua paste in
 * AI output (or hand-write a draft) and queue it for approval. No
 * external coupling to TAChatView; the draft is a real ai_ta_drafts row
 * regardless of where the text came from.
 */
export default function NewAIDraftCard({ defaultStudentId }: { defaultStudentId?: string | null }) {
  const create = useCreateAITADraft();
  const [studentId, setStudentId] = useState<string | null>(defaultStudentId ?? null);
  const [picking, setPicking] = useState(!defaultStudentId);
  const [draftType, setDraftType] = useState<AITADraftType>('session_recap');
  const [prompt, setPrompt] = useState('');
  const [body, setBody] = useState('');

  const submit = async () => {
    if (!studentId) {
      toast.error('Pick a student');
      return;
    }
    if (!body.trim()) {
      toast.error('Draft text required');
      return;
    }
    try {
      await create.mutateAsync({
        studentId,
        draftType,
        prompt: prompt.trim() || undefined,
        draftMarkdown: body,
      });
      toast.success('Saved as draft');
      setPrompt('');
      setBody('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100">New draft</h3>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs"
          onClick={() => setPicking((v) => !v)}
        >
          {studentId ? 'Change student' : 'Pick student'}
        </Button>
      </div>

      {picking && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 max-h-[260px] overflow-y-auto">
          <HubStudentList
            selectedId={studentId}
            onSelect={(id) => {
              setStudentId(id);
              setPicking(false);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Draft type</Label>
          <select
            value={draftType}
            onChange={(e) => setDraftType(e.target.value as AITADraftType)}
            className="mt-1 w-full text-sm rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-zinc-100"
          >
            {DRAFT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Selected student</Label>
          <Input
            readOnly
            value={studentId ?? ''}
            placeholder="Pick a student"
            className="mt-1 text-xs"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Prompt (optional)</Label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What did you ask the AI for?"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-xs">Draft text</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="mt-1 text-sm"
          placeholder="Paste the AI output here, or write your own. Nothing posts to the student until you approve and post it."
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={create.isPending || !studentId || !body.trim()}>
          {create.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Save draft
        </Button>
      </div>
    </section>
  );
}

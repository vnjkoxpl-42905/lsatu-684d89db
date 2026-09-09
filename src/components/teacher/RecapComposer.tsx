import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createClassroomItem } from '@/lib/classroomItems';
import ClassroomMarkdown from '@/components/classroom/ClassroomMarkdown';
import { TEACHER_MARKDOWN_CLASS } from '@/components/teacher/teacherMarkdown';

interface Props {
  studentId: string;
  adminUserId: string;
  onClose: () => void;
}

export default function RecapComposer({ studentId, adminUserId, onClose }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dirty = title.trim().length > 0 || body.trim().length > 0;

  // The composer was a bare fixed overlay: no Escape, no focus move, nothing
  // naming it to a screen reader. Escape closes, but never out from under a
  // half-written recap — losing ten minutes of typing to a stray keypress is
  // worse than one confirm.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      if (submitting) return;
      if (dirty && !window.confirm('Discard this recap?')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dirty, onClose, submitting]);

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body required');
      return;
    }
    setSubmitting(true);
    try {
      await createClassroomItem({
        studentId,
        createdBy: adminUserId,
        type: 'session_recap',
        title: title.trim(),
        contentMarkdown: body,
        visibleToStudent: true,
        status: 'assigned',
      });
      qc.invalidateQueries({ queryKey: ['classroom-items-admin', studentId] });
      qc.invalidateQueries({ queryKey: ['classroom-items'] });
      toast.success('Recap posted to Classroom');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to post recap');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recap-composer-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl p-5 space-y-4">
        <div>
          <h3 id="recap-composer-title" className="text-base font-semibold">
            Post a session recap
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Posts immediately to the student's Classroom under Notes and recaps.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs" htmlFor="recap-title">
              Title
            </Label>
            <Input
              id="recap-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder="Today's session"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs" htmlFor="recap-body">
                Body
              </Label>
              {/* The body is stored as markdown and the classroom renders it as
                  markdown. Without a preview the only place to find out what a
                  heading or a bullet list actually looks like was the student's
                  own screen, after posting. */}
              <button
                type="button"
                onClick={() => setPreview((p) => !p)}
                className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-100"
                aria-pressed={preview}
              >
                {preview ? 'Back to writing' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="mt-1 min-h-[13rem] rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                {body.trim() ? (
                  <ClassroomMarkdown className={TEACHER_MARKDOWN_CLASS}>
                    {body}
                  </ClassroomMarkdown>
                ) : (
                  <p className="text-sm text-zinc-500">Nothing written yet.</p>
                )}
              </div>
            ) : (
              <Textarea
                id="recap-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="mt-1 text-sm"
                placeholder={
                  'What we worked on, in markdown.\n\n## What we covered\n\n- Sufficient assumption\n- Negating the answer\n\n**Next:** redo PT 141 S2.'
                }
              />
            )}
            <p className="mt-1 text-[11px] text-zinc-500">
              Markdown: ## for a heading, - for a bullet, **bold**.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (dirty && !window.confirm('Discard this recap?')) return;
              onClose();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Post recap
          </Button>
        </div>
      </div>
    </div>
  );
}

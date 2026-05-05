import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createClassroomItem } from '@/lib/classroomItems';

interface Props {
  studentId: string;
  adminUserId: string;
  onClose: () => void;
}

export default function RecapComposer({ studentId, adminUserId, onClose }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to post recap');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold">Post a session recap</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Posts immediately to the student's Classroom under Session recaps.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              placeholder="Today's session"
            />
          </div>
          <div>
            <Label className="text-xs">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="mt-1 text-sm"
              placeholder="Key takeaways, what we worked on, next steps."
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
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

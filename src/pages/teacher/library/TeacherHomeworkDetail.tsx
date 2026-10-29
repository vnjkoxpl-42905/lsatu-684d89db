import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useHomeworkSet, useHomeworkSets } from '@/hooks/useHomeworkSets';
import QuestionMultiPicker from '@/components/homework/QuestionMultiPicker';
import { AssignWorkSheet } from '@/components/teacher/library/AssignWorkSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/**
 * A homework set inside Library (spec D4): the Gen-1 admin editor ported onto
 * the workspace's gray format, keeping the question picker as-is. Assigning goes
 * through the shared sheet, so homework and drills leave by the same door.
 */
export default function TeacherHomeworkDetail() {
  const navigate = useNavigate();
  const { setId } = useParams<{ setId: string }>();

  const { set, loading, error, refresh } = useHomeworkSet(setId);
  const { update, remove } = useHomeworkSets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [qids, setQids] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  // Which set the form holds. Keyed by id, not a "have we filled it once" flag,
  // so moving between sets cannot save one set's questions onto another.
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  useEffect(() => {
    if (set && initializedFor !== set.id) {
      setTitle(set.title);
      setDescription(set.description ?? '');
      setQids(set.question_qids);
      setInitializedFor(set.id);
    }
  }, [set, initializedFor]);

  const dirty =
    !!set &&
    (title !== set.title ||
      (description || '') !== (set.description || '') ||
      JSON.stringify(qids) !== JSON.stringify(set.question_qids));

  const canSave = dirty && title.trim().length > 0 && qids.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave || !setId) return;
    setSaving(true);
    const { data: row, error: saveError } = await update(setId, {
      title: title.trim(),
      description: description.trim() || null,
      question_qids: qids,
    });
    setSaving(false);
    if (!row) {
      toast.error(saveError || "Couldn't save changes.", { duration: 10000 });
      return;
    }
    toast.success('Set updated.');
    void refresh();
  };

  const handleDelete = async () => {
    if (!setId) return;
    const { ok, error: deleteError } = await remove(setId);
    if (!ok) {
      toast.error(deleteError || "Couldn't delete the set.", { duration: 10000 });
      return;
    }
    toast.success('Set deleted.');
    navigate('/teacher/library/homework');
  };

  return (
    <section className="flex h-full w-full flex-col" aria-label="Homework set">
      <header className="shrink-0 border-b border-black/10 px-5 pb-3 pt-4">
        <button
          type="button"
          onClick={() => navigate('/teacher/library/homework')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-black/45 transition hover:text-black"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Homework
        </button>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold tracking-tight text-black">
              {set ? set.title : loading ? 'Loading…' : 'Homework set'}
            </h1>
            {set ? (
              <p className="mt-1 text-xs text-black/45">
                {set.question_qids?.length ?? 0} question
                {(set.question_qids?.length ?? 0) === 1 ? '' : 's'}
                {set.is_guided_set ? ' · guided set' : ''}
              </p>
            ) : null}
          </div>

          {set ? (
            <div className="flex shrink-0 items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 border border-black/15 bg-white px-2.5 py-2 text-xs font-medium text-black/55 transition hover:text-[#8a3b2f]"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Delete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this set?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Already-issued assignments keep their snapshotted questions — students can
                      still drill them. You just won't be able to re-assign from this template.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <button
                type="button"
                onClick={() => setAssignOpen(true)}
                className="inline-flex items-center gap-1.5 bg-teacher-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-teacher-accent-hover"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={2} />
                Assign
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {loading ? (
          <p className="text-xs text-black/45">Loading set…</p>
        ) : error ? (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-[#8a3b2f]">
            Couldn't load this set. {error}
          </div>
        ) : !set ? (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-black/45">
            Set not found, or you don't have access to it.
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="hw-title" className="text-[13px] font-semibold text-black/70">
                Title
              </label>
              <input
                id="hw-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 w-full border border-black/15 bg-white px-2 text-sm text-black focus:border-black/35 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="hw-desc" className="text-[13px] font-semibold text-black/70">
                Description
              </label>
              <textarea
                id="hw-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-black/15 bg-white p-2 text-sm text-black focus:border-black/35 focus:outline-none"
              />
            </div>

            <QuestionMultiPicker value={qids} onChange={setQids} />

            <div className="flex items-center justify-end gap-3">
              {!dirty ? <span className="text-xs text-black/40">No changes to save.</span> : null}
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                title={qids.length === 0 ? 'Add at least one question.' : undefined}
                className="inline-flex items-center gap-1.5 bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {set ? (
        <AssignWorkSheet
          open={assignOpen}
          items={[
            {
              item: { kind: 'homework_set', setId: set.id },
              title: set.title,
              kindLabel: 'Homework',
            },
          ]}
          onClose={() => setAssignOpen(false)}
        />
      ) : null}
    </section>
  );
}

import * as React from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Send, RefreshCw, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import type { AITADraft } from '@/hooks/useAITADrafts';
import {
  useUpdateBundle,
  useSynthesizeBundle,
  usePublishBundle,
} from '@/hooks/useSessionBundles';
import {
  type SessionBundle,
  type PartKey,
  type BundlePart,
  type QuizItem,
  PART_LABELS,
  STUDENT_PART_KEYS,
  ADMIN_PART_KEYS,
  includedParts,
  isSessionBundle,
  patchPart,
  allIncludedApproved,
  unpublishedApprovedParts,
} from '@/lib/sessionBundle';

// Phase 2/3 review surface. Renders a classroom_update_bundle draft as
// per-part review cards: edit, approve per part, then publish approved
// student-facing parts. Admin-only planning parts are reviewable but never
// publish. Honest empty state when a part is omitted.

export default function SessionBundleReview({ draft }: { draft: AITADraft }) {
  const update = useUpdateBundle();
  const synth = useSynthesizeBundle();
  const publish = usePublishBundle();

  // Local working copy so edits feel immediate; persisted on approve/save.
  const initial = isSessionBundle(draft.draft_json) ? (draft.draft_json as SessionBundle) : null;
  const [bundle, setBundle] = React.useState<SessionBundle | null>(initial);

  React.useEffect(() => {
    if (isSessionBundle(draft.draft_json)) setBundle(draft.draft_json as SessionBundle);
  }, [draft.draft_json]);

  if (!bundle) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
        This draft is not a session bundle.
      </div>
    );
  }

  const isPosted = draft.status === 'posted';
  const parts = includedParts(bundle);
  const fullyApproved = allIncludedApproved(bundle);
  const readyToPublish = unpublishedApprovedParts(bundle);

  async function persist(nextBundle: SessionBundle) {
    setBundle(nextBundle);
    try {
      await update.mutateAsync({ draftId: draft.id, bundle: nextBundle, currentStatus: draft.status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  }

  function patchLocal(key: PartKey, patch: Partial<BundlePart>) {
    setBundle((b) => (b ? patchPart(b, key, patch) : b));
  }

  // Apply a patch and persist it in one step, so a field that only commits on
  // blur (the homework list) never saves a stale copy of itself.
  async function patchAndSave(key: PartKey, patch: Partial<BundlePart>) {
    if (!bundle) return;
    await persist(patchPart(bundle, key, patch));
  }

  async function toggleApprove(key: PartKey) {
    if (!bundle) return;
    const current = bundle.parts[key];
    const next = patchPart(bundle, key, { approved: !current?.approved });
    await persist(next);
  }

  async function approveAll() {
    if (!bundle) return;
    let next = bundle;
    for (const k of parts) next = patchPart(next, k, { approved: true });
    await persist(next);
    toast.success('All parts approved.');
  }

  async function handlePublish(only?: PartKey[]) {
    if (!bundle) return;
    try {
      const res = await publish.mutateAsync({
        studentId: draft.student_id,
        draftId: draft.id,
        bundle,
        only,
      });
      if (res.nothing_to_publish) {
        toast.info('Nothing approved and unpublished to send.');
        return;
      }
      setBundle(res.bundle);
      const okCount = res.published.filter((p) => p.ok).length;
      const failCount = res.published.length - okCount;
      if (failCount === 0) toast.success(`Published ${okCount} part${okCount === 1 ? '' : 's'} to Classroom.`);
      else toast.warning(`Published ${okCount}, ${failCount} failed. Check the part for details.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed');
    }
  }

  async function regenerate() {
    const ledgerId = bundle?.source?.ledger_id ?? undefined;
    const sessionId = bundle?.source?.session_id ?? undefined;
    try {
      await synth.mutateAsync({ ledgerId, sessionId, regenerate: true });
      toast.success('Regenerated from the transcript.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regenerate failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Session bundle</h3>
          <p className="text-xs text-zinc-500">
            {bundle.source?.doc_name ? `From: ${bundle.source.doc_name} · ` : ''}
            {parts.length} part{parts.length === 1 ? '' : 's'} ·{' '}
            {isPosted ? 'published' : fullyApproved ? 'approved, ready to publish' : 'in review'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={regenerate}
            disabled={synth.isPending || isPosted}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            title={isPosted ? 'Cannot regenerate a published bundle' : 'Rebuild from the transcript'}
          >
            {synth.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </button>
          {!isPosted && !fullyApproved && parts.length > 0 && (
            <button
              onClick={approveAll}
              disabled={update.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Approve all
            </button>
          )}
          <button
            onClick={() => handlePublish()}
            disabled={publish.isPending || readyToPublish.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            title={readyToPublish.length === 0 ? 'Approve a student-facing part first' : 'Publish approved parts'}
          >
            {publish.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publish{readyToPublish.length ? ` (${readyToPublish.length})` : ''}
          </button>
        </div>
      </div>

      {parts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          The transcript did not clearly support any part. Regenerate or log the session
          details manually.
        </div>
      ) : (
        <div className="space-y-2.5">
          {parts.map((key) => (
            <PartCard
              key={`${draft.id}:${key}`}
              partKey={key}
              part={bundle.parts[key] as BundlePart}
              locked={isPosted}
              saving={update.isPending}
              onPatchLocal={(patch) => patchLocal(key, patch)}
              onSavePatch={(patch) => patchAndSave(key, patch)}
              onSaveBody={() => bundle && persist(bundle)}
              onToggleApprove={() => toggleApprove(key)}
              onPublishOne={() => handlePublish([key])}
              publishing={publish.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PartCard({
  partKey,
  part,
  locked,
  saving,
  onPatchLocal,
  onSavePatch,
  onSaveBody,
  onToggleApprove,
  onPublishOne,
  publishing,
}: {
  partKey: PartKey;
  part: BundlePart;
  locked: boolean;
  saving: boolean;
  onPatchLocal: (patch: Partial<BundlePart>) => void;
  onSavePatch: (patch: Partial<BundlePart>) => void;
  onSaveBody: () => void;
  onToggleApprove: () => void;
  onPublishOne: () => void;
  publishing: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  const isStudent = STUDENT_PART_KEYS.includes(partKey);
  const editable = !locked && !part.posted;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={() => setOpen((o) => !o)} className="text-zinc-500 hover:text-zinc-300">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">{PART_LABELS[partKey]}</span>
            {!isStudent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                <Lock className="h-2.5 w-2.5" /> admin only
              </span>
            )}
            {part.posted && (
              <span className="rounded-full bg-emerald-900/50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                published
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onToggleApprove}
          disabled={!editable || saving}
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
            part.approved
              ? 'bg-emerald-700 text-white hover:bg-emerald-600'
              : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          <Check className="h-3.5 w-3.5" /> {part.approved ? 'Approved' : 'Approve'}
        </button>
        {isStudent && part.approved && !part.posted && !locked && (
          <button
            onClick={onPublishOne}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-700 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-950/40 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Send
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-zinc-800 px-3 py-3">
          <PartBody
            partKey={partKey}
            part={part}
            editable={editable}
            onPatchLocal={onPatchLocal}
            onSavePatch={onSavePatch}
            onSaveBody={onSaveBody}
          />
        </div>
      )}
    </div>
  );
}

// The homework list is one task per line. Splitting on every keystroke ate the
// newline the moment it was typed, so the raw text is held locally and only
// split into items when the field loses focus. The editor is remounted (via a
// key that includes the draft id) when a different bundle is reviewed, which is
// the only time the incoming items should overwrite what is being typed.
function HomeworkItemsEditor({
  items,
  editable,
  onSaveItems,
}: {
  items: string[];
  editable: boolean;
  onSaveItems: (items: string[]) => void;
}) {
  const [raw, setRaw] = React.useState(() => items.join('\n'));

  return (
    <textarea
      value={raw}
      disabled={!editable}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => onSaveItems(raw.split('\n').filter((l) => l.trim()))}
      rows={Math.max(3, raw.split('\n').length)}
      placeholder="One task per line"
      className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60"
    />
  );
}

function PartBody({
  partKey,
  part,
  editable,
  onPatchLocal,
  onSavePatch,
  onSaveBody,
}: {
  partKey: PartKey;
  part: BundlePart;
  editable: boolean;
  onPatchLocal: (patch: Partial<BundlePart>) => void;
  onSavePatch: (patch: Partial<BundlePart>) => void;
  onSaveBody: () => void;
}) {
  // Body-markdown parts: session_note, next_agenda, private_note.
  if (partKey === 'session_note' || partKey === 'next_agenda' || partKey === 'private_note') {
    return (
      <div className="space-y-2">
        {partKey !== 'private_note' && (
          <input
            value={part.title ?? ''}
            disabled={!editable}
            onChange={(e) => onPatchLocal({ title: e.target.value })}
            onBlur={onSaveBody}
            placeholder="Title"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60"
          />
        )}
        <textarea
          value={part.body_markdown ?? ''}
          disabled={!editable}
          onChange={(e) => onPatchLocal({ body_markdown: e.target.value })}
          onBlur={onSaveBody}
          rows={partKey === 'session_note' ? 8 : 4}
          className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60"
        />
      </div>
    );
  }

  // Homework: editable newline list. weakness_tags / drill_recs read-only review.
  if (partKey === 'homework') {
    const items = (part.items as string[]) ?? [];
    return (
      <div className="space-y-2">
        <input
          value={part.title ?? ''}
          disabled={!editable}
          onChange={(e) => onPatchLocal({ title: e.target.value })}
          onBlur={onSaveBody}
          placeholder="Title"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-60"
        />
        <HomeworkItemsEditor items={items} editable={editable} onSaveItems={(next) => onSavePatch({ items: next })} />
      </div>
    );
  }

  if (partKey === 'quiz') {
    const items = (part.items as QuizItem[]) ?? [];
    return (
      <ol className="space-y-2 text-sm text-zinc-200">
        {items.map((q, i) => (
          <li key={i} className="rounded-md bg-zinc-900/60 px-2.5 py-2">
            <p className="font-medium">{i + 1}. {q.prompt}</p>
            <p className="mt-0.5 text-xs text-zinc-400">Answer: {q.answer}</p>
            {q.why && <p className="mt-0.5 text-xs text-zinc-500">{q.why}</p>}
          </li>
        ))}
      </ol>
    );
  }

  if (partKey === 'weakness_tags') {
    const tags = (part.tags as string[]) ?? [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{t}</span>
        ))}
      </div>
    );
  }

  if (partKey === 'drill_recs') {
    const recs = (part.items as unknown as Array<{ skill: string; reason?: string }>) ?? [];
    return (
      <ul className="space-y-1.5 text-sm text-zinc-200">
        {recs.map((r, i) => (
          <li key={i}>
            <span className="font-medium">{r.skill}</span>
            {r.reason && <span className="text-zinc-400"> · {r.reason}</span>}
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

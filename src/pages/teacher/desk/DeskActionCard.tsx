import ReactMarkdown from 'react-markdown';
import { Check, Loader2, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { approveLabel, approvedLabel, type DeskTask } from './deskTasks';
import type { DrillOption } from './useDeskActions';

export type DeskCardStatus = 'drafting' | 'ready' | 'working' | 'done' | 'discarded' | 'error';

interface DeskActionCardProps {
  task: DeskTask;
  status: DeskCardStatus;
  body: string;
  editing: boolean;
  error?: string;
  drillId: string;
  dueAt: string;
  drillOptions: DrillOption[];
  drillsLoading: boolean;
  onBodyChange: (value: string) => void;
  onToggleEdit: () => void;
  onStartBlank: () => void;
  onDrillChange: (value: string) => void;
  onDueChange: (value: string) => void;
  onApprove: () => void;
  onDiscard: () => void;
}

export function DeskActionCard(props: DeskActionCardProps) {
  const { task, status, body, editing, error } = props;
  const isReply = task.sourceKind === 'conversation';
  const isDraft = task.sourceKind === 'draft';
  const isUpload = task.sourceKind === 'upload';
  const isAssign = task.sourceKind === 'assignment-gap';
  const editable = isReply || isDraft;
  const busy = status === 'working';

  const approveDisabled =
    busy ||
    (isReply && !body.trim()) ||
    (isAssign && !props.drillId);

  return (
    <div className="w-full max-w-[88%] self-start border border-black/16 bg-white/55">
      <div className="flex items-center justify-between gap-2 border-b border-black/10 px-3 py-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-black/45">
          {task.sourceLabel} · {task.studentName || task.subject}
        </span>
        {task.suggested ? (
          <span className="text-[9px] uppercase tracking-[0.14em] text-black/35">Suggested</span>
        ) : null}
      </div>

      <div className="px-3 py-3 text-[13px] leading-relaxed text-[#11181c]">
        {status === 'drafting' ? (
          <span className="inline-flex items-center gap-2 text-black/55">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Drafting…
          </span>
        ) : isUpload ? (
          <p className="text-black/65">{task.preview}</p>
        ) : editable ? (
          editing ? (
            <textarea
              value={body}
              onChange={(event) => props.onBodyChange(event.target.value)}
              placeholder={isReply ? 'Write the reply to send…' : 'Edit the draft…'}
              className="min-h-[120px] w-full resize-y border border-black/16 bg-white/70 px-3 py-2 text-[13px] outline-none focus:border-black"
            />
          ) : body.trim() ? (
            <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1.5 prose-ul:my-1.5">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-black/45">
              No draft yet. {isReply ? 'Edit to write the reply' : 'Edit to write the draft'} or start blank.
            </p>
          )
        ) : null}

        {isAssign ? (
          <div className="mt-3 space-y-3">
            {body.trim() ? (
              <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            ) : null}
            <div className="grid grid-cols-[minmax(0,1fr)_150px] gap-2">
              <select
                value={props.drillId}
                onChange={(event) => props.onDrillChange(event.target.value)}
                aria-label="Guided drill to assign"
                disabled={props.drillsLoading || props.drillOptions.length === 0}
                className="h-10 border border-black/16 bg-white/70 px-2 text-[13px] outline-none focus:border-black disabled:opacity-60"
              >
                {props.drillsLoading ? (
                  <option value="">Loading guided drills…</option>
                ) : props.drillOptions.length === 0 ? (
                  <option value="">No guided drills available</option>
                ) : (
                  <>
                    <option value="">Select a guided drill…</option>
                    {props.drillOptions.map((drill) => (
                      <option key={drill.id} value={drill.id}>
                        {drill.title}
                      </option>
                    ))}
                  </>
                )}
              </select>
              <input
                type="date"
                value={props.dueAt}
                onChange={(event) => props.onDueChange(event.target.value)}
                aria-label="Due date"
                className="h-10 border border-black/16 bg-white/70 px-2 text-[13px] outline-none focus:border-black"
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-black/10 px-3 py-2.5">
        {status === 'done' ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-black/60">
            <Check className="h-3.5 w-3.5" strokeWidth={2} /> {approvedLabel(task)}
          </span>
        ) : status === 'discarded' ? (
          <span className="text-[12px] font-semibold text-black/45">Discarded</span>
        ) : (
          <>
            <button
              type="button"
              onClick={props.onApprove}
              disabled={approveDisabled}
              className="inline-flex items-center gap-1.5 border border-black bg-black px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-black/85 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
              {approveLabel(task)}
            </button>
            {editable ? (
              <>
                <button
                  type="button"
                  onClick={props.onToggleEdit}
                  disabled={busy || status === 'drafting'}
                  className="border border-black/16 px-3 py-1.5 text-[12px] font-semibold text-black/65 transition hover:border-black/40 disabled:opacity-40"
                >
                  {editing ? 'Done editing' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={props.onStartBlank}
                  disabled={busy || status === 'drafting'}
                  className="border border-black/16 px-3 py-1.5 text-[12px] font-semibold text-black/65 transition hover:border-black/40 disabled:opacity-40"
                >
                  Start blank
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={props.onDiscard}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1 px-2 py-1.5 text-[12px] font-semibold text-black/45 transition hover:text-black disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} /> Discard
            </button>
          </>
        )}
        {status === 'error' && error ? (
          <div className="flex w-full items-center gap-2 pt-1 text-[12px] text-[#11181c]">
            <span className="text-red-700">{error}</span>
            <button
              type="button"
              onClick={props.onApprove}
              className="inline-flex items-center gap-1 border border-black/20 px-2 py-1 font-semibold transition hover:bg-black hover:text-white"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} /> Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

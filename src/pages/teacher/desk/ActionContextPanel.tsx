import { Check, FileText, Loader2, Pin, Search, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HubStudentRow } from '@/hooks/useHubStudents';
import { completionRate, MODE_ORDER, MODE_META, type ContextKey, type DeskMode, type DeskTask } from './deskTasks';

const CONTEXT_TABS: { key: ContextKey; Icon: typeof UserRound }[] = [
  { key: 'student', Icon: UserRound },
  { key: 'source', Icon: FileText },
];

/**
 * Right panel: actions first (primary + secondary + pin), then the 2x2 context
 * card grid from the reference's "Lightning" block. Only one context view is
 * open at a time and it never buries the action controls.
 */
export function ActionContextPanel({
  task,
  studentRow,
  contextKey,
  pinned,
  busy,
  showPrimary = true,
  primaryDisabled,
  previewActionsDisabled,
  counts,
  nextSessionCue,
  onContextChange,
  onPrimary,
  onSecondary,
  onTogglePin,
}: {
  task: DeskTask | null;
  studentRow: HubStudentRow | null;
  contextKey: ContextKey;
  pinned: boolean;
  busy: boolean;
  showPrimary?: boolean;
  primaryDisabled: boolean;
  previewActionsDisabled?: boolean;
  counts: Record<DeskMode, number>;
  nextSessionCue: string | null;
  onContextChange: (key: ContextKey) => void;
  onPrimary: (task: DeskTask) => void;
  onSecondary: (task: DeskTask) => void;
  onTogglePin: (task: DeskTask) => void;
}) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Controls</div>

      {!task ? (
        <div className="border border-black/15 bg-white/12 p-4">
          <div className="text-sm font-semibold">Today</div>
          <dl className="mt-3 space-y-1.5 text-xs text-black/56">
            {MODE_ORDER.map((mode) => (
              <Row key={mode} label={MODE_META[mode].label} value={String(counts[mode])} />
            ))}
          </dl>
          {nextSessionCue ? <p className="mt-4 text-sm leading-6 text-black/52">{nextSessionCue}</p> : null}
        </div>
      ) : (
        <>
          {showPrimary ? (
            <>
              <button
                type="button"
                onClick={() => onPrimary(task)}
                disabled={busy || primaryDisabled}
                className="inline-flex h-11 w-full items-center justify-center gap-2 bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/85 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
                {task.primaryActionLabel}
              </button>
              {previewActionsDisabled ? (
                <p className="mt-2 text-xs leading-5 text-black/48">Preview data. Actions unlock on the live teacher desk.</p>
              ) : null}
            </>
          ) : (
            <p className="text-xs leading-5 text-black/48">
              Send the reply from the draft card in the work area. Use these for context.
            </p>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSecondary(task)}
              className="inline-flex h-10 items-center justify-center gap-2 border border-black/16 bg-white/14 px-3 text-sm font-semibold text-black/68 transition hover:bg-white/30"
            >
              <Search className="h-4 w-4" strokeWidth={1.5} />
              {task.secondaryActionLabel}
            </button>
            <button
              type="button"
              onClick={() => onTogglePin(task)}
              aria-pressed={pinned}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-2 border px-3 text-sm font-semibold transition',
                pinned
                  ? 'border-black bg-black text-white'
                  : 'border-black/16 bg-white/14 text-black/68 hover:bg-white/30',
              )}
            >
              <Pin className="h-4 w-4" strokeWidth={1.5} />
              {pinned ? 'Pinned' : 'Pin'}
            </button>
          </div>

          <div className="mt-7 text-[10px] uppercase tracking-[0.2em] text-black/40">Context</div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {CONTEXT_TABS.map(({ key, Icon }) => {
              const active = contextKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onContextChange(key)}
                  className={cn(
                    'flex h-[58px] flex-col items-start justify-between border p-2.5 text-left transition',
                    active ? 'border-black bg-black text-white' : 'border-black/16 bg-white/14 text-black/60 hover:bg-white/28',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span className="text-xs font-semibold capitalize">{key}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 min-h-[150px] border border-black/16 bg-white/12 p-4">
            <ContextBody task={task} studentRow={studentRow} contextKey={contextKey} />
          </div>
        </>
      )}
    </div>
  );
}

function ContextBody({
  task,
  studentRow,
  contextKey,
}: {
  task: DeskTask;
  studentRow: HubStudentRow | null;
  contextKey: ContextKey;
}) {
  if (contextKey === 'student') {
    return (
      <div>
        <div className="text-sm font-semibold">{task.studentName || task.subject}</div>
        {studentRow ? (
          <dl className="mt-3 space-y-1.5 text-xs text-black/56">
            <Row label="Completed" value={`${studentRow.assignments_completed} / ${studentRow.assignments_total}`} />
            <Row label="Completion" value={`${completionRate(studentRow)}%`} />
            <Row label="Unread from student" value={studentRow.has_unread_from_student ? 'Yes' : 'No'} />
          </dl>
        ) : (
          <p className="mt-2 text-sm leading-6 text-black/52">
            No roster row is loaded for this task. Open the full student page for profile and progress.
          </p>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="text-sm font-semibold">{task.sourceLabel}</div>
      <p className="mt-2 text-sm leading-6 text-black/56">{task.preview}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-semibold text-black/72 tabular-nums">{value}</dd>
    </div>
  );
}

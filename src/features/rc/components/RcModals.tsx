import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RC_COLOR_SCHEMES,
  RC_LINE_HEIGHTS,
  type RcA11ySettings,
} from '../hooks/useRcA11y';
import type { RcSessionItem } from '../lib/rcSession';
import type { RcPassage, RcQuestion } from '../lib/rcTypes';

/* ----------------------------------------------------------------- shared */

const PILL =
  'rounded-full border border-slate-400 bg-white px-5 py-2 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';
const PILL_PRIMARY =
  'rounded-full bg-slate-900 px-7 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40';
const MENU_ROW =
  'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-[14px] text-slate-800 transition-colors hover:bg-slate-50';

function useEscape(onClose: () => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      <X size={18} />
    </button>
  );
}

interface ShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, onClose, children }: ShellProps) {
  useEscape(onClose);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-[92%] max-w-2xl overflow-y-auto rounded-md border border-slate-200 bg-white px-6 py-5 text-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[20px] font-semibold text-slate-900">{title}</h2>
          <CloseButton onClose={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- review */

interface ReviewModalProps {
  items: RcSessionItem[];
  currentIndex: number;
  answered: (item: RcSessionItem) => boolean;
  flagged: (item: RcSessionItem) => boolean;
  /** State classes for a pill, matching the footer pager. */
  pillClass: (item: RcSessionItem, index: number) => string;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onSubmit?: () => void;
}

export function RcReviewModal({
  items,
  currentIndex,
  answered,
  flagged,
  pillClass,
  onNavigate,
  onClose,
  onSubmit,
}: ReviewModalProps) {
  const [onlyFlagged, setOnlyFlagged] = React.useState(false);
  const [onlyUnattempted, setOnlyUnattempted] = React.useState(false);

  const visible = items.filter((item) => {
    if (onlyFlagged && !flagged(item)) return false;
    if (onlyUnattempted && answered(item)) return false;
    return true;
  });

  return (
    <Modal title="Review" onClose={onClose}>
      <div className="flex gap-5 text-[13px] text-slate-700">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={(e) => setOnlyFlagged(e.target.checked)}
          />
          Flagged
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={onlyUnattempted}
            onChange={(e) => setOnlyUnattempted(e.target.checked)}
          />
          Unattempted
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {visible.map((item) => {
          const index = items.indexOf(item);
          const isCurrent = index === currentIndex;
          return (
            <button
              key={item.question.questionId}
              type="button"
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-medium tabular-nums transition-colors',
                isCurrent
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : pillClass(item, index),
              )}
              aria-label={`Go to question ${item.number}`}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => {
                onNavigate(index);
                onClose();
              }}
            >
              {item.number}
              {flagged(item) && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <p className="mt-3 text-[13px] text-slate-600">Nothing matches those filters.</p>
      )}

      {onSubmit && (
        <div className="mt-6 text-right">
          <button type="button" className={PILL_PRIMARY} onClick={onSubmit}>
            Submit
          </button>
        </div>
      )}
    </Modal>
  );
}

/* --------------------------------------------------- text settings popover */

/**
 * Line spacing and color scheme, appended inside the toolbar's Aa popover so
 * every text setting sits behind one control. This replaces the standalone
 * accessibility modal the right rail used to open.
 */
export function RcTextSettings({
  settings,
  onChange,
}: {
  settings: RcA11ySettings;
  onChange: (patch: Partial<RcA11ySettings>) => void;
}) {
  return (
    <>
      <Section label="Line spacing" />
      {RC_LINE_HEIGHTS.map((option) => (
        <OptionRow
          key={option.label}
          label={option.label}
          selected={settings.lineHeight === option.value}
          onClick={() => onChange({ lineHeight: option.value })}
        />
      ))}

      <Section label="Color scheme" />
      {RC_COLOR_SCHEMES.map((scheme) => (
        <OptionRow
          key={scheme.id}
          label={scheme.label}
          selected={settings.scheme === scheme.id}
          onClick={() => onChange({ scheme: scheme.id })}
        />
      ))}
    </>
  );
}

function Section({ label }: { label: string }) {
  return (
    <div className="mt-2 border-t border-slate-200 px-3 pb-1 pt-3 text-[11px] uppercase tracking-wide text-slate-400">
      {label}
    </div>
  );
}

/** Matches the radio rows the font-size list already uses in the same popover. */
function OptionRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-[15px] text-slate-900 hover:bg-slate-50"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-full border-2',
          selected ? 'border-blue-600' : 'border-slate-400',
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-blue-600" />}
      </span>
    </button>
  );
}

/* ------------------------------------------------------- question details */

const dash = (value: unknown) =>
  value === null || value === undefined || value === '' ? '—' : String(value);

export function RcQuestionDetails({
  question,
  passage,
  number,
  onClose,
}: {
  question: RcQuestion;
  passage: RcPassage;
  number: number;
  onClose: () => void;
}) {
  const rows: [string, string][] = [
    ['PrepTest', dash(passage.preptest)],
    ['Section', dash(passage.section)],
    ['Question', String(number)],
    ['Difficulty', dash(question.difficulty)],
    ['Question Type', dash(question.questionType)],
    [
      'Question Features',
      question.features.length > 0 ? question.features.map((f) => f.name).join(', ') : '—',
    ],
    ['Passage Topic', dash(passage.topic)],
    ['Passage Format', dash(passage.format)],
    ['Frameworks', passage.frameworks.length > 0 ? passage.frameworks.join(', ') : '—'],
    ['Set Difficulty', dash(passage.difficulty)],
    ['Set Number', dash(passage.setNumber)],
  ];

  return (
    <Modal title="Question details" onClose={onClose}>
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-slate-100">
              <th scope="row" className="w-[46%] py-2 pr-3 text-left font-semibold text-slate-500">
                {label}
              </th>
              <td className="py-2 align-top text-slate-800">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/* --------------------------------------------------------- overflow menu */

interface MenuProps {
  onClose: () => void;
  onQuestionDetails: () => void;
  /** Omitted in review, which has no clock and nothing to pause. */
  onPause?: () => void;
  onSaveExit: () => void;
  /** Names the exit for the mode: nothing is being saved in review. */
  saveExitLabel?: string;
  onSubmit?: () => void;
}

export function RcOverflowMenu({
  onClose,
  onQuestionDetails,
  onPause,
  onSaveExit,
  saveExitLabel = 'Save and exit',
  onSubmit,
}: MenuProps) {
  useEscape(onClose);

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />
      <div
        className="fixed inset-y-0 right-0 z-[75] w-[min(420px,92vw)] overflow-y-auto border-l border-slate-200 bg-white px-6 py-5 shadow-[-8px_0_28px_rgba(15,23,42,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-[20px] font-semibold text-slate-900">Menu</h2>
          <CloseButton onClose={onClose} />
        </div>
        <div className="space-y-2">
          <button type="button" className={MENU_ROW} onClick={onQuestionDetails}>
            Question details
          </button>
          {onPause && (
            <button type="button" className={MENU_ROW} onClick={onPause}>
              Pause
            </button>
          )}
          <button type="button" className={MENU_ROW} onClick={onSaveExit}>
            {saveExitLabel}
          </button>
          {onSubmit && (
            <button type="button" className={MENU_ROW} onClick={onSubmit}>
              Submit
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------- confirm submit */

export function RcSubmitConfirm({
  unanswered,
  onCancel,
  onConfirm,
}: {
  unanswered: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Submit this drill?" onClose={onCancel}>
      <p className="mb-5 text-[14px] leading-relaxed text-slate-600">
        {unanswered > 0
          ? `You have ${unanswered} question${unanswered === 1 ? '' : 's'} without an answer. Submitting now scores ${unanswered === 1 ? 'it' : 'them'} as missed.`
          : 'Every question has an answer. You can review everything after you submit.'}
      </p>
      <div className="flex justify-end gap-3">
        <button type="button" className={PILL} onClick={onCancel}>
          Keep working
        </button>
        <button type="button" className={PILL_PRIMARY} onClick={onConfirm}>
          Submit
        </button>
      </div>
    </Modal>
  );
}

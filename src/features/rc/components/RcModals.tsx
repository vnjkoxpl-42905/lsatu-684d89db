import * as React from 'react';
import { X, Check, ListFilter } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import {
  RC_COLOR_SCHEMES,
  RC_LINE_HEIGHTS,
  type RcA11ySettings,
} from '../hooks/useRcA11y';
import type { RcPassage, RcQuestion } from '../lib/rcTypes';

/* ----------------------------------------------------------------- shared */

const PILL =
  'rounded-full border border-slate-400 bg-white px-5 py-2 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40';
const PILL_PRIMARY =
  'rounded-full bg-slate-900 px-7 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40';
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
      <Section label="Reading focus" />
      <OptionRow label="Paragraph focus" selected={settings.paragraphFocus}
        onClick={() => onChange({ paragraphFocus: !settings.paragraphFocus })} />
      <p className="px-3 pb-2 text-xs text-slate-500">Highlight the paragraph under your mouse.</p>

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

/** Standalone toolbar menu. Percentages scale the comfortable default leading. */
export function RcLineSpacingMenu({ settings, onChange }: {
  settings: RcA11ySettings;
  onChange: (patch: Partial<RcA11ySettings>) => void;
}) {
  const legacy = !RC_LINE_HEIGHTS.some(option => option.value === settings.lineHeight);
  const options = legacy ? [...RC_LINE_HEIGHTS, {
    label: 'Saved spacing', percent: Math.round((1.6 + settings.lineHeight) / 1.6 * 100), value: settings.lineHeight,
  }] : RC_LINE_HEIGHTS;
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>
      <button type="button" aria-label="Change line spacing" title="Change line spacing"
        className="flex items-center justify-center rounded-sm border border-transparent p-1.5 text-slate-800 hover:bg-slate-200 data-[state=open]:border-slate-700 data-[state=open]:bg-white">
        <ListFilter size={20} aria-hidden="true" />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content align="end" sideOffset={8}
        className="z-[80] w-60 max-w-[calc(100vw-1rem)] rounded-2xl border-2 border-slate-900 bg-white p-2 text-slate-900 shadow-md">
        <DropdownMenu.Label className="pb-2 text-center text-xs font-medium">Change Line Spacing</DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={String(settings.lineHeight)} onValueChange={value => onChange({ lineHeight: Number(value) })}>
          {options.map(option => <DropdownMenu.RadioItem key={option.value} value={String(option.value)}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm outline-none data-[highlighted]:bg-slate-100 data-[state=checked]:border-lime-300 data-[state=checked]:bg-lime-100">
            <span className="flex-1 font-semibold uppercase">{option.label}</span>
            <span className="tabular-nums">{option.percent}%</span>
            <span className="w-4"><DropdownMenu.ItemIndicator><Check size={16} aria-hidden="true" /></DropdownMenu.ItemIndicator></span>
          </DropdownMenu.RadioItem>)}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>;
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
      aria-pressed={selected}
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
    ['Passage difficulty', dash(passage.difficulty)],
    ['Passage', dash(passage.setNumber)],
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

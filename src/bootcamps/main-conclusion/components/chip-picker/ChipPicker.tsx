/**
 * ChipPicker — keyboard-first single-select chip group.
 *
 * Pattern shared by RoleLabeler and IndicatorTagger: a compact horizontal
 * group of chips, one selected at a time, click-again-to-clear, and full
 * keyboard support (Tab to enter, arrows to move within the group, Enter
 * or Space to pick, number keys 1..N as direct picks).
 *
 * `value === null` means nothing selected. Picking the currently-selected
 * chip clears to null (parity with RoleLabeler's existing behavior).
 */

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export interface ChipOption<T extends string> {
  /** Stable key. */
  value: T;
  /** Visible chip label. */
  label: string;
  /** Tailwind class for the leading dot color (token-bound). */
  dotClass: string;
  /** Tailwind classes applied when this chip is the selected one. */
  pickedClass: string;
}

interface Props<T extends string> {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (next: T | null) => void;
  disabled?: boolean;
  /** A11y label for the radiogroup wrapper. */
  ariaLabel: string;
}

export function ChipPicker<T extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
}: Props<T>): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  function focusButton(index: number) {
    const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
    if (!buttons) return;
    const wrapped = (index + buttons.length) % buttons.length;
    buttons[wrapped]?.focus();
  }

  function pick(next: T) {
    if (disabled) return;
    onChange(value === next ? null : next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const buttons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('button[role="radio"]') ?? [],
    );
    const activeIx = buttons.findIndex((b) => b === document.activeElement);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusButton(activeIx < 0 ? 0 : activeIx + 1);
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusButton(activeIx < 0 ? options.length - 1 : activeIx - 1);
      return;
    }
    // Number keys: 1..9 pick the Nth option directly.
    if (/^[1-9]$/.test(e.key)) {
      const ix = Number(e.key) - 1;
      if (ix < options.length) {
        e.preventDefault();
        pick(options[ix]!.value);
        focusButton(ix);
      }
    }
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt, i) => {
        const isPicked = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isPicked}
            disabled={disabled}
            onClick={() => pick(opt.value)}
            title={isPicked ? 'Click again to clear' : `Press ${i + 1} to pick`}
            // Roving tabindex: only the picked chip (or the first one if none picked) is in the tab order.
            tabIndex={isPicked || (value === null && i === 0) ? 0 : -1}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
              'font-mc-mono text-mono uppercase tracking-wider',
              'transition-[background,color,border-color] duration-150 ease-eased',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
              'disabled:cursor-default',
              isPicked
                ? opt.pickedClass
                : 'bg-[rgb(var(--surface-elev))] text-ink-faint border-[rgb(var(--border)/0.10)] hover:text-ink hover:border-[color:var(--border-accent-soft)]',
            )}
          >
            <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', opt.dotClass)} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

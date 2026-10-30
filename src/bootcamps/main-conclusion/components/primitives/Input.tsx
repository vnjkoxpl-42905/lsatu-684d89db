import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type State = 'default' | 'success' | 'warn' | 'error';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  state?: State;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  state?: State;
}

const STATE_BORDER: Record<State, string> = {
  default: 'border-[rgb(var(--border)/0.10)] focus-within:border-[color:var(--border-accent-strong)]',
  success: 'border-[rgb(var(--success)/0.40)] focus-within:border-[rgb(var(--success))]',
  warn: 'border-[rgb(var(--warn)/0.40)] focus-within:border-[rgb(var(--warn))]',
  error: 'border-[rgb(var(--error)/0.50)] focus-within:border-[rgb(var(--error))]',
};

const STATE_GLOW: Record<State, string> = {
  default: 'focus-within:shadow-[var(--glow-accent-soft)]',
  success: 'focus-within:shadow-[0_0_24px_-4px_rgb(16_185_129/0.32)]',
  warn: 'focus-within:shadow-[0_0_24px_-4px_rgb(250_204_21/0.32)]',
  error: 'focus-within:shadow-[0_0_24px_-4px_rgb(239_68_68/0.32)]',
};

const FIELD_BASE = cn(
  'w-full bg-transparent font-mc-serif text-body-prose text-ink',
  'placeholder:text-ink-faint',
  'focus:outline-none',
);

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, state = 'default', leftIcon, rightIcon, disabled, ...rest },
  ref,
) {
  return (
    <span
      className={cn(
        'group/field inline-flex w-full items-center gap-2 rounded-3 px-3',
        'bg-[image:var(--grad-surface-soft)]',
        'border transition-[border-color,box-shadow] duration-150 ease-eased',
        STATE_BORDER[state],
        STATE_GLOW[state],
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {leftIcon ? <span className="shrink-0 text-ink-faint inline-flex">{leftIcon}</span> : null}
      <input ref={ref} disabled={disabled} className={cn(FIELD_BASE, 'h-9 py-2')} {...rest} />
      {rightIcon ? <span className="shrink-0 text-ink-faint inline-flex">{rightIcon}</span> : null}
    </span>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, state = 'default', disabled, ...rest },
  ref,
) {
  return (
    <span
      className={cn(
        'block w-full rounded-3 px-3 py-2',
        'bg-[image:var(--grad-surface-soft)]',
        'border transition-[border-color,box-shadow] duration-150 ease-eased',
        STATE_BORDER[state],
        STATE_GLOW[state],
        disabled && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      <textarea ref={ref} disabled={disabled} className={cn(FIELD_BASE, 'min-h-[6rem] resize-y')} {...rest} />
    </span>
  );
});

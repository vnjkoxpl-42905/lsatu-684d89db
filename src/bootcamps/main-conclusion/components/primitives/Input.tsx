import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const FIELD =
  'w-full rounded-3 bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.10)] px-3 py-2 font-mc-serif text-body-prose text-ink ' +
  'placeholder:text-ink-faint focus:border-[rgb(var(--accent)/0.50)] focus:outline focus:outline-2 focus:outline-mc-accent focus:outline-offset-1 ' +
  'transition-colors duration-150 ease-eased';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(FIELD, 'h-9', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(FIELD, 'min-h-[6rem] resize-y', className)} {...rest} />;
});

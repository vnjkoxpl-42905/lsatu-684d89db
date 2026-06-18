import { useCallback, useEffect, useRef } from 'react';
import { ArrowUp, Loader2, Lock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SeedAction {
  label: string;
  onClick: () => void;
}

export function AssistantComposer({
  value,
  onChange,
  onSubmit,
  loading,
  disabled,
  placeholder,
  seedAction,
  readOnlyMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
  seedAction?: SeedAction;
  readOnlyMessage?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 && !loading && !disabled;

  const adjustHeight = useCallback((reset?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '44px';
    if (reset) return;
    textarea.style.height = `${Math.max(44, Math.min(textarea.scrollHeight, 132))}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight, value]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [adjustHeight]);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit();
    requestAnimationFrame(() => adjustHeight(true));
  };

  if (readOnlyMessage) {
    return (
      <div className="m-3 flex min-h-10 items-center gap-2 border border-black/16 bg-white/45 px-2.5 py-1.5">
        <Lock className="h-3.5 w-3.5 shrink-0 text-black/40" strokeWidth={1.5} />
        <span className="truncate text-[12px] text-black/45">{readOnlyMessage}</span>
      </div>
    );
  }

  return (
    <div className="m-3 border border-black/16 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] transition focus-within:border-black/32 focus-within:bg-white/70">
      <div className="flex items-end gap-2 px-2.5 py-1.5">
        <span className="mb-1.5 font-mono text-[13px] text-black/40">❯</span>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            adjustHeight();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          aria-label="Assistant instructions"
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'min-h-11 flex-1 resize-none overflow-hidden border-0 bg-transparent px-0 py-2 font-mono text-[13px] leading-5 text-[#11181c] shadow-none outline-none ring-0',
            'focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
            'placeholder:text-black/35',
          )}
        />
        {seedAction ? (
          <button
            type="button"
            onClick={seedAction.onClick}
            disabled={loading || disabled}
            className="mb-1 inline-flex h-7 shrink-0 items-center whitespace-nowrap border border-black/16 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/60 transition hover:bg-black hover:text-white disabled:opacity-40"
          >
            {seedAction.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="Send command"
          className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-black/16 text-black/60 transition hover:bg-black hover:text-white disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

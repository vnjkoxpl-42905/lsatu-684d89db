import { useCallback, useEffect, useRef } from 'react';
import {
  ArrowUp,
  CircleUserRound,
  Figma,
  FileUp,
  ImageIcon,
  Loader2,
  MonitorIcon,
  Paperclip,
  PlusIcon,
} from 'lucide-react';
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

  return (
    <div className="mt-5 w-full">
      {readOnlyMessage ? <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">{readOnlyMessage}</div> : null}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-700 bg-[#151515] shadow-[0_16px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]">
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
            'min-h-[84px] w-full resize-none overflow-hidden border-0 bg-transparent px-4 py-4 text-[15px] leading-6 text-white shadow-none outline-none ring-0',
            'focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
            'placeholder:text-neutral-500',
          )}
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <button
            type="button"
            disabled
            aria-label="Attach"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/85 transition disabled:opacity-85"
          >
            <Paperclip className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              aria-label="Project"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-zinc-600 px-3 text-sm text-zinc-400 transition disabled:opacity-85"
            >
              <PlusIcon className="h-4 w-4" strokeWidth={1.75} />
              Project
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-label="Send command"
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 transition hover:border-zinc-500 hover:bg-zinc-800',
                canSubmit && 'border-white bg-white text-black hover:bg-white/90',
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <ArrowUp className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <ActionChip icon={<ImageIcon className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Clone a Screenshot" />
        <ActionChip icon={<Figma className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Import from Figma" />
        <ActionChip icon={<FileUp className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Upload a Project" />
        <ActionChip icon={<MonitorIcon className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Landing Page" />
        <ActionChip icon={<CircleUserRound className="h-3.5 w-3.5" strokeWidth={1.75} />} label="Sign Up Form" />
      </div>
    </div>
  );
}

function ActionChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-800 bg-[#151515] px-4 py-2 text-xs text-neutral-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] disabled:opacity-100"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

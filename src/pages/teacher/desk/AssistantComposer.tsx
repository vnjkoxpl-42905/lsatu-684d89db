import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Cloud,
  FileText,
  Library,
  Loader2,
  Paperclip,
  Sparkles,
  Wand2,
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
  onAttachFile,
  onOpenDrive,
  onUtilityCommand,
  readOnlyMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled: boolean;
  placeholder: string;
  seedAction?: SeedAction;
  onAttachFile?: () => void;
  onOpenDrive?: () => void;
  onUtilityCommand?: (command: string) => void;
  readOnlyMessage?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [materialOpen, setMaterialOpen] = useState(false);
  const canSubmit = value.trim().length > 0 && !loading && !disabled;
  const canUseAssistantActions = !loading && !disabled && Boolean(onUtilityCommand);

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

  const runUtility = (command: string) => {
    if (!canUseAssistantActions) return;
    onUtilityCommand?.(command);
  };

  const attachMaterial = (label: string) => {
    setMaterialOpen(false);
    runUtility(`Attach ${label.toLowerCase()} context to this Teacher Desk task.`);
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
            onClick={onAttachFile}
            disabled={!onAttachFile}
            aria-label="Attach file"
            title={onAttachFile ? 'Open student upload/source material' : 'File attach is not connected here yet'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/85 transition disabled:opacity-85"
          >
            <Paperclip className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMaterialOpen((current) => !current)}
                aria-expanded={materialOpen}
                aria-haspopup="menu"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-zinc-600 px-3 text-sm text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                <Library className="h-4 w-4" strokeWidth={1.75} />
                Attach material
              </button>
              {materialOpen ? (
                <div
                  role="menu"
                  className="absolute bottom-11 right-0 z-20 w-64 overflow-hidden rounded-xl border border-zinc-700 bg-[#111111] p-1.5 text-sm text-zinc-200 shadow-2xl"
                >
                  {MATERIAL_TYPES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      role="menuitem"
                      onClick={() => attachMaterial(item)}
                      disabled={!canUseAssistantActions}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onOpenDrive}
              disabled={!onOpenDrive}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-700 px-3 text-sm text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-55"
            >
              <Cloud className="h-4 w-4" strokeWidth={1.75} />
              Google Drive
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
        <ActionChip
          icon={<Wand2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Improve writing"
          disabled={!canUseAssistantActions}
          onClick={() => runUtility('Improve the writing in this Teacher Desk task. Keep Joshua’s voice and preserve the substance.')}
        />
        <ActionChip
          icon={<FileText className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Canvas\u00a0"
          disabled={!canUseAssistantActions}
          onClick={() => runUtility('Create a concise Canvas-style draft reply for this Teacher Desk task.')}
        />
        <ActionChip
          icon={<Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />}
          label="Recommend next work"
          disabled={!canUseAssistantActions}
          onClick={() => runUtility('Recommend the next useful LSAT work for this student, using this Teacher Desk context.')}
        />
      </div>
    </div>
  );
}

const MATERIAL_TYPES = [
  'Guided drill',
  'Bootcamp lesson/module',
  'Practice set',
  'PT / section assignment',
  'Reading or lesson page',
  'Homework/classroom item',
  'Recap or note',
  'Student upload/source material',
];

function ActionChip({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center gap-2 rounded-full border border-neutral-800 bg-[#151515] px-4 py-2 text-xs text-neutral-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-neutral-700 hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-55"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

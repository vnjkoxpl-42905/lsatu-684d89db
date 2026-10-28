import { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Italic, Link2, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type ToolbarMode = 'idle' | 'ai' | 'link';

interface Selection {
  start: number;
  end: number;
  x: number;
  y: number;
}

/**
 * The editable draft body for the Teacher Desk Draft Bubble (./CONTEXT.md →
 * "Draft Bubble" / "Ask for Changes"). A plain-markdown textarea is the source of
 * truth (drafts stay markdown end to end), with a ChatGPT-canvas-style selection
 * toolbar: highlight text to get Bold / Italic / Link and "Ask Gemini ⌘K",
 * which revises ONLY the selected fragment via the polish-message edge function
 * (instruction mode) and splices the result back in place.
 */
export function DraftEditor({
  value,
  onChange,
  canUseAi,
  ariaLabel,
  placeholder = 'Edit the draft, highlight text to format or ask for changes...',
  textareaClassName,
  openAiOnSelection = false,
}: {
  value: string;
  onChange: (value: string) => void;
  canUseAi: boolean;
  ariaLabel: string;
  placeholder?: string;
  textareaClassName?: string;
  openAiOnSelection?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  const [mode, setMode] = useState<ToolbarMode>('idle');
  const [field, setField] = useState('');
  const [revising, setRevising] = useState(false);

  const close = useCallback(() => {
    setSel(null);
    setMode('idle');
    setField('');
  }, []);

  // Read the current selection from the textarea. anchor lets a keyboard-driven
  // selection (no mouse event) still place the toolbar sensibly.
  const capture = useCallback((anchor?: { x: number; y: number }, source?: HTMLTextAreaElement, clearWhenEmpty = true, activateAi = false) => {
    const el = source ?? ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (end <= start) {
      if (clearWhenEmpty) {
        setSel((current) => (current && mode === 'idle' ? null : current));
      }
      return;
    }
    const point =
      anchor ??
      (() => {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + 28 };
      })();
    setSel({ start, end, x: point.x, y: point.y });
    if (activateAi && mode === 'idle') {
      setMode('ai');
      setField('');
    }
  }, [mode]);

  // Splice a replacement over the active selection and keep it selected.
  const apply = useCallback(
    (replacement: string) => {
      if (!sel) return;
      const next = value.slice(0, sel.start) + replacement + value.slice(sel.end);
      onChange(next);
      const newEnd = sel.start + replacement.length;
      setSel({ ...sel, end: newEnd });
      requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(sel.start, newEnd);
      });
    },
    [onChange, sel, value],
  );

  const selectedText = sel ? value.slice(sel.start, sel.end) : '';

  const wrap = (prefix: string, suffix: string) => {
    apply(`${prefix}${selectedText}${suffix}`);
    setMode('idle');
  };

  const submitLink = () => {
    const url = field.trim();
    if (!url) return;
    apply(`[${selectedText}](${url})`);
    close();
  };

  const revise = async () => {
    const instruction = field.trim();
    if (!instruction || !sel) return;
    setRevising(true);
    try {
      const { data, error } = await supabase.functions.invoke('polish-message', {
        body: { text: selectedText, instruction },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const revised = typeof data?.polished === 'string' ? data.polished.trim() : '';
      if (!revised) throw new Error('The assistant returned an empty revision.');
      apply(revised);
      setMode('idle');
      setField('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not revise the selection');
    } finally {
      setRevising(false);
    }
  };

  // Dismiss the toolbar on Escape anywhere.
  useEffect(() => {
    if (!sel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, close]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => capture(undefined, event.currentTarget, false)}
        onMouseUpCapture={(event) => capture({ x: event.clientX, y: event.clientY }, event.currentTarget, true, openAiOnSelection)}
        onMouseUp={(event) => capture({ x: event.clientX, y: event.clientY }, event.currentTarget, true, openAiOnSelection)}
        onSelect={(event) => capture(undefined, event.currentTarget, false, openAiOnSelection)}
        onKeyUp={(event) => {
          if (event.shiftKey || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            capture(undefined, event.currentTarget, true, openAiOnSelection);
          }
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            const el = ref.current;
            if (el && el.selectionEnd > el.selectionStart) {
              event.preventDefault();
              capture();
              setMode('ai');
            }
          }
        }}
        autoFocus
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={cn(
          'min-h-[120px] w-full resize-y border border-black/16 bg-white/80 px-3 py-2 text-[13px] leading-relaxed outline-none placeholder:text-black/35 focus:border-black',
          textareaClassName,
        )}
      />

      {sel ? (
        <div
          style={{ position: 'fixed', left: Math.min(Math.max(sel.x, 120), window.innerWidth - 140), top: sel.y - 12 }}
          className="z-50 -translate-x-1/2 -translate-y-full"
          onMouseDown={(event) => event.preventDefault() /* keep the textarea selection alive */}
        >
          <div
            role={mode === 'ai' ? 'group' : undefined}
            aria-label={mode === 'ai' ? 'Ask Gemini' : undefined}
            className={cn(
              'flex items-center border border-white/10 bg-[#11181c] text-white shadow-xl',
              mode === 'ai' ? 'gap-2 rounded-xl bg-[#272a2d] p-2' : 'gap-0.5 rounded-lg p-1',
            )}
          >
            {mode === 'idle' ? (
              <>
                <ToolBtn label="Bold" onClick={() => wrap('**', '**')}>
                  <Bold className="h-3.5 w-3.5" strokeWidth={2} />
                </ToolBtn>
                <ToolBtn label="Italic" onClick={() => wrap('*', '*')}>
                  <Italic className="h-3.5 w-3.5" strokeWidth={2} />
                </ToolBtn>
                <ToolBtn label="Link" onClick={() => { setMode('link'); setField(''); }}>
                  <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                </ToolBtn>
                <span className="mx-0.5 h-4 w-px bg-white/25" />
                <button
                  type="button"
                  onClick={() => { if (canUseAi) { setMode('ai'); setField(''); } }}
                  disabled={!canUseAi}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-zinc-200 transition hover:bg-white/15 disabled:opacity-40"
                  title={canUseAi ? 'Ask Gemini (⌘K)' : 'Connects on the live teacher desk'}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> Ask Gemini
                  <kbd className="ml-0.5 hidden rounded bg-white/15 px-1 text-[9px] sm:inline">⌘K</kbd>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 pl-1">
                <Sparkles
                  className={cn('h-4 w-4 text-zinc-400', mode === 'link' ? 'hidden' : undefined)}
                  strokeWidth={1.6}
                />
                <span className={cn('text-[12px] font-medium text-zinc-400', mode === 'ai' ? undefined : 'text-[10px] uppercase tracking-[0.12em] text-white/55')}>
                  {mode === 'ai' ? 'Ask Gemini' : 'Link'}
                </span>
                <input
                  value={field}
                  onChange={(event) => setField(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      if (mode === 'ai') revise();
                      else submitLink();
                    }
                  }}
                  autoFocus
                  disabled={mode === 'ai' && !canUseAi}
                  placeholder={mode === 'ai' ? 'Ask Gemini' : 'https://…'}
                  className={cn(
                    'h-8 bg-transparent px-2 text-[14px] text-white outline-none placeholder:text-zinc-400',
                    mode === 'ai' ? 'w-64' : 'w-44 bg-white/10 text-[12px]',
                    mode === 'ai' && !canUseAi ? 'cursor-not-allowed opacity-60' : undefined,
                  )}
                />
                <button
                  type="button"
                  onClick={() => (mode === 'ai' ? revise() : submitLink())}
                  disabled={(mode === 'ai' && !canUseAi) || !field.trim() || revising}
                  aria-label={mode === 'ai' ? 'Apply Gemini edit' : undefined}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-3 text-[12px] font-semibold text-[#11181c] transition hover:bg-white/85 disabled:opacity-50"
                >
                  {revising ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : null}
                  {mode === 'ai' ? 'Apply' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('idle')}
                  aria-label="Cancel"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/15"
                >
                  <X className="h-3 w-3" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ToolBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 items-center justify-center transition hover:bg-white/15"
    >
      {children}
    </button>
  );
}

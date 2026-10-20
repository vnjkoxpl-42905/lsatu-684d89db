import { useState, type ReactNode } from 'react';
import {
  Bold,
  ChevronDown,
  Cloud,
  Copy,
  FileDown,
  FileText,
  Italic,
  LayoutTemplate,
  List,
  ListOrdered,
  Loader2,
  Printer,
  Redo2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  TextCursorInput,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { DraftEditor } from './DraftEditor';
import { copyCanvasMarkdown, downloadCanvasMarkdown, downloadCanvasPdf } from './canvasExports';

type CanvasAiAction = 'polish' | 'outline' | 'draft';

const CANVAS_TITLE = 'Collaborative Workspace';

const AI_ACTIONS: Record<CanvasAiAction, { label: string; instruction: string }> = {
  polish: {
    label: 'Polish document',
    instruction:
      'Polish this full canvas while preserving the author’s voice, structure, and intent. Return only the revised markdown.',
  },
  outline: {
    label: 'Make outline',
    instruction:
      'Convert this canvas into a structured outline with clear headings, nested bullets where useful, and no extra commentary. Return only markdown.',
  },
  draft: {
    label: 'Draft next version',
    instruction:
      'Rewrite this canvas as a cleaner second draft. Keep the same core ideas, improve flow and clarity, and return only markdown.',
  },
};

interface DeskCanvasPanelProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  canUseAi: boolean;
  onAskAssistantFromCanvas?: (prompt: string) => void;
}

export function DeskCanvasPanel({
  value,
  onChange,
  onClose,
  canUseAi,
}: DeskCanvasPanelProps) {
  const [creating, setCreating] = useState<CanvasAiAction | null>(null);

  const runAiAction = async (action: CanvasAiAction) => {
    const body = value.trim();
    if (!body) {
      toast.error('Add canvas text before using AI actions.');
      return;
    }
    if (!canUseAi) {
      toast.error('AI actions connect on the live teacher desk.');
      return;
    }

    setCreating(action);
    try {
      const { data, error } = await supabase.functions.invoke('polish-message', {
        body: { text: value, instruction: AI_ACTIONS[action].instruction },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const polished = typeof data?.polished === 'string' ? data.polished.trim() : '';
      if (!polished) throw new Error('The assistant returned an empty document.');
      onChange(polished);
      toast.success(`${AI_ACTIONS[action].label} complete`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update the canvas');
    } finally {
      setCreating(null);
    }
  };

  const focusDocument = () => {
    const editor = document.querySelector<HTMLTextAreaElement>('[aria-label="Collaborative canvas document"]');
    editor?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    editor?.focus();
  };

  const exportPdf = async () => {
    try {
      await downloadCanvasPdf(CANVAS_TITLE, value);
      toast.success('PDF exported');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not export PDF');
    }
  };

  const exportMarkdown = () => {
    downloadCanvasMarkdown(CANVAS_TITLE, value);
    toast.success('Markdown exported');
  };

  const copyMarkdown = async () => {
    try {
      await copyCanvasMarkdown(value);
      toast.success('Markdown copied');
    } catch {
      toast.error('Could not copy markdown');
    }
  };

  return (
    <section
      aria-label="Collaborative Workspace"
      className="relative flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#1d1d1d] text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex min-h-14 items-center gap-3 border-b border-white/8 px-5 text-sm text-zinc-300">
        <h2 className="w-56 shrink-0 truncate font-medium">Collaborative Workspace</h2>
        <div className="hidden items-center gap-1 text-zinc-300 md:flex">
          <ToolbarButton label="Cloud status">
            <Cloud className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Undo">
            <Undo2 className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Redo">
            <Redo2 className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <span className="mx-2 h-6 w-px bg-white/16" />
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/8"
          >
            Normal text
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.7} />
          </button>
          <span className="mx-2 h-6 w-px bg-white/16" />
          <ToolbarButton label="Bold">
            <Bold className="h-4 w-4" strokeWidth={2.1} />
          </ToolbarButton>
          <ToolbarButton label="Italic">
            <Italic className="h-4 w-4" strokeWidth={2.1} />
          </ToolbarButton>
          <ToolbarButton label="Bulleted list">
            <List className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Numbered list">
            <ListOrdered className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
        </div>
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <ToolbarButton label="Print">
            <Printer className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <ToolbarButton label="Share">
            <Share2 className="h-4 w-4" strokeWidth={1.8} />
          </ToolbarButton>
          <CreateMenu
            canUseAi={canUseAi}
            creating={creating}
            onExportPdf={exportPdf}
            onExportMarkdown={exportMarkdown}
            onCopyMarkdown={copyMarkdown}
            onAiAction={runAiAction}
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close canvas"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <DraftEditor
          value={value}
          onChange={onChange}
          canUseAi={canUseAi}
          ariaLabel="Collaborative canvas document"
          placeholder="Paste or draft here..."
          textareaClassName="min-h-[430px] resize-none border-0 bg-transparent p-0 text-[16px] leading-7 text-zinc-100 shadow-none outline-none placeholder:text-zinc-500 focus:border-transparent"
          openAiOnSelection
        />
      </div>

      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col overflow-hidden rounded-full bg-[#111]/95 py-2 shadow-[0_16px_36px_rgba(0,0,0,0.35)] md:flex">
        <SideToolButton label="Fit document" onClick={focusDocument}>
          <TextCursorInput className="h-4 w-4" strokeWidth={1.8} />
        </SideToolButton>
        <SideToolButton label="Canvas settings" disabled title="Canvas settings are not wired yet.">
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.8} />
        </SideToolButton>
        <SideToolButton label="Create from selection" disabled title="Use Ask Gemini after selecting text.">
          <LayoutTemplate className="h-4 w-4" strokeWidth={1.8} />
        </SideToolButton>
      </div>
    </section>
  );
}

function CreateMenu({
  canUseAi,
  creating,
  onExportPdf,
  onExportMarkdown,
  onCopyMarkdown,
  onAiAction,
}: {
  canUseAi: boolean;
  creating: CanvasAiAction | null;
  onExportPdf: () => void;
  onExportMarkdown: () => void;
  onCopyMarkdown: () => void;
  onAiAction: (action: CanvasAiAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const aiDisabled = !canUseAi || creating !== null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-[#126295] px-3 text-xs font-semibold text-white transition hover:bg-[#1774ad]"
        >
          Create
          {creating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-white/10 bg-[#222426] p-1.5 text-zinc-100 shadow-2xl"
      >
        <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-white" onSelect={onExportPdf}>
          <FileDown className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-white" onSelect={onExportMarkdown}>
          <FileText className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 focus:bg-white/10 focus:text-white" onSelect={onCopyMarkdown}>
          <Copy className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
          Copy markdown
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          disabled={aiDisabled}
          className="gap-2 focus:bg-white/10 focus:text-white"
          onSelect={() => onAiAction('polish')}
        >
          <Sparkles className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
          Polish document
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={aiDisabled}
          className="gap-2 focus:bg-white/10 focus:text-white"
          onSelect={() => onAiAction('outline')}
        >
          <ListOrdered className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
          Make outline
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={aiDisabled}
          className="gap-2 focus:bg-white/10 focus:text-white"
          onSelect={() => onAiAction('draft')}
        >
          <WandSparkles className="h-4 w-4 text-zinc-400" strokeWidth={1.8} />
          Draft next version
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarButton({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-zinc-400 transition hover:bg-white/8 hover:text-white"
    >
      {children}
    </button>
  );
}

function SideToolButton({
  label,
  children,
  onClick,
  disabled,
  title,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-11 items-center justify-center text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}
